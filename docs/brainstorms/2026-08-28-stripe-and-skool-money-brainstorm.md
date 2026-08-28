---
date: 2026-08-28
topic: stripe-and-skool-money
---

# Jumpseat Stripe + Skool MRR on Today

## What We're Building

Two offers, two numbers on Today’s Focus. Jumpseat cash comes from the live Stripe account (that account is Jumpseat-only). Skool cash never hits Stripe; Community MRR is paid members × $250 from Zapier → Bought.

## Why This Approach

Skool does not send payments to this Stripe. There is no weekly Skool lump to display. Agency “paid this month” is the sum of succeeded Jumpseat charges. To-collect stays on Closed 50/50 cards. Stripe never moves anyone to Closed.

## Key Decisions

- One Stripe account, Jumpseat only. No product filter needed.
- Jumpseat paid this month = Stripe succeeded charges (minus refunds), America/Denver month.
- Jumpseat to-collect = Closed cards still owed (50/50 second half). CRM only.
- Community MRR = Bought count × $250. Growth = new Bought this month × $250.
- New Skool members: Zapier POST `/api/leads/skool-member` `{ name, email, paid: true }`.
- Missing `STRIPE_SECRET_KEY`: fall back to Closed-card estimates and mark the source.
- Never auto-close from Stripe. Do not match charges onto cards in this pass.

## Open Questions

- Restricted live key in Replit Secrets (`charges:read` is enough).
- Zapier “new paid member” vs “new member” — `paid: true` only when they actually paid.

## Next Steps

Add `STRIPE_SECRET_KEY` on Replit. Pull this commit. Point Zapier at `/api/leads/skool-member`.
