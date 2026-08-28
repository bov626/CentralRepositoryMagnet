---
date: 2026-08-27
topic: crm-full-scope
---

# Jumpseat CRM — Full Scope for Approval

Three projects, in order. Nothing auto-emails clients. Nothing auto-moves anyone to Closed.

## Project 1 — Email + Today’s Focus (build first)

**Gmail**
- Nightly sync of all leads that have an email. Search `from:them OR to:them`. Cache in the app.
- Per-lead **Sync** button: same search, that person only, pull any new threads.
- Do not search Gmail every time a card opens.
- Timeline: each thread shows subject, 1–2 sentence summary, date.
- Emails sent from the CRM also land on the timeline.

**Follow-up dates**
- One follow-up date on the lead.
- Action items can have their own due dates. If the lead has no date, use the soonest action-item date.
- After a sales call: **same day**, **day 3**, **day 7**. Then stop.
- Long cadence from **card created**: 3 / 6 / 9 / 12 months. Skip a milestone if any email went out within ±1 day of it.

**Today’s Focus (the work queue)**
- Remove: sales meetings, pitch-call listings, current overdue/waiting piles.
- Show who to email today (follow-up date today + 3/6/9/12 check-ins).
- Each person expands to: summary, subject, draft, **Send**.
- Send logs the timeline and clears that follow-up.

**Morning email to Wilson only**
- Subject: `Sales Focus Email`.
- Body: how many follow-ups, names, one link to Today’s Focus.
- Never auto-send to clients.

**Drafts**
- Top: personalized from this lead’s call notes / last thread.
- Middle: cloned from outbound emails to **Closed** (~21 deals). Skip onboarding/Stripe/payment threads.
- Same-day drafts from converting first-touch emails. Day 3/7 from bumps. Check-ins from a simple template until Closed has real check-in examples.
- Fallback to existing templates only if that type has no Closed examples.
- Wilson edits, then Send.

## Project 2 — Audit in, calls auto-import, board cleanup

**Overemployed Risk Audit**
- Keep: site → Zapier → DocRaptor.
- Add: Zapier POSTs name/email/audit (PDF link if available) into this CRM.
- No call yet → **New Lead** (renamed Backlog). Same email later upgrades that card, no duplicate.

**Fathom / Granola**
- Kill manual “Import as Lead.” Background import (poll or webhook).
- Match on **email only**.
- Both sources for the same meeting: Granola notes + Fathom action items and recording, AI-merged. One source: use that one.
- Existing New Lead → Pitch Call, attach notes, start same-day / 3 / 7.
- No matching email → create in Pitch Call.
- Closed or Disqualified: attach notes only. Never move.

**Jumpseat columns (relationship state, not a to-do list)**

| Column | Who |
|---|---|
| New Lead | Audit or inbound, no call yet |
| Pitch Call | Call happened, 0/3/7 running |
| Decision Pending | Said they are deciding *this cohort* — small, hot |
| Future Client | Not this cohort, **or** 0/3/7 unanswered |
| Closed | Paid — human drag only |
| Disqualified | Human drag only |

- Drop **Nudge Scheduled**. Dates + Today’s Focus replace it.
- Auto-moves only: New Lead → Pitch Call → Decision Pending or Future Client.
- This cohort / interested now → stay in Pitch Call or Decision Pending with 0/3/7.
- Not now / when ready / ghosted → Future Client with 3/6/9/12.

## Project 3 — Community / Skool + money strip

**Community board**
- Keep To Pitch / Would Buy for now. Add **Bought**.
- This CRM is people + email, not a Skool rebuild (no classroom/chat).
- New Skool member → Community lead (dedupe email), onboarding follow-ups via Today’s Focus.
- **Bought** = paid Skool member. Not a Stripe charge.
- Skool does not send per-person charges to Stripe — only a weekly payout total. Do not map that lump to cards. Do not compute MRR from it.

**Today’s Focus money strip (not a dashboard)**

Agency
- List **$8,000**. Upfront **$7,000**. Most take **$4,000 + $4,000**.
- Custom quote on the card still wins.
- This month: people closed, **paid / still to collect** (second $4k on 50/50).
- Paid from Jumpseat Stripe charges (per person).

Community
- **$250/month**.
- Metric: **MRR** and **MRR growth** = paid members × $250 (or Skool’s MRR number).
- Member source still TBD: export, Zapier joined, or manual MRR / drag to Bought.

Stripe never auto-moves anyone to Closed.

## Out of scope

- Auto-emailing clients
- Writing drafts into Gmail’s Drafts folder
- Full analytics dashboard
- Scraping Skool or unofficial Skool APIs
- Replacing DocRaptor / the audit site
- Rebuilding Skool inside this app

## Defaults if you approve as-is

- Overdue follow-ups: not a section on Today (queue stays “due today” only).
- Fathom-only if no Granola API key; both when the key exists.
- Skool members: Zapier “joined” + manual Bought/MRR until a member list exists.
- One Community board (not split by free vs paid Skool).
