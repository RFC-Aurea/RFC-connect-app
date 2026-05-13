import { eq, and, or, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, mentorAssignments, patientPhases, messages, reports, resources, refreshTokens,
  notifications, auditLog, chatAttachments,
  type User, type InsertUser,
  type MentorAssignment, type InsertMentorAssignment,
  type PatientPhase, type InsertPatientPhase,
  type Message, type InsertMessage,
  type Report, type InsertReport,
  type Resource, type InsertResource,
  type RefreshToken, type InsertRefreshToken,
  type Notification, type InsertNotification,
  type AuditLog, type InsertAuditLog,
  type ChatAttachment, type InsertChatAttachment,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  createAssignment(assignment: InsertMentorAssignment): Promise<MentorAssignment>;
  getAssignmentsByMentor(mentorId: number): Promise<MentorAssignment[]>;
  getAssignmentsByPatient(patientId: number): Promise<MentorAssignment[]>;
  deleteAssignment(id: number): Promise<void>;
  getAllAssignments(): Promise<MentorAssignment[]>;

  getPatientPhase(patientId: number): Promise<PatientPhase | undefined>;
  upsertPatientPhase(phase: InsertPatientPhase): Promise<PatientPhase>;

  getMessage(id: number): Promise<Message | undefined>;
  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<Report[]>;

  getResources(): Promise<Resource[]>;
  getResourcesByPhase(phase: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;

  getUserByUsername(username: string): Promise<User | undefined>;
  deleteAssignmentsByUserId(userId: number): Promise<void>;

  createRefreshToken(data: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshTokenByHash(hash: string): Promise<RefreshToken | undefined>;
  deleteRefreshTokenByHash(hash: string): Promise<void>;
  deleteRefreshTokensByUserId(userId: number): Promise<void>;

  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  createChatAttachment(attachment: InsertChatAttachment): Promise<ChatAttachment>;
  getChatAttachment(id: number): Promise<ChatAttachment | undefined>;
  getChatAttachmentsByMessage(messageId: number): Promise<ChatAttachment[]>;
  linkAttachmentToMessage(attachmentId: number, messageId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async createAssignment(assignment: InsertMentorAssignment): Promise<MentorAssignment> {
    const [created] = await db.insert(mentorAssignments).values(assignment).returning();
    return created;
  }

  async getAssignmentsByMentor(mentorId: number): Promise<MentorAssignment[]> {
    return db.select().from(mentorAssignments).where(eq(mentorAssignments.mentorId, mentorId));
  }

  async getAssignmentsByPatient(patientId: number): Promise<MentorAssignment[]> {
    return db.select().from(mentorAssignments).where(eq(mentorAssignments.patientId, patientId));
  }

  async deleteAssignment(id: number): Promise<void> {
    await db.delete(mentorAssignments).where(eq(mentorAssignments.id, id));
  }

  async getAllAssignments(): Promise<MentorAssignment[]> {
    return db.select().from(mentorAssignments);
  }

  async getPatientPhase(patientId: number): Promise<PatientPhase | undefined> {
    const [phase] = await db.select().from(patientPhases).where(eq(patientPhases.patientId, patientId));
    return phase;
  }

  async upsertPatientPhase(phase: InsertPatientPhase): Promise<PatientPhase> {
    const existing = await this.getPatientPhase(phase.patientId);
    if (existing) {
      const [updated] = await db.update(patientPhases)
        .set({ currentPhase: phase.currentPhase, lastUpdatedBy: phase.lastUpdatedBy, lastUpdatedAt: new Date() })
        .where(eq(patientPhases.patientId, phase.patientId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(patientPhases).values(phase).returning();
    return created;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async getMessages(userId1: number, userId2: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async getReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async getResources(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(resources.phase);
  }

  async getResourcesByPhase(phase: string): Promise<Resource[]> {
    return db.select().from(resources).where(eq(resources.phase, phase));
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async createRefreshToken(data: InsertRefreshToken): Promise<RefreshToken> {
    const [created] = await db.insert(refreshTokens).values(data).returning();
    return created;
  }

  async getRefreshTokenByHash(hash: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    return token;
  }

  async deleteRefreshTokenByHash(hash: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
  }

  async deleteRefreshTokensByUserId(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async deleteAssignmentsByUserId(userId: number): Promise<void> {
    await db.delete(mentorAssignments).where(
      or(
        eq(mentorAssignments.mentorId, userId),
        eq(mentorAssignments.patientId, userId),
      ),
    );
  }

  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLog).values(entry).returning();
    return created;
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const query = db.select().from(auditLog).orderBy(desc(auditLog.createdAt));
    if (limit) return query.limit(limit);
    return query;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async createChatAttachment(attachment: InsertChatAttachment): Promise<ChatAttachment> {
    const [created] = await db.insert(chatAttachments).values(attachment).returning();
    return created;
  }

  async getChatAttachment(id: number): Promise<ChatAttachment | undefined> {
    const [att] = await db.select().from(chatAttachments).where(eq(chatAttachments.id, id));
    return att;
  }

  async getChatAttachmentsByMessage(messageId: number): Promise<ChatAttachment[]> {
    return db.select().from(chatAttachments).where(eq(chatAttachments.messageId, messageId));
  }

  async linkAttachmentToMessage(attachmentId: number, messageId: number): Promise<void> {
    await db
      .update(chatAttachments)
      .set({ messageId })
      .where(eq(chatAttachments.id, attachmentId));
  }
}

export const storage = new DatabaseStorage();
