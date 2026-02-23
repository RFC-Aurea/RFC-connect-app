import MobileLayout from "@/components/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { TREATMENT_PHASES } from "@shared/schema";
import type { Resource } from "@shared/schema";
import { BookOpen, PlayCircle, FileText, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function ResourceIcon({ type }: { type: string }) {
  if (type === "video") return <PlayCircle className="w-5 h-5" />;
  if (type === "guide") return <BookOpen className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div
      data-testid={`resource-card-${resource.id}`}
      className="bg-card rounded-xl p-3 flex gap-3 items-center shadow-sm border border-border"
    >
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0">
        <ResourceIcon type={resource.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-primary font-medium mb-0.5 uppercase tracking-wider">{resource.category}</p>
        <p data-testid={`resource-title-${resource.id}`} className="text-sm font-medium leading-snug mb-1 truncate">{resource.title}</p>
        <p className="text-xs text-muted-foreground truncate">{resource.summary}</p>
      </div>
    </div>
  );
}

export default function JourneyHub() {
  const { user } = useAuth();

  const { data: resources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<{ currentPhase: string }>({
    queryKey: ["/api/patient/dashboard"],
    enabled: user?.role === "patient",
  });

  const isLoading = resourcesLoading || (user?.role === "patient" && dashboardLoading);
  const isMentor = user?.role === "mentor";
  const currentPhase = dashboard?.currentPhase ?? TREATMENT_PHASES[0];

  const resourcesByPhase = TREATMENT_PHASES.reduce<Record<string, Resource[]>>((acc, phase) => {
    acc[phase] = resources.filter((r) => r.phase === phase);
    return acc;
  }, {} as Record<string, Resource[]>);

  return (
    <MobileLayout title="Journey Hub" showBack>
      <div className="p-6 space-y-8" data-testid="journey-hub-container">

        <div data-testid="red-flags-banner" className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive mb-1">When to Call the Clinic</h3>
            <p className="text-sm text-foreground/80 mb-2 leading-relaxed">
              If you experience fever over 101°F, severe abdominal pain, or heavy bleeding, contact RFC immediately. Mentors cannot assist with emergencies.
            </p>
            <button data-testid="button-view-full-guide" className="text-xs font-semibold text-destructive uppercase tracking-wide">View Full Guide &rarr;</button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {!isMentor && (
              <div data-testid="current-phase-section">
                <h2 className="text-xl font-display font-semibold mb-4">Your Current Phase</h2>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
                  <h3 data-testid="text-current-phase" className="font-semibold text-lg text-primary mb-2">{currentPhase} Phase</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Resources curated for your current treatment step based on your clinic profile.
                  </p>
                  <div className="space-y-3">
                    {(resourcesByPhase[currentPhase] ?? []).map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                    {(resourcesByPhase[currentPhase] ?? []).length === 0 && (
                      <p data-testid="text-no-resources" className="text-sm text-muted-foreground text-center py-4">No resources available for this phase yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div data-testid="all-phases-section">
              <h2 className="text-xl font-display font-semibold mb-4">
                {isMentor ? "All Phase Resources" : "Explore All Phases"}
              </h2>
              <div className="space-y-2">
                {TREATMENT_PHASES.map((phase, index) => (
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    key={phase}
                    data-testid={`phase-item-${index}`}
                    className={`bg-card border shadow-sm rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors ${
                      !isMentor && phase === currentPhase
                        ? "border-primary/40 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-medium text-xs">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm">{phase}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{(resourcesByPhase[phase] ?? []).length} resources</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    {isMentor && (resourcesByPhase[phase] ?? []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(resourcesByPhase[phase] ?? []).map((resource) => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </MobileLayout>
  );
}
