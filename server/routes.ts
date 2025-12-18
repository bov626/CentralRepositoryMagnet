import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertBlockerSchema } from "@shared/schema";
import { z } from "zod";

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

  return httpServer;
}
