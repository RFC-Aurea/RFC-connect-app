import { eq, and, or, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, mentorAssignments, patientPhases, messages, reports, resources,
  type User, type InsertUser,
  type MentorAssignment, type InsertMentorAssignment,
  type PatientPhase, type InsertPatientPhase,
  type Message, type InsertMessage,
  type Report, type InsertReport,
  type Resource, type InsertResource,
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

  getMessages(userId1: number, userId2: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<Report[]>;

  getResources(): Promise<Resource[]>;
  getResourcesByPhase(phase: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
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
}

export const storage = new DatabaseStorage();
