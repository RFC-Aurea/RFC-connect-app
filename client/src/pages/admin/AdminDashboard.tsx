import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { mockPatients, mockMentors } from "@/lib/mockData";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [patients, setPatients] = useState(mockPatients);
  const { toast } = useToast();

  const unassigned = patients.filter(p => !p.mentorId);
  const assigned = patients.filter(p => p.mentorId);

  const handleAssign = (patientId: string) => {
    // Mock assignment to mentor 1
    setPatients(prev => 
      prev.map(p => p.id === patientId ? { ...p, mentorId: "m1" } : p)
    );
    toast({
      title: "Mentor Assigned",
      description: "Patient has been successfully matched with Rachel Moore.",
    });
  };

  return (
    <MobileLayout title="Clinic Admin">
      <div className="p-6 space-y-6">
        
        <div>
          <h3 className="font-semibold text-lg mb-4 text-destructive flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Needs Assignment
          </h3>
          
          {unassigned.length === 0 ? (
            <div className="text-center p-6 bg-card border border-border rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All patients are assigned to mentors.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassigned.map(patient => (
                <div key={patient.id} className="bg-card border border-border shadow-sm rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">{patient.name}</h4>
                      <p className="text-sm text-muted-foreground">Phase: {patient.phase}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl"
                    onClick={() => handleAssign(patient.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Mentor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-4">Recently Assigned</h3>
          <div className="space-y-3">
            {assigned.map(patient => {
              const mentor = mockMentors.find(m => m.id === patient.mentorId);
              return (
                <div key={patient.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between opacity-70">
                  <div>
                    <h4 className="font-medium text-sm">{patient.name}</h4>
                    <p className="text-xs text-muted-foreground">Matched with: {mentor?.name}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}