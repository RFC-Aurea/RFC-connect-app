import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageCircle, Phone, Video, FileText, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { mockPatients } from "@/lib/mockData";

export default function PatientDashboard() {
  const [, setLocation] = useLocation();
  const patient = mockPatients[0]; // Sarah

  return (
    <MobileLayout title="My Dashboard">
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
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">Current Phase</p>
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
          <div className="bg-card border border-border shadow-sm rounded-2xl p-5">
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
                onClick={() => setLocation("/chat/m1")}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-medium shadow-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
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
            <h3 className="font-semibold text-lg">Journey Hub</h3>
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => setLocation("/journey")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div 
            onClick={() => setLocation("/journey")}
            className="bg-secondary/50 rounded-2xl p-5 border border-secondary cursor-pointer hover:bg-secondary/70 transition-colors"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shadow-sm shrink-0 text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Stimulation Guide</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">Understanding your meds, managing side effects, and emotional support.</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </MobileLayout>
  );
}