import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageCircle, FileText, ArrowRight, Activity, Settings as SettingsIcon, AlertTriangle, Loader2, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { journeyResources } from "@/lib/mockData";

type DashboardData = {
  user: { id: number; name: string; email: string; role: string };
  phase: string;
  mentor: { id: number; name: string } | null;
  assignmentId: number | null;
};

type Resource = {
  id: string | number;
  title: string;
  summary: string;
  category: string;
  type: string;
  phase: string;
};

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/patient/dashboard"],
  });

  const currentPhase = dashboard?.phase?.toLowerCase().replace(/[\s/]/g, '-') || '';

  const { data: apiResources } = useQuery<Resource[]>({
    queryKey: ["/api/resources", currentPhase],
    queryFn: async () => {
      if (!currentPhase) return [];
      const res = await fetch(`/api/resources?phase=${encodeURIComponent(currentPhase)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentPhase,
  });

  const currentPhaseResources = apiResources && apiResources.length > 0
    ? apiResources
    : journeyResources.filter(r => r.phase === currentPhase);

  const mentorInitials = dashboard?.mentor?.name
    ? dashboard.mentor.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '';

  const headerAction = (
    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/settings")} data-testid="button-settings">
      <SettingsIcon className="w-5 h-5 text-foreground" />
    </Button>
  );

  if (isLoading) {
    return (
      <MobileLayout title="My Dashboard" headerAction={headerAction}>
        <div className="flex items-center justify-center h-full" data-testid="loading-spinner">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  const firstName = dashboard?.user?.name?.split(' ')[0] || authUser?.name?.split(' ')[0] || 'there';

  return (
    <MobileLayout title="My Dashboard" headerAction={headerAction}>
      <div className="p-6 space-y-8">
        
        {/* Welcome & Phase */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="section-welcome"
        >
          <h2 className="text-3xl font-display font-semibold mb-2" data-testid="text-greeting">Hi, {firstName}</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4" data-testid="card-phase">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Current Phase</p>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Updated by Clinic</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-phase">{dashboard?.phase || 'Not set'}</h3>
              <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                <div className="bg-primary w-2/5 h-full rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mentor Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-mentor"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Your Mentor</h3>
          </div>
          {dashboard?.mentor ? (
            <div className="bg-card border border-border shadow-sm rounded-2xl p-5 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setLocation(`/chat/${dashboard.mentor!.id}`)} data-testid="card-mentor">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-display font-semibold text-xl" data-testid="text-mentor-initials">
                  {mentorInitials}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg" data-testid="text-mentor-name">{dashboard.mentor.name}</h4>
                  <p className="text-sm text-muted-foreground">RFC Graduate & Mentor</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={(e) => { e.stopPropagation(); setLocation(`/chat/${dashboard.mentor!.id}`); }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-medium shadow-sm"
                  data-testid="button-message-mentor"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message {dashboard.mentor.name.split(' ')[0]}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border shadow-sm rounded-2xl p-5" data-testid="card-no-mentor">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserX className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg" data-testid="text-no-mentor">No mentor assigned yet</h4>
                  <p className="text-sm text-muted-foreground">Your clinic will assign a mentor to you soon.</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Journey Hub Quick Access */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-journey"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Recommended for You</h3>
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => setLocation("/journey")} data-testid="button-journey-hub">
              Journey Hub <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {currentPhaseResources.slice(0, 2).map((resource) => (
              <div 
                key={resource.id}
                onClick={() => setLocation("/journey")}
                className={`rounded-2xl p-4 border cursor-pointer transition-colors flex gap-4 ${resource.type === 'alert' ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10' : 'bg-card border-border shadow-sm hover:border-primary/40'}`}
                data-testid={`card-resource-${resource.id}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${resource.type === 'alert' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-primary'}`}>
                  {resource.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <p className={`text-xs font-medium mb-0.5 ${resource.type === 'alert' ? 'text-destructive' : 'text-primary'}`}>{resource.category}</p>
                  <h4 className="font-semibold mb-1 leading-snug">{resource.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{resource.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </MobileLayout>
  );
}
