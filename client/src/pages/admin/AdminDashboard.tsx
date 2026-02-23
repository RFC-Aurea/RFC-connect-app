import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mockPatients, mockMentors, treatmentPhases } from "@/lib/mockData";
import { UserPlus, CheckCircle2, Edit2, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [patients, setPatients] = useState(mockPatients);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const unassigned = patients.filter(p => !p.mentorId);
  const assigned = patients.filter(p => p.mentorId);

  const headerAction = (
    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/settings")}>
      <SettingsIcon className="w-5 h-5 text-foreground" />
    </Button>
  );

  const handleAssign = (patientId: string) => {
    setPatients(prev => 
      prev.map(p => p.id === patientId ? { ...p, mentorId: "m1" } : p)
    );
    toast({
      title: "Mentor Assigned",
      description: "Patient has been successfully matched with Rachel Moore.",
    });
  };

  const openEditDialog = (patient: any) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  };

  const handleSavePatient = () => {
    if (editingPatient) {
      setPatients(prev => 
        prev.map(p => p.id === editingPatient.id ? editingPatient : p)
      );
      setIsDialogOpen(false);
      toast({
        title: "Profile Updated",
        description: `${editingPatient.name}'s profile and phase have been updated.`,
      });
    }
  };

  return (
    <MobileLayout title="Clinic Admin" headerAction={headerAction}>
      <div className="p-6 space-y-6">
        
        {/* Create new patient (mock) */}
        <Button className="w-full bg-primary text-primary-foreground h-12 rounded-xl mb-2 shadow-sm" onClick={() => {
            const newPatient = {
                id: `p${Date.now()}`,
                name: "New Patient",
                phase: "Pre-consult",
                avatar: "NP",
                mentorId: null,
                lastActive: "Just now",
                nextAppointment: "Pending"
            };
            openEditDialog(newPatient);
        }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Patient Profile
        </Button>

        <div>
          <h3 className="font-semibold text-lg mb-4 text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Needs Mentor Assignment
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
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(patient)} className="h-8 w-8">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button 
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl"
                    onClick={() => handleAssign(patient.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Mentor (Rachel)
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-4">Assigned Patients</h3>
          <div className="space-y-3">
            {assigned.map(patient => {
              const mentor = mockMentors.find(m => m.id === patient.mentorId);
              return (
                <div key={patient.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{patient.name}</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{patient.phase}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Matched with: {mentor?.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(patient)} className="h-8 w-8 ml-2 shrink-0">
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Patient Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[90%] sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle>Edit Patient Profile</DialogTitle>
            </DialogHeader>
            
            {editingPatient && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input 
                    value={editingPatient.name} 
                    onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Current Treatment Phase</Label>
                  <Select 
                    value={editingPatient.phase} 
                    onValueChange={val => setEditingPatient({...editingPatient, phase: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentPhases.map(phase => (
                        <SelectItem key={phase.id} value={phase.title}>
                          {phase.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Updating this will automatically adjust the patient's Journey Hub content.</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePatient} className="bg-primary text-primary-foreground">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MobileLayout>
  );
}