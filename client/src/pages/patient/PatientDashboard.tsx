import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageCircle, FileText, ArrowRight, Activity, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { mockPatients, journeyResources } from "@/lib/mockData";

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  const patient = mockPatients[0]; // Sarah

  const currentPhaseResources = journeyResources.filter(r => r.phase === patient.phase.toLowerCase().replace(/[\s/]/g, '-') || r.phase === 'all');

  const headerAction = (
    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/settings")}>
      <SettingsIcon className="w-5 h-5 text-foreground" />
    </Button>
  );

  return (
    <MobileLayout title="My Dashboard" headerAction={headerAction}>
      <div className="p-6 space-y-8">
        
        {/* Welcome & Phase */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl font-display font-semibold mb-2">Hi, {patient.name.split(' ')[0]}</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">Current Phase</p>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Updated by Clinic</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{patient.phase}</h3>
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
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Your Mentor</h3>
          </div>
          <div className="bg-card border border-border shadow-sm rounded-2xl p-5 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setLocation("/chat/m1")}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-display font-semibold text-xl">
                RM
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">Rachel Moore</h4>
                <p className="text-sm text-muted-foreground">RFC Graduate & Mentor</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={(e) => { e.stopPropagation(); setLocation("/chat/m1"); }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-medium shadow-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Rachel
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Journey Hub Quick Access */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Recommended for You</h3>
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => setLocation("/journey")}>
              Journey Hub <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {currentPhaseResources.slice(0, 2).map((resource) => (
              <div 
                key={resource.id}
                onClick={() => setLocation("/journey")}
                className={`rounded-2xl p-4 border cursor-pointer transition-colors flex gap-4 ${resource.type === 'alert' ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10' : 'bg-card border-border shadow-sm hover:border-primary/40'}`}
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