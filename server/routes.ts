import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertBlockerSchema } from "@shared/schema";
import { z } from "zod";
import { getUpcomingEvents, createEvent } from "./google-calendar";
import { listMeetings, getMeeting, extractLeadDataFromMeeting, isFathomConfigured } from "./fathom";
import { summarizeClientNeeds } from "./ai-summarize";
import { sendEmail, isGmailConfigured } from "./gmail";

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
      // Convert date strings to Date objects for timestamp fields
      const updates = { ...req.body };
      if (updates.nextFollowUp !== undefined) {
        updates.nextFollowUp = updates.nextFollowUp ? new Date(updates.nextFollowUp) : null;
      }
      
      const updatedLead = await storage.updateLead(req.params.id, updates);
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
        clientSummary = await summarizeClientNeeds(leadData.summary, leadData.actionItems);
      } catch (error) {
        console.error("AI summarization failed, using original:", error);
      }
      
      // Check if lead with this email already exists - ENHANCE instead of duplicate
      let existingLead = null;
      if (leadData.email) {
        existingLead = await storage.getLeadByEmail(leadData.email);
      }
      
      if (existingLead) {
        // Enhance existing lead with Fathom data - APPEND instead of replace
        const existingHistory = Array.isArray(existingLead.history) ? existingLead.history : [];
        const existingActionItems = Array.isArray(existingLead.actionItems) ? existingLead.actionItems : [];
        
        // Append summary: keep existing notes, add new Fathom summary below
        let combinedSummary = existingLead.summary || '';
        if (clientSummary) {
          const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const separator = combinedSummary ? `\n\n--- Fathom Call (${dateStr}) ---\n` : '';
          combinedSummary = combinedSummary + separator + clientSummary;
        }
        
        // Merge action items: existing + new (avoid duplicates)
        const newActionItems = leadData.actionItems || [];
        const mergedActionItems = [...existingActionItems];
        for (const item of newActionItems) {
          if (!mergedActionItems.includes(item)) {
            mergedActionItems.push(item);
          }
        }
        
        const updatedLead = await storage.updateLead(existingLead.id, {
          summary: combinedSummary,
          actionItems: mergedActionItems,
          recordingLink: leadData.recordingLink,
          fathomRecordingId: recordingId,
          nextFollowUp: leadData.nextFollowUp ? new Date(leadData.nextFollowUp) : existingLead.nextFollowUp,
          history: [...existingHistory, {
            date: new Date().toISOString(),
            action: `Enhanced with Fathom call: ${meeting.title}`
          }],
        });
        res.status(200).json(updatedLead);
      } else {
        // Create new lead
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
          summary: clientSummary,
          actionItems: leadData.actionItems,
          followUpAngle: null,
          recordingLink: leadData.recordingLink,
          fathomRecordingId: recordingId,
          history: [{
            date: new Date().toISOString(),
            action: `Imported from Fathom: ${meeting.title}`
          }],
        });
        res.status(201).json(newLead);
      }
    } catch (error: any) {
      console.error("Error importing from Fathom:", error);
      res.status(500).json({ error: error.message || "Failed to import meeting" });
    }
  });

  // Calendar sync - auto-create leads from upcoming meetings
  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const events = await getUpcomingEvents(20);
      const createdLeads: any[] = [];
      const skippedCount = { existing: 0, noAttendee: 0 };
      
      for (const event of events) {
        // Get external attendee (not self)
        const attendees = event.attendees || [];
        const externalAttendee = attendees.find(a => !a.self && !a.organizer && a.email);
        
        if (!externalAttendee || !externalAttendee.email) {
          skippedCount.noAttendee++;
          continue;
        }
        
        // Check if lead already exists with this email or calendar event ID
        const existingByEmail = await storage.getLeadByEmail(externalAttendee.email);
        const existingByEvent = event.id ? await storage.getLeadByCalendarEventId(event.id) : null;
        
        if (existingByEmail || existingByEvent) {
          skippedCount.existing++;
          continue;
        }
        
        // Create new lead from calendar event
        // Priority: 1) displayName from Google, 2) Parse name from event title (before "and"/"with"), 3) formatted email prefix
        let attendeeName = externalAttendee.displayName;
        
        if (!attendeeName) {
          const eventTitle = event.summary || '';
          // Parse name from event title: "Michael McClellan and Wilson Wye" -> "Michael McClellan"
          // Common patterns: "Name and Name", "Name with Name", "Name - Name", "Name/Name"
          const namePart = eventTitle.split(/\s+(and|with|&|-|\/)\s+/i)[0]?.trim();
          
          // Check if the extracted part looks like a name (2-4 words, letters only, reasonable length)
          const looksLikeName = namePart && /^[A-Za-z]+(\s[A-Za-z]+){0,3}$/.test(namePart) && namePart.length < 40;
          
          if (looksLikeName) {
            attendeeName = namePart;
          } else {
            // Fallback: Convert email prefix to proper name: "carl.j.noonan" -> "Carl J Noonan"
            const emailPrefix = externalAttendee.email.split('@')[0];
            attendeeName = emailPrefix
              .replace(/[._-]/g, ' ')
              .replace(/\d+/g, '')
              .trim()
              .split(' ')
              .filter(w => w.length > 0)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
        }
        
        // Extract company from email domain (only for non-personal email domains)
        const emailDomain = externalAttendee.email.split('@')[1] || '';
        const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'aol.com'];
        const company = personalDomains.includes(emailDomain.toLowerCase()) 
          ? null 
          : emailDomain.replace(/\.(com|org|net|io|co|edu)$/i, '').split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        const newLead = await storage.createLead({
          name: attendeeName || 'Unknown',
          email: externalAttendee.email,
          company,
          linkedIn: null,
          tags: [],
          pipeline: "jumpseat",
          stage: "backlog",
          onboardingStage: null,
          nextFollowUp: null, // Don't auto-set follow-up - only from Fathom or manual entry
          actionNeeded: true,
          summary: `Upcoming call: ${event.summary || 'Meeting'}`,
          keyTakeaways: [],
          blocker: null,
          decisionTrigger: null,
          followUpAngle: null,
          recordingLink: null,
          calendarEventId: event.id || null,
          history: [{
            date: new Date().toISOString(),
            action: `Auto-created from calendar: ${event.summary || 'Meeting'}`
          }],
        });
        
        createdLeads.push(newLead);
      }
      
      res.json({ 
        created: createdLeads.length, 
        skipped: skippedCount,
        leads: createdLeads 
      });
    } catch (error: any) {
      console.error("Error syncing calendar:", error);
      res.status(500).json({ error: error.message || "Failed to sync calendar" });
    }
  });

  // Email routes
  app.get("/api/email/status", async (req, res) => {
    const configured = await isGmailConfigured();
    res.json({ configured });
  });

  app.post("/api/email/send", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }
      
      await sendEmail(to, subject, body);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  return httpServer;
}
