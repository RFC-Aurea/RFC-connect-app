import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { storage } from "./storage";
import { verifyAccessToken } from "./jwt";
import type { User, Message } from "@shared/schema";

// ---------------------------------------------------------------------------
// Typed Socket.IO event maps
// ---------------------------------------------------------------------------

interface ServerToClientEvents {
  "message:received": (data: {
    message: Message;
    sender: Omit<User, "password">;
  }) => void;
  "typing:start": (data: { userId: number }) => void;
  "typing:stop": (data: { userId: number }) => void;
}

interface ClientToServerEvents {
  "message:send": (data: {
    partnerId: number;
    content: string;
    messageType?: string;
    attachmentId?: number;
  }) => void;
  "typing:start": (data: { partnerId: number }) => void;
  "typing:stop": (data: { partnerId: number }) => void;
}

// No inter-server events (single-node deployment)
type InterServerEvents = Record<string, never>;

interface SocketData {
  user: User;
}

// ---------------------------------------------------------------------------
// Online-user tracking (userId → set of connected socketIds)
// Using a Set per user handles multiple devices gracefully.
// ---------------------------------------------------------------------------

const onlineSockets = new Map<number, Set<string>>();

function addOnlineSocket(userId: number, socketId: string): void {
  if (!onlineSockets.has(userId)) {
    onlineSockets.set(userId, new Set());
  }
  onlineSockets.get(userId)!.add(socketId);
}

function removeOnlineSocket(userId: number, socketId: string): void {
  const sockets = onlineSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineSockets.delete(userId);
    }
  }
}

/** Returns true if the user has at least one active socket connection. */
export function isUserOnline(userId: number): boolean {
  return (onlineSockets.get(userId)?.size ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Socket.IO initialisation
// ---------------------------------------------------------------------------

type AppIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let ioInstance: AppIO | undefined;

/** Returns the active Socket.IO server, or undefined if not yet initialised. */
export function getIO(): AppIO | undefined {
  return ioInstance;
}

export function initializeSocket(httpServer: HttpServer): void {
  const io: AppIO = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      // In production, set SOCKET_ALLOWED_ORIGIN to your app domain.
      // If not set, CORS is denied (same-origin only). In dev, all origins
      // are allowed so the iOS simulator and web client both connect.
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.SOCKET_ALLOWED_ORIGIN || false
          : "*",
      methods: ["GET", "POST"],
    },
  });

  ioInstance = io;

  // ------------------------------------------------------------------
  // Connection authentication middleware
  // Expects: socket.handshake.auth.token = "<access JWT>"
  // ------------------------------------------------------------------
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      const user = await storage.getUser(payload.userId);
      if (!user) {
        next(new Error("User not found"));
        return;
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ------------------------------------------------------------------
  // Connection handler
  // ------------------------------------------------------------------
  io.on("connection", async (socket) => {
    const user = socket.data.user;

    // Track across multiple devices
    addOnlineSocket(user.id, socket.id);

    // Join one room per assignment so messages are scoped to a conversation.
    // Snapshot at connection time — new assignments require a reconnect.
    const [mentorAssignments, patientAssignments] = await Promise.all([
      storage.getAssignmentsByMentor(user.id),
      storage.getAssignmentsByPatient(user.id),
    ]);
    const allAssignments = [...mentorAssignments, ...patientAssignments];

    for (const assignment of allAssignments) {
      socket.join(`assignment:${assignment.id}`);
    }

    // Personal room for direct server-push notifications
    socket.join(`user:${user.id}`);

    // ----------------------------------------------------------------
    // message:send
    // ----------------------------------------------------------------
    socket.on("message:send", async (data) => {
      try {
        const { partnerId, content, messageType } = data;

        const assignment = allAssignments.find(
          (a) => a.mentorId === partnerId || a.patientId === partnerId,
        );
        if (!assignment) {
          socket.emit("message:received" as any, {
            error: "Not assigned to this user",
          });
          return;
        }

        if (!content?.trim()) return;

        const message = await storage.createMessage({
          senderId: user.id,
          receiverId: partnerId,
          content: content.trim(),
          messageType: messageType ?? "text",
        });

        const { password: _, ...safeSender } = user;

        // Broadcast to all sockets in the room (including the sender's
        // other devices) so every participant sees the message immediately.
        io.to(`assignment:${assignment.id}`).emit("message:received", {
          message,
          sender: safeSender,
        });
      } catch (err) {
        console.error("[socket] message:send error:", err);
      }
    });

    // ----------------------------------------------------------------
    // typing:start / typing:stop
    // Broadcast only to OTHER sockets in the room (socket.to, not io.to).
    // ----------------------------------------------------------------
    socket.on("typing:start", (data) => {
      const assignment = allAssignments.find(
        (a) => a.mentorId === data.partnerId || a.patientId === data.partnerId,
      );
      if (!assignment) return;
      socket
        .to(`assignment:${assignment.id}`)
        .emit("typing:start", { userId: user.id });
    });

    socket.on("typing:stop", (data) => {
      const assignment = allAssignments.find(
        (a) => a.mentorId === data.partnerId || a.patientId === data.partnerId,
      );
      if (!assignment) return;
      socket
        .to(`assignment:${assignment.id}`)
        .emit("typing:stop", { userId: user.id });
    });

    // ----------------------------------------------------------------
    // Disconnect
    // ----------------------------------------------------------------
    socket.on("disconnect", () => {
      removeOnlineSocket(user.id, socket.id);
    });
  });
}
