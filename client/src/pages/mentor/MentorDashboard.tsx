import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageCircle, Users, AlertCircle } from "lucide-react";
import { mockMentors, mockPatients } from "@/lib/mockData";
import { motion } from "framer-motion";

export default function MentorDashboard() {
  const [, setLocation] = useLocation();
  const mentor = mockMentors[0]; // Rachel
  const assignedPatients = mockPatients.filter(p => p.mentorId === mentor.id);

  return (
    <MobileLayout title="Mentor Dashboard">
      <div className="p-6 space-y-6">
        
        {/* Mentor Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-semibold text-foreground">{mentor.currentMentees} <span className="text-sm font-normal text-muted-foreground">/ {mentor.capacity}</span></p>
            <p className="text-sm text-muted-foreground font-medium">Active Mentees</p>
          </div>
          <div className="bg-secondary rounded-2xl p-4 border border-secondary-foreground/10">
            <MessageCircle className="w-5 h-5 text-secondary-foreground mb-2" />
            <p className="text-2xl font-semibold text-foreground">1</p>
            <p className="text-sm text-muted-foreground font-medium">Unread Message</p>
          </div>
        </div>

        {/* Guidelines Reminder */}
        <div className="bg-card border border-border shadow-sm rounded-2xl p-4 flex gap-4">
          <div className="mt-0.5">
            <AlertCircle className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Mentor Guidelines</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Remember, you are here for peer support. Always redirect medical questions to the patient's RFC care team.
            </p>
            <Button variant="link" className="h-auto p-0 text-xs text-primary">Review Full Guidelines</Button>
          </div>
        </div>

        {/* Assigned Patients List */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Your Mentees</h3>
          <div className="space-y-3">
            {assignedPatients.map((patient, i) => (
              <motion.div 
                key={patient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border shadow-sm rounded-2xl p-4 flex items-center justify-between"
                onClick={() => setLocation(`/chat/${patient.id}`)}
                role="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {patient.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold">{patient.name}</h4>
                    <p className="text-xs text-muted-foreground">Phase: {patient.phase}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}