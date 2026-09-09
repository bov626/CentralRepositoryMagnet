export type EmailDirection = "in" | "out";

export type EmailThread = {
  gmailThreadId: string;
  gmailMessageId: string;
  subject: string;
  summary: string;
  date: string;
  from: string;
  to: string;
  direction: EmailDirection;
};

export type HistoryItem = {
  date: string;
  action: string;
  type?: "email" | "note" | "move";
  subject?: string;
  summary?: string;
  gmailThreadId?: string;
  direction?: EmailDirection;
};

export type CadenceKind =
  | "same-day"
  | "day-3"
  | "day-7"
  | "check-in-3"
  | "check-in-6"
  | "check-in-9"
  | "check-in-12"
  | "follow-up-date"
  | "reply";

export type DueToday = {
  due: boolean;
  reason: string;
  cadence: CadenceKind | null;
  priority: number;
  callAt?: string | null;
};

export type RecentCallMatch = {
  leadId: string;
  start: string;
};

export type TodayFollowUp = {
  leadId: string;
  reason: string;
  cadence: CadenceKind | null;
  priority: number;
  callAt: string | null;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysApart(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function isSameDay(a: Date, b: Date): boolean {
  return daysApart(a, b) === 0;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function noonIso(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return d.toISOString();
}

type FollowUpLead = {
  id?: string;
  pipeline?: string | null;
  stage?: string | null;
  source?: string | null;
  tags?: string[] | null;
  archived?: boolean | null;
  email?: string | null;
  summary?: string | null;
  auditPdfUrl?: string | null;
  nextFollowUp?: string | Date | null;
  actionItemDates?: unknown;
  cadenceAnchor?: string | Date | null;
  fathomRecordingId?: number | string | null;
  recordingLink?: string | null;
  queueDismissedAt?: string | Date | null;
  auditFeedbackAt?: string | Date | null;
  createdAt?: string | Date | null;
  emailThreads?: unknown;
  history?: unknown;
};

export function normalizeActionItemDates(dates: unknown, itemCount: number): Array<string | null> {
  const raw = Array.isArray(dates) ? dates : [];
  return Array.from({ length: itemCount }, (_, i) => {
    const value = raw[i];
    if (!value) return null;
    const parsed = parseDate(value);
    return parsed ? parsed.toISOString() : null;
  });
}

export function effectiveFollowUp(lead: FollowUpLead): Date | null {
  const explicit = parseDate(lead.nextFollowUp);
  if (explicit) return explicit;

  const dates = (Array.isArray(lead.actionItemDates) ? lead.actionItemDates : [])
    .map((value) => parseDate(value))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());

  return dates[0] ?? null;
}

function latestDate(dates: Date[]): Date | null {
  if (!dates.length) return null;
  return dates.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}

function emailDates(lead: FollowUpLead, direction: EmailDirection): Date[] {
  const threads = Array.isArray(lead.emailThreads) ? (lead.emailThreads as EmailThread[]) : [];
  const fromThreads = threads
    .filter((t) => t.direction === direction && !isIgnoredEmail(t))
    .map((t) => parseDate(t.date))
    .filter((d): d is Date => !!d);

  const history = Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
  const fromHistory = history
    .filter((h) => {
      if (isIgnoredEmail(h)) return false;
      if (h.type === "email" && h.direction === direction) return true;
      if (direction === "out") return /^(sent):/i.test(h.action || "");
      return /^(received):/i.test(h.action || "");
    })
    .map((h) => parseDate(h.date))
    .filter((d): d is Date => !!d);

  return [...fromThreads, ...fromHistory];
}

function outboundEmailDates(lead: FollowUpLead): Date[] {
  return emailDates(lead, "out");
}

export function lastOutboundAt(lead: FollowUpLead): Date | null {
  return latestDate(emailDates(lead, "out"));
}

const FOLLOWED_UP_DAYS = 30;
const FOLLOWED_UP_FROM = new Set(["backlog", "pitch-call", "followed-up"]);

export function autoFollowedUpStage(
  lead: FollowUpLead,
  now = new Date(),
): "followed-up" | "pitch-call" | null {
  if (lead.archived) return null;
  if (lead.pipeline !== "jumpseat") return null;
  const stage = String(lead.stage || "");
  if (
    stage === "decision-pending" ||
    stage === "future-client" ||
    stage === "closed" ||
    stage === "disqualified"
  ) {
    return null;
  }
  if (!FOLLOWED_UP_FROM.has(stage) && stage !== "backlog") return null;

  const lastOut = lastOutboundAt(lead);
  const age = lastOut ? daysApart(now, lastOut) : null;
  const emailedThisMonth = age != null && age <= FOLLOWED_UP_DAYS;
  const dateDue = !!followUpDateDue(lead, now);

  if (theyEmailedLast(lead)) {
    if (stage === "followed-up") return "pitch-call";
  } else if (dateDue) {
    if (stage === "followed-up") return "pitch-call";
    return null;
  } else if (FOLLOWED_UP_FROM.has(stage) && emailedThisMonth) {
    return stage === "followed-up" ? null : "followed-up";
  }
  if (stage === "followed-up") return "pitch-call";
  if (stage === "backlog" && hadSalesCall(lead)) return "pitch-call";
  return null;
}

export function lastInboundAt(lead: FollowUpLead): Date | null {
  return latestDate(emailDates(lead, "in"));
}

export function theyEmailedLast(lead: FollowUpLead): boolean {
  const lastIn = lastInboundAt(lead);
  if (!lastIn) return false;
  const lastOut = lastOutboundAt(lead);
  if (!lastOut) return true;
  return lastIn.getTime() > lastOut.getTime();
}

export function isWaitingOnReply(lead: FollowUpLead): boolean {
  const lastOut = lastOutboundAt(lead);
  if (!lastOut) return false;
  const lastIn = lastInboundAt(lead);
  if (!lastIn) return true;
  return lastOut.getTime() > lastIn.getTime();
}

export function unansweredInboundReason(receivedAt: Date, now = new Date()): string {
  const days = daysApart(now, receivedAt);
  if (days <= 1) return "They emailed — no reply";
  return `They emailed ${days} days ago — no reply`;
}

export function unansweredInboundDue(
  lead: FollowUpLead,
  now = new Date(),
  finishedEmails?: Set<string>,
): DueToday {
  if (lead.archived || lead.pipeline === "appliers") return NOT_DUE;
  if (isFinishedStage(lead.stage)) return NOT_DUE;
  if (String(lead.stage || "") === "future-client") return NOT_DUE;
  const email = String(lead.email || "").trim().toLowerCase();
  if (email && finishedEmails?.has(email)) return NOT_DUE;
  if (!theyEmailedLast(lead)) return NOT_DUE;
  const lastIn = lastInboundAt(lead);
  if (!lastIn) return NOT_DUE;
  const dismissedAt = parseDate(lead.queueDismissedAt);
  if (dismissedAt && lastIn.getTime() <= dismissedAt.getTime()) return NOT_DUE;
  const hours = (now.getTime() - lastIn.getTime()) / (60 * 60 * 1000);
  if (hours < 24) return NOT_DUE;
  return {
    due: true,
    reason: unansweredInboundReason(lastIn, now),
    cadence: "reply",
    priority: 0,
    callAt: lastIn.toISOString(),
  };
}

function lastContactAt(lead: FollowUpLead): Date | null {
  return latestDate(
    [lastOutboundAt(lead), lastInboundAt(lead), parseDate(lead.cadenceAnchor), parseDate(lead.createdAt)].filter(
      (d): d is Date => !!d,
    ),
  );
}

export function emailedWithinOneDay(lead: FollowUpLead, milestone: Date): boolean {
  return outboundEmailDates(lead).some((sent) => Math.abs(daysApart(sent, milestone)) <= 1);
}

function emailedOnOrAfter(lead: FollowUpLead, milestone: Date): boolean {
  return outboundEmailDates(lead).some((sent) => daysApart(sent, milestone) >= -1);
}

export function emailedAfter(lead: FollowUpLead, after: Date): boolean {
  return outboundEmailDates(lead).some((sent) => sent.getTime() >= after.getTime());
}

export function followUpDateDue(lead: FollowUpLead, now = new Date()): Date | null {
  const follow = effectiveFollowUp(lead);
  if (!follow) return null;
  if (daysApart(follow, now) > 0) return null;
  if (emailedOnOrAfter(lead, follow)) return null;
  return follow;
}

export function missedCallReason(callAt: Date, now = new Date()): string {
  const days = daysApart(now, callAt);
  if (days <= 0) return "Call today — no email sent";
  if (days === 1) return "Call yesterday — no email sent";
  return `Call ${days} days ago — no email sent`;
}

const NOT_DUE: DueToday = { due: false, reason: "", cadence: null, priority: 1, callAt: null };

const CHECK_INS: Array<{ months: number; cadence: CadenceKind; reason: string }> = [
  { months: 3, cadence: "check-in-3", reason: "3-month check-in" },
  { months: 6, cadence: "check-in-6", reason: "6-month check-in" },
  { months: 9, cadence: "check-in-9", reason: "9-month check-in" },
  { months: 12, cadence: "check-in-12", reason: "1-year check-in" },
];

const SHORT_CADENCE: Array<{ days: number; cadence: CadenceKind; reason: string }> = [
  { days: 0, cadence: "same-day", reason: "Same-day recap" },
  { days: 3, cadence: "day-3", reason: "Day 3 bump" },
  { days: 7, cadence: "day-7", reason: "Day 7 bump" },
];

export function isFinishedStage(stage?: string | null): boolean {
  const value = String(stage || "").trim().toLowerCase();
  return value === "closed" || value === "bought" || value === "disqualified";
}

export function isAuditLead(lead: FollowUpLead): boolean {
  if (lead.source === "audit") return true;
  if (Array.isArray(lead.tags) && lead.tags.includes("audit")) return true;
  if (lead.auditPdfUrl) return true;
  return /overemployed risk audit/i.test(String(lead.summary || ""));
}

export function hadSalesCall(lead: FollowUpLead, recentCallIds?: Set<string>): boolean {
  if (parseDate(lead.cadenceAnchor)) return true;
  if (lead.fathomRecordingId) return true;
  if (lead.recordingLink) return true;
  if (lead.source === "fathom" || lead.source === "calendar") return true;
  return !!(lead.id && recentCallIds?.has(lead.id));
}

export function needsAuditCall(lead: FollowUpLead, recentCallIds?: Set<string>): boolean {
  if (lead.archived || lead.pipeline === "appliers") return false;
  if (isFinishedStage(lead.stage)) return false;
  if (!isAuditLead(lead)) return false;
  if (hadSalesCall(lead, recentCallIds)) return false;
  return !parseDate(lead.auditFeedbackAt);
}

export function finishedDealEmails(leads: FollowUpLead[]): Set<string> {
  const emails = new Set<string>();
  for (const lead of leads) {
    if (!isFinishedStage(lead.stage)) continue;
    const email = String(lead.email || "").trim().toLowerCase();
    if (email) emails.add(email);
  }
  return emails;
}

export function missedCallDue(
  lead: FollowUpLead,
  callAt: Date,
  now = new Date(),
  finishedEmails?: Set<string>,
): DueToday {
  if (lead.archived || lead.pipeline === "appliers") return NOT_DUE;
  if (isFinishedStage(lead.stage)) return NOT_DUE;
  const email = String(lead.email || "").trim().toLowerCase();
  if (email && finishedEmails?.has(email)) return NOT_DUE;
  if (parseDate(lead.queueDismissedAt)) return NOT_DUE;
  if (Number.isNaN(callAt.getTime()) || callAt.getTime() > now.getTime()) return NOT_DUE;
  const age = daysApart(now, callAt);
  if (age < 0 || age > 7) return NOT_DUE;
  if (emailedAfter(lead, callAt)) return NOT_DUE;
  return {
    due: true,
    reason: missedCallReason(callAt, now),
    cadence: "same-day",
    priority: 1,
    callAt: callAt.toISOString(),
  };
}

export function dueToday(lead: FollowUpLead, now = new Date(), finishedEmails?: Set<string>): DueToday {
  if (lead.archived) return NOT_DUE;
  if (lead.pipeline === "appliers") return NOT_DUE;
  if (isFinishedStage(lead.stage)) return NOT_DUE;
  const email = String(lead.email || "").trim().toLowerCase();
  if (email && finishedEmails?.has(email)) return NOT_DUE;

  const unanswered = unansweredInboundDue(lead, now, finishedEmails);
  if (unanswered.due) return unanswered;

  if (isAuditLead(lead) && !parseDate(lead.cadenceAnchor)) return NOT_DUE;
  if (parseDate(lead.queueDismissedAt)) return NOT_DUE;

  const anchor = parseDate(lead.cadenceAnchor);
  if (anchor) {
    const missed = missedCallDue(lead, anchor, now, finishedEmails);
    if (missed.due) return missed;
  }

  const follow = followUpDateDue(lead, now);
  if (follow) {
    return {
      due: true,
      reason: isSameDay(follow, now) ? "Follow-up date" : "Overdue",
      cadence: "follow-up-date",
      priority: 2,
      callAt: null,
    };
  }

  if (anchor) {
    const sentAfterCall = emailedAfter(lead, anchor);
    for (const step of SHORT_CADENCE) {
      const when = addDays(anchor, step.days);
      const late = daysApart(now, when);
      if (late < 0) continue;
      if (step.days === 0 && anchor.getTime() > now.getTime()) continue;
      if (emailedOnOrAfter(lead, when)) continue;
      if (sentAfterCall && late > 1) continue;
      return {
        due: true,
        reason: late === 0 ? step.reason : `${step.reason} (overdue)`,
        cadence: step.cadence,
        priority: 2,
        callAt: null,
      };
    }
  }

  const lastContact = lastContactAt(lead);
  if (lastContact) {
    for (const check of CHECK_INS) {
      const when = addMonths(lastContact, check.months);
      const age = daysApart(now, when);
      if (age < 0 || age > 14) continue;
      if (emailedOnOrAfter(lead, when)) continue;
      return { due: true, reason: check.reason, cadence: check.cadence, priority: 2, callAt: null };
    }
  }

  return NOT_DUE;
}

export function buildTodayQueue(
  leads: FollowUpLead[],
  recentCalls: RecentCallMatch[] = [],
  now = new Date(),
): { followUps: TodayFollowUp[]; auditCalls: FollowUpLead[] } {
  const finishedEmails = finishedDealEmails(leads);
  const calledIds = new Set(recentCalls.map((call) => call.leadId));
  const leadsById = new Map(leads.filter((lead) => lead.id).map((lead) => [lead.id as string, lead]));
  const byId = new Map<string, TodayFollowUp>();

  const upsert = (lead: FollowUpLead, info: DueToday) => {
    if (!info.due || !lead.id) return;
    const next: TodayFollowUp = {
      leadId: lead.id,
      reason: info.reason,
      cadence: info.cadence,
      priority: info.priority ?? 1,
      callAt: info.callAt ?? null,
    };
    const existing = byId.get(lead.id);
    if (!existing || next.priority < existing.priority) {
      byId.set(lead.id, next);
      return;
    }
    if (next.priority === existing.priority && next.callAt && next.callAt > (existing.callAt || "")) {
      byId.set(lead.id, next);
    }
  };

  for (const lead of leads) {
    upsert(lead, dueToday(lead, now, finishedEmails));
  }
  for (const call of recentCalls) {
    const lead = leadsById.get(call.leadId);
    if (!lead) continue;
    upsert(lead, missedCallDue(lead, new Date(call.start), now, finishedEmails));
  }

  const auditCalls = leads.filter((lead) => needsAuditCall(lead, calledIds));
  const auditIds = new Set(auditCalls.map((lead) => lead.id).filter((id): id is string => !!id));
  const auditEmails = new Set(
    auditCalls.map((lead) => String(lead.email || "").trim().toLowerCase()).filter(Boolean),
  );

  const followUps = Array.from(byId.values())
    .filter((row) => {
      if (auditIds.has(row.leadId)) return false;
      const lead = leadsById.get(row.leadId);
      const email = String(lead?.email || "").trim().toLowerCase();
      return !(email && auditEmails.has(email));
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.priority === 0) return String(a.callAt || "").localeCompare(String(b.callAt || ""));
      if (a.priority === 1) return String(b.callAt || "").localeCompare(String(a.callAt || ""));
      return 0;
    });

  return { followUps, auditCalls };
}

export function nextFollowUpAfterSend(cadence: CadenceKind | null, now = new Date()): string | null {
  if (cadence === "same-day") return noonIso(addDays(now, 3));
  if (cadence === "day-3") return noonIso(addDays(now, 4));
  return null;
}

export function isPaymentOrOnboardingEmail(subject: string, summary: string): boolean {
  const text = `${subject} ${summary}`.toLowerCase();
  return [
    "stripe",
    "payment",
    "paid",
    "invoice",
    "onboarding details",
    "onboarding session",
    "buy.stripe",
    "questionnaire",
  ].some((needle) => text.includes(needle));
}

export function emailHistoryItem(thread: EmailThread): HistoryItem {
  const label = thread.direction === "out" ? "Sent" : "Received";
  return {
    date: thread.date,
    action: `${label}: ${thread.subject}`,
    type: "email",
    subject: thread.subject,
    summary: thread.summary,
    gmailThreadId: thread.gmailThreadId,
    direction: thread.direction,
  };
}

const FAKE_SAMPLE_SUMMARIES = [
  "one slot left, refund if an offer lands",
  "still in interviews and will decide this week",
  "the service outline and asked how they'd like to move forward",
];

export function isFakeSampleEmail(item: {
  gmailThreadId?: string | null;
  gmailMessageId?: string | null;
  summary?: string | null;
}): boolean {
  const id = `${item.gmailThreadId || ""}${item.gmailMessageId || ""}`;
  if (id.startsWith("mock-") || id.includes("mock-")) return true;
  const summary = (item.summary || "").toLowerCase();
  return FAKE_SAMPLE_SUMMARIES.some((needle) => summary.includes(needle));
}

export function isCalendarNotification(item: { from?: string | null; subject?: string | null }): boolean {
  const from = (item.from || "").toLowerCase();
  const subject = (item.subject || "").toLowerCase();
  if (
    from.includes("calendly") ||
    from.includes("calendar-notification") ||
    from.includes("noreply@google.com")
  ) {
    return true;
  }
  return /^(new event|updated|canceled|cancelled|invitation):/i.test(subject);
}

export function isSalesFocusEmail(item: {
  subject?: string | null;
  action?: string | null;
}): boolean {
  const subject = (item.subject || "").toLowerCase();
  const action = (item.action || "").toLowerCase();
  return subject.includes("sales focus email") || action.includes("sales focus email");
}

export function isIgnoredEmail(item: {
  from?: string | null;
  subject?: string | null;
  action?: string | null;
  summary?: string | null;
  gmailThreadId?: string | null;
  gmailMessageId?: string | null;
}): boolean {
  return isFakeSampleEmail(item) || isCalendarNotification(item) || isSalesFocusEmail(item);
}

export function isEmailHistoryItem(item: HistoryItem): boolean {
  if (item.type === "email") return true;
  if (item.gmailThreadId) return true;
  return /^(sent|received):/i.test(item.action || "");
}
