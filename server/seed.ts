import { db } from "./db";
import { users, resources, patientPhases, mentorAssignments } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const seedResources = [
  { title: "Questions to Ask at Your First Consult", phase: "Pre-Consult & Decision", category: "Preparation", type: "guide", summary: "A checklist of questions to bring to your initial RFC meeting.", readTime: "4 min read" },
  { title: "Understanding Your HSG and Bloodwork", phase: "Testing & Diagnosis", category: "Diagnostic", type: "article", summary: "What these common tests look for and how to prepare.", readTime: "5 min read" },
  { title: "Injection Anxiety? Here's How I Coped", phase: "Stimulation", category: "Medications", type: "video", summary: "Tips from mentors on managing the fear of needles.", readTime: "4 min watch" },
  { title: "Navigating Stims Brain & Bloat", phase: "Stimulation", category: "Emotional Support", type: "article", summary: "How to stay comfortable during ovarian stimulation. Always consult RFC if bloat is severe.", readTime: "6 min read" },
  { title: "Egg Retrieval Day Checklist", phase: "Retrieval & Fertilization", category: "Procedure", type: "guide", summary: "What to pack, wear, and expect on the big day.", readTime: "3 min read" },
  { title: "Preparing for Your Embryo Transfer", phase: "Transfer Prep", category: "Preparation", type: "video", summary: "Mental and physical preparation for a frozen or fresh transfer.", readTime: "7 min watch" },
  { title: "Surviving the Two-Week Wait (TWW)", phase: "Two Week Wait", category: "Emotional Support", type: "article", summary: "Distraction strategies and managing symptom spotting.", readTime: "8 min read" },
  { title: "Beta Testing & Early Ultrasounds", phase: "Early Pregnancy", category: "Milestones", type: "guide", summary: "What HCG levels mean and when to expect your first heartbeat scan.", readTime: "5 min read" },
  { title: "Graduating from RFC: Next Steps", phase: "Postpartum/Graduation", category: "Graduation", type: "article", summary: "Transitioning your care to your OBGYN.", readTime: "4 min read" },
];

export async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@rfc.com"));
  if (existingAdmin.length > 0) {
    console.log("Database already seeded.");
    return;
  }

  const adminPass = await hashPassword("admin123");
  const mentorPass = await hashPassword("mentor123");
  const patientPass = await hashPassword("patient123");

  const [admin] = await db.insert(users).values({
    name: "Clinic Admin",
    email: "admin@rfc.com",
    password: adminPass,
    role: "admin",
    status: "active",
  }).returning();

  const [mentor1] = await db.insert(users).values({
    name: "Rachel Moore",
    email: "rachel@rfc.com",
    password: mentorPass,
    role: "mentor",
    status: "active",
  }).returning();

  const [mentor2] = await db.insert(users).values({
    name: "Chloe Davis",
    email: "chloe@rfc.com",
    password: mentorPass,
    role: "mentor",
    status: "active",
  }).returning();

  const [patient1] = await db.insert(users).values({
    name: "Sarah Jenkins",
    email: "sarah@example.com",
    password: patientPass,
    role: "patient",
    status: "active",
  }).returning();

  const [patient2] = await db.insert(users).values({
    name: "Emily Chen",
    email: "emily@example.com",
    password: patientPass,
    role: "patient",
    status: "active",
  }).returning();

  await db.insert(patientPhases).values([
    { patientId: patient1.id, currentPhase: "Stimulation", lastUpdatedBy: admin.id },
    { patientId: patient2.id, currentPhase: "Pre-Consult & Decision", lastUpdatedBy: admin.id },
  ]);

  await db.insert(mentorAssignments).values({
    mentorId: mentor1.id,
    patientId: patient1.id,
    assignedBy: admin.id,
  });

  for (const resource of seedResources) {
    await db.insert(resources).values({
      ...resource,
      createdBy: admin.id,
    });
  }

  console.log("Seed complete!");
  console.log(`Admin: admin@rfc.com / admin123`);
  console.log(`Mentor: rachel@rfc.com / mentor123`);
  console.log(`Patient: sarah@example.com / patient123`);
}
