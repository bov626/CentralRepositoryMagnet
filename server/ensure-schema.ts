import { sql } from "drizzle-orm";
import { db } from "./db";

const LEAD_COLUMNS: Array<{ sql: ReturnType<typeof sql>; name: string }> = [
  { name: "source", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source text` },
  { name: "audit_pdf_url", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS audit_pdf_url text` },
  { name: "granola_note_id", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS granola_note_id text` },
  { name: "payment_plan", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_plan text` },
  { name: "amount_paid", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS amount_paid integer NOT NULL DEFAULT 0` },
  { name: "bought_at", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bought_at timestamp` },
  { name: "queue_dismissed_at", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS queue_dismissed_at timestamp` },
  { name: "audit_feedback_at", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS audit_feedback_at timestamp` },
  { name: "next_step_ai", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_step_ai text` },
  { name: "next_step_manual", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_step_manual text` },
  { name: "next_step_ai_at", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_step_ai_at timestamp` },
  { name: "job_title", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_title text` },
  { name: "audit_score", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS audit_score integer` },
  { name: "follow_up_angle", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_angle text` },
  { name: "cadence_anchor", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS cadence_anchor timestamp` },
  { name: "email_threads", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_threads jsonb NOT NULL DEFAULT '[]'::jsonb` },
  { name: "action_item_dates", sql: sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS action_item_dates jsonb NOT NULL DEFAULT '[]'::jsonb` },
];

export async function ensureLeadColumns(): Promise<void> {
  for (const column of LEAD_COLUMNS) {
    try {
      await db.execute(column.sql);
    } catch (error) {
      console.error(`[startup] add column ${column.name} skipped`, error);
    }
  }
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dismissed_calendar_events (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id text NOT NULL UNIQUE,
        recurring_event_id text,
        title text,
        dismissed_at timestamp NOT NULL DEFAULT now()
      )
    `);
  } catch (error) {
    console.error("[startup] dismissed_calendar_events table skipped", error);
  }
}
