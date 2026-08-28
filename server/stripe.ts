import Stripe from "stripe";
import { lastMonthKeys, monthKeyFromDate } from "@shared/money";

const DENVER = "America/Denver";

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value || "GMT-00:00";
  const match = tz.match(/GMT([+-])(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000;
}

export function startOfMonthUnix(timeZone = DENVER, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const asUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offset = zoneOffsetMs(new Date(asUtc), timeZone);
  return Math.floor((asUtc - offset) / 1000);
}

function startOfMonthKeyUnix(key: string, timeZone = DENVER): number {
  const [year, month] = key.split("-").map(Number);
  const asUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offset = zoneOffsetMs(new Date(asUtc), timeZone);
  return Math.floor((asUtc - offset) / 1000);
}

export type StripeMonthPaid = {
  dollars: number;
  chargeCount: number;
  configured: boolean;
};

export type StripeHistory = {
  configured: boolean;
  thisMonth: number;
  total: number;
  byMonth: Record<string, number>;
};

async function listSucceededCharges(gte: number): Promise<Array<{ amount: number; created: number }>> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return [];
  const stripe = new Stripe(key);
  const charges: Array<{ amount: number; created: number }> = [];
  let startingAfter: string | undefined;

  for (let i = 0; i < 40; i++) {
    const page = await stripe.charges.list({
      limit: 100,
      created: { gte },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const charge of page.data) {
      if (charge.status !== "succeeded") continue;
      charges.push({
        amount: charge.amount - (charge.amount_refunded || 0),
        created: charge.created,
      });
    }
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }
  return charges;
}

export async function jumpseatPaidHistory(monthCount = 12): Promise<StripeHistory> {
  const keys = lastMonthKeys(monthCount);
  const empty: StripeHistory = {
    configured: false,
    thisMonth: 0,
    total: 0,
    byMonth: Object.fromEntries(keys.map((k) => [k, 0])),
  };
  if (!process.env.STRIPE_SECRET_KEY) return empty;

  const charges = await listSucceededCharges(startOfMonthKeyUnix(keys[0]));
  const byMonth: Record<string, number> = { ...empty.byMonth };
  let total = 0;
  for (const charge of charges) {
    const dollars = Math.round(charge.amount / 100);
    const key = monthKeyFromDate(charge.created * 1000);
    byMonth[key] = (byMonth[key] || 0) + dollars;
    total += dollars;
  }
  const thisMonthKey = keys[keys.length - 1];
  return {
    configured: true,
    thisMonth: byMonth[thisMonthKey] || 0,
    total,
    byMonth,
  };
}

export async function jumpseatPaidThisMonth(): Promise<StripeMonthPaid> {
  const history = await jumpseatPaidHistory(1);
  return {
    dollars: history.thisMonth,
    chargeCount: 0,
    configured: history.configured,
  };
}
