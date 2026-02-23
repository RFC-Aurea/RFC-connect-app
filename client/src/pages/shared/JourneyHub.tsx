import MobileLayout from "@/components/MobileLayout";
import { journeyResources, treatmentPhases } from "@/lib/mockData";
import { BookOpen, PlayCircle, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function JourneyHub() {
  return (
    <MobileLayout title="Journey Hub" showBack>
      <div className="p-6 space-y-8">
        
        {/* Current Phase Highlight */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-4">Your Current Phase</h2>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <h3 className="font-semibold text-lg text-primary mb-2">Stimulation Phase</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Resources curated for your current treatment step, focusing on medication management and emotional wellbeing.
            </p>
            <div className="space-y-3">
              {journeyResources.map((resource, i) => (
                <div key={resource.id} className="bg-card rounded-xl p-3 flex gap-3 items-center shadow-sm border border-border">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
                    {resource.type === 'video' ? <PlayCircle className="w-5 h-5" /> : 
                     resource.type === 'guide' ? <BookOpen className="w-5 h-5" /> : 
                     <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-primary font-medium mb-0.5">{resource.category}</p>
                    <p className="text-sm font-medium truncate">{resource.title}</p>
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
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
              >
                <span className="font-medium text-sm">{phase.title}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}