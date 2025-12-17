import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PipelinePage from "@/pages/pipeline";
import TodayPage from "@/pages/today";
import BlockersPage from "@/pages/blockers";
import { StoreProvider } from "@/lib/data";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PipelinePage} />
      <Route path="/today" component={TodayPage} />
      <Route path="/blockers" component={BlockersPage} />
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
