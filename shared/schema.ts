import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  linkedIn: text("linked_in"),
  email: text("email"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  pipeline: text("pipeline").notNull(), // "jumpseat" | "community"
  stage: text("stage").notNull(),
  onboardingStage: text("onboarding_stage"), // null = not onboarding, or "future-cohort" | "call-1" | "call-2" | "document-creation" | "apply-ready"
  nextFollowUp: timestamp("next_follow_up"),
  summary: text("summary"),
  keyTakeaways: text("key_takeaways").array().default(sql`ARRAY[]::text[]`),
  pitchAmount: text("pitch_amount"),
  actionItems: text("action_items").array().default(sql`ARRAY[]::text[]`),
  followUpAngle: text("follow_up_angle"),
  recordingLink: text("recording_link"),
  calendarEventId: text("calendar_event_id"), // Google Calendar event ID for deduplication
  fathomRecordingId: integer("fathom_recording_id"), // Fathom recording ID for tracking enrichment
  coverLetterIdeas: text("cover_letter_ideas"), // Cover letter ideas/notes for this lead
  onboardingNotes: text("onboarding_notes"), // General notes for onboarding
  resumePathA: text("resume_path_a"), // Object storage path for resume A
  resumePathB: text("resume_path_b"), // Object storage path for resume B
  coverLetterPathA: text("cover_letter_path_a"), // Object storage path for cover letter A
  coverLetterPathB: text("cover_letter_path_b"), // Object storage path for cover letter B
  archived: boolean("archived").notNull().default(false), // Hide from Kanban without deleting
  history: jsonb("history").notNull().default(sql`'[]'::jsonb`), // Array of {date: string, action: string}
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const blockers = pgTable("blockers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  category: text("category").notNull(), // "price" | "timing" | "spouse" | "trust" | "logistics" | "other"
  count: integer("count").notNull().default(1),
  response: text("response").notNull(),
  exampleLeadIds: text("example_lead_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onboardingSubmissions = pgTable("onboarding_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tier: text("tier").notNull(), // "God Tier Status" | "Gamer" | "Operator" | "NPC"
  totalPoints: integer("total_points").notNull(),
  answers: jsonb("answers").notNull(), // All form answers as JSON
  resumePath: text("resume_path"), // Object storage path for resume file
  coverLetterPath: text("cover_letter_path"), // Object storage path for cover letter file
  linkedIn: text("linked_in"), // LinkedIn URL
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockerSchema = createInsertSchema(blockers).omit({
  id: true,
  createdAt: true,
});

export const insertOnboardingSubmissionSchema = createInsertSchema(onboardingSubmissions).omit({
  id: true,
  submittedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Blocker = typeof blockers.$inferSelect;
export type InsertBlocker = z.infer<typeof insertBlockerSchema>;
export type OnboardingSubmission = typeof onboardingSubmissions.$inferSelect;
export type InsertOnboardingSubmission = z.infer<typeof insertOnboardingSubmissionSchema>;
