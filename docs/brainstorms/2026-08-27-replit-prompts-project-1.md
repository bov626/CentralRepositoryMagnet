---
date: 2026-08-27
topic: replit-prompts-project-1
---

# Project 1 — Replit prompts (one step at a time)

Paste **one** prompt per Agent chat. Do not combine steps. After each step, verify it works, then paste the next.

Do these in order. Step 0 is you (no Agent). Steps 1–8 are Agent prompts.

---

## Step 0 — You: reconnect Gmail with read access

The app can already **send** mail via the Replit `google-mail` connector (`server/gmail.ts`). Sync needs **read/search**.

1. In Replit, open this project’s **Integrations / Connectors**.
2. Find **Google Mail** (`google-mail`).
3. Disconnect if it is already connected.
4. Connect again and accept Google’s permissions. You need at least:
   - send mail
   - **read** mail (search and open messages)
5. Sign in as the sales inbox: **wyedoyoudothis@gmail.com**.
6. Tell the Agent “Gmail is reconnected” and paste **Step 1**.

If Google only shows send and not read, the connector is still send-only — stop and fix that before Step 1.

---

## Step 1 — Prove Gmail search works

```
This CRM already sends email through the Replit Google Mail connector in server/gmail.ts (getUncachableGmailClient, sendEmail, isGmailConfigured). Do not replace that OAuth path.

Add Gmail READ using the same client:

1. In server/gmail.ts add:
   - searchEmails(query: string) using gmail.users.messages.list with q, userId 'me', maxResults ~50
   - getMessage(id) using gmail.users.messages.get format 'metadata' or 'full' so we can read Subject, Date, From, To, and a plain-text snippet/body
2. In server/routes.ts add GET /api/email/search?q=  (require q, cap results, return id, threadId, subject, from, to, date, snippet). Return a clear 401/500 if Gmail is not connected or the token lacks read scope.
3. Do not change the UI yet. Do not import a whole mailbox. Do not store anything in the database yet.

Keep sendEmail working exactly as it does today.

When done, tell me how to test: I will open a lead email I know I've written with, hit the search endpoint, and we should see those threads. If the API says insufficient permissions, say so plainly so I can reconnect Gmail with read access.
```

---

## Step 2 — Cache threads on the lead + timeline

```
Gmail search now works (server/gmail.ts + GET /api/email/search). Next: cache threads on each lead and show them on the Activity History timeline.

Data:
- Match people by lead.email only (names can differ).
- Store cached emails on the lead. Prefer a jsonb field such as emailThreads on leads in shared/schema.ts: array of { gmailThreadId, gmailMessageId, subject, snippet or summary, date, from, to, direction: 'in'|'out' }. Deduplicate by gmailThreadId or gmailMessageId.
- Do not store full raw MIME. Subject + short snippet/summary + date is enough.
- Run drizzle-kit push / schema migrate as this repo already does (db:push).

Backend:
- POST /api/email/sync/:leadId
  - 400 if the lead has no email
  - Search Gmail: `{email} -in:spam -in:trash` (covers from and to)
  - Merge new threads into the lead cache
  - For each new thread, also append a history item so the timeline can render it: include type 'email', subject, summary/snippet, date. Keep existing history items ({date, action}) working.
  - Return the updated lead
- Do not search Gmail on GET lead or on panel open.

UI (client/src/components/lead-details.tsx):
- Add a Sync emails button on the lead panel (only if lead.email exists). Call POST /api/email/sync/:id, show loading/error toast.
- In Activity History, if an item is an email (or matches a cached thread), show subject, summary, and date — not just a generic action string. Newest first, as today.

Do not build nightly cron, Today's Focus, or draft generation yet.
```

---

## Step 3 — Nightly sync for every lead with an email

```
Per-lead POST /api/email/sync/:leadId already works. Add a nightly job that syncs every lead that has an email.

- Add POST /api/email/sync-all (protect it: same CRM_PASSWORD / existing auth pattern as other admin routes in server/routes.ts, or a secret header). Loop leads with a non-empty email, call the same sync logic as per-lead, skip/log failures, return { synced, failed }.
- Cap concurrency so we do not blow Gmail quota (e.g. a few at a time, brief delay).
- Schedule it once per night. This is a Replit app: use a simple in-process nightly timer (e.g. run around 2am America/Denver) AND document that Replit must stay awake or use a Scheduled Deployment hitting POST /api/email/sync-all. Do not invent a new hosting platform.
- Do not sync on every page load.

Do not change Today's Focus or drafts yet.
```

---

## Step 4 — Sending from the CRM writes the timeline

```
client/src/components/compose-email-modal.tsx POSTs /api/email/send but does not log history.

When send succeeds:
- Append a history/email-thread item on that lead: subject, a short summary (first lines of body is fine), date, direction out, to address.
- Also add to emailThreads cache if that field exists, with a stable id (use Gmail's returned id if send returns it; otherwise a local id).
- Keep the existing success toast.

If /api/email/send does not know the lead id, pass leadId from the modal (emailingLead.id) so the server can update the right card.

Do not auto-send anything. Do not create Gmail drafts.
```

---

## Step 5 — Follow-up cadence and action-item dates

```
Follow-up dates drive who appears on Today. Implement cadence without building the new Today UI yet.

Rules:
- Keep one nextFollowUp on the lead.
- Action items should support an optional due date. Migrate actionItems from string[] to objects { text, dueDate?: string | null } if needed, and keep old string items working (treat as undated).
- If nextFollowUp is empty, the effective follow-up is the soonest dated open action item.
- After a Fathom-imported sales call (see server/fathom.ts extractLeadDataFromMeeting and the Fathom import route): set first reminder to TODAY, not +3 days. Create or schedule the 0/3/7 sequence: same day, day 3, day 7. Do not auto-email clients. Only set dates.
- Long cadence from lead.createdAt: 3, 6, 9, 12 months. A person is "due" on that calendar day unless any cached email (or history email) was sent within ±1 day of that milestone. Skip that milestone if so.
- Helper used later by Today: list leads due today = (effective follow-up is today) OR (3/6/9/12 milestone today and not skipped). Exclude stage closed and disqualified.

Wire action-item due dates in lead-details so I can set a date on an item. Do not rebuild Today's Focus in this step.

Never auto-move a card to Closed.
```

---

## Step 6 — Rebuild Today's Focus as the send queue

```
Rebuild client/src/pages/today.tsx. It is unused because it lists calendar meetings, pitch calls, and overdue piles.

Replace it with a send queue:
- Remove sales meetings, pitch-call listings, overdue, and "waiting on me".
- List leads due today using the helper from Step 5 (follow-up date today + 3/6/9/12 check-ins, skip ±1 day if already emailed, exclude closed/disqualified).
- Each row: name, why they're here (e.g. "Day 3 bump" / "6-month check-in" / "Follow-up date").
- Expand in place (not only the full lead sheet): summary (from lead.summary), subject + draft body (placeholder copy is OK if Step 7 is not done — use existing EMAIL_TEMPLATES in compose-email-modal.tsx), and Send.
- Send uses the existing /api/email/send path, logs timeline (Step 4), then clears or advances that follow-up so they leave the queue.
- Empty state: "You're all caught up for today."

Keep the page at /today. Do not add a full dashboard or Stripe numbers (that's Project 3).
```

---

## Step 7 — Draft from Closed-won emails

```
Today's Focus Send still uses generic templates. Generate drafts from emails that already closed deals.

- Source: cached emailThreads / Gmail outbound to leads whose stage is "closed" (~21 people). Skip threads that look like onboarding, Stripe/payment links, or contracts after they already paid.
- Same-day / first-touch drafts: pattern on the converting first outbound email (like the existing "initial-service" template: service outline, let's move forward).
- Day 3 / day 7: pattern on short bump emails (like "follow-up" template).
- 3/6/9/12 check-in: simple check-in template until Closed has real check-in examples.
- Personalize the top from this lead's summary / Fathom notes / last thread. Keep a proven middle. Sign off like existing templates (– W.W.).
- Use the existing AI helper style in server/ai-summarize.ts (Replit AI integrations OpenAI). Add a function that returns { subject, body } for a lead + cadence type.
- Endpoint e.g. POST /api/email/draft/:leadId with { cadence } or infer cadence from why they're due today.
- Today's Focus loads that draft into the expanded row. I can edit before Send.
- Fallback to EMAIL_TEMPLATES in compose-email-modal.tsx if there are not enough Closed examples for that cadence type.

Never send without me clicking Send. Never email clients automatically.
```

---

## Step 8 — Morning Sales Focus Email

```
Once a day, email Wilson a reminder. Never email clients.

- Subject: Sales Focus Email
- To: wyedoyoudothis@gmail.com (same From already used in compose-email-modal.tsx)
- Body: "You have N follow-ups today", list names, one link to Today's Focus. Use the public app URL from REPLIT_DEV_DOMAIN / REPLIT_INTERNAL_APP_DOMAIN / a sensible env APP_URL, path /today.
- Use the same due-today list as Step 6.
- If N is 0, still send a short "You're all caught up" or skip — pick skip if zero so I am not spammed. Document which you picked.
- Send in the morning America/Denver (e.g. 7:30am) via existing sendEmail in server/gmail.ts.
- Same hosting constraint as nightly sync: in-process schedule + document Scheduled Deployment hitting POST /api/email/daily-focus (protect it like sync-all).

Do not put full draft copy in the email. Do not auto-send to leads. Do not build Gmail drafts.
```
