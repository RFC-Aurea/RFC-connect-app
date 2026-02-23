import MobileLayout from "@/components/MobileLayout";
import { journeyResources, treatmentPhases } from "@/lib/mockData";
import { BookOpen, PlayCircle, FileText, ChevronRight, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function JourneyHub() {
  const patientPhaseTitle = "Stimulation"; // Mocking patient phase for display

  return (
    <MobileLayout title="Journey Hub" showBack>
      <div className="p-6 space-y-8">
        
        {/* Red Flags Global Warning */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive mb-1">When to Call the Clinic</h3>
            <p className="text-sm text-foreground/80 mb-2 leading-relaxed">
              If you experience fever over 101°F, severe abdominal pain, or heavy bleeding, contact RFC immediately. Mentors cannot assist with emergencies.
            </p>
            <button className="text-xs font-semibold text-destructive uppercase tracking-wide">View Full Guide &rarr;</button>
          </div>
        </div>

        {/* Current Phase Highlight */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-4">Your Current Phase</h2>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <h3 className="font-semibold text-lg text-primary mb-2">{patientPhaseTitle} Phase</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Resources curated for your current treatment step based on your clinic profile.
            </p>
            <div className="space-y-3">
              {journeyResources.filter(r => r.phase === 'stimulation').map((resource) => (
                <div key={resource.id} className="bg-card rounded-xl p-3 flex gap-3 items-center shadow-sm border border-border">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
                    {resource.type === 'video' ? <PlayCircle className="w-5 h-5" /> : 
                     resource.type === 'guide' ? <BookOpen className="w-5 h-5" /> : 
                     <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary font-medium mb-0.5 uppercase tracking-wider">{resource.category}</p>
                    <p className="text-sm font-medium leading-snug mb-1 truncate">{resource.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{resource.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Phases */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-4">Explore All Phases</h2>
          <div className="space-y-2">
            {treatmentPhases.map((phase) => (
              <motion.div 
                whileTap={{ scale: 0.98 }}
                key={phase.id} 
                className="bg-card border border-border shadow-sm rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-medium text-xs">
                    {treatmentPhases.indexOf(phase) + 1}
                  </div>
                  <span className="font-medium text-sm">{phase.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}