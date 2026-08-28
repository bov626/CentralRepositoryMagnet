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
