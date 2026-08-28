import { dueToday } from "@shared/email";
import { sendEmail } from "./gmail";
import { syncAllLeadEmails } from "./email-sync";
import { autoImportFathomCalls, moveGhostedAfterCadence } from "./lead-intake";
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
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
  }
  return "http://localhost:5000";
}

let lastSyncDay = "";
let lastFocusDay = "";

export async function sendSalesFocusEmail(): Promise<{ sent: boolean; count: number }> {
  const leads = await storage.getAllLeads();
  const due = leads.filter((lead) => dueToday(lead).due);
  if (due.length === 0) {
    return { sent: false, count: 0 };
  }

  const names = due.map((l) => l.name).join("\n- ");
  const body = `You have ${due.length} follow-up${due.length === 1 ? "" : "s"} today.

- ${names}

Open Today's Focus:
${appUrl()}/today`;

  await sendEmail("wyedoyoudothis@gmail.com", "Sales Focus Email", body);
  return { sent: true, count: due.length };
}

export function startEmailJobs() {
  setInterval(async () => {
    const { hour, minute, dayKey } = denverNowParts();

    if (hour === 2 && minute < 5 && lastSyncDay !== dayKey) {
      lastSyncDay = dayKey;
      console.log("[jobs] nightly email sync starting");
      try {
        const result = await syncAllLeadEmails();
        console.log("[jobs] nightly email sync", result);
        const fathom = await autoImportFathomCalls();
        console.log("[jobs] fathom auto-import", fathom);
        const ghosted = await moveGhostedAfterCadence();
        if (ghosted) console.log("[jobs] ghosted to future-client", ghosted);
      } catch (error) {
        console.error("[jobs] nightly email sync failed", error);
      }
    }

    if (hour === 7 && minute >= 30 && minute < 35 && lastFocusDay !== dayKey) {
      lastFocusDay = dayKey;
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
