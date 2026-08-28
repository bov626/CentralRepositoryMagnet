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
  | "follow-up-date";

export type DueToday = {
  due: boolean;
  reason: string;
  cadence: CadenceKind | null;
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
  pipeline?: string | null;
  stage?: string | null;
  archived?: boolean | null;
  nextFollowUp?: string | Date | null;
  actionItemDates?: unknown;
  cadenceAnchor?: string | Date | null;
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

function outboundEmailDates(lead: FollowUpLead): Date[] {
  const threads = Array.isArray(lead.emailThreads) ? (lead.emailThreads as EmailThread[]) : [];
  const fromThreads = threads
    .filter((t) => t.direction === "out")
    .map((t) => parseDate(t.date))
    .filter((d): d is Date => !!d);

  const history = Array.isArray(lead.history) ? (lead.history as HistoryItem[]) : [];
  const fromHistory = history
    .filter((h) => h.type === "email" && h.direction === "out")
    .map((h) => parseDate(h.date))
    .filter((d): d is Date => !!d);

  return [...fromThreads, ...fromHistory];
}

export function emailedWithinOneDay(lead: FollowUpLead, milestone: Date): boolean {
  return outboundEmailDates(lead).some((sent) => Math.abs(daysApart(sent, milestone)) <= 1);
}

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

export function dueToday(lead: FollowUpLead, now = new Date()): DueToday {
  if (lead.archived) return { due: false, reason: "", cadence: null };
  if (lead.pipeline && lead.pipeline !== "jumpseat") {
    return { due: false, reason: "", cadence: null };
  }
  if (lead.stage === "closed" || lead.stage === "disqualified") {
    return { due: false, reason: "", cadence: null };
  }

  const follow = effectiveFollowUp(lead);
  if (follow && isSameDay(follow, now)) {
    return { due: true, reason: "Follow-up date", cadence: "follow-up-date" };
  }

  const anchor = parseDate(lead.cadenceAnchor);
  if (anchor) {
    for (const step of SHORT_CADENCE) {
      const when = addDays(anchor, step.days);
      if (!isSameDay(when, now)) continue;
      if (step.days > 0 && emailedWithinOneDay(lead, when)) continue;
      return { due: true, reason: step.reason, cadence: step.cadence };
    }
  }

  const created = parseDate(lead.createdAt);
  if (created) {
    for (const check of CHECK_INS) {
      const when = addMonths(created, check.months);
      if (!isSameDay(when, now)) continue;
      if (emailedWithinOneDay(lead, when)) continue;
      return { due: true, reason: check.reason, cadence: check.cadence };
    }
  }

  return { due: false, reason: "", cadence: null };
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

export function mockThreadsForLead(name: string, email: string): EmailThread[] {
  const first = name.split(" ")[0] || name;
  const now = Date.now();
  return [
    {
      gmailThreadId: `mock-${email}-1`,
      gmailMessageId: `mock-${email}-1`,
      subject: "Service Agreement",
      summary: `After our call, sent ${first} the service outline and asked how they'd like to move forward.`,
      date: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      from: "wyedoyoudothis@gmail.com",
      to: email,
      direction: "out",
    },
    {
      gmailThreadId: `mock-${email}-2`,
      gmailMessageId: `mock-${email}-2`,
      subject: "Re: Service Agreement",
      summary: `${first} said they're still in interviews and will decide this week.`,
      date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      from: email,
      to: "wyedoyoudothis@gmail.com",
      direction: "in",
    },
    {
      gmailThreadId: `mock-${email}-3`,
      gmailMessageId: `mock-${email}-3`,
      subject: "Following up",
      summary: `Bumped ${first} — one slot left, refund if an offer lands.`,
      date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      from: "wyedoyoudothis@gmail.com",
      to: email,
      direction: "out",
    },
  ];
}
