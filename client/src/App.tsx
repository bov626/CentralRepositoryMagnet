import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PipelinePage from "@/pages/pipeline";
import OnboardingPage from "@/pages/onboarding";
import TodayPage from "@/pages/today";
import SettingsPage from "@/pages/settings";
import FathomPage from "@/pages/fathom";
import { StoreProvider } from "@/lib/data";
import { useEffect } from "react";

function CalendarAutoSync() {
  const qc = useQueryClient();
  
  useEffect(() => {
    fetch("/api/calendar/sync", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.created > 0) {
          qc.invalidateQueries({ queryKey: ["leads"] });
          console.log(`Auto-synced ${data.created} leads from calendar`);
        }
      })
      .catch(err => {
        console.log("Calendar sync skipped:", err.message);
      });
  }, []);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PipelinePage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/today" component={TodayPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/fathom" component={FathomPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <CalendarAutoSync />
          <Toaster />
          <Router />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
