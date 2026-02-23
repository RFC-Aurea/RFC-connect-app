import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Page imports
import RoleSelect from "@/pages/RoleSelect";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import MentorDashboard from "@/pages/mentor/MentorDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ChatView from "@/pages/shared/ChatView";
import JourneyHub from "@/pages/shared/JourneyHub";
import Settings from "@/pages/shared/Settings";
import { About, PrivacyPolicy, TermsOfUse, CommunityGuidelines } from "@/pages/shared/PolicyPages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleSelect} />
      
      {/* Patient Routes */}
      <Route path="/patient" component={PatientDashboard} />
      
      {/* Mentor Routes */}
      <Route path="/mentor" component={MentorDashboard} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Shared Routes */}
      <Route path="/chat/:userId" component={ChatView} />
      <Route path="/journey" component={JourneyHub} />
      <Route path="/settings" component={Settings} />
      
      {/* Policy Routes */}
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;