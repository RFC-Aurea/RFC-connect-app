import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole, comparePasswords, hashPassword } from "./auth";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "./jwt";
import {
  twilioEnabled,
  sendVerificationCode,
  checkVerificationCode,
} from "./twilio";
import {
  upload,
  uploadFile,
  storageEnabled,
  ALLOWED_MIMES,
  maxSizeForType,
  type AttachmentType,
} from "./upload";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Mobile JWT auth routes
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      // If the user has already verified their phone AND Twilio is available,
      // require SMS 2FA before issuing tokens.
      if (user.phoneVerified && user.phone && twilioEnabled) {
        await sendVerificationCode(user.phone);
        res.json({ requiresVerification: true, userId: user.id });
        return;
      }

      // New users (phoneVerified = false) or dev mode: issue tokens directly.
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt });
      const { password: _, ...safeUser } = user;
      res.json({ accessToken, refreshToken, user: safeUser });
    } catch (err) { next(err); }
  });

  app.post("/api/auth/refresh", async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
      }
      let payload: { userId: number };
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch {
        res.status(401).json({ message: "Invalid or expired refresh token" });
        return;
      }
      const tokenHash = hashToken(refreshToken);
      const stored = await storage.getRefreshTokenByHash(tokenHash);
      if (!stored || stored.expiresAt < new Date()) {
        res.status(401).json({ message: "Refresh token not recognised" });
        return;
      }
      // Rotate: delete old token, issue new pair
      await storage.deleteRefreshTokenByHash(tokenHash);
      const newAccessToken = generateAccessToken(payload.userId);
      const newRefreshToken = generateRefreshToken(payload.userId);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken({ userId: payload.userId, tokenHash: hashToken(newRefreshToken), expiresAt });
      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) { next(err); }
  });

  app.post("/api/auth/logout-mobile", async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
      }
      await storage.deleteRefreshTokenByHash(hashToken(refreshToken));
      res.json({ message: "Logged out" });
    } catch (err) { next(err); }
  });

  // Complete a 2FA login: verify the SMS code, then issue tokens.
  app.post("/api/auth/complete-login", async (req, res, next) => {
    try {
      const { userId, verificationCode } = req.body;
      if (!userId || !verificationCode) {
        res.status(400).json({ message: "userId and verificationCode are required" });
        return;
      }

      const user = await storage.getUser(Number(userId));
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      if (!user.phone) {
        res.status(400).json({ message: "No phone number on record for this user" });
        return;
      }

      if (twilioEnabled) {
        const approved = await checkVerificationCode(user.phone, String(verificationCode));
        if (!approved) {
          res.status(401).json({ message: "Invalid or expired verification code" });
          return;
        }
      }
      // twilioEnabled === false → dev mode, auto-approve

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.createRefreshToken({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt });
      const { password: _, ...safeUser } = user;
      res.json({ accessToken, refreshToken, user: safeUser });
    } catch (err) { next(err); }
  });

  // E.164 phone: starts with +, followed by 10–15 digits
  const PHONE_RE = /^\+\d{10,15}$/;

  app.post("/api/auth/send-verification", requireAuth, async (req, res, next) => {
    try {
      const { phone } = req.body;
      if (!phone || !PHONE_RE.test(phone)) {
        res.status(400).json({ message: "phone must be in E.164 format (e.g. +14155552671)" });
        return;
      }

      if (!twilioEnabled) {
        res.json({ success: true, message: "Twilio not configured — verification skipped" });
        return;
      }

      await sendVerificationCode(phone);
      // Persist the phone number so complete-login and verify-phone can use it
      await storage.updateUser(req.user!.id, { phone });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  app.post("/api/auth/verify-phone", requireAuth, async (req, res, next) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        res.status(400).json({ message: "phone and code are required" });
        return;
      }
      if (!PHONE_RE.test(phone)) {
        res.status(400).json({ message: "phone must be in E.164 format (e.g. +14155552671)" });
        return;
      }

      if (!twilioEnabled) {
        await storage.updateUser(req.user!.id, { phone, phoneVerified: true });
        res.json({ success: true, verified: true });
        return;
      }

      const approved = await checkVerificationCode(phone, String(code));
      if (!approved) {
        res.status(400).json({ success: false, verified: false, message: "Invalid or expired code" });
        return;
      }

      await storage.updateUser(req.user!.id, { phone, phoneVerified: true });
      res.json({ success: true, verified: true });
    } catch (err) { next(err); }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ message: "currentPassword and newPassword are required" });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ message: "newPassword must be at least 8 characters" });
        return;
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const valid = await comparePasswords(currentPassword, user.password);
      if (!valid) {
        res.status(401).json({ message: "Current password is incorrect" });
        return;
      }

      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed, mustChangePassword: false });

      await storage.createAuditLog({
        actorId: user.id,
        action: "change_password",
        targetId: user.id,
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  });

  app.post(
    "/api/upload",
    requireAuth,
    upload.single("file"),
    async (req, res, next) => {
      try {
        const type = req.body.type as string;
        if (!type || !["photo", "document", "voice"].includes(type)) {
          res.status(400).json({ message: "type must be 'photo', 'document', or 'voice'" });
          return;
        }
        const attachmentType = type as AttachmentType;

        if (!req.file) {
          res.status(400).json({ message: "No file provided" });
          return;
        }

        // Validate MIME type matches declared category
        if (!ALLOWED_MIMES[attachmentType].includes(req.file.mimetype)) {
          res.status(400).json({
            message: `MIME type '${req.file.mimetype}' is not valid for type '${type}'`,
          });
          return;
        }

        // Per-type size check (multer's global limit is the highest; this enforces tighter limits)
        if (req.file.size > maxSizeForType(attachmentType)) {
          res.status(400).json({
            message: `File too large for type '${type}'. Max: ${maxSizeForType(attachmentType) / 1024 / 1024} MB`,
          });
          return;
        }

        const fileUrl = await uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          attachmentType,
        );

        const duration = req.body.duration ? parseInt(req.body.duration, 10) : null;

        const attachment = await storage.createChatAttachment({
          type,
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          durationSeconds: attachmentType === "voice" && duration ? duration : null,
        });

        res.status(201).json({
          attachmentId: attachment.id,
          url: attachment.fileUrl,
          type: attachment.type,
        });
      } catch (err) { next(err); }
    },
  );

  app.get("/api/users/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id as string);
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err) { next(err); }
  });

  app.get("/api/users", requireRole("admin"), async (req, res, next) => {
    try {
      const role = req.query.role as string | undefined;
      if (role) {
        const users = await storage.getUsersByRole(role);
        return res.json(users.map(({ password, ...u }) => u));
      }
      const patients = await storage.getUsersByRole("patient");
      const mentors = await storage.getUsersByRole("mentor");
      const all = [...patients, ...mentors];
      return res.json(all.map(({ password, ...u }) => u));
    } catch (err) { next(err); }
  });

  app.get("/api/patient/dashboard", requireRole("patient"), async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const phase = await storage.getPatientPhase(userId);
      const assignments = await storage.getAssignmentsByPatient(userId);
      let mentor = null;
      if (assignments.length > 0) {
        const mentorUser = await storage.getUser(assignments[0].mentorId);
        if (mentorUser) {
          const { password, ...safeMentor } = mentorUser;
          mentor = safeMentor;
        }
      }
      const { password, ...safeUser } = req.user!;
      return res.json({
        user: safeUser,
        phase: phase?.currentPhase || "Pre-Consult & Decision",
        mentor,
        assignmentId: assignments[0]?.id || null,
      });
    } catch (err) { next(err); }
  });

  app.get("/api/mentor/mentees", requireRole("mentor"), async (req, res, next) => {
    try {
      const assignments = await storage.getAssignmentsByMentor(req.user!.id);
      const mentees = await Promise.all(
        assignments.map(async (a) => {
          const user = await storage.getUser(a.patientId);
          const phase = await storage.getPatientPhase(a.patientId);
          if (!user) return null;
          const { password, ...safeUser } = user;
          return { ...safeUser, phase: phase?.currentPhase || "Pre-Consult & Decision", assignmentId: a.id };
        })
      );
      return res.json(mentees.filter(Boolean));
    } catch (err) { next(err); }
  });

  app.get("/api/admin/overview", requireRole("admin"), async (req, res, next) => {
    try {
      const patients = await storage.getUsersByRole("patient");
      const mentors = await storage.getUsersByRole("mentor");
      const assignments = await storage.getAllAssignments();

      const patientsWithPhase = await Promise.all(
        patients.map(async (p) => {
          const phase = await storage.getPatientPhase(p.id);
          const assignment = assignments.find(a => a.patientId === p.id);
          const { password, ...safe } = p;
          return {
            ...safe,
            phase: phase?.currentPhase || "Pre-Consult & Decision",
            mentorId: assignment?.mentorId || null,
            assignmentId: assignment?.id || null,
          };
        })
      );

      return res.json({
        patients: patientsWithPhase,
        mentors: mentors.map(({ password, ...m }) => m),
        assignments,
      });
    } catch (err) { next(err); }
  });

  app.patch("/api/patients/:id/phase", requireRole("admin"), async (req, res, next) => {
    try {
      const patientId = parseInt(req.params.id as string);
      const { phase } = req.body;
      if (!phase) return res.status(400).json({ message: "Phase is required" });
      const updated = await storage.upsertPatientPhase({
        patientId,
        currentPhase: phase,
        lastUpdatedBy: req.user!.id,
      });
      return res.json(updated);
    } catch (err) { next(err); }
  });

  app.post("/api/mentor-assignments", requireRole("admin"), async (req, res, next) => {
    try {
      const { mentorId, patientId } = req.body;
      if (!mentorId || !patientId) return res.status(400).json({ message: "mentorId and patientId are required" });
      const assignment = await storage.createAssignment({
        mentorId,
        patientId,
        assignedBy: req.user!.id,
      });
      return res.status(201).json(assignment);
    } catch (err) { next(err); }
  });

  app.delete("/api/mentor-assignments/:id", requireRole("admin"), async (req, res, next) => {
    try {
      await storage.deleteAssignment(parseInt(req.params.id as string));
      return res.json({ message: "Assignment removed" });
    } catch (err) { next(err); }
  });

  app.get("/api/messages/:partnerId", requireAuth, async (req, res, next) => {
    try {
      const partnerId = parseInt(req.params.partnerId as string);
      const userId = req.user!.id;

      if (req.user!.role === "admin") {
        return res.status(403).json({ message: "Admins cannot access chat" });
      }

      const assignments = req.user!.role === "patient"
        ? await storage.getAssignmentsByPatient(userId)
        : await storage.getAssignmentsByMentor(userId);

      const isAssigned = assignments.some(
        a => a.mentorId === partnerId || a.patientId === partnerId
      );
      if (!isAssigned) return res.status(403).json({ message: "Not assigned to this user" });

      const msgs = await storage.getMessages(userId, partnerId);

      // For non-text messages attach the first chat_attachment record
      const messagesWithAttachments = await Promise.all(
        msgs.map(async (msg) => {
          if (msg.messageType === "text") return { ...msg, attachment: null };
          const attachments = await storage.getChatAttachmentsByMessage(msg.id);
          const a = attachments[0] ?? null;
          return {
            ...msg,
            attachment: a
              ? { url: a.fileUrl, fileName: a.fileName, type: a.type, durationSeconds: a.durationSeconds }
              : null,
          };
        }),
      );

      return res.json(messagesWithAttachments);
    } catch (err) { next(err); }
  });

  app.post("/api/messages/:partnerId", requireAuth, async (req, res, next) => {
    try {
      const partnerId = parseInt(req.params.partnerId as string);
      const userId = req.user!.id;
      const { content, messageType, attachmentId } = req.body;

      if (req.user!.role === "admin") {
        return res.status(403).json({ message: "Admins cannot send messages" });
      }

      if (!content?.trim()) return res.status(400).json({ message: "Content is required" });

      const assignments = req.user!.role === "patient"
        ? await storage.getAssignmentsByPatient(userId)
        : await storage.getAssignmentsByMentor(userId);

      const isAssigned = assignments.some(
        a => a.mentorId === partnerId || a.patientId === partnerId
      );
      if (!isAssigned) return res.status(403).json({ message: "Not assigned to this user" });

      const message = await storage.createMessage({
        senderId: userId,
        receiverId: partnerId,
        content: content.trim(),
        messageType: messageType ?? "text",
      });

      // Link the pre-uploaded attachment to this message
      if (attachmentId) {
        await storage.linkAttachmentToMessage(Number(attachmentId), message.id);
      }

      return res.status(201).json(message);
    } catch (err) { next(err); }
  });

  app.post("/api/reports", requireAuth, async (req, res, next) => {
    try {
      const { messageId, reason } = req.body;
      if (!messageId || !reason) return res.status(400).json({ message: "messageId and reason are required" });
      const report = await storage.createReport({
        reportedBy: req.user!.id,
        messageId,
        reason,
      });
      return res.status(201).json(report);
    } catch (err) { next(err); }
  });

  app.get("/api/reports", requireRole("admin"), async (req, res, next) => {
    try {
      const allReports = await storage.getReports();
      return res.json(allReports);
    } catch (err) { next(err); }
  });

  app.get("/api/resources", requireAuth, async (req, res, next) => {
    try {
      const phase = req.query.phase as string | undefined;
      if (phase) {
        const res2 = await storage.getResourcesByPhase(phase);
        return res.json(res2);
      }
      const all = await storage.getResources();
      return res.json(all);
    } catch (err) { next(err); }
  });

  app.post("/api/resources", requireRole("admin"), async (req, res, next) => {
    try {
      const resource = await storage.createResource({
        ...req.body,
        createdBy: req.user!.id,
      });
      return res.status(201).json(resource);
    } catch (err) { next(err); }
  });

  app.post("/api/admin/create-user", requireRole("admin"), async (req, res, next) => {
    try {
      const { email, name, role } = req.body;
      if (!email || !name || !role) {
        return res.status(400).json({ message: "email, name, and role are required" });
      }
      if (role !== "patient" && role !== "mentor") {
        return res.status(400).json({ message: "role must be 'patient' or 'mentor'" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already exists" });

      // Auto-generate username: firstname.lastname.YYYY, with collision suffix
      const year = new Date().getFullYear();
      const nameParts = name.trim().toLowerCase().split(/\s+/);
      const baseUsername = nameParts.length >= 2
        ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}.${year}`
        : `${nameParts[0]}.${year}`;

      let username = baseUsername;
      let suffix = 2;
      while (await storage.getUserByUsername(username)) {
        username = `${baseUsername}.${suffix}`;
        suffix++;
      }

      // Auto-generate temporary password (8-char hex)
      const tempPassword = randomBytes(4).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);

      const user = await storage.createUser({
        email,
        name,
        username,
        password: hashedPassword,
        role,
        status: "pending",
        mustChangePassword: true,
      });

      if (role === "patient") {
        await storage.upsertPatientPhase({
          patientId: user.id,
          currentPhase: "Pre-Consult & Decision",
          lastUpdatedBy: req.user!.id,
        });
      }

      await storage.createAuditLog({
        actorId: req.user!.id,
        action: "create_user",
        targetId: user.id,
        details: `Created ${role} account for ${email}`,
      });

      const { password: _, ...safeUser } = user;
      return res.status(201).json({ ...safeUser, tempPassword });
    } catch (err) { next(err); }
  });

  app.patch("/api/admin/users/:id/status", requireRole("admin"), async (req, res, next) => {
    try {
      const targetId = parseInt(req.params.id as string);
      const { status } = req.body;
      if (!["active", "inactive", "pending"].includes(status)) {
        return res.status(400).json({ message: "status must be 'active', 'inactive', or 'pending'" });
      }

      const updated = await storage.updateUser(targetId, { status });
      if (!updated) return res.status(404).json({ message: "User not found" });

      await storage.createAuditLog({
        actorId: req.user!.id,
        action: "update_user_status",
        targetId,
        details: `Set status to '${status}'`,
      });

      const { password: _, ...safeUser } = updated;
      return res.json(safeUser);
    } catch (err) { next(err); }
  });

  app.delete("/api/admin/users/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const targetId = parseInt(req.params.id as string);

      const target = await storage.getUser(targetId);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (targetId === req.user!.id) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      // Remove all mentor assignments involving this user before deactivating
      await storage.deleteAssignmentsByUserId(targetId);

      await storage.updateUser(targetId, { status: "inactive" });

      await storage.createAuditLog({
        actorId: req.user!.id,
        action: "deactivate_user",
        targetId,
        details: `Deactivated user ${target.email}`,
      });

      return res.json({ message: "User deactivated" });
    } catch (err) { next(err); }
  });

  return httpServer;
}
