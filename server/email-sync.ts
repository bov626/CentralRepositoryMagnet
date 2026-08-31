import { storage } from "./storage";
import {
  emailHistoryItem,
  isCalendarNotification,
  isEmailHistoryItem,
  isFakeSampleEmail,
  type EmailThread,
  type HistoryItem,
} from "@shared/email";
import { isGmailConfigured, searchThreadsForLead } from "./gmail";
import { summarizeNextStep } from "./ai-summarize";
import { denverDayKey } from "./google-calendar";
import type { Lead } from "@shared/schema";

export type SyncResult = {
  lead: Lead;
  added: number;
  mocked: boolean;
};

type TaughtExample = { id: string; guessed: string; actual: string };

const DEAD_STAGES = new Set(["closed", "disqualified", "bought"]);

type SyncStatus = {
  running: boolean;
  done: number;
  total: number;
  failed: number;
  current: string | null;
  lastAt: number | null;
};

const status: SyncStatus = {
  running: false,
  done: 0,
  total: 0,
  failed: 0,
  current: null,
  lastAt: 0,
};

function isSalesCard(lead: Lead): boolean {
  if (lead.archived) return false;
  if (lead.pipeline === "appliers") return false;
  if (DEAD_STAGES.has(lead.stage)) return false;
  return true;
}

function guessedToday(lead: Lead): boolean {
  if (!lead.nextStepAiAt) return false;
  return denverDayKey(new Date(lead.nextStepAiAt)) === denverDayKey(new Date());
}

function taughtFrom(leads: Lead[], exceptId?: string): TaughtExample[] {
  return leads
    .filter((l) => l.id !== exceptId && l.nextStepManual && (l.nextStepAi || l.followUpAngle))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .slice(-40)
    .map((l) => ({
      id: l.id,
      guessed: (l.nextStepAi || l.followUpAngle || "").trim(),
      actual: (l.nextStepManual || "").trim(),
    }));
}

async function guessNextStep(
  lead: Lead,
  threads: EmailThread[],
  examples: TaughtExample[],
  opts: { newEmail?: boolean } = {},
): Promise<string> {
  const history = Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
  const prior = (lead.nextStepManual || lead.followUpAngle || "").trim();
  return summarizeNextStep({
    name: lead.name,
    pipeline: lead.pipeline,
    stage: lead.stage,
    source: lead.source,
    tags: lead.tags,
    jobTitle: lead.jobTitle,
    auditScore: lead.auditScore,
    summary: lead.summary,
    keyTakeaways: lead.keyTakeaways,
    actionItems: lead.actionItems,
    nextFollowUp: lead.nextFollowUp,
    cadenceAnchor: lead.cadenceAnchor,
    history,
    threads: threads.map((t) => ({
      subject: t.subject,
      summary: t.summary,
      direction: t.direction,
      date: t.date,
    })),
    examples: examples.map(({ guessed, actual }) => ({ guessed, actual })),
    priorNextStep: prior || null,
    newEmail: !!opts.newEmail,
  });
}

export async function syncLeadEmails(
  leadId: string,
  examples?: Array<{ guessed: string; actual: string }>,
): Promise<SyncResult> {
  const lead = await storage.getLead(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  if (!lead.email) {
    throw new Error("Lead has no email address");
  }

  const gmailReady = await isGmailConfigured();
  if (!gmailReady) {
    const existing = Array.isArray(lead.emailThreads)
      ? (lead.emailThreads as EmailThread[]).filter((thread) => !isFakeSampleEmail(thread))
      : [];
    const existingHistory = Array.isArray(lead.history)
      ? (lead.history as HistoryItem[]).filter((item) => !isFakeSampleEmail(item))
      : [];
    await storage.updateLead(leadId, {
      emailThreads: existing,
      history: existingHistory,
    });
    throw new Error("Gmail not connected — refusing to write email history");
  }

  const found = await searchThreadsForLead(lead.email);
  const incoming = found.threads.filter(
    (thread) => !isFakeSampleEmail(thread) && !isCalendarNotification(thread),
  );
  const existing = Array.isArray(lead.emailThreads) ? (lead.emailThreads as EmailThread[]) : [];
  const existingIds = new Set(existing.map((t) => t.gmailMessageId));
  const added = incoming.filter((thread) => !existingIds.has(thread.gmailMessageId));
  const newEmail = added.some((thread) => thread.direction === "in");
  const newFacts = added.length > 0;
  const prior = (lead.nextStepManual || lead.followUpAngle || "").trim();

  const crmHistory = (Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : []).filter(
    (item) => !isEmailHistoryItem(item) && !isFakeSampleEmail(item),
  );
  const history = [
    ...crmHistory,
    ...incoming.map((thread) =>
      emailHistoryItem({ ...thread, summary: thread.summary.slice(0, 280) }),
    ),
  ];

  const allLeads = examples ? null : await storage.getAllLeads();
  const taught = examples
    ? examples.map((e, i) => ({ id: String(i), ...e }))
    : taughtFrom(allLeads || [], leadId);

  let guessed = lead.nextStepAi || prior;
  if (newFacts || !prior) {
    guessed = await guessNextStep(lead, incoming, taught, { newEmail });
  }

  const live = newFacts || !lead.nextStepManual ? guessed : prior;

  const updated = await storage.updateLead(leadId, {
    emailThreads: incoming,
    history,
    nextStepAi: guessed || null,
    followUpAngle: live || guessed,
    nextStepAiAt: new Date(),
  });

  return {
    lead: updated!,
    added: added.length,
    mocked: false,
  };
}

async function refreshNotesOnly(lead: Lead, taught: TaughtExample[]): Promise<void> {
  const prior = (lead.nextStepManual || lead.followUpAngle || "").trim();
  if (prior && lead.nextStepManual) {
    return;
  }
  const threads = Array.isArray(lead.emailThreads) ? (lead.emailThreads as EmailThread[]) : [];
  const guessed = await guessNextStep(lead, threads, taught.filter((e) => e.id !== lead.id));
  await storage.updateLead(lead.id, {
    nextStepAi: guessed,
    followUpAngle: guessed,
    nextStepAiAt: new Date(),
  });
}

export function emailSyncStatus() {
  return { ...status, lastAt: status.lastAt || null };
}

export async function purgeFakeSampleEmails(): Promise<number> {
  const leads = await storage.getAllLeads();
  let cleaned = 0;
  for (const lead of leads) {
    const threads = Array.isArray(lead.emailThreads) ? (lead.emailThreads as EmailThread[]) : [];
    const history = Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
    const nextThreads = threads.filter(
      (thread) => !isFakeSampleEmail(thread) && !isCalendarNotification(thread),
    );
    const nextHistory = history.filter(
      (item) => !isFakeSampleEmail(item) && !isCalendarNotification(item),
    );
    if (nextThreads.length === threads.length && nextHistory.length === history.length) continue;
    await storage.updateLead(lead.id, {
      emailThreads: nextThreads,
      history: nextHistory,
    });
    cleaned++;
  }
  if (cleaned) console.log(`[startup] removed untrusted emails from ${cleaned} cards`);
  return cleaned;
}

export async function syncAllLeadEmails(_force = false): Promise<{
  synced: number;
  failed: number;
  mocked: boolean;
}> {
  const gmailReady = await isGmailConfigured();
  const leads = await storage.getAllLeads();
  const queue = leads
    .filter(isSalesCard)
    .filter((lead) => !guessedToday(lead))
    .sort((a, b) => {
      const aAt = a.nextStepAiAt ? new Date(a.nextStepAiAt).getTime() : 0;
      const bAt = b.nextStepAiAt ? new Date(b.nextStepAiAt).getTime() : 0;
      return aAt - bAt;
    });

  status.total = queue.length;
  status.done = 0;
  status.failed = 0;
  status.current = null;

  let taught = taughtFrom(leads);
  let synced = 0;
  let failed = 0;

  for (const lead of queue) {
    status.current = lead.name;
    try {
      if (lead.email) {
        await syncLeadEmails(
          lead.id,
          taught.filter((e) => e.id !== lead.id).map(({ guessed, actual }) => ({ guessed, actual })),
        );
      } else {
        await refreshNotesOnly(lead, taught);
      }
      synced++;
    } catch (error) {
      console.error(`Next-step pass failed for ${lead.email || lead.name}:`, error);
      failed++;
      status.failed = failed;
    }
    status.done = synced + failed;
    if (synced % 10 === 0) {
      taught = taughtFrom(await storage.getAllLeads());
    }
  }

  status.current = null;
  status.lastAt = Date.now();
  return { synced, failed, mocked: !gmailReady };
}

export async function ensureEmailSync(force = false): Promise<void> {
  if (status.running) return;
  if (status.lastAt && denverDayKey(new Date(status.lastAt)) === denverDayKey(new Date())) return;
  status.running = true;
  try {
    const result = await syncAllLeadEmails(force);
    console.log("[jobs] next-step pass", result);
  } catch (error) {
    console.error("[jobs] next-step pass failed", error);
    status.lastAt = 0;
  } finally {
    status.running = false;
    status.current = null;
  }
}

export async function recordOutboundEmail(
  leadId: string,
  input: { to: string; subject: string; body: string; gmailId?: string; threadId?: string },
): Promise<Lead | undefined> {
  const lead = await storage.getLead(leadId);
  if (!lead) return undefined;

  const thread: EmailThread = {
    gmailThreadId: input.threadId || input.gmailId || `local-${Date.now()}`,
    gmailMessageId: input.gmailId || `local-${Date.now()}`,
    subject: input.subject,
    summary: input.body.replace(/\s+/g, " ").trim().slice(0, 280),
    date: new Date().toISOString(),
    from: "wyedoyoudothis@gmail.com",
    to: input.to,
    direction: "out",
  };

  const existing = Array.isArray(lead.emailThreads)
    ? (lead.emailThreads as EmailThread[])
    : [];
  const history = Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];

  return storage.updateLead(leadId, {
    emailThreads: [...existing, thread],
    history: [...history, emailHistoryItem(thread)],
  });
}
