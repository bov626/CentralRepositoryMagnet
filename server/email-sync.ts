import { storage } from "./storage";
import {
  emailHistoryItem,
  mockThreadsForLead,
  type EmailThread,
  type HistoryItem,
} from "@shared/email";
import { isGmailConfigured, searchThreadsForLead } from "./gmail";
import { summarizeNextStep } from "./ai-summarize";
import type { Lead } from "@shared/schema";

export type SyncResult = {
  lead: Lead;
  added: number;
  mocked: boolean;
};

export async function syncLeadEmails(leadId: string): Promise<SyncResult> {
  const lead = await storage.getLead(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  if (!lead.email) {
    throw new Error("Lead has no email address");
  }

  const gmailReady = await isGmailConfigured();
  const incoming = gmailReady
    ? await searchThreadsForLead(lead.email)
    : mockThreadsForLead(lead.name, lead.email);

  const existing = Array.isArray(lead.emailThreads)
    ? (lead.emailThreads as EmailThread[])
    : [];
  const existingHistory = Array.isArray(lead.history)
    ? (lead.history as HistoryItem[])
    : [];

  const byId = new Map<string, EmailThread>();
  for (const thread of existing) {
    byId.set(thread.gmailThreadId || thread.gmailMessageId, thread);
  }

  const added: EmailThread[] = [];
  for (const thread of incoming) {
    const key = thread.gmailThreadId || thread.gmailMessageId;
    if (!byId.has(key)) added.push(thread);
    byId.set(key, thread);
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const history = [
    ...existingHistory,
    ...added.map(emailHistoryItem),
  ];

  const followUpAngle = await summarizeNextStep({
    name: lead.name,
    stage: lead.stage,
    summary: lead.summary,
    threads: merged.map((t) => ({
      subject: t.subject,
      summary: t.summary,
      direction: t.direction,
      date: t.date,
    })),
  });

  const updated = await storage.updateLead(leadId, {
    emailThreads: merged,
    history,
    followUpAngle,
  });

  return {
    lead: updated!,
    added: added.length,
    mocked: !gmailReady,
  };
}

export async function syncAllLeadEmails(): Promise<{ synced: number; failed: number; mocked: boolean }> {
  const gmailReady = await isGmailConfigured();
  const leads = await storage.getAllLeads();
  let synced = 0;
  let failed = 0;

  for (const lead of leads) {
    if (!lead.email || lead.archived) continue;
    try {
      await syncLeadEmails(lead.id);
      synced++;
      await new Promise((r) => setTimeout(r, 150));
    } catch (error) {
      console.error(`Email sync failed for ${lead.email}:`, error);
      failed++;
    }
  }

  return { synced, failed, mocked: !gmailReady };
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
