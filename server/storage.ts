import { eq, and, or, desc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, mentorAssignments, patientPhases, messages, messageDeletions, reports, resources, refreshTokens,
  notifications, auditLog, chatAttachments, videoCalls,
  type User, type InsertUser,
  type MentorAssignment, type InsertMentorAssignment,
  type PatientPhase, type InsertPatientPhase,
  type Message, type InsertMessage,
  type MessageDeletion,
  type Report, type InsertReport,
  type Resource, type InsertResource,
  type RefreshToken, type InsertRefreshToken,
  type Notification, type InsertNotification,
  type AuditLog, type InsertAuditLog,
  type ChatAttachment, type InsertChatAttachment,
  type VideoCall, type InsertVideoCall,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  clearDeviceTokenFromOtherUsers(token: string, currentUserId: number): Promise<void>;
  deleteUser(id: number, reassignAssignedBy: number): Promise<void>;

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
  softDeleteMessage(messageId: number): Promise<void>;
  createMessageDeletion(messageId: number, userId: number): Promise<MessageDeletion>;
  getMessageDeletionsForUser(userId: number): Promise<number[]>;
  markMessageRead(messageId: number): Promise<Message | undefined>;
  markAllMessagesRead(recipientId: number, senderId: number): Promise<void>;
  getUnreadCountForUser(userId: number): Promise<{ totalUnread: number; byPartner: Record<number, number> }>;
  getUnreadCountFromPartner(recipientId: number, senderId: number): Promise<number>;

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

  createVideoCall(call: InsertVideoCall): Promise<VideoCall>;
  getVideoCall(id: number): Promise<VideoCall | undefined>;
  updateVideoCall(id: number, data: Partial<InsertVideoCall>): Promise<VideoCall | undefined>;
  getVideoCallsByAssignment(assignmentId: number): Promise<VideoCall[]>;
  getUpcomingVideoCalls(userId: number): Promise<VideoCall[]>;
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

  async clearDeviceTokenFromOtherUsers(token: string, currentUserId: number): Promise<void> {
    await db
      .update(users)
      .set({ apnsDeviceToken: null })
      .where(and(eq(users.apnsDeviceToken, token), sql`${users.id} <> ${currentUserId}`));
  }

  async deleteUser(id: number, reassignAssignedBy: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Messages involving this user — collect ids so we can clean up dependents
      const userMessages = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
      const messageIds = userMessages.map(m => m.id);

      // Reports: by this user, or referencing messages we're about to delete
      await tx.delete(reports).where(eq(reports.reportedBy, id));
      // Drop any message_deletion rows authored by this user — the messages they
      // reference may still exist (sent by other users).
      await tx.delete(messageDeletions).where(eq(messageDeletions.userId, id));
      if (messageIds.length > 0) {
        await tx.delete(reports).where(inArray(reports.messageId, messageIds));
        await tx.delete(chatAttachments).where(inArray(chatAttachments.messageId, messageIds));
        await tx.delete(messageDeletions).where(inArray(messageDeletions.messageId, messageIds));
        await tx.delete(messages).where(inArray(messages.id, messageIds));
      }

      // Mentor assignments involving this user (mentor or patient)
      const userAssignments = await tx
        .select({ id: mentorAssignments.id })
        .from(mentorAssignments)
        .where(
          or(eq(mentorAssignments.mentorId, id), eq(mentorAssignments.patientId, id)),
        );
      const assignmentIds = userAssignments.map(a => a.id);

      // Video calls: initiated by this user, or for assignments being deleted
      await tx.delete(videoCalls).where(eq(videoCalls.initiatedBy, id));
      if (assignmentIds.length > 0) {
        await tx.delete(videoCalls).where(inArray(videoCalls.assignmentId, assignmentIds));
      }

      // Mentor assignments where this user is mentor or patient
      await tx.delete(mentorAssignments).where(
        or(eq(mentorAssignments.mentorId, id), eq(mentorAssignments.patientId, id)),
      );

      // Assignments this user (admin) created for others — reassign to current admin
      await tx
        .update(mentorAssignments)
        .set({ assignedBy: reassignAssignedBy })
        .where(eq(mentorAssignments.assignedBy, id));

      // Patient phase rows
      await tx.delete(patientPhases).where(eq(patientPhases.patientId, id));
      await tx
        .update(patientPhases)
        .set({ lastUpdatedBy: null })
        .where(eq(patientPhases.lastUpdatedBy, id));

      // Resources authored by this user — keep the resource, drop the author
      await tx
        .update(resources)
        .set({ createdBy: null })
        .where(eq(resources.createdBy, id));

      // Refresh tokens and notifications
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
      await tx.delete(notifications).where(eq(notifications.userId, id));

      // Audit log: nullify references where this user was the target, remove rows where actor
      await tx.update(auditLog).set({ targetId: null }).where(eq(auditLog.targetId, id));
      await tx.delete(auditLog).where(eq(auditLog.actorId, id));

      // Finally the user row itself
      await tx.delete(users).where(eq(users.id, id));
    });
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

  async softDeleteMessage(messageId: number): Promise<void> {
    await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, messageId));
  }

  async createMessageDeletion(messageId: number, userId: number): Promise<MessageDeletion> {
    const [created] = await db
      .insert(messageDeletions)
      .values({ messageId, userId })
      .returning();
    return created;
  }

  async getMessageDeletionsForUser(userId: number): Promise<number[]> {
    const rows = await db
      .select({ messageId: messageDeletions.messageId })
      .from(messageDeletions)
      .where(eq(messageDeletions.userId, userId));
    return rows.map(r => r.messageId);
  }

  async markMessageRead(messageId: number): Promise<Message | undefined> {
    const [updated] = await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.id, messageId), isNull(messages.readAt)))
      .returning();
    return updated;
  }

  async markAllMessagesRead(recipientId: number, senderId: number): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.receiverId, recipientId),
          eq(messages.senderId, senderId),
          isNull(messages.readAt),
          eq(messages.isDeleted, false),
        ),
      );
  }

  async getUnreadCountForUser(userId: number): Promise<{ totalUnread: number; byPartner: Record<number, number> }> {
    const rows = await db
      .select({
        senderId: messages.senderId,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          isNull(messages.readAt),
          eq(messages.isDeleted, false),
        ),
      )
      .groupBy(messages.senderId);

    const byPartner: Record<number, number> = {};
    let totalUnread = 0;
    for (const row of rows) {
      byPartner[row.senderId] = Number(row.count);
      totalUnread += Number(row.count);
    }
    return { totalUnread, byPartner };
  }

  async getUnreadCountFromPartner(recipientId: number, senderId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, recipientId),
          eq(messages.senderId, senderId),
          isNull(messages.readAt),
          eq(messages.isDeleted, false),
        ),
      );
    return Number(row?.count ?? 0);
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

  async createVideoCall(call: InsertVideoCall): Promise<VideoCall> {
    const [created] = await db.insert(videoCalls).values(call).returning();
    return created;
  }

  async getVideoCall(id: number): Promise<VideoCall | undefined> {
    const [call] = await db.select().from(videoCalls).where(eq(videoCalls.id, id));
    return call;
  }

  async updateVideoCall(id: number, data: Partial<InsertVideoCall>): Promise<VideoCall | undefined> {
    const [updated] = await db.update(videoCalls).set(data).where(eq(videoCalls.id, id)).returning();
    return updated;
  }

  async getVideoCallsByAssignment(assignmentId: number): Promise<VideoCall[]> {
    return db
      .select()
      .from(videoCalls)
      .where(eq(videoCalls.assignmentId, assignmentId))
      .orderBy(desc(videoCalls.createdAt));
  }

  async getUpcomingVideoCalls(userId: number): Promise<VideoCall[]> {
    // Active or scheduled calls in any assignment involving this user.
    const userAssignments = await db
      .select({ id: mentorAssignments.id })
      .from(mentorAssignments)
      .where(
        or(
          eq(mentorAssignments.mentorId, userId),
          eq(mentorAssignments.patientId, userId),
        ),
      );
    const assignmentIds = userAssignments.map(a => a.id);
    if (assignmentIds.length === 0) return [];

    return db
      .select()
      .from(videoCalls)
      .where(
        and(
          inArray(videoCalls.assignmentId, assignmentIds),
          or(eq(videoCalls.status, "active"), eq(videoCalls.status, "scheduled")),
        ),
      )
      .orderBy(videoCalls.scheduledAt);
  }
}

export const storage = new DatabaseStorage();
