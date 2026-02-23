import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TREATMENT_PHASES } from "@shared/schema";
import { UserPlus, CheckCircle2, Edit2, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type PatientData = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  phase: string;
  mentorId: number | null;
  assignmentId: number | null;
};

type MentorData = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

type OverviewData = {
  patients: PatientData[];
  mentors: MentorData[];
  assignments: any[];
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/overview"],
  });

  const patients = data?.patients ?? [];
  const mentors = data?.mentors ?? [];

  const unassigned = patients.filter(p => !p.mentorId);
  const assigned = patients.filter(p => p.mentorId);

  const createUserMutation = useMutation({
    mutationFn: async (body: { email: string; password: string; name: string; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/create-user", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ patientId, phase }: { patientId: number; phase: string }) => {
      const res = await apiRequest("PATCH", `/api/patients/${patientId}/phase`, { phase });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  const assignMentorMutation = useMutation({
    mutationFn: async (body: { mentorId: number; patientId: number }) => {
      const res = await apiRequest("POST", "/api/mentor-assignments", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  const headerAction = (
    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/settings")} data-testid="button-settings">
      <SettingsIcon className="w-5 h-5 text-foreground" />
    </Button>
  );

  const handleAssign = (patientId: number) => {
    if (!selectedMentorId) {
      toast({ title: "Select a Mentor", description: "Please choose a mentor from the dropdown." });
      return;
    }
    assignMentorMutation.mutate(
      { mentorId: parseInt(selectedMentorId), patientId },
      {
        onSuccess: () => {
          setSelectedMentorId("");
          toast({ title: "Mentor Assigned", description: "Patient has been successfully matched." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const openEditDialog = (patient: any, isNew = false) => {
    setEditingPatient({ ...patient });
    setIsNewPatient(isNew);
    if (isNew) {
      setNewEmail("");
      setNewPassword("Welcome123!");
    }
    setIsDialogOpen(true);
  };

  const handleSavePatient = () => {
    if (!editingPatient) return;

    if (isNewPatient) {
      if (!newEmail) {
        toast({ title: "Email Required", description: "Please enter an email address.", variant: "destructive" });
        return;
      }
      createUserMutation.mutate(
        { email: newEmail, password: newPassword || "Welcome123!", name: editingPatient.name, role: "patient" },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            toast({ title: "Patient Created", description: `${editingPatient.name} has been added.` });
          },
          onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      updatePhaseMutation.mutate(
        { patientId: editingPatient.id, phase: editingPatient.phase },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            toast({ title: "Profile Updated", description: `${editingPatient.name}'s phase has been updated.` });
          },
          onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="Clinic Admin" headerAction={headerAction}>
        <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Clinic Admin" headerAction={headerAction}>
      <div className="p-6 space-y-6">
        
        <Button
          data-testid="button-add-patient"
          className="w-full bg-primary text-primary-foreground h-12 rounded-xl mb-2 shadow-sm"
          onClick={() => {
            openEditDialog({ name: "New Patient", phase: "Pre-Consult & Decision" }, true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Patient Profile
        </Button>

        <div>
          <h3 className="font-semibold text-lg mb-4 text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Needs Mentor Assignment
          </h3>
          
          {unassigned.length === 0 ? (
            <div className="text-center p-6 bg-card border border-border rounded-2xl" data-testid="text-all-assigned">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All patients are assigned to mentors.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassigned.map(patient => (
                <div key={patient.id} className="bg-card border border-border shadow-sm rounded-2xl p-4" data-testid={`card-unassigned-patient-${patient.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold" data-testid={`text-patient-name-${patient.id}`}>{patient.name}</h4>
                      <p className="text-sm text-muted-foreground">Phase: {patient.phase}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(patient)} className="h-8 w-8" data-testid={`button-edit-patient-${patient.id}`}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                      <SelectTrigger data-testid={`select-mentor-${patient.id}`}>
                        <SelectValue placeholder="Select a mentor" />
                      </SelectTrigger>
                      <SelectContent>
                        {mentors.map(mentor => (
                          <SelectItem key={mentor.id} value={String(mentor.id)} data-testid={`select-mentor-option-${mentor.id}`}>
                            {mentor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl"
                      onClick={() => handleAssign(patient.id)}
                      disabled={assignMentorMutation.isPending}
                      data-testid={`button-assign-mentor-${patient.id}`}
                    >
                      {assignMentorMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Assign Mentor
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-4">Assigned Patients</h3>
          <div className="space-y-3">
            {assigned.map(patient => {
              const mentor = mentors.find(m => m.id === patient.mentorId);
              return (
                <div key={patient.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between" data-testid={`card-assigned-patient-${patient.id}`}>
                  <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm" data-testid={`text-patient-name-${patient.id}`}>{patient.name}</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{patient.phase}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Matched with: {mentor?.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(patient)} className="h-8 w-8 ml-2 shrink-0" data-testid={`button-edit-patient-${patient.id}`}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[90%] sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">{isNewPatient ? "Add New Patient" : "Edit Patient Profile"}</DialogTitle>
            </DialogHeader>
            
            {editingPatient && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input 
                    value={editingPatient.name} 
                    onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                    data-testid="input-patient-name"
                  />
                </div>

                {isNewPatient && (
                  <>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="patient@example.com"
                        data-testid="input-patient-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input 
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Default password"
                        data-testid="input-patient-password"
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label>Current Treatment Phase</Label>
                  <Select 
                    value={editingPatient.phase} 
                    onValueChange={val => setEditingPatient({...editingPatient, phase: val})}
                  >
                    <SelectTrigger data-testid="select-treatment-phase">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {TREATMENT_PHASES.map(phase => (
                        <SelectItem key={phase} value={phase} data-testid={`select-phase-option-${phase}`}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Updating this will automatically adjust the patient's Journey Hub content.</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button
                onClick={handleSavePatient}
                className="bg-primary text-primary-foreground"
                disabled={createUserMutation.isPending || updatePhaseMutation.isPending}
                data-testid="button-save"
              >
                {(createUserMutation.isPending || updatePhaseMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isNewPatient ? "Create Patient" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MobileLayout>
  );
}