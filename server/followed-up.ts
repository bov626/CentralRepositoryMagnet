import { autoFollowedUpStage, theyEmailedLast, type HistoryItem } from "@shared/email";
import { storage } from "./storage";
import type { Lead } from "@shared/schema";

function historyOf(lead: Lead): HistoryItem[] {
  return Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
}

export async function applyFollowedUpStage(lead: Lead, now = new Date()): Promise<Lead> {
  const next = autoFollowedUpStage(lead, now);
  if (!next) return lead;
  const updated = await storage.updateLead(lead.id, {
    stage: next,
    history: [
      ...historyOf(lead),
      {
        date: now.toISOString(),
        action:
          next === "followed-up"
            ? "Moved to followed-up (emailed in the last 30 days)"
            : lead.stage === "backlog"
              ? "Moved to pitch-call (already had a call)"
              : theyEmailedLast(lead)
                ? "Moved to pitch-call (they emailed last — needs a reply)"
                : "Moved to pitch-call (last email older than 30 days)",
      },
    ],
  });
  return updated || lead;
}

export async function reconcileFollowedUpStages(): Promise<number> {
  const leads = await storage.getAllLeads();
  let moved = 0;
  for (const lead of leads) {
    if (!autoFollowedUpStage(lead)) continue;
    await applyFollowedUpStage(lead);
    moved++;
  }
  return moved;
}
