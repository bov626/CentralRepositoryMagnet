import { storage } from "./storage";
import type { InsertLead, Lead } from "@shared/schema";

export type HubOnboardingEvent =
  | "account_created"
  | "outline_done"
  | "questionnaire_submitted"
  | "call_booked"
  | "payment_selected";

const STAGE_LABEL: Record<HubOnboardingEvent, string> = {
  account_created: "Hub account created (provisional)",
  outline_done: "Read the service outline",
  questionnaire_submitted: "Submitted onboarding questionnaire",
  call_booked: "Booked first onboarding call",
  payment_selected: "Picked a payment option",
};

function historyOf(lead: Lead | undefined) {
  return Array.isArray(lead?.history) ? (lead!.history as Array<{ date: string; action: string }>) : [];
}

/**
 * Put or keep this person on the Onboarding Kanban (Call #1).
 * Does not email them. Does not auto-advance past Call #1.
 */
export async function upsertOnboardingLead(input: {
  name: string;
  email?: string | null;
  linkedIn?: string | null;
  event: HubOnboardingEvent;
  hubClientId?: string | null;
  resumePath?: string | null;
  coverLetterPath?: string | null;
}): Promise<Lead> {
  const email = (input.email || "").trim() || null;
  const existing = email ? await storage.getLeadByEmail(email) : undefined;
  const action = STAGE_LABEL[input.event];
  const entry = { date: new Date().toISOString(), action };

  if (existing) {
    const updates: Partial<InsertLead> = {
      history: [...historyOf(existing), entry],
    };
    if (!existing.onboardingStage) {
      updates.onboardingStage = "call-1";
      updates.stage = "closed";
    }
    if (input.linkedIn && !existing.linkedIn) updates.linkedIn = input.linkedIn;
    if (input.resumePath) updates.resumePathA = input.resumePath;
    if (input.coverLetterPath && !existing.coverLetterPathA) updates.coverLetterPathA = input.coverLetterPath;
    const updated = await storage.updateLead(existing.id, updates);
    return updated ?? existing;
  }

  return storage.createLead({
    name: input.name,
    email,
    linkedIn: input.linkedIn || null,
    tags: ["hub"],
    pipeline: "jumpseat",
    stage: "closed",
    onboardingStage: "call-1",
    source: "hub",
    resumePathA: input.resumePath || null,
    coverLetterPathA: input.coverLetterPath || null,
    history: [entry],
  });
}

/**
 * Record a resume that is already in CRM object storage.
 * Does not email the client and does not move the lead past Call #1.
 */
export async function attachOnboardingResume(input: {
  name: string;
  email?: string | null;
  resumePath: string;
}): Promise<Lead> {
  const email = (input.email || "").trim() || null;
  const existing = email ? await storage.getLeadByEmail(email) : undefined;
  if (existing) {
    const updated = await storage.updateLead(existing.id, { resumePathA: input.resumePath });
    return updated ?? existing;
  }
  return storage.createLead({
    name: input.name,
    email,
    tags: ["hub"],
    pipeline: "jumpseat",
    stage: "closed",
    onboardingStage: "call-1",
    source: "hub",
    resumePathA: input.resumePath,
    history: [{ date: new Date().toISOString(), action: "Resume stored from Hub" }],
  });
}
