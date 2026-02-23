import { useLocation } from "wouter";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Heart, User, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <MobileLayout hideHeader>
      <div className="flex flex-col h-full px-6 pt-20 pb-12 bg-gradient-to-b from-primary/5 to-background">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
            <Heart className="w-8 h-8" />
          </div>
          
          <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground mb-3">
            RFC<br/>MentorConnect
          </h1>
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
            Your guided journey through fertility treatment with peer support.
          </p>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Select Prototype View</h2>
            
            <RoleCard 
              icon={<User className="w-6 h-6" />}
              title="Patient (Mentee)"
              description="Access your journey hub and connect with your mentor."
              onClick={() => setLocation("/patient")}
              color="bg-primary"
              textColor="text-primary"
            />
            
            <RoleCard 
              icon={<Heart className="w-6 h-6" />}
              title="Mentor"
              description="Support your assigned patients."
              onClick={() => setLocation("/mentor")}
              color="bg-accent"
              textColor="text-accent-foreground"
            />
            
            <RoleCard 
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Clinic Admin"
              description="Assign mentors to new patients."
              onClick={() => setLocation("/admin")}
              color="bg-foreground"
              textColor="text-foreground"
            />
          </div>
        </motion.div>
        
        <div className="text-center mt-auto pt-8">
          <p className="text-xs text-muted-foreground">
            A prototype for Rejuvenating Fertility Clinic
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}

function RoleCard({ icon, title, description, onClick, color, textColor }: any) {
  return (
    <motion.button
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="w-full text-left bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-secondary ${textColor}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}