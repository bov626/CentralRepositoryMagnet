---
date: 2026-08-27
topic: skool-community-crm
---

# Community Pipeline + Skool Member CRM

## What We're Building

Project 3. Treat the Community kanban as the Skool CRM: members in, Bought as a column, follow-ups and new-member onboarding emails from the same Today’s Focus / Gmail path as Jumpseat. Stripe is the money source: a **month-to-date sales total** on Today’s Focus (motivating, not a full analytics suite).

Community columns today: Backlog, To Pitch, Would Buy. Add **Bought**.

## Why This Approach

Skool has no real public API, and Skool **does not send per-member charges to Stripe** — only a weekly payout total. Stripe cannot tell us who bought Community or what MRR is. Agency money stays on Stripe (per person). Community people and MRR have to come from Skool (member list / Skool’s MRR number), or from paid-member count × $250.

## Key Decisions

- New Community stage: `bought`.
- New member joined Skool → Community lead (dedupe on email). Start onboarding email sequence via Today’s Focus, same send model as Project 1.
- **Bought** is a Skool signal (paid member), not a Stripe charge. Stripe weekly Community payout is cash-in only and is not mapped to cards.
- Follow-ups to members reuse Gmail sync + cadence, scoped to `pipeline = community`.
- Do not try to rebuild Skool’s classroom, chat, or comments in this app. This is the **people and email** layer.
- **Today’s Focus money strip (not a dashboard):** Agency vs Community, people closed this month, Agency paid vs to-collect, Community MRR / MRR growth.
- Agency list **$8,000**. Upfront **$7,000**. 50/50 **$4,000 + $4,000** (most common). Custom `pitchAmount` still wins if you quoted something else.
- Agency **paid** = Stripe charges for Jumpseat. **To collect** = remaining second $4k on 50/50 deals.
- Community **$250/month**. Metric is **MRR and MRR growth**. MRR = paid members × $250 (or Skool’s reported MRR). Do **not** derive MRR from the weekly Stripe lump sum — that mixes new + recurring and hides churn.
- Closed count = Agency Closed this month. Community is counted as members/MRR, not “closes.”
- Never auto-move to Closed from Stripe.

## Open Questions

- How we get paid Skool members into the CRM: member export, Zapier “joined,” or you type MRR / drag to Bought.
- Free community vs paid community (skool.com/remote vs skool.com/job) — one board or two sources?
- What “onboarding flow emails for people who just joined” actually are (day 0 / 3 / 7 copy).
- Whether Would Buy vs To Pitch still mean anything once members sync automatically.

## Next Steps

→ After Projects 1 and 2. Confirm Stripe vs Skool Zapier as the member source, then plan schema + Bought column + sequences.
