export const treatmentPhases = [
  { id: "pre-consult", title: "Pre-consult" },
  { id: "testing", title: "Testing/Diagnosis" },
  { id: "stimulation", title: "Stimulation" },
  { id: "retrieval", title: "Retrieval/Fertilization" },
  { id: "transfer", title: "Transfer Prep/Procedure" },
  { id: "tww", title: "Two-week wait" },
  { id: "early-pregnancy", title: "Early Pregnancy" },
  { id: "postpartum", title: "Postpartum/Graduation" }
];

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
    phase: "Pre-consult",
    avatar: "EC",
    mentorId: null, // Needs assignment
    lastActive: "1 day ago",
    nextAppointment: "Oct 26 - Initial Consult",
  },
  {
    id: "p3",
    name: "Jessica Taylor",
    phase: "Transfer Prep/Procedure",
    avatar: "JT",
    mentorId: "m1",
    lastActive: "10 mins ago",
    nextAppointment: "Oct 22 - Mock Cycle Check",
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
    currentMentees: 0,
    experience: "IUI, PCOS",
  },
];

export const journeyResources = [
  // General / Global
  {
    id: "red-flags",
    category: "Important Safety Info",
    title: "Red Flags & When to Call the Clinic",
    type: "alert",
    readTime: "Important",
    phase: "all",
    summary: "Fever over 101, severe abdominal pain, heavy bleeding. Always confirm symptoms with your RFC care team.",
  },
  // Pre-consult
  {
    id: "r-pre-1",
    category: "Preparation",
    title: "Questions to Ask at Your First Consult",
    type: "guide",
    readTime: "4 min read",
    phase: "pre-consult",
    summary: "A checklist of questions to bring to your initial RFC meeting.",
  },
  // Testing
  {
    id: "r-test-1",
    category: "Diagnostic",
    title: "Understanding Your HSG and Bloodwork",
    type: "article",
    readTime: "5 min read",
    phase: "testing",
    summary: "What these common tests look for and how to prepare.",
  },
  // Stimulation
  {
    id: "r-stim-1",
    category: "Medications",
    title: "Injection Anxiety? Here's How I Coped",
    type: "video",
    readTime: "4 min watch",
    phase: "stimulation",
    summary: "Tips from mentors on managing the fear of needles.",
  },
  {
    id: "r-stim-2",
    category: "Emotional Support",
    title: "Navigating Stims Brain & Bloat",
    type: "article",
    readTime: "6 min read",
    phase: "stimulation",
    summary: "How to stay comfortable during ovarian stimulation. Always consult RFC if bloat is severe.",
  },
  // Retrieval
  {
    id: "r-ret-1",
    category: "Procedure",
    title: "Egg Retrieval Day Checklist",
    type: "guide",
    readTime: "3 min read",
    phase: "retrieval",
    summary: "What to pack, wear, and expect on the big day.",
  },
  // Transfer
  {
    id: "r-trans-1",
    category: "Preparation",
    title: "Preparing for Your Embryo Transfer",
    type: "video",
    readTime: "7 min watch",
    phase: "transfer",
    summary: "Mental and physical preparation for a frozen or fresh transfer.",
  },
  // TWW
  {
    id: "r-tww-1",
    category: "Emotional Support",
    title: "Surviving the Two-Week Wait (TWW)",
    type: "article",
    readTime: "8 min read",
    phase: "tww",
    summary: "Distraction strategies and managing symptom spotting.",
  },
  // Early Pregnancy
  {
    id: "r-ep-1",
    category: "Milestones",
    title: "Beta Testing & Early Ultrasounds",
    type: "guide",
    readTime: "5 min read",
    phase: "early-pregnancy",
    summary: "What HCG levels mean and when to expect your first heartbeat scan.",
  },
  // Postpartum
  {
    id: "r-post-1",
    category: "Graduation",
    title: "Graduating from RFC: Next Steps",
    type: "article",
    readTime: "4 min read",
    phase: "postpartum",
    summary: "Transitioning your care to your OBGYN.",
  }
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