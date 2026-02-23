import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import logo_with_white_back from "@assets/logo_with_white_back.png";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await login(email, password);
      } else {
        if (!name.trim()) {
          toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        user = await register({ name, email, password, role });
      }
      const routes: Record<string, string> = { patient: "/patient", mentor: "/mentor", admin: "/admin" };
      setLocation(routes[user.role] || "/patient");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message?.includes("401") ? "Invalid email or password" : err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout hideHeader>
      <div className="flex flex-col h-full px-6 pt-10 pb-8 bg-gradient-to-b from-primary/5 to-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 border border-border overflow-hidden">
              <img src={logo_with_white_back} alt="RFC Logo" className="w-full h-full object-cover" onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground mb-1" data-testid="text-app-title">
              RFC Mentor App
            </h1>
            <p className="text-sm font-medium text-secondary tracking-widest uppercase">Rejuvenating Fertility Center</p>
          </div>

          {isLogin && (
            <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-4 mb-6">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Clinic-assigned peer mentors</strong> for your fertility treatment support.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">1:1 messaging</strong> with someone who has been there.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Guided journey & emotional support</strong> every step of the way.
                  </span>
                </li>
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-center">{isLogin ? "Sign In" : "Create Account"}</h2>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 rounded-xl"
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-12 rounded-xl" data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient (Mentee)</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="admin">Clinic Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 rounded-xl"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 rounded-xl"
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold shadow-sm"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary font-medium"
              data-testid="button-toggle-auth"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>

          {isLogin && (
            <div className="mt-5 bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Demo Accounts:</p>
              <p className="text-[10px] text-muted-foreground">admin@rfc.com | rachel@rfc.com | sarah@example.com</p>
              <p className="text-[10px] text-muted-foreground">Password: admin123 / mentor123 / patient123</p>
            </div>
          )}
        </motion.div>

        <div className="text-center mt-auto pt-4 flex flex-col gap-2">
          <div className="flex justify-center gap-4 text-xs text-primary/70 font-medium">
            <button onClick={() => setLocation("/about")} data-testid="link-about">About</button>
            <button onClick={() => setLocation("/privacy")} data-testid="link-privacy">Privacy Policy</button>
            <button onClick={() => setLocation("/terms")} data-testid="link-terms">Terms of Use</button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
