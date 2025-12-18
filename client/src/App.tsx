import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PipelinePage from "@/pages/pipeline";
import OnboardingPage from "@/pages/onboarding";
import TodayPage from "@/pages/today";
import BlockersPage from "@/pages/blockers";
import SettingsPage from "@/pages/settings";
import { StoreProvider } from "@/lib/data";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PipelinePage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/today" component={TodayPage} />
      <Route path="/blockers" component={BlockersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <Toaster />
          <Router />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
