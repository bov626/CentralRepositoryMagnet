import { createContext, useContext, useState, ReactNode } from "react";

// Simple ID generator since nanoid isn't installed
const generateId = () => Math.random().toString(36).substring(2, 9);

export type PipelineType = "jumpseat" | "community";

export type JumpseatStage = 
  | "backlog"
  | "pitch-call"
  | "decision-pending"
  | "nudge-scheduled"
  | "closed"
  | "disqualified";

export type CommunityStage =
  | "new-leads"
  | "to-pitch"
  | "too-expensive"
  | "would-buy"
  | "nurture"
  | "unsubscribe";

export interface Lead {
  id: string;
  name: string;
  company?: string;
  linkedIn?: string;
  tags: string[];
  pipeline: PipelineType;
  stage: string;
  nextFollowUp?: string; // ISO Date
  actionNeeded: boolean;
  
  // Details
  summary?: string;
  keyTakeaways?: string[];
  blocker?: string;
  decisionTrigger?: string;
  followUpAngle?: string;
  recordingLink?: string;
  history: { date: string; action: string }[];
}

export interface Blocker {
  id: string;
  text: string;
  category: "price" | "timing" | "spouse" | "trust" | "logistics" | "other";
  count: number;
  response: string;
  exampleLeadIds: string[];
}

// Initial Mock Data
const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Miller",
    company: "TechFlow",
    linkedIn: "https://linkedin.com/in/sarahmiller-example",
    tags: ["price", "perfect-fit"],
    pipeline: "jumpseat",
    stage: "pitch-call",
    nextFollowUp: new Date().toISOString(),
    actionNeeded: true,
    summary: "Talked about scaling issues. She loves the interface but worried about cost.",
    keyTakeaways: ["Needs 5 seats", "Budget approval needed"],
    blocker: "Price is 20% over budget",
    decisionTrigger: "If we can do a 6-month contract instead of 12",
    followUpAngle: "Send case study on ROI",
    history: [{ date: new Date().toISOString(), action: "Created from Fathom" }],
  },
  {
    id: "2",
    name: "David Chen",
    company: "Acme Corp",
    linkedIn: "https://linkedin.com/in/davidchen-example",
    tags: ["timing", "logistics"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: false,
    history: [{ date: new Date().toISOString(), action: "Created from Fathom" }],
  },
  {
    id: "3",
    name: "Emily Davis",
    company: "Design Studio",
    tags: ["confidence"],
    pipeline: "community",
    stage: "nurture",
    actionNeeded: false,
    history: [{ date: new Date().toISOString(), action: "Moved to Community" }],
  },
  {
    id: "4",
    name: "Michael Ross",
    company: "Global Inc",
    tags: ["waiting-on-me"],
    pipeline: "jumpseat",
    stage: "decision-pending",
    nextFollowUp: new Date().toISOString(),
    actionNeeded: true,
    history: [{ date: new Date().toISOString(), action: "Pitch call completed" }],
  },
];

const initialBlockers: Blocker[] = [
  {
    id: "b1",
    text: "It's too expensive for us right now",
    category: "price",
    count: 12,
    response: "- Compare cost of inaction\n- Offer payment plan\n- Highlight ROI timeframe",
    exampleLeadIds: ["1"],
  },
  {
    id: "b2",
    text: "Need to check with my spouse/partner",
    category: "spouse",
    count: 8,
    response: "- Send 'partner packet' PDF\n- Offer joint call",
    exampleLeadIds: [],
  },
];

interface StoreContextType {
  leads: Lead[];
  blockers: Blocker[];
  addLead: (lead: Omit<Lead, "id" | "history">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, pipeline: PipelineType, stage: string) => void;
  addBlocker: (blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds">) => void;
  incrementBlocker: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [blockers, setBlockers] = useState<Blocker[]>(initialBlockers);

  const addLead = (lead: Omit<Lead, "id" | "history">) => {
    setLeads((prev) => [
      ...prev,
      {
        ...lead,
        id: generateId(),
        history: [{ date: new Date().toISOString(), action: "Created" }],
      },
    ]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const moveLead = (id: string, pipeline: PipelineType, stage: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              pipeline,
              stage,
              history: [
                ...l.history,
                { date: new Date().toISOString(), action: `Moved to ${stage}` },
              ],
            }
          : l
      )
    );
  };

  const addBlocker = (blocker: Omit<Blocker, "id" | "count" | "exampleLeadIds">) => {
    setBlockers((prev) => [
      ...prev,
      { ...blocker, id: generateId(), count: 1, exampleLeadIds: [] },
    ]);
  };

  const incrementBlocker = (id: string) => {
    setBlockers(prev => prev.map(b => b.id === id ? { ...b, count: b.count + 1 } : b));
  };

  return (
    <StoreContext.Provider
      value={{ leads, blockers, addLead, updateLead, moveLead, addBlocker, incrementBlocker }}
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
