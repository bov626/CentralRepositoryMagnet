import { storage } from "./storage";
import {
  extractLeadDataFromMeeting,
  getMeeting,
  isFathomConfigured,
  listMeetings,
  type FathomMeeting,
} from "./fathom";
import { classifyCallIntent, summarizeClientNeeds } from "./ai-summarize";
import { findGranolaNoteForEmail, mergeCallNotes } from "./granola";
import type { HistoryItem } from "@shared/email";
import type { InsertLead, Lead } from "@shared/schema";

type Intent = "this_cohort" | "later" | "unclear";

function historyOf(lead: Lead): HistoryItem[] {
  return Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
}

function frozenStage(lead: Lead): boolean {
  return lead.stage === "closed" || lead.stage === "disqualified";
}

function stageAfterCall(existing: Lead | null, intent: Intent): string {
  if (existing && frozenStage(existing)) return existing.stage;
  if (intent === "later") return "future-client";
  if (intent === "this_cohort") return "decision-pending";
  return "pitch-call";
}

export async function ingestFathomMeeting(recordingId: number): Promise<{
  lead: Lead;
  created: boolean;
  moved: boolean;
}> {
  const meeting = await getMeeting(recordingId);
  if (!meeting) throw new Error("Meeting not found");
  return ingestFathomMeetingData(meeting);
}

export async function ingestFathomMeetingData(meeting: FathomMeeting): Promise<{
  lead: Lead;
  created: boolean;
  moved: boolean;
}> {
  const leadData = extractLeadDataFromMeeting(meeting);
  const email = (leadData.email || "").toLowerCase();

  let clientSummary = leadData.summary;
  try {
    clientSummary = await summarizeClientNeeds(leadData.summary, leadData.actionItems);
  } catch {
    // keep raw
  }

  const granola = email
    ? await findGranolaNoteForEmail(email, new Date(leadData.cadenceAnchor || Date.now()))
    : null;
  const mergedSummary = mergeCallNotes(granola?.summary || null, clientSummary);
  const intent = await classifyCallIntent(mergedSummary);

  let existing = null;
  if (email) existing = await storage.getLeadByEmail(leadData.email);
  if (!existing) {
    existing = await storage.getLeadByFathomRecordingId(meeting.recording_id);
  }

  if (existing) {
    const existingHistory = historyOf(existing);
    let combinedSummary = existing.summary || "";
    if (mergedSummary) {
      const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const separator = combinedSummary ? `\n\n--- Call (${dateStr}) ---\n` : "";
      combinedSummary = combinedSummary + separator + mergedSummary;
    }

    if (frozenStage(existing)) {
      const updated = await storage.updateLead(existing.id, {
        summary: combinedSummary,
        granolaNoteId: granola?.id || existing.granolaNoteId,
        history: [
          ...existingHistory,
          { date: new Date().toISOString(), action: `Call notes added (no stage move): ${meeting.title}` },
        ],
      });
      return { lead: updated!, created: false, moved: false };
    }

    const existingActionItems = Array.isArray(existing.actionItems) ? existing.actionItems : [];
    const newActionItems = leadData.actionItems || [];
    const mergedActionItems = [...existingActionItems];
    for (const item of newActionItems) {
      if (!mergedActionItems.includes(item)) mergedActionItems.push(item);
    }

    const nextStage = stageAfterCall(existing, intent);
    const moved = nextStage !== existing.stage;
    const history = [...existingHistory, {
      date: new Date().toISOString(),
      action: moved
        ? `Call imported: ${meeting.title} → ${nextStage}`
        : `Enhanced with call: ${meeting.title}`,
    }];

    const updated = await storage.updateLead(existing.id, {
      summary: combinedSummary,
      actionItems: mergedActionItems,
      recordingLink: leadData.recordingLink,
      fathomRecordingId: meeting.recording_id,
      granolaNoteId: granola?.id || existing.granolaNoteId,
      source: existing.source || "fathom",
      nextFollowUp: leadData.nextFollowUp ? new Date(leadData.nextFollowUp) : existing.nextFollowUp,
      cadenceAnchor: leadData.cadenceAnchor ? new Date(leadData.cadenceAnchor) : existing.cadenceAnchor,
      actionItemDates: [
        ...(Array.isArray(existing.actionItemDates) ? (existing.actionItemDates as Array<string | null>) : []),
        ...newActionItems.map(() => leadData.nextFollowUp),
      ],
      stage: nextStage,
      history,
    });
    return { lead: updated!, created: false, moved };
  }

  const stage = stageAfterCall(null, intent);
  const created = await storage.createLead({
    name: leadData.name,
    email: leadData.email || null,
    company: leadData.company,
    linkedIn: null,
    tags: granola ? ["granola"] : [],
    pipeline: "jumpseat",
    stage,
    onboardingStage: null,
    nextFollowUp: leadData.nextFollowUp ? new Date(leadData.nextFollowUp) : null,
    cadenceAnchor: leadData.cadenceAnchor ? new Date(leadData.cadenceAnchor) : null,
    actionItemDates: (leadData.actionItems || []).map(() => leadData.nextFollowUp),
    summary: mergedSummary,
    actionItems: leadData.actionItems,
    followUpAngle: null,
    recordingLink: leadData.recordingLink,
    fathomRecordingId: meeting.recording_id,
    granolaNoteId: granola?.id || null,
    source: "fathom",
    history: [{
      date: new Date().toISOString(),
      action: `Auto-imported call: ${meeting.title} → ${stage}`,
    }],
  });
  return { lead: created, created: true, moved: false };
}

export async function autoImportFathomCalls(): Promise<{ imported: number; skipped: number }> {
  if (!isFathomConfigured()) return { imported: 0, skipped: 0 };
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const meetings = await listMeetings({
    includeSummary: true,
    includeActionItems: true,
    createdAfter: since.toISOString(),
  });

  let imported = 0;
  let skipped = 0;
  for (const meeting of meetings.items || []) {
    const already = await storage.getLeadByFathomRecordingId(meeting.recording_id);
    if (already && already.fathomRecordingId === meeting.recording_id && already.recordingLink) {
      skipped++;
      continue;
    }
    try {
      await ingestFathomMeetingData(meeting);
      imported++;
    } catch (error) {
      console.error(`Fathom auto-import failed for ${meeting.recording_id}:`, error);
      skipped++;
    }
  }
  return { imported, skipped };
}

export async function ingestAuditLead(input: {
  name: string;
  email?: string;
  linkedIn?: string;
  summary?: string;
  pdfUrl?: string;
}): Promise<{ lead: Lead; created: boolean }> {
  const email = input.email?.trim() || null;
  const existing = email ? await storage.getLeadByEmail(email) : undefined;
  const auditBlock = input.summary
    ? `Overemployed Risk Audit\n${input.summary}`
    : "Completed the Overemployed Risk Audit. No sales call yet.";

  if (existing) {
    const history = historyOf(existing);
    const summary = existing.summary
      ? `${existing.summary}\n\n--- Audit ---\n${auditBlock}`
      : auditBlock;
    const updated = await storage.updateLead(existing.id, {
      linkedIn: input.linkedIn || existing.linkedIn,
      auditPdfUrl: input.pdfUrl || existing.auditPdfUrl,
      source: existing.source || "audit",
      summary,
      history: [...history, { date: new Date().toISOString(), action: "Audit received" }],
    });
    return { lead: updated!, created: false };
  }

  const lead = await storage.createLead({
    name: input.name.trim(),
    email,
    linkedIn: input.linkedIn || null,
    tags: ["audit"],
    pipeline: "jumpseat",
    stage: "backlog",
    source: "audit",
    auditPdfUrl: input.pdfUrl || null,
    summary: auditBlock,
    actionItems: [],
    history: [{ date: new Date().toISOString(), action: "Created from Overemployed Risk Audit" }],
  });
  return { lead, created: true };
}

export async function ingestSkoolMember(input: {
  name: string;
  email?: string;
  paid?: boolean;
}): Promise<{ lead: Lead; created: boolean }> {
  const email = input.email?.trim() || null;
  const existing = email ? await storage.getLeadByEmail(email) : undefined;
  const paid = !!input.paid;
  const stage = paid ? "bought" : "backlog";

  if (existing) {
    const history = historyOf(existing);
    const updates: Partial<InsertLead> = {
      pipeline: "community",
      stage: existing.stage === "bought" ? "bought" : stage,
      source: existing.source || "skool",
      history: [...history, {
        date: new Date().toISOString(),
        action: paid ? "Skool paid member" : "Joined Skool",
      }],
    };
    if (paid && existing.stage !== "bought") {
      updates.boughtAt = new Date();
      updates.cadenceAnchor = new Date();
      updates.nextFollowUp = new Date();
    }
    const updated = await storage.updateLead(existing.id, updates);
    return { lead: updated!, created: false };
  }

  const lead = await storage.createLead({
    name: input.name.trim(),
    email,
    tags: ["skool"],
    pipeline: "community",
    stage,
    source: "skool",
    boughtAt: paid ? new Date() : null,
    cadenceAnchor: paid ? new Date() : new Date(),
    nextFollowUp: new Date(),
    summary: paid ? "Paid Skool member." : "Joined Skool. Not marked paid yet.",
    actionItems: paid ? ["Send community onboarding email"] : ["Send welcome / follow-up"],
    history: [{
      date: new Date().toISOString(),
      action: paid ? "Created from Skool (Bought)" : "Created from Skool",
    }],
  });
  return { lead, created: true };
}

export async function migrateNudgeScheduled(): Promise<number> {
  const leads = await storage.getAllLeads();
  let moved = 0;
  for (const lead of leads) {
    if (lead.stage !== "nudge-scheduled") continue;
    await storage.updateLead(lead.id, {
      stage: "future-client",
      history: [
        ...historyOf(lead),
        { date: new Date().toISOString(), action: "Moved to future-client (Nudge Scheduled retired)" },
      ],
    });
    moved++;
  }
  return moved;
}

export async function moveGhostedAfterCadence(): Promise<number> {
  const leads = await storage.getAllLeads();
  const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
  let moved = 0;
  for (const lead of leads) {
    if (lead.pipeline !== "jumpseat") continue;
    if (lead.stage !== "pitch-call" && lead.stage !== "decision-pending") continue;
    if (!lead.cadenceAnchor) continue;
    if (new Date(lead.cadenceAnchor).getTime() > cutoff) continue;
    if (lead.nextFollowUp && new Date(lead.nextFollowUp).getTime() > Date.now()) continue;
    await storage.updateLead(lead.id, {
      stage: "future-client",
      history: [
        ...historyOf(lead),
        { date: new Date().toISOString(), action: "Moved to future-client (0/3/7 unanswered)" },
      ],
    });
    moved++;
  }
  return moved;
}
