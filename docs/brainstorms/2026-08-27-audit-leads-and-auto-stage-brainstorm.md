---
date: 2026-08-27
topic: audit-leads-and-auto-stage
---

# Overemployed Risk Audit → CRM, Auto-Import, and Board States

## What We're Building

Project 2. Kill the manual Fathom “Import as Lead” tab. Nightly/poll auto-import from Fathom and/or Granola. Match on **email only**. Move cards by relationship state — never to Closed.

## Why This Approach

The Fathom page is a human sync layer. Fathom already lists meetings; Granola has a public notes API. Import should run in the background. The board is messy because columns mixed *reminders* (Nudge Scheduled, a stuffed Decision Pending) with *relationship state*. Reminders belong on Today’s Focus. Columns only answer “where is this person in the relationship?”

## Key Decisions

- **Match key:** email. Names can differ.
- **Sources:** Fathom and Granola. If both exist for the same attendee + time window, AI-merge into one client summary (Granola as the cleaner notes, Fathom for action items + recording link). If only one exists, use that.
- **Existing lead:** attach notes. If they are in New Lead (Backlog), move to Pitch Call and start 0/3/7. If they are Closed or Disqualified, attach only — never move.
- **No matching email:** create a card in Pitch Call (they just had a call).
- **Never auto-move to Closed.** Human drag only.
- **Allowed auto-moves:** New Lead → Pitch Call → Decision Pending or Future Client.
- **Rename Backlog → New Lead.** Audit-without-call lands here.
- **Drop Nudge Scheduled** (pending confirm). Follow-up dates + Today’s Focus replace it.
- **Ghosted after 0/3/7 with no reply, not DQ/closed, already had a call → Future Client.** That is the missing bucket. Decision Pending is only “they said they are deciding this cohort,” and it should stay small.

Proposed Jumpseat columns:

| Column | Who lives here |
|---|---|
| New Lead | Audit or inbound, no call yet |
| Pitch Call | Call happened, 0/3/7 sequence running |
| Decision Pending | Said they are deciding *this cohort* — hot, short-lived |
| Future Client | Not this cohort, or went silent after the sequence |
| Closed | Paid — human only |
| Disqualified | Human only |

## Open Questions

- Confirm dropping Nudge Scheduled rather than renaming it “Not Scheduled.”
- Granola API key available (Business/Enterprise)? If not, Fathom-only for v1.

## Next Steps

→ After Project 1. Webhook/poll import, Granola+Fathom merge, stage rules, audit Zapier intake.
