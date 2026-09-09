import { db } from "./db";
import { type User, type InsertUser, type Lead, type InsertLead, type Blocker, type InsertBlocker, type OnboardingSubmission, type InsertOnboardingSubmission, users, leads, blockers, onboardingSubmissions, dismissedCalendarEvents, rejectedLeads, jobRuns } from "@shared/schema";
import { and, eq, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Lead methods
  getAllLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadByEmail(email: string): Promise<Lead | undefined>;
  getLeadByCalendarEventId(calendarEventId: string): Promise<Lead | undefined>;
  getLeadByFathomRecordingId(recordingId: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Blocker methods
  getAllBlockers(): Promise<Blocker[]>;
  getBlocker(id: string): Promise<Blocker | undefined>;
  createBlocker(blocker: InsertBlocker): Promise<Blocker>;
  updateBlocker(id: string, blocker: Partial<InsertBlocker>): Promise<Blocker | undefined>;
  deleteBlocker(id: string): Promise<boolean>;

  // Onboarding submission methods
  getAllOnboardingSubmissions(): Promise<OnboardingSubmission[]>;
  createOnboardingSubmission(submission: InsertOnboardingSubmission): Promise<OnboardingSubmission>;
  getDismissedCalendarEvents(): Promise<Array<{ eventId: string; recurringEventId: string | null }>>;
  dismissCalendarEvent(input: { eventId: string; recurringEventId?: string | null; title?: string | null }): Promise<void>;
  rejectLead(lead: Pick<Lead, "name" | "email" | "fathomRecordingId" | "calendarEventId">): Promise<void>;
  isRejectedLead(input: { email?: string | null; fathomRecordingId?: number | null; calendarEventId?: string | null }): Promise<boolean>;
  claimJobRun(job: string, dayKey: string): Promise<boolean>;
  releaseJobRun(job: string, dayKey: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Lead methods
  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByEmail(email: string): Promise<Lead | undefined> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return undefined;
    const [lead] = await db.select().from(leads).where(sql`lower(${leads.email}) = ${normalized}`);
    return lead;
  }

  async getLeadByCalendarEventId(calendarEventId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.calendarEventId, calendarEventId));
    return lead;
  }

  async getLeadByFathomRecordingId(recordingId: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.fathomRecordingId, recordingId));
    return lead;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Blocker methods
  async getAllBlockers(): Promise<Blocker[]> {
    return await db.select().from(blockers);
  }

  async getBlocker(id: string): Promise<Blocker | undefined> {
    const [blocker] = await db.select().from(blockers).where(eq(blockers.id, id));
    return blocker;
  }

  async createBlocker(insertBlocker: InsertBlocker): Promise<Blocker> {
    const [blocker] = await db.insert(blockers).values(insertBlocker).returning();
    return blocker;
  }

  async updateBlocker(id: string, updates: Partial<InsertBlocker>): Promise<Blocker | undefined> {
    const [blocker] = await db
      .update(blockers)
      .set(updates)
      .where(eq(blockers.id, id))
      .returning();
    return blocker;
  }

  async deleteBlocker(id: string): Promise<boolean> {
    const result = await db.delete(blockers).where(eq(blockers.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Onboarding submission methods
  async getAllOnboardingSubmissions(): Promise<OnboardingSubmission[]> {
    return await db.select().from(onboardingSubmissions).orderBy(desc(onboardingSubmissions.submittedAt));
  }

  async createOnboardingSubmission(insertSubmission: InsertOnboardingSubmission): Promise<OnboardingSubmission> {
    const [submission] = await db.insert(onboardingSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async getDismissedCalendarEvents(): Promise<Array<{ eventId: string; recurringEventId: string | null }>> {
    const rows = await db.select().from(dismissedCalendarEvents);
    return rows.map((row) => ({
      eventId: row.eventId,
      recurringEventId: row.recurringEventId,
    }));
  }

  async dismissCalendarEvent(input: {
    eventId: string;
    recurringEventId?: string | null;
    title?: string | null;
  }): Promise<void> {
    await db
      .insert(dismissedCalendarEvents)
      .values({
        eventId: input.eventId,
        recurringEventId: input.recurringEventId || null,
        title: input.title || null,
      })
      .onConflictDoNothing();
  }

  async rejectLead(lead: Pick<Lead, "name" | "email" | "fathomRecordingId" | "calendarEventId">): Promise<void> {
    const email = (lead.email || "").trim().toLowerCase() || null;
    const existing = await this.findRejectedLead({
      email,
      fathomRecordingId: lead.fathomRecordingId,
      calendarEventId: lead.calendarEventId,
    });
    if (existing) {
      await db
        .update(rejectedLeads)
        .set({
          email: existing.email || email,
          fathomRecordingId: existing.fathomRecordingId || lead.fathomRecordingId || null,
          calendarEventId: existing.calendarEventId || lead.calendarEventId || null,
          name: existing.name || lead.name,
        })
        .where(eq(rejectedLeads.id, existing.id));
      return;
    }
    await db.insert(rejectedLeads).values({
      email,
      fathomRecordingId: lead.fathomRecordingId || null,
      calendarEventId: lead.calendarEventId || null,
      name: lead.name,
    });
  }

  async isRejectedLead(input: {
    email?: string | null;
    fathomRecordingId?: number | null;
    calendarEventId?: string | null;
  }): Promise<boolean> {
    return !!(await this.findRejectedLead(input));
  }

  private async findRejectedLead(input: {
    email?: string | null;
    fathomRecordingId?: number | null;
    calendarEventId?: string | null;
  }) {
    const email = (input.email || "").trim().toLowerCase() || null;
    const parts = [];
    if (email) parts.push(eq(rejectedLeads.email, email));
    if (input.fathomRecordingId) parts.push(eq(rejectedLeads.fathomRecordingId, input.fathomRecordingId));
    if (input.calendarEventId) parts.push(eq(rejectedLeads.calendarEventId, input.calendarEventId));
    if (parts.length === 0) return undefined;
    const [row] = await db.select().from(rejectedLeads).where(or(...parts)).limit(1);
    return row;
  }

  async claimJobRun(job: string, dayKey: string): Promise<boolean> {
    const inserted = await db
      .insert(jobRuns)
      .values({ job, dayKey })
      .onConflictDoNothing()
      .returning({ id: jobRuns.id });
    return inserted.length > 0;
  }

  async releaseJobRun(job: string, dayKey: string): Promise<void> {
    await db.delete(jobRuns).where(and(eq(jobRuns.job, job), eq(jobRuns.dayKey, dayKey)));
  }
}

export const storage = new DatabaseStorage();
