import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertBlockerSchema, insertOnboardingSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import { getUpcomingEvents, createEvent } from "./google-calendar";
import { listMeetings, isFathomConfigured } from "./fathom";
import { sendEmail, isGmailConfigured, searchEmails } from "./gmail";
import { recordOutboundEmail, syncAllLeadEmails, syncLeadEmails } from "./email-sync";
import { draftEmailForLead } from "./email-draft";
import { sendSalesFocusEmail } from "./jobs";
import { dueToday, nextFollowUpAfterSend, type CadenceKind } from "@shared/email";
import { moneySnapshot, withStripePaid } from "@shared/money";
import { isStripeConfigured, jumpseatPaidThisMonth } from "./stripe";
import {
  autoImportFathomCalls,
  ingestAuditLead,
  ingestFathomMeeting,
  ingestSkoolMember,
} from "./lead-intake";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import crypto from "crypto";

function signToken(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function webhookAllowed(req: any): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.WEBHOOK_SECRET || process.env.CRM_PASSWORD;
  if (!secret) return true;
  const provided = String(req.headers["x-webhook-secret"] || req.body?.secret || "");
  return provided === secret;
}

function verifyToken(token: string, secret: string): { exp: number } | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Auth routes — uses HMAC-signed tokens so sessions survive server restarts
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.CRM_PASSWORD;
    
    if (!adminPassword) {
      console.error("CRM_PASSWORD environment variable not set");
      return res.status(500).json({ error: "Authentication not configured" });
    }
    
    console.log(`[auth] Login attempt. CRM_PASSWORD length: ${adminPassword.length}, submitted length: ${(password || "").length}`);
    
    if ((password || "").trim() === adminPassword.trim()) {
      const payload = { exp: Date.now() + 30 * 24 * 60 * 60 * 1000 };
      const token = signToken(payload, adminPassword.trim());
      console.log("[auth] Login successful");
      return res.json({ success: true, token });
    }
    
    console.log("[auth] Login failed - password mismatch");
    return res.status(401).json({ success: false, error: "Invalid password" });
  });

  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body;
    const adminPassword = process.env.CRM_PASSWORD;
    
    if (!token || !adminPassword) {
      return res.json({ valid: false });
    }
    
    const payload = verifyToken(token, adminPassword.trim());
    return res.json({ valid: payload !== null });
  });
  
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
      if (updates.cadenceAnchor !== undefined) {
        updates.cadenceAnchor = updates.cadenceAnchor ? new Date(updates.cadenceAnchor) : null;
      }
      if (updates.boughtAt !== undefined) {
        updates.boughtAt = updates.boughtAt ? new Date(updates.boughtAt) : null;
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
      const result = await ingestFathomMeeting(recordingId);
      res.status(result.created ? 201 : 200).json(result.lead);
    } catch (error: any) {
      console.error("Error importing from Fathom:", error);
      res.status(500).json({ error: error.message || "Failed to import meeting" });
    }
  });

  app.post("/api/fathom/auto-import", async (req, res) => {
    try {
      if (!isFathomConfigured()) {
        return res.json({ imported: 0, skipped: 0, configured: false });
      }
      const result = await autoImportFathomCalls();
      res.json({ ...result, configured: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to auto-import Fathom" });
    }
  });

  app.post("/api/leads/audit", async (req, res) => {
    try {
      if (!webhookAllowed(req)) return res.status(401).json({ error: "Unauthorized" });
      const { name, email, linkedIn, summary, pdfUrl, pdf_url } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const result = await ingestAuditLead({
        name,
        email,
        linkedIn,
        summary,
        pdfUrl: pdfUrl || pdf_url,
      });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to ingest audit" });
    }
  });

  app.post("/api/leads/skool-member", async (req, res) => {
    try {
      if (!webhookAllowed(req)) return res.status(401).json({ error: "Unauthorized" });
      const { name, email, paid } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const result = await ingestSkoolMember({ name, email, paid: paid === true || paid === "true" });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to ingest Skool member" });
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
          summary: `Upcoming call: ${event.summary || 'Meeting'}`,
          keyTakeaways: [],
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
    res.json({
      configured,
      mockOnLocalhost: !configured && process.env.NODE_ENV !== "production",
    });
  });

  app.get("/api/email/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.status(400).json({ error: "Missing query parameter q" });
      }
      const configured = await isGmailConfigured();
      if (!configured) {
        return res.status(401).json({
          error: "Gmail not connected. Search works on Replit after Gmail is connected, or use Sync on a lead locally to load mock threads.",
        });
      }
      const results = await searchEmails(q, 50);
      res.json(results);
    } catch (error: any) {
      const message = error.message || "Failed to search email";
      const status = message.toLowerCase().includes("read access") ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/email/sync/:leadId", async (req, res) => {
    try {
      const result = await syncLeadEmails(req.params.leadId);
      res.json(result);
    } catch (error: any) {
      const message = error.message || "Failed to sync email";
      const status = message.includes("no email") ? 400 : message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/email/sync-all", async (req, res) => {
    try {
      const secret = process.env.CRM_PASSWORD;
      const provided = String(req.headers["x-cron-secret"] || req.body?.secret || "");
      if (process.env.NODE_ENV === "production" && secret && provided !== secret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await syncAllLeadEmails();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to sync all email" });
    }
  });

  app.post("/api/email/send", async (req, res) => {
    try {
      const { to, subject, body, leadId, cadence } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }

      let gmailId: string | undefined;
      let threadId: string | undefined;
      const configured = await isGmailConfigured();
      if (configured) {
        const sent = await sendEmail(to, subject, body);
        gmailId = sent.id;
        threadId = sent.threadId;
      } else if (process.env.NODE_ENV === "production") {
        throw new Error("Gmail not connected");
      }

      let lead = null;
      if (leadId) {
        lead = await recordOutboundEmail(leadId, { to, subject, body, gmailId, threadId });
        const next = nextFollowUpAfterSend((cadence as CadenceKind) || null);
        if (lead) {
          lead = await storage.updateLead(leadId, { nextFollowUp: next ? new Date(next) : null }) || lead;
        }
      }
      
      res.json({
        success: true,
        message: configured ? "Email sent successfully" : "Logged locally (Gmail not connected — send will go out on Replit)",
        mocked: !configured,
        lead,
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  app.post("/api/email/draft/:leadId", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const allLeads = await storage.getAllLeads();
      const cadence = (req.body?.cadence as CadenceKind) || dueToday(lead).cadence;
      const draft = await draftEmailForLead(lead, allLeads, cadence);
      res.json({ ...draft, cadence, reason: dueToday(lead).reason });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to draft email" });
    }
  });

  app.get("/api/today-focus", async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      const due = [];
      for (const lead of allLeads) {
        const info = dueToday(lead);
        if (!info.due) continue;
        const draft = await draftEmailForLead(lead, allLeads, info.cadence);
        due.push({
          lead,
          reason: info.reason,
          cadence: info.cadence,
          draft,
          preview: false,
        });
      }

      if (due.length === 0 && process.env.NODE_ENV !== "production") {
        const previewLeads = allLeads
          .filter((l) => !l.archived && l.email && l.stage !== "closed" && l.stage !== "disqualified")
          .slice(0, 3);
        for (const lead of previewLeads) {
          const draft = await draftEmailForLead(lead, allLeads, "same-day");
          due.push({
            lead,
            reason: "Localhost preview — not actually due. Set a follow-up date to test for real.",
            cadence: "same-day" as CadenceKind,
            draft,
            preview: true,
          });
        }
      }
      let stripePaid = { dollars: 0, chargeCount: 0, configured: false };
      try {
        stripePaid = await jumpseatPaidThisMonth();
      } catch (error) {
        console.error("Stripe month total failed", error);
      }
      res.json({
        count: due.length,
        items: due,
        money: withStripePaid(moneySnapshot(allLeads), stripePaid),
        stripe: { configured: isStripeConfigured() && stripePaid.configured },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load today's focus" });
    }
  });

  app.post("/api/email/daily-focus", async (req, res) => {
    try {
      const secret = process.env.CRM_PASSWORD;
      const provided = String(req.headers["x-cron-secret"] || req.body?.secret || "");
      if (process.env.NODE_ENV === "production" && secret && provided !== secret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await sendSalesFocusEmail();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send sales focus email" });
    }
  });

  // Onboarding form submissions
  app.get("/api/onboarding-submissions", async (req, res) => {
    try {
      const submissions = await storage.getAllOnboardingSubmissions();
      res.json(submissions);
    } catch (error: any) {
      console.error("Error fetching onboarding submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.post("/api/onboarding-form", async (req, res) => {
    try {
      const { name, linkedIn, resumePath, coverLetterPath, answers, totalPoints, tier } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Save to database with file paths
      const submissionData = {
        name,
        tier: tier || "NPC",
        totalPoints: totalPoints || 0,
        answers: answers || {},
        resumePath: resumePath || null,
        coverLetterPath: coverLetterPath || null,
        linkedIn: linkedIn || null,
      };

      const savedSubmission = await storage.createOnboardingSubmission(submissionData);

      // Format the answers into a readable email
      const formatSection = (title: string, items: {label: string, value: string}[]) => {
        const content = items
          .filter(item => item.value?.trim())
          .map(item => `${item.label}\n${item.value}`)
          .join('\n\n');
        return content ? `=== ${title} ===\n\n${content}` : '';
      };

      const resumeFileName = answers?.resumeFileName || 'Not provided';
      const coverLetterFileName = answers?.coverLetterFileName || 'Not provided';
      
      const infoSection = `=== 👤 YOUR INFORMATION ===

Name: ${name}
LinkedIn: ${linkedIn || 'N/A'}
Resume: ${resumeFileName}${resumePath ? ' (uploaded)' : ''}
Cover Letter: ${coverLetterFileName}${coverLetterPath ? ' (uploaded)' : ''}
Points: ${totalPoints || 0}
Tier: ${tier || 'N/A'}`;

      const careerSection = formatSection('📖 CAREER NARRATIVE', [
        { label: 'Best job ever:', value: answers.bestJob },
        { label: 'How they chose their career:', value: answers.careerChoice },
        { label: 'Teachers & mentors:', value: answers.mentors },
        { label: 'Beyond job description:', value: answers.beyondJobDescription },
        { label: 'What colleagues come to them for:', value: answers.colleaguesComeToYouFor },
        { label: 'Full career history:', value: answers.careerHistory },
        { label: 'Target role titles:', value: answers.targetRoles },
      ]);

      const impactSection = formatSection('💥 YOUR IMPACT', [
        { label: 'Key impact per role:', value: answers.impactPerRole },
        { label: 'Impact metrics:', value: answers.impactMetrics },
      ]);

      const thinkingSection = formatSection('🧠 HOW YOU THINK', [
        { label: 'Guiding quote or idea:', value: answers.principlesQuotes },
        { label: 'Book or movie seen more than once:', value: answers.bookOrMovie },
      ]);

      const perspectiveSection = formatSection('🔍 PERSPECTIVE', [
        { label: 'Unlisted accomplishment:', value: answers.unlistedAccomplishment },
        { label: 'Hobbies & side projects:', value: answers.hobbiesSideProjects },
        { label: 'Sabbatical plans:', value: answers.sabbatical },
        { label: 'Anything else:', value: answers.anythingElse },
      ]);

      const emailBody = `ONBOARDING QUESTIONNAIRE SUBMISSION

Submitted: ${new Date().toLocaleString()}

${[infoSection, careerSection, impactSection, thinkingSection, perspectiveSection].filter(Boolean).join('\n\n\n')}`;

      await sendEmail(
        'wyedoyoudothis@gmail.com',
        `Onboarding Form: ${name}`,
        emailBody
      );

      res.json({ success: true, message: "Form submitted successfully", submission: savedSubmission });
    } catch (error: any) {
      console.error("Error submitting onboarding form:", error);
      res.status(500).json({ error: error.message || "Failed to submit form" });
    }
  });

  return httpServer;
}
