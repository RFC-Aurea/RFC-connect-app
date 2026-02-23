import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
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
  password: text("password").notNull(),
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

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export type User = typeof users.$inferSelect;
export type MentorAssignment = typeof mentorAssignments.$inferSelect;
export type PatientPhase = typeof patientPhases.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Resource = typeof resources.$inferSelect;

export type InsertUser = {
  name: string;
  email: string;
  password: string;
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
