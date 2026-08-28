import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Just add "appliers" to the existing union
export type PipelineType = "jumpseat" | "community" | "appliers";

export type JumpseatStage =
  | "backlog"
  | "pitch-call"
  | "decision-pending"
  | "future-client"
  | "closed"
  | "disqualified";

export type CommunityStage = "backlog" | "to-pitch" | "would-buy" | "bought";

// NEW: Applier hiring stages
export type ApplierStage = "interview" | "to_hire" | "onboarded";

export type OnboardingStage =
  | "future-cohort"
  | "call-1"
  | "call-2"
  | "document-creation"
  | "apply-ready";

export interface Lead {
  id: string;
  name: string;
  company?: string | null;
  linkedIn?: string | null;
  email?: string | null;
  tags: string[];
  pipeline: PipelineType;
  stage: string;
  onboardingStage?: OnboardingStage | null;
  nextFollowUp?: string | null; // ISO Date
  actionNeeded?: boolean;

  // Details
  summary?: string | null;
  keyTakeaways?: string[] | null;
  pitchAmount?: string | null;
  paymentPlan?: "upfront" | "fifty_fifty" | null;
  amountPaid?: number | null;
  source?: string | null;
  auditPdfUrl?: string | null;
  granolaNoteId?: string | null;
  boughtAt?: string | null;
  blocker?: string | null;
  decisionTrigger?: string | null;
  followUpAngle?: string | null;
  recordingLink?: string | null;
  calendarEventId?: string | null;
  fathomRecordingId?: number | null;
  actionItems?: string[] | null;
  actionItemDates?: Array<string | null> | null;
  cadenceAnchor?: string | null;
  emailThreads?: Array<{
    gmailThreadId: string;
    gmailMessageId: string;
    subject: string;
    summary: string;
    date: string;
    from: string;
    to: string;
    direction: "in" | "out";
  }> | null;
  coverLetterIdeas?: string | null;
  onboardingNotes?: string | null;
  resumePathA?: string | null;
  resumePathB?: string | null;
  coverLetterPathA?: string | null;
  coverLetterPathB?: string | null;
  archived?: boolean;
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
  addLead: (
    lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">,
  ) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  archiveLead: (id: string) => void;
  moveLead: (id: string, pipeline: PipelineType, stage: string) => void;
  moveOnboardingLead: (id: string, onboardingStage: OnboardingStage) => void;
  addBlocker: (
    blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">,
  ) => void;
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
    mutationFn: async (
      lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">,
    ) => {
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

  // Update lead mutation with optimistic updates
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Lead>;
    }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      queryClient.setQueryData<Lead[]>(["leads"], (old) => {
        if (!old) return old;
        return old.map((lead) =>
          lead.id === id ? { ...lead, ...updates } : lead,
        );
      });

      return { previousLeads };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lead");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Move lead mutation with optimistic updates for smooth drag-drop
  const moveLeadMutation = useMutation({
    mutationFn: async ({
      id,
      pipeline,
      stage,
    }: {
      id: string;
      pipeline: PipelineType;
      stage: string;
    }) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) throw new Error("Lead not found");

      const updatedHistory = Array.isArray(lead.history) ? lead.history : [];
      const updates: Record<string, unknown> = {
        pipeline,
        stage,
        history: [
          ...updatedHistory,
          { date: new Date().toISOString(), action: `Moved to ${stage}` },
        ],
      };

      // If moving to "closed", automatically add to onboarding at "call-1"
      if (stage === "closed" && !lead.onboardingStage) {
        updates.onboardingStage = "call-1";
      }
      if (stage === "bought" && pipeline === "community") {
        updates.boughtAt = new Date().toISOString();
        updates.nextFollowUp = null;
        updates.cadenceAnchor = null;
      }

      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to move lead");
      return res.json();
    },
    onMutate: async ({ id, pipeline, stage }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      // Optimistically update the cache
      queryClient.setQueryData<Lead[]>(["leads"], (old) => {
        if (!old) return old;
        return old.map((lead) => {
          if (lead.id === id) {
            return {
              ...lead,
              pipeline,
              stage,
              onboardingStage:
                stage === "closed" && !lead.onboardingStage
                  ? ("call-1" as OnboardingStage)
                  : lead.onboardingStage,
              boughtAt:
                stage === "bought" && pipeline === "community"
                  ? new Date().toISOString()
                  : lead.boughtAt,
              nextFollowUp:
                stage === "bought" && pipeline === "community"
                  ? null
                  : lead.nextFollowUp,
            };
          }
          return lead;
        });
      });

      return { previousLeads };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Move onboarding lead mutation with optimistic updates
  const moveOnboardingLeadMutation = useMutation({
    mutationFn: async ({
      id,
      onboardingStage,
    }: {
      id: string;
      onboardingStage: OnboardingStage;
    }) => {
      const lead = leads.find((l) => l.id === id);
      if (!lead) throw new Error("Lead not found");

      const updatedHistory = Array.isArray(lead.history) ? lead.history : [];
      const stageLabels: Record<OnboardingStage, string> = {
        "future-cohort": "Future Cohort",
        "call-1": "Call #1",
        "call-2": "Call #2",
        "document-creation": "Document Creation",
        "apply-ready": "Apply Ready",
      };

      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingStage,
          history: [
            ...updatedHistory,
            {
              date: new Date().toISOString(),
              action: `Onboarding: ${stageLabels[onboardingStage]}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to move onboarding lead");
      return res.json();
    },
    onMutate: async ({ id, onboardingStage }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads"]);

      queryClient.setQueryData<Lead[]>(["leads"], (old) => {
        if (!old) return old;
        return old.map((lead) =>
          lead.id === id ? { ...lead, onboardingStage } : lead,
        );
      });

      return { previousLeads };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Add blocker mutation
  const addBlockerMutation = useMutation({
    mutationFn: async (
      blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">,
    ) => {
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

  const addLead = (
    lead: Omit<Lead, "id" | "history" | "createdAt" | "updatedAt">,
  ) => {
    addLeadMutation.mutate(lead);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    updateLeadMutation.mutate({ id, updates });
  };

  const deleteLead = (id: string) => {
    deleteLeadMutation.mutate(id);
  };

  const archiveLead = (id: string) => {
    updateLeadMutation.mutate({ id, updates: { archived: true } });
  };

  const moveLead = (id: string, pipeline: PipelineType, stage: string) => {
    moveLeadMutation.mutate({ id, pipeline, stage });
  };

  const moveOnboardingLead = (id: string, onboardingStage: OnboardingStage) => {
    moveOnboardingLeadMutation.mutate({ id, onboardingStage });
  };

  const addBlocker = (
    blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds" | "createdAt">,
  ) => {
    addBlockerMutation.mutate(blocker);
  };

  const incrementBlocker = (id: string) => {
    incrementBlockerMutation.mutate(id);
  };

  // Filter out archived leads from the active leads list
  const activeLeads = leads.filter((lead) => !lead.archived);

  return (
    <StoreContext.Provider
      value={{
        leads: activeLeads,
        blockers,
        isLoading: leadsLoading || blockersLoading,
        emailingLead,
        setEmailingLead,
        addLead,
        updateLead,
        deleteLead,
        archiveLead,
        moveLead,
        moveOnboardingLead,
        addBlocker,
        incrementBlocker,
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
