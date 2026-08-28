export const AGENCY_LIST = 8000;
export const AGENCY_UPFRONT = 7000;
export const AGENCY_HALF = 4000;
export const COMMUNITY_MRR_PER_MEMBER = 250;

export type PaymentPlan = "upfront" | "fifty_fifty";

function firstDollarAmount(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/(\d{3,5})/);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 500 ? n : null;
}

function isThisMonth(value: Date | string | null | undefined, now = new Date()): boolean {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

type MoneyLead = {
  pipeline?: string | null;
  stage?: string | null;
  archived?: boolean | null;
  pitchAmount?: string | null;
  paymentPlan?: string | null;
  amountPaid?: number | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  boughtAt?: Date | string | null;
  history?: unknown;
};

export function agencyExpected(lead: MoneyLead): number {
  const custom = firstDollarAmount(lead.pitchAmount);
  if (lead.paymentPlan === "upfront") return custom && custom !== AGENCY_LIST ? custom : AGENCY_UPFRONT;
  if (custom) return custom;
  return AGENCY_LIST;
}

export function agencyPaid(lead: MoneyLead): number {
  if (lead.amountPaid && lead.amountPaid > 0) return lead.amountPaid;
  if (lead.stage !== "closed") return 0;
  return lead.paymentPlan === "upfront" ? agencyExpected(lead) : Math.round(agencyExpected(lead) / 2);
}

export function agencyToCollect(lead: MoneyLead): number {
  if (lead.stage !== "closed") return 0;
  return Math.max(0, agencyExpected(lead) - agencyPaid(lead));
}

export function closedThisMonth(lead: MoneyLead, now = new Date()): boolean {
  if (lead.archived || lead.pipeline !== "jumpseat" || lead.stage !== "closed") return false;
  const history = Array.isArray(lead.history) ? lead.history : [];
  const closed = [...history].reverse().find((h: any) => String(h.action || "").toLowerCase().includes("closed"));
  if (closed?.date) return isThisMonth(closed.date, now);
  return isThisMonth(lead.updatedAt, now);
}

export function communityBought(lead: MoneyLead): boolean {
  return lead.pipeline === "community" && lead.stage === "bought" && !lead.archived;
}

export function boughtThisMonth(lead: MoneyLead, now = new Date()): boolean {
  if (!communityBought(lead)) return false;
  if (lead.boughtAt) return isThisMonth(lead.boughtAt, now);
  return isThisMonth(lead.createdAt, now);
}

export function moneySnapshot(leads: MoneyLead[], now = new Date()) {
  const agencyClosed = leads.filter((l) => closedThisMonth(l, now));
  const paid = agencyClosed.reduce((sum, l) => sum + agencyPaid(l), 0);
  const toCollect = agencyClosed.reduce((sum, l) => sum + agencyToCollect(l), 0);
  // Outstanding 50/50 from earlier months still sitting on Closed cards
  const openCollect = leads
    .filter((l) => l.pipeline === "jumpseat" && l.stage === "closed" && !l.archived)
    .reduce((sum, l) => sum + agencyToCollect(l), 0);

  const members = leads.filter(communityBought).length;
  const newMembers = leads.filter((l) => boughtThisMonth(l, now)).length;

  return {
    agency: {
      closed: agencyClosed.length,
      paid,
      toCollect: openCollect,
      paidThisMonth: paid,
      toCollectThisMonth: toCollect,
      paidSource: "crm" as const,
    },
    community: {
      members,
      mrr: members * COMMUNITY_MRR_PER_MEMBER,
      mrrGrowth: newMembers * COMMUNITY_MRR_PER_MEMBER,
      newMembers,
    },
  };
}

export function withStripePaid(
  snapshot: ReturnType<typeof moneySnapshot>,
  stripe: { dollars: number; configured: boolean } | null,
) {
  if (!stripe?.configured) return snapshot;
  return {
    ...snapshot,
    agency: {
      ...snapshot.agency,
      paid: stripe.dollars,
      paidThisMonth: stripe.dollars,
      paidSource: "stripe" as const,
    },
  };
}

export function formatDollars(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatSignedDollars(n: number): string {
  if (n > 0) return `+${formatDollars(n)}`;
  if (n < 0) return `-${formatDollars(Math.abs(n))}`;
  return formatDollars(0);
}

export const DENVER_TZ = "America/Denver";

export function monthKeyFromDate(value: Date | string | number, timeZone = DENVER_TZ): string {
  const d = value instanceof Date ? value : new Date(typeof value === "number" ? value : String(value));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(d).slice(0, 7);
}

export function lastMonthKeys(count = 12, now = new Date(), timeZone = DENVER_TZ): string[] {
  const [yearStr, monthStr] = monthKeyFromDate(now, timeZone).split("-");
  let year = Number(yearStr);
  let month = Number(monthStr);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });
}

export function monthLabelLong(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

export type MoneyMonth = {
  key: string;
  label: string;
  labelLong: string;
  jumpseat: number;
  skoolGrowth: number;
  skoolMrr: number;
  skoolMembers: number;
};

export function skoolMonthlySeries(
  leads: MoneyLead[],
  monthKeys: string[],
): MoneyMonth[] {
  const members = leads.filter(communityBought).map((l) => ({
    key: monthKeyFromDate(l.boughtAt || l.createdAt || new Date()),
  }));

  return monthKeys.map((key) => {
    const newThisMonth = members.filter((m) => m.key === key).length;
    const membersToDate = members.filter((m) => m.key <= key).length;
    return {
      key,
      label: monthLabel(key),
      labelLong: monthLabelLong(key),
      jumpseat: 0,
      skoolGrowth: newThisMonth * COMMUNITY_MRR_PER_MEMBER,
      skoolMrr: membersToDate * COMMUNITY_MRR_PER_MEMBER,
      skoolMembers: membersToDate,
    };
  });
}

export function buildMoneyView(
  leads: MoneyLead[],
  stripe: { configured: boolean; thisMonth: number; total: number; byMonth: Record<string, number> },
  monthCount = 12,
) {
  const keys = lastMonthKeys(monthCount);
  const skool = skoolMonthlySeries(leads, keys);
  const months: MoneyMonth[] = skool.map((row) => ({
    ...row,
    jumpseat: stripe.byMonth[row.key] || 0,
  }));
  const latest = months[months.length - 1];
  return {
    thisMonth: {
      jumpseat: stripe.configured ? stripe.thisMonth : (latest?.jumpseat || 0),
      skoolGrowth: latest?.skoolGrowth || 0,
    },
    totals: {
      jumpseat: stripe.total,
      skoolMrr: latest?.skoolMrr || 0,
      skoolMembers: latest?.skoolMembers || 0,
    },
    months,
    stripeConfigured: stripe.configured,
  };
}
