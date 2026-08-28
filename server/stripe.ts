import Stripe from "stripe";

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

export type StripeMonthPaid = {
  dollars: number;
  chargeCount: number;
  configured: boolean;
};

export async function jumpseatPaidThisMonth(): Promise<StripeMonthPaid> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { dollars: 0, chargeCount: 0, configured: false };
  }

  const stripe = new Stripe(key);
  const gte = startOfMonthUnix();
  let totalCents = 0;
  let chargeCount = 0;
  let startingAfter: string | undefined;

  for (let i = 0; i < 20; i++) {
    const page = await stripe.charges.list({
      limit: 100,
      created: { gte },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const charge of page.data) {
      if (charge.status !== "succeeded") continue;
      totalCents += charge.amount - (charge.amount_refunded || 0);
      chargeCount += 1;
    }
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  return {
    dollars: Math.round(totalCents / 100),
    chargeCount,
    configured: true,
  };
}
