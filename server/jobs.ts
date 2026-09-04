import { buildTodayQueue } from "@shared/email";
import { sendEmail } from "./gmail";
import { ensureEmailSync } from "./email-sync";
import { listRecentMatchedCalls } from "./google-calendar";
import { autoImportFathomCalls, moveGhostedAfterCadence } from "./lead-intake";
import { reconcileFollowedUpStages } from "./followed-up";
import { storage } from "./storage";

const DENVER_OFFSET_CHECK_MS = 60 * 1000;

function denverNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "https://jumpseatboarding.com";
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
  }
  return "http://localhost:5000";
}

let lastSyncDay = "";
let lastFocusDay = "";

export async function sendSalesFocusEmail(): Promise<{ sent: boolean; count: number; skipped?: boolean }> {
  const { dayKey } = denverNowParts();
  if (lastFocusDay === dayKey) {
    return { sent: false, count: 0, skipped: true };
  }

  const leads = await storage.getAllLeads();
  const leadsByEmail = new Map(
    leads
      .filter((lead) => lead.email)
      .map((lead) => [lead.email!.trim().toLowerCase(), { id: lead.id, name: lead.name }]),
  );
  const recentCalls = await listRecentMatchedCalls(leadsByEmail).catch((error) => {
    console.error("[jobs] recent calendar calls failed", error);
    return [];
  });
  const { followUps, auditCalls } = buildTodayQueue(leads, recentCalls);
  if (followUps.length === 0 && auditCalls.length === 0) {
    lastFocusDay = dayKey;
    return { sent: false, count: 0 };
  }

  const nameOf = (id: string | undefined) => leads.find((lead) => lead.id === id)?.name || "Lead";
  const theyEmailed = followUps.filter((row) => row.priority === 0);
  const missed = followUps.filter((row) => row.priority === 1);
  const rest = followUps.filter((row) => row.priority > 1);
  const parts = [];
  if (theyEmailed.length) {
    parts.push(
      `${theyEmailed.length} ${theyEmailed.length === 1 ? "person emailed you" : "people emailed you"} with no reply.\n\n- ${theyEmailed.map((row) => nameOf(row.leadId)).join("\n- ")}`,
    );
  }
  if (missed.length) {
    parts.push(
      `${missed.length} call${missed.length === 1 ? "" : "s"} with no follow-up email.\n\n- ${missed.map((row) => nameOf(row.leadId)).join("\n- ")}`,
    );
  }
  if (rest.length) {
    parts.push(
      `${rest.length} follow-up${rest.length === 1 ? "" : "s"} today.\n\n- ${rest.map((row) => nameOf(row.leadId)).join("\n- ")}`,
    );
  }
  if (auditCalls.length) {
    parts.push(
      `Call ${auditCalls.length} audit completer${auditCalls.length === 1 ? "" : "s"} for feedback.\n\n- ${auditCalls.map((lead) => nameOf(lead.id)).join("\n- ")}`,
    );
  }
  const body = `${parts.join("\n\n")}

Open Today's Focus:
${appUrl()}/today`;

  await sendEmail("wyedoyoudothis@gmail.com", "Sales Focus Email", body);
  lastFocusDay = dayKey;
  return { sent: true, count: followUps.length + auditCalls.length };
}

export async function runNightlyJobs() {
  const fathom = await autoImportFathomCalls();
  const ghosted = await moveGhostedAfterCadence();
  await ensureEmailSync(true);
  const followedUp = await reconcileFollowedUpStages();
  return { fathom, ghosted, followedUp };
}

export function startEmailJobs() {
  setInterval(async () => {
    const { hour, minute, dayKey } = denverNowParts();

    if (hour === 2 && minute < 5 && lastSyncDay !== dayKey) {
      lastSyncDay = dayKey;
      console.log("[jobs] nightly email sync starting");
      try {
        const result = await runNightlyJobs();
        console.log("[jobs] nightly email sync", result);
      } catch (error) {
        console.error("[jobs] nightly email sync failed", error);
      }
    }

    if (hour === 7 && minute >= 30 && minute < 35) {
      console.log("[jobs] sales focus email starting");
      try {
        const result = await sendSalesFocusEmail();
        console.log("[jobs] sales focus email", result);
      } catch (error) {
        console.error("[jobs] sales focus email failed", error);
      }
    }
  }, DENVER_OFFSET_CHECK_MS);

  console.log("[jobs] email jobs scheduled (2:00am sync, 7:30am Sales Focus Email, America/Denver)");
}
