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
  | "backlog"
  | "to-pitch"
  | "would-buy";

export interface Lead {
  id: string;
  name: string;
  company?: string;
  linkedIn?: string;
  email?: string;
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
    name: "Jonathan Einav",
    email: "jonathan.einav@gmail.com",
    tags: ["YouTube", "laid-off"],
    pipeline: "jumpseat",
    stage: "disqualified",
    actionNeeded: false,
    summary: "Laid off. 3K applies total which lead to 40 interviews. No resume tailoring no cover letters, applying to director level.",
    keyTakeaways: ["Applied to 3k jobs", "No resume tailoring"],
    blocker: "Poor Fit",
    history: [{ date: "2025-12-09T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "2",
    name: "Chris",
    email: "cflosco@gmail.com",
    tags: ["YouTube", "unemployed"],
    pipeline: "jumpseat",
    stage: "disqualified",
    actionNeeded: false,
    summary: "Unemployed for a solar roofing company and is looking for remote work. Already bought a different service, doubt he would double up.",
    keyTakeaways: ["Looking for remote work", "Bought competitor service"],
    blocker: "Already bought a different service",
    history: [{ date: "2025-12-11T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "3",
    name: "Brenden",
    email: "brendenw@gmail.com",
    tags: ["YouTube", "career-pivot"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: true,
    summary: "Sales engineering but wants to be project manager. Don't think he is a fit. Couldn't apply for him anyway as he is in the army.",
    keyTakeaways: ["Wants to pivot to PM", "Active Army"],
    history: [{ date: "2025-12-04T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "4",
    name: "Celeste",
    email: "cavalic17@gmail.com",
    tags: ["YouTube", "tentative"],
    pipeline: "jumpseat",
    stage: "pitch-call",
    actionNeeded: true,
    summary: "She is tentative. 50/50 blend. Way too conservative with applying strategy. She is interested but I wouldn't work with her.",
    keyTakeaways: ["Conservative strategy", "Interested but hesitant"],
    blocker: "Tentative mindset",
    history: [{ date: "2025-12-13T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "5",
    name: "Will",
    email: "william.ford0@gmail.com",
    tags: ["YouTube", "tentative"],
    pipeline: "jumpseat",
    stage: "disqualified",
    actionNeeded: false,
    summary: "He wouldn't buy too tentative.",
    history: [{ date: "2025-12-14T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "6",
    name: "Naj",
    email: "najeeduddin@gmail.com",
    tags: ["YouTube", "tech"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: true,
    summary: "Software for recruiting companies. He is a database administrator. He doesn't use cover letters. And has been applying with no success.",
    keyTakeaways: ["DB Admin", "No success applying"],
    history: [{ date: "2025-12-15T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "7",
    name: "Ty",
    email: "tybohannon@gmail.com",
    tags: ["YouTube", "perfect-fit", "RTO"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: true,
    summary: "10 years at spectrum but they are Calling RTO currently. Wants 50/50 blend.",
    keyTakeaways: ["10 years exp", "Hates RTO"],
    decisionTrigger: "Needs remote flexibility",
    history: [{ date: "2025-12-16T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "8",
    name: "Mike",
    email: "duffcutco@hotmail.com",
    tags: ["YouTube", "long-term"],
    pipeline: "jumpseat",
    stage: "nudge-scheduled",
    nextFollowUp: "2026-06-01T09:00:00Z",
    actionNeeded: false,
    summary: "10 years there, wants second job. Has sent out 200-300 applications. Potentially Email Him In JUNE 2026 $6,000.",
    keyTakeaways: ["Wants 2nd job", "High volume applicant"],
    history: [{ date: "2025-12-17T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "9",
    name: "Ben",
    email: "benbutton@gmail.com",
    tags: ["YouTube", "tech"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: false,
    summary: "Kubernetes kid just moved to Florida for a remote job. Soon looking for a second.",
    history: [{ date: "2025-11-30T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "10",
    name: "Alonzo",
    email: "alonzo.hatten123@gmail.com",
    tags: ["YouTube", "military", "engineering"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: true,
    summary: "Active duty military. Graduating soon. Engineering. He's good for Q1.",
    keyTakeaways: ["Military transition", "Q1 prospect"],
    history: [{ date: "2025-12-09T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "11",
    name: "Tom",
    email: "tom@redeogen.com",
    tags: ["YouTube", "international"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: false,
    summary: "In australia but already overemployed.",
    history: [{ date: "2025-11-30T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "12",
    name: "Chung",
    email: "thangcungh@gmail.com",
    tags: ["YouTube", "package-deal"],
    pipeline: "jumpseat",
    stage: "decision-pending",
    actionNeeded: true,
    summary: "Wants me to apply for him AND wife. Marketing B2B sales, paid ads. He wants to Nudge Him in One week. He would buy.",
    keyTakeaways: ["Double deal potential", "Marketing background"],
    history: [{ date: "2025-11-30T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "13",
    name: "Del",
    email: "delano_j@outlook.com",
    tags: ["YouTube", "tech", "high-value"],
    pipeline: "jumpseat",
    stage: "backlog",
    actionNeeded: true,
    summary: "Salesforce Architect. Claude Code, LinkedIn.ai he's applying. $6,000 I would be surprised if he didn't buy.",
    keyTakeaways: ["High intent", "Salesforce Architect"],
    history: [{ date: "2025-12-22T10:00:00Z", action: "Created from Fathom" }],
  },
  {
    id: "14",
    name: "Matan",
    email: "matancoalition@gmail.com",
    tags: ["YouTube", "ready"],
    pipeline: "jumpseat",
    stage: "pitch-call",
    actionNeeded: true,
    summary: "He is ready to go and would work.",
    history: [{ date: "2025-12-23T10:00:00Z", action: "Created from Fathom" }],
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
  emailingLead: Lead | null;
  setEmailingLead: (lead: Lead | null) => void;
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
  const [emailingLead, setEmailingLead] = useState<Lead | null>(null);

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
      value={{ 
        leads, 
        blockers, 
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
