import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import type { Request, RequestHandler } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-jwt-refresh-secret-change-in-production";

export interface JwtPayload {
  userId: number;
}

export function generateAccessToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401; message: string };

/**
 * Shared helper used by both authenticateToken and requireRole.
 * Checks Bearer JWT first, then falls through to Passport session.
 */
export async function resolveAuthUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      const user = await storage.getUser(payload.userId);
      if (!user) return { ok: false, status: 401, message: "Not authenticated" };
      return { ok: true, user };
    } catch {
      return { ok: false, status: 401, message: "Invalid or expired token" };
    }
  }

  if (req.isAuthenticated() && req.user) {
    return { ok: true, user: req.user as User };
  }

  return { ok: false, status: 401, message: "Not authenticated" };
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  const result = await resolveAuthUser(req);
  if (!result.ok) {
    res.status(result.status).json({ message: result.message });
    return;
  }
  req.user = result.user;
  next();
};
