import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["patient", "mentor", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "dismissed"]);

export const TREATMENT_PHASES = [
  "Pre-Consult & Decision",
  "Testing & Diagnosis",
  "Stimulation",
  "Retrieval & Fertilization",
  "Transfer Prep",
  "Two Week Wait",
  "Early Pregnancy",
  "Postpartum/Graduation",
] as const;

export type TreatmentPhase = (typeof TREATMENT_PHASES)[number];

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  apnsDeviceToken: text("apns_device_token"),
  profileImageUrl: text("profile_image_url"),
  role: roleEnum("role").notNull().default("patient"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentorAssignments = pgTable("mentor_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  mentorId: integer("mentor_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const patientPhases = pgTable("patient_phases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  patientId: integer("patient_id").notNull().references(() => users.id).unique(),
  currentPhase: text("current_phase").notNull().default("Pre-Consult & Decision"),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageDeletions = pgTable("message_deletions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer("message_id").notNull().references(() => messages.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportedBy: integer("reported_by").notNull().references(() => users.id),
  messageId: integer("message_id").notNull().references(() => messages.id),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  phase: text("phase").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull().default("article"),
  summary: text("summary").notNull(),
  content: text("content"),
  readTime: text("read_time"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatAttachments = pgTable("chat_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer("message_id").references(() => messages.id),
  type: text("type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  dataJson: text("data_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoCalls = pgTable("video_calls", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assignmentId: integer("assignment_id").notNull().references(() => mentorAssignments.id),
  roomName: text("room_name").notNull(),
  roomUrl: text("room_url").notNull(),
  status: text("status").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  initiatedBy: integer("initiated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  actorId: integer("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetId: integer("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type MentorAssignment = typeof mentorAssignments.$inferSelect;
export type PatientPhase = typeof patientPhases.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageDeletion = typeof messageDeletions.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ChatAttachment = typeof chatAttachments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type VideoCall = typeof videoCalls.$inferSelect;

export type InsertUser = {
  name: string;
  email: string;
  password: string;
  username?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  mustChangePassword?: boolean;
  apnsDeviceToken?: string | null;
  profileImageUrl?: string | null;
  role?: "patient" | "mentor" | "admin";
  status?: "active" | "inactive" | "pending";
};

export type InsertMentorAssignment = {
  mentorId: number;
  patientId: number;
  assignedBy: number;
};

export type InsertPatientPhase = {
  patientId: number;
  currentPhase: string;
  lastUpdatedBy?: number | null;
};

export type InsertMessage = {
  senderId: number;
  receiverId: number;
  content: string;
  messageType?: string;
};

export type InsertReport = {
  reportedBy: number;
  messageId: number;
  reason: string;
};

export type InsertResource = {
  title: string;
  phase: string;
  category: string;
  type?: string;
  summary: string;
  content?: string | null;
  readTime?: string | null;
  createdBy?: number | null;
};

export type InsertRefreshToken = {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
};

export type InsertChatAttachment = {
  messageId?: number | null;
  type: string;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
};

export type InsertNotification = {
  userId: number;
  type: string;
  title: string;
  body: string;
  read?: boolean;
  dataJson?: string | null;
};

export type InsertAuditLog = {
  actorId: number;
  action: string;
  targetId?: number | null;
  details?: string | null;
};

export type InsertVideoCall = {
  assignmentId: number;
  roomName: string;
  roomUrl: string;
  status: "active" | "ended" | "scheduled";
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  initiatedBy: number;
};
