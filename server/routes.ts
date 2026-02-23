import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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
      return res.json(msgs);
    } catch (err) { next(err); }
  });

  app.post("/api/messages/:partnerId", requireAuth, async (req, res, next) => {
    try {
      const partnerId = parseInt(req.params.partnerId as string);
      const userId = req.user!.id;
      const { content } = req.body;

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
      });
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
      const { email, password, name, role } = req.body;
      if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already exists" });

      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        status: "active",
      });

      if (role === "patient") {
        await storage.upsertPatientPhase({
          patientId: user.id,
          currentPhase: "Pre-Consult & Decision",
          lastUpdatedBy: req.user!.id,
        });
      }

      const { password: _, ...safeUser } = user;
      return res.status(201).json(safeUser);
    } catch (err) { next(err); }
  });

  return httpServer;
}
