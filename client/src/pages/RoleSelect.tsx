import { useLocation } from "wouter";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Heart, User, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import logo_with_white_back from "@assets/logo_with_white_back.png";

export default function RoleSelect() {
  const [, setLocation] = useLocation();

  return (
    <MobileLayout hideHeader>
      <div className="flex flex-col h-full px-6 pt-12 pb-12 bg-gradient-to-b from-primary/5 to-background">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          {/* Logo & App Name */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 border border-border overflow-hidden">
              <img src={logo_with_white_back} alt="RFC Logo" className="w-full h-full object-cover" onError={(e) => {
                 // Fallback if image doesn't load immediately
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerHTML = '<div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Heart class="w-6 h-6 text-primary" /></div>';
              }} />
            </div>
            
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-1">
              RFC Mentor App
            </h1>
            <p className="text-sm font-medium text-secondary tracking-widest uppercase">
              Rejuvenating Fertility Clinic
            </p>
          </div>

          {/* Value Proposition */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 mb-8">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Clinic-assigned peer mentors</strong> for your fertility treatment support.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Chat, voice, and video</strong> connections with someone who has been there.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Guided journey & emotional support</strong> every step of the way.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">Login Options</h2>
            
            <RoleCard 
              icon={<User className="w-5 h-5" />}
              title="Patient (Mentee)"
              onClick={() => setLocation("/patient")}
              color="bg-primary"
              textColor="text-primary"
            />
            
            <RoleCard 
              icon={<Heart className="w-5 h-5" />}
              title="Mentor"
              onClick={() => setLocation("/mentor")}
              color="bg-secondary"
              textColor="text-secondary"
            />
            
            <RoleCard 
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Clinic Admin"
              onClick={() => setLocation("/admin")}
              color="bg-foreground"
              textColor="text-foreground"
            />
          </div>
        </motion.div>
        
        <div className="text-center mt-auto pt-6 flex flex-col gap-2">
          <div className="flex justify-center gap-4 text-xs text-primary/70 font-medium">
            <button onClick={() => setLocation("/about")}>About</button>
            <button onClick={() => setLocation("/privacy")}>Privacy Policy</button>
            <button onClick={() => setLocation("/terms")}>Terms of Use</button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

function RoleCard({ icon, title, onClick, textColor }: any) {
  return (
    <motion.button
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="w-full text-left bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-4 group"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-muted ${textColor}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
    </motion.button>
  );
}