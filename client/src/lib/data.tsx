import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type PipelineType = "jumpseat" | "community";

export type JumpseatStage = 
  | "backlog"
  | "pitch-call"
  | "decision-pending"
  | "nudge-scheduled"
  | "future-client"
  | "closed"
  | "disqualified";

export type CommunityStage =
  | "backlog"
  | "to-pitch"
  | "would-buy";

export interface Lead {
  id: string;
  name: string;
  company?: string | null;
  linkedIn?: string | null;
  email?: string | null;
  tags: string[];
  pipeline: PipelineType;
  stage: string;
  nextFollowUp?: string | null; // ISO Date
  actionNeeded: boolean;
  
  // Details
  summary?: string | null;
  keyTakeaways?: string[] | null;
  blocker?: string | null;
  decisionTrigger?: string | null;
  followUpAngle?: string | null;
  recordingLink?: string | null;
  history: any; // JSONB field
  createdAt: Date;
  updatedAt: Date;
}

export interface Blocker {
  id: string;
  text: string;
  category: "price" | "timing" | "spouse" | "trust" | "logistics" | "other";
  count: number;
  response: string;
  exampleLeadIds: string[];
  createdAt: Date;
}

interface StoreContextType {
  leads: Lead[];
  blockers: Blocker[];
  isLoading: boolean;
  emailingLead: Lead | null;
  setEmailingLead: (lead: Lead | null) => void;
  addLead: (lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, pipeline: PipelineType, stage: string) => void;
  addBlocker: (blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">) => void;
  incrementBlocker: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [emailingLead, setEmailingLead] = useState<Lead | null>(null);

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json() as Promise<Lead[]>;
    },
  });

  // Fetch blockers
  const { data: blockers = [], isLoading: blockersLoading } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (!res.ok) throw new Error("Failed to fetch blockers");
      return res.json() as Promise<Blocker[]>;
    },
  });

  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lead,
          history: [{ date: new Date().toISOString(), action: "Created" }],
        }),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Move lead mutation
  const moveLeadMutation = useMutation({
    mutationFn: async ({ id, pipeline, stage }: { id: string; pipeline: PipelineType; stage: string }) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) throw new Error("Lead not found");

      const updatedHistory = Array.isArray(lead.history) ? lead.history : [];
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipeline,
          stage,
          history: [...updatedHistory, { date: new Date().toISOString(), action: `Moved to ${stage}` }],
        }),
      });
      if (!res.ok) throw new Error("Failed to move lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Add blocker mutation
  const addBlockerMutation = useMutation({
    mutationFn: async (blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">) => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blocker,
          count: 1,
          exampleLeadIds: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create blocker");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
    },
  });

  // Increment blocker mutation
  const incrementBlockerMutation = useMutation({
    mutationFn: async (id: string) => {
      const blocker = blockers.find((b) => b.id === id);
      if (!blocker) throw new Error("Blocker not found");

      const res = await fetch(`/api/blockers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: blocker.count + 1 }),
      });
      if (!res.ok) throw new Error("Failed to increment blocker");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
    },
  });

  const addLead = (lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">) => {
    addLeadMutation.mutate(lead);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    updateLeadMutation.mutate({ id, updates });
  };

  const moveLead = (id: string, pipeline: PipelineType, stage: string) => {
    moveLeadMutation.mutate({ id, pipeline, stage });
  };

  const addBlocker = (blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">) => {
    addBlockerMutation.mutate(blocker);
  };

  const incrementBlocker = (id: string) => {
    incrementBlockerMutation.mutate(id);
  };

  return (
    <StoreContext.Provider
      value={{ 
        leads, 
        blockers, 
        isLoading: leadsLoading || blockersLoading,
        emailingLead,
        setEmailingLead,
        addLead, 
        updateLead, 
        moveLead, 
        addBlocker, 
        incrementBlocker 
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
