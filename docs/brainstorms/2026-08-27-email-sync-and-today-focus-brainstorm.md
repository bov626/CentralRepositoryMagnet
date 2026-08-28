---
date: 2026-08-27
topic: email-sync-and-today-focus
---

# Email Sync, Today’s Focus, and Follow-up Cadence

## What We're Building

Turn the CRM from a manual log into a send queue. Gmail syncs into each lead’s timeline. Today’s Focus becomes the place to hammer through follow-ups (summary, subject, draft, Send). A morning email to Wilson is only a reminder to open that page.

## Why This Approach

Gmail drafts and live inbox search on every card open were considered and rejected for v1. Cached nightly sync plus a per-lead Sync button stays fast, stays inside the CRM, and still powers the daily reminder. Drafts are generated from emails that already converted (Closed tab), not from unused templates alone.

## Key Decisions

- **Sync:** Nightly background job for all leads with an email. Per-lead Sync button searches `from:them OR to:them`, caches threads, appends new ones to the timeline (subject, summary, date). Sending from the CRM also writes to the timeline.
- **Do not search Gmail on every card open.** Cache is the source of truth in the UI.
- **Daily email:** Sent to Wilson only. Subject: `Sales Focus Email`. Body: count + names + one link to Today’s Focus. Never auto-send to clients.
- **Today’s Focus:** Strip sales meetings, pitch-call listings, and the current overdue/waiting piles. Show who to email today. Each row expands to summary, subject, draft copy, Send. Send logs history and clears that follow-up.
- **Who appears today:** Follow-up date is today (or overdue, if we keep a thin overdue strip later — v1 is due today only unless derived from cadence). Plus 3 / 6 / 9 / 12 month check-ins from **card createdAt**. Skip a milestone if any email was sent within ±1 day of it.
- **Dates:** Lead has one `nextFollowUp`. Action items can have their own due dates. If the lead has no date, use the soonest action-item date.
- **Post-call cadence:** Same day (recap / next step), day 3 (bump), day 7 (last bump). Then 3 / 6 / 9 / 12 months. After a Fathom call, first reminder is **today**, not +3 days.
- **Draft copy:** Personalized first lines from this lead’s Fathom/summary/last thread. Middle/body cloned from outbound emails to **Closed** leads that match the same purpose (same-day close email vs bump vs long check-in). ~21 closes is enough source material. Fall back to existing templates (`initial-service`, `follow-up`) only if a cadence type has no Closed examples. User edits before Send.
- **Out of scope for this pass:** Lead magnet intake, Community/Skool CRM, writing drafts into Gmail’s Drafts folder. See sibling brainstorms.

## Open Questions

- Whether overdue (missed yesterday) should still appear on Today’s Focus in v1, or only “due today” so the queue stays short.
- How strictly to exclude Closed-lead emails that are onboarding/payment rather than sales follow-up (likely: skip threads whose subject/body matches onboarding or Stripe links).

## Next Steps

→ Implementation plan for: Gmail list/read + cache, timeline, cadence dates, Today’s Focus send queue, Sales Focus Email, Closed-won draft generation.
