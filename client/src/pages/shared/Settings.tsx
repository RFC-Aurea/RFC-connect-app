import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Mail, FileText, Info, Shield, HeartHandshake, LogOut, ChevronRight, User } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  return (
    <MobileLayout title="Settings & Support" showBack>
      <div className="p-6 space-y-8" data-testid="settings-container">

        {user && (
          <div data-testid="user-profile-section">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profile</h3>
            <div className="bg-card border border-border shadow-sm rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p data-testid="text-user-name" className="font-semibold">{user.name}</p>
                  <p data-testid="text-user-email" className="text-sm text-muted-foreground">{user.email}</p>
                  <span data-testid="text-user-role" className="inline-block mt-1 text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5 capitalize">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div data-testid="support-section">
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
                  <Button data-testid="button-call-clinic" size="sm" className="bg-primary text-primary-foreground h-8 rounded-lg flex-1">
                    Call Clinic
                  </Button>
                  <Button data-testid="button-message-portal" size="sm" variant="outline" className="h-8 rounded-lg flex-1">
                    Message Portal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-testid="about-section">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">About App</h3>
          <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden">
            <SettingsItem
              icon={<Info className="w-5 h-5" />}
              label="About RFC Mentor App"
              onClick={() => setLocation("/about")}
              testId="link-about"
            />
            <SettingsItem
              icon={<HeartHandshake className="w-5 h-5" />}
              label="Community Guidelines"
              onClick={() => setLocation("/guidelines")}
              testId="link-guidelines"
            />
            <SettingsItem
              icon={<Shield className="w-5 h-5" />}
              label="Privacy Policy"
              onClick={() => setLocation("/privacy")}
              testId="link-privacy"
            />
            <SettingsItem
              icon={<FileText className="w-5 h-5" />}
              label="Terms of Use"
              onClick={() => setLocation("/terms")}
              hasBorder={false}
              testId="link-terms"
            />
          </div>
        </div>

        <Button
          data-testid="button-logout"
          variant="outline"
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>

      </div>
    </MobileLayout>
  );
}

function SettingsItem({ icon, label, onClick, hasBorder = true, testId }: any) {
  return (
    <div
      data-testid={testId}
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
