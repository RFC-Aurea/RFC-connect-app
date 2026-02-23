import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Phone, Mail, FileText, Info, Shield, HeartHandshake, LogOut, ChevronRight } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();

  return (
    <MobileLayout title="Settings & Support" showBack>
      <div className="p-6 space-y-8">
        
        {/* Contact Clinic */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Support</h3>
          <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Contact RFC Care Team</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3">For medical questions, protocol changes, or urgent symptoms.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary text-primary-foreground h-8 rounded-lg flex-1">
                    Call Clinic
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg flex-1">
                    Message Portal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal & Info */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About App</h3>
          <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
            <SettingsItem 
              icon={<Info className="w-5 h-5" />} 
              label="About RFC Mentor App" 
              onClick={() => setLocation("/about")} 
            />
            <SettingsItem 
              icon={<HeartHandshake className="w-5 h-5" />} 
              label="Community Guidelines" 
              onClick={() => setLocation("/guidelines")} 
            />
            <SettingsItem 
              icon={<Shield className="w-5 h-5" />} 
              label="Privacy Policy" 
              onClick={() => setLocation("/privacy")} 
            />
            <SettingsItem 
              icon={<FileText className="w-5 h-5" />} 
              label="Terms of Use" 
              onClick={() => setLocation("/terms")} 
              hasBorder={false}
            />
          </div>
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => setLocation("/")}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>

      </div>
    </MobileLayout>
  );
}

function SettingsItem({ icon, label, onClick, hasBorder = true }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${hasBorder ? 'border-b border-border' : ''}`}
    >
      <div className="flex items-center gap-3 text-foreground">
        <div className="text-primary">{icon}</div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}