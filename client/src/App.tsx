import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

import AuthPage from "@/pages/AuthPage";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import MentorDashboard from "@/pages/mentor/MentorDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ChatView from "@/pages/shared/ChatView";
import JourneyHub from "@/pages/shared/JourneyHub";
import Settings from "@/pages/shared/Settings";
import { About, PrivacyPolicy, TermsOfUse, CommunityGuidelines } from "@/pages/shared/PolicyPages";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <AuthPage />;
  const route = user.role === "admin" ? "/admin"
    : user.role === "mentor" ? "/mentor"
    : "/patient";
  return <Redirect to={route} />;
}

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/about" component={About} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfUse} />
        <Route path="/guidelines" component={CommunityGuidelines} />
        <Route>{() => <AuthPage />}</Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={RoleRedirect} />

      <Route path="/patient" component={PatientDashboard} />
      <Route path="/mentor" component={MentorDashboard} />
      <Route path="/admin" component={AdminDashboard} />

      <Route path="/chat/:userId" component={ChatView} />
      <Route path="/journey" component={JourneyHub} />
      <Route path="/settings" component={Settings} />

      <Route path="/about" component={About} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfUse} />
      <Route path="/guidelines" component={CommunityGuidelines} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <AuthenticatedRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
