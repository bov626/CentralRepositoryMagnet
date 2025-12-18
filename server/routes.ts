import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertBlockerSchema } from "@shared/schema";
import { z } from "zod";
import { getUpcomingEvents, createEvent } from "./google-calendar";
import { listMeetings, getMeeting, extractLeadDataFromMeeting, isFathomConfigured } from "./fathom";
import { summarizeClientNeeds } from "./ai-summarize";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Lead routes
  app.get("/api/leads", async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      res.json(allLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const newLead = await storage.createLead(validatedData);
      res.status(201).json(newLead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lead data", details: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const updatedLead = await storage.updateLead(req.params.id, req.body);
      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const success = await storage.deleteLead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Blocker routes
  app.get("/api/blockers", async (req, res) => {
    try {
      const allBlockers = await storage.getAllBlockers();
      res.json(allBlockers);
    } catch (error) {
      console.error("Error fetching blockers:", error);
      res.status(500).json({ error: "Failed to fetch blockers" });
    }
  });

  app.post("/api/blockers", async (req, res) => {
    try {
      const validatedData = insertBlockerSchema.parse(req.body);
      const newBlocker = await storage.createBlocker(validatedData);
      res.status(201).json(newBlocker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid blocker data", details: error.errors });
      }
      console.error("Error creating blocker:", error);
      res.status(500).json({ error: "Failed to create blocker" });
    }
  });

  app.patch("/api/blockers/:id", async (req, res) => {
    try {
      const updatedBlocker = await storage.updateBlocker(req.params.id, req.body);
      if (!updatedBlocker) {
        return res.status(404).json({ error: "Blocker not found" });
      }
      res.json(updatedBlocker);
    } catch (error) {
      console.error("Error updating blocker:", error);
      res.status(500).json({ error: "Failed to update blocker" });
    }
  });

  // Google Calendar routes - only sales meetings with attendees
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const events = await getUpcomingEvents(15);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/events", async (req, res) => {
    try {
      const { summary, description, startTime, endTime, attendeeEmail } = req.body;
      const event = await createEvent(
        summary,
        description,
        new Date(startTime),
        new Date(endTime),
        attendeeEmail
      );
      res.status(201).json(event);
    } catch (error: any) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: error.message || "Failed to create calendar event" });
    }
  });

  // Fathom API routes
  app.get("/api/fathom/status", async (req, res) => {
    res.json({ configured: isFathomConfigured() });
  });

  app.get("/api/fathom/meetings", async (req, res) => {
    try {
      if (!isFathomConfigured()) {
        return res.status(400).json({ error: "Fathom API key not configured" });
      }
      const meetings = await listMeetings({
        includeSummary: true,
        includeActionItems: true,
      });
      res.json(meetings);
    } catch (error: any) {
      console.error("Error fetching Fathom meetings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch meetings from Fathom" });
    }
  });

  app.post("/api/fathom/import/:recordingId", async (req, res) => {
    try {
      if (!isFathomConfigured()) {
        return res.status(400).json({ error: "Fathom API key not configured" });
      }
      
      const recordingId = parseInt(req.params.recordingId);
      const meeting = await getMeeting(recordingId);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      const leadData = extractLeadDataFromMeeting(meeting);
      
      // Use AI to summarize just the client's needs (not the pitch)
      let clientSummary = leadData.summary;
      try {
        clientSummary = await summarizeClientNeeds(leadData.summary, leadData.keyTakeaways);
      } catch (error) {
        console.error("AI summarization failed, using original:", error);
      }
      
      const newLead = await storage.createLead({
        name: leadData.name,
        email: leadData.email || null,
        company: leadData.company,
        linkedIn: null,
        tags: [],
        pipeline: "jumpseat",
        stage: "backlog",
        onboardingStage: null,
        nextFollowUp: leadData.nextFollowUp ? new Date(leadData.nextFollowUp) : null,
        actionNeeded: leadData.keyTakeaways.length > 0,
        summary: clientSummary,
        keyTakeaways: leadData.keyTakeaways,
        blocker: null,
        decisionTrigger: null,
        followUpAngle: null,
        recordingLink: leadData.recordingLink,
        history: [{
          date: new Date().toISOString(),
          action: `Imported from Fathom: ${meeting.title}`
        }],
      });
      
      res.status(201).json(newLead);
    } catch (error: any) {
      console.error("Error importing from Fathom:", error);
      res.status(500).json({ error: error.message || "Failed to import meeting" });
    }
  });

  return httpServer;
}
