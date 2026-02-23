export const mockPatients = [
  {
    id: "p1",
    name: "Sarah Jenkins",
    phase: "Stimulation",
    avatar: "SJ",
    mentorId: "m1",
    lastActive: "2 hours ago",
    nextAppointment: "Oct 24 - Monitoring Ultrasound",
  },
  {
    id: "p2",
    name: "Emily Chen",
    phase: "Pre-Consult",
    avatar: "EC",
    mentorId: null, // Needs assignment
    lastActive: "1 day ago",
    nextAppointment: "Oct 26 - Initial Consult",
  },
  {
    id: "p3",
    name: "Jessica Taylor",
    phase: "Retrieval Prep",
    avatar: "JT",
    mentorId: "m1",
    lastActive: "10 mins ago",
    nextAppointment: "Oct 22 - Trigger Shot Instruction",
  },
];

export const mockMentors = [
  {
    id: "m1",
    name: "Rachel Moore",
    status: "Active",
    avatar: "RM",
    capacity: 3,
    currentMentees: 2,
    experience: "IVF, Endometriosis",
  },
  {
    id: "m2",
    name: "Chloe Davis",
    status: "Available",
    avatar: "CD",
    capacity: 5,
    currentMentees: 1,
    experience: "IUI, PCOS",
  },
];

export const treatmentPhases = [
  { id: "pre-consult", title: "Pre-Consult & Decision Making" },
  { id: "testing", title: "Testing & Diagnosis" },
  { id: "stimulation", title: "Stimulation Phase" },
  { id: "retrieval", title: "Retrieval & Fertilization" },
  { id: "transfer", title: "Transfer Prep & Procedure" },
  { id: "tww", title: "The Two-Week Wait (TWW)" },
  { id: "early-pregnancy", title: "Early Pregnancy" },
];

export const journeyResources = [
  {
    id: "r1",
    category: "Medications",
    title: "Injection Anxiety? Here's How I Coped",
    type: "article",
    readTime: "4 min read",
  },
  {
    id: "r2",
    category: "Emotional Support",
    title: "Navigating Relationships During Treatment",
    type: "video",
    readTime: "12 min watch",
  },
  {
    id: "r3",
    category: "Milestones",
    title: "What to Expect at Your First Monitoring Appointment",
    type: "guide",
    readTime: "6 min read",
  },
];

export const mockChatHistory = [
  {
    id: "msg1",
    senderId: "m1",
    senderName: "Rachel",
    text: "Hi Sarah! I saw you have your monitoring appointment coming up. How are you feeling about the stims so far?",
    timestamp: "10:30 AM",
    isMentor: true,
  },
  {
    id: "msg2",
    senderId: "p1",
    senderName: "Sarah",
    text: "Honestly, a bit overwhelmed. The Menopur burned a little last night. Is that normal?",
    timestamp: "10:35 AM",
    isMentor: false,
  },
  {
    id: "msg3",
    senderId: "m1",
    senderName: "Rachel",
    text: "Totally normal! It happened to me too. One trick I learned was to let the medication sit at room temp for about 10 mins before injecting, and wipe the needle tip. Always check with your nurse if it's severe though! 💕",
    timestamp: "10:38 AM",
    isMentor: true,
  }
];