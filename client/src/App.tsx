import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PipelinePage from "@/pages/pipeline";
import OnboardingPage from "@/pages/onboarding";
import OnboardingFormPage from "@/pages/onboarding-form";
import TodayPage from "@/pages/today";
import FathomPage from "@/pages/fathom";
import { StoreProvider } from "@/lib/data";
import { useEffect } from "react";
import { AuthProvider, ProtectedRoute } from "@/hooks/use-auth";

function FathomAutoImport() {
  const qc = useQueryClient();

  useEffect(() => {
    fetch("/api/fathom/auto-import", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.imported > 0) {
          qc.invalidateQueries({ queryKey: ["leads"] });
        }
      })
      .catch(() => {});
  }, []);

  return null;
}

function ProtectedDashboard() {
  return (
    <ProtectedRoute>
      <FathomAutoImport />
      <Switch>
        <Route path="/" component={PipelinePage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/today" component={TodayPage} />
        <Route path="/fathom" component={FathomPage} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
  );
}

function Router() {
  const [location] = window.location.pathname === '/questions1' ? ['/questions1'] : [window.location.pathname];
  
  if (location === '/questions1') {
    return <OnboardingFormPage />;
  }
  
  return <ProtectedDashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <StoreProvider>
            <Toaster />
            <Router />
          </StoreProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

console.log("App.tsx loaded successfully");

export default App;
