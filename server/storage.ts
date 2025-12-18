import { db } from "./db";
import { type User, type InsertUser, type Lead, type InsertLead, type Blocker, type InsertBlocker, users, leads, blockers } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Blocker methods
  getAllBlockers(): Promise<Blocker[]>;
  getBlocker(id: string): Promise<Blocker | undefined>;
  createBlocker(blocker: InsertBlocker): Promise<Blocker>;
  updateBlocker(id: string, blocker: Partial<InsertBlocker>): Promise<Blocker | undefined>;
  deleteBlocker(id: string): Promise<boolean>;
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
    const [lead] = await db.select().from(leads).where(eq(leads.email, email));
    return lead;
  }

  async getLeadByCalendarEventId(calendarEventId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.calendarEventId, calendarEventId));
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
}

export const storage = new DatabaseStorage();
