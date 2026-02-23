# RFC Mentor App

## Overview
Full-stack application for Rejuvenating Fertility Clinic (RFC) connecting clinic-assigned graduate patient mentors with newly onboarded fertility patients. Three user roles: Patient (mentee), Mentor, and Clinic Admin/Coordinator.

## Tech Stack
- **Frontend**: React 19, Vite 7, Tailwind v4, wouter routing, Framer Motion, Radix UI/shadcn components
- **Backend**: Express 5, Passport.js (local strategy), express-session with memorystore
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Email/password with scrypt hashing, session-based, role-based access control

## Project Structure
```
client/src/
├── pages/
│   ├── AuthPage.tsx          # Login/Register page
│   ├── patient/PatientDashboard.tsx
│   ├── mentor/MentorDashboard.tsx
│   ├── admin/AdminDashboard.tsx
│   └── shared/
│       ├── ChatView.tsx       # 1:1 messaging with report feature
│       ├── JourneyHub.tsx     # Phase-specific resources
│       ├── Settings.tsx       # User settings, Contact Clinic, Logout
│       └── PolicyPages.tsx    # About, Privacy, Terms, Guidelines
├── hooks/
│   ├── useAuth.tsx            # Auth context provider
│   └── use-toast.ts
├── components/
│   ├── MobileLayout.tsx       # Mobile-first responsive layout
│   └── ui/                    # shadcn/Radix UI components
├── lib/
│   ├── queryClient.ts         # TanStack Query setup
│   └── mockData.ts            # Legacy mock data (mostly unused now)
└── App.tsx                    # Root routing with auth guards

server/
├── index.ts                   # Express server entry point
├── auth.ts                    # Passport setup, login/register/logout routes
├── routes.ts                  # All API routes with role-based middleware
├── storage.ts                 # Database storage interface (PostgreSQL via Drizzle)
├── db.ts                      # Database connection
├── seed.ts                    # Initial seed data
├── static.ts                  # Static file serving (production)
└── vite.ts                    # Vite dev server integration

shared/
└── schema.ts                  # Drizzle schema + types (users, assignments, phases, messages, reports, resources)
```

## Database Schema
- **users**: id, name, email, password, role (patient/mentor/admin), status, createdAt
- **mentor_assignments**: mentorId, patientId, assignedBy, assignedAt
- **patient_phases**: patientId, currentPhase, lastUpdatedBy, lastUpdatedAt
- **messages**: senderId, receiverId, content, createdAt
- **reports**: reportedBy, messageId, reason, status
- **resources**: title, phase, category, type, summary, content, readTime, createdBy

## Treatment Phases
Pre-Consult & Decision → Testing & Diagnosis → Stimulation → Retrieval & Fertilization → Transfer Prep → Two Week Wait → Early Pregnancy → Postpartum/Graduation

## Demo Accounts (Seeded)
- Admin: admin@rfc.com / admin123
- Mentor: rachel@rfc.com / mentor123
- Patient: sarah@example.com / patient123

## API Routes
- POST /api/register, /api/login, /api/logout, GET /api/user (auth)
- GET /api/patient/dashboard (patient's phase, mentor, user info)
- GET /api/mentor/mentees (mentor's assigned patients)
- GET /api/admin/overview (all patients, mentors, assignments)
- PATCH /api/patients/:id/phase (admin updates phase)
- POST /api/mentor-assignments, DELETE /api/mentor-assignments/:id
- GET/POST /api/messages/:partnerId (1:1 chat between assigned pairs)
- POST /api/reports (report a message)
- GET /api/resources (journey hub content)
- POST /api/admin/create-user (admin creates user accounts)
- GET /api/users/:id (get user info)

## Design
- Primary green (#2d9f5e), orange accent (#ff6b35)
- Outfit display font, Plus Jakarta Sans UI font
- Mobile-first responsive layout with desktop phone-frame preview
- RFC logo on auth screen

## Safety Features
- "Mentors provide peer support, not medical advice" disclaimer in chat
- Contact Clinic emergency button in settings
- Message reporting feature in chat
- Admin-only phase management
- Chat restricted to assigned mentor-patient pairs only
