import type { Lead } from "@shared/schema";
import {
  isPaymentOrOnboardingEmail,
  type CadenceKind,
  type EmailThread,
} from "@shared/email";
import {
  EMAIL_TEMPLATES,
  fillTemplate,
  templateForCadence,
} from "@shared/email-templates";
import { summarizeClientNeeds } from "./ai-summarize";

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

function closedOutboundExamples(leads: Lead[]): EmailThread[] {
  const closed = leads.filter((l) => l.stage === "closed" && !l.archived);
  const examples: EmailThread[] = [];
  for (const lead of closed) {
    const threads = Array.isArray(lead.emailThreads)
      ? (lead.emailThreads as EmailThread[])
      : [];
    for (const thread of threads) {
      if (thread.direction !== "out") continue;
      if (isPaymentOrOnboardingEmail(thread.subject, thread.summary)) continue;
      examples.push(thread);
    }
  }
  return examples.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function pickExamples(all: EmailThread[], cadence: CadenceKind | null): EmailThread[] {
  if (cadence === "same-day") {
    return all
      .filter((t) => /service|agreement|outline|move forward/i.test(`${t.subject} ${t.summary}`))
      .slice(0, 3);
  }
  if (cadence === "day-3" || cadence === "day-7") {
    return all
      .filter((t) => /follow/i.test(`${t.subject} ${t.summary}`))
      .slice(0, 3);
  }
  return all.slice(0, 3);
}

function fallbackDraft(lead: Lead, cadence: CadenceKind | null): { subject: string; body: string } {
  const key = templateForCadence(cadence, lead.pipeline);
  const template = EMAIL_TEMPLATES[key];
  return {
    subject: template.subject,
    body: fillTemplate(template.body, lead.name),
  };
}

export async function draftEmailForLead(
  lead: Lead,
  allLeads: Lead[],
  cadence: CadenceKind | null,
): Promise<{ subject: string; body: string; source: "closed-won" | "template" }> {
  const fallback = fallbackDraft(lead, cadence);
  const examples = pickExamples(closedOutboundExamples(allLeads), cadence);

  if (examples.length === 0) {
    return { ...fallback, source: "template" };
  }

  const personal = (lead.summary || "").slice(0, 800);
  const exampleBlock = examples
    .map((e) => `Subject: ${e.subject}\n${e.summary}`)
    .join("\n\n---\n\n");

  try {
    const prompt = `Write a follow-up email from Wilson (sign off "– W.W.") to ${lead.name} (${firstName(lead.name)}).

Cadence: ${cadence || "follow-up"}
Personalize the first 1-3 lines from this client context:
${personal || "No extra notes."}

The middle should follow the tone and structure of these emails that already closed deals (do not copy Stripe, payment, or onboarding emails):
${exampleBlock}

Return ONLY:
SUBJECT: <subject line>
BODY:
<email body>`;

    const drafted = await summarizeClientNeeds(prompt, []);
    const subjectMatch = drafted.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = drafted.match(/BODY:\s*([\s\S]+)/i);
    if (subjectMatch && bodyMatch) {
      return {
        subject: subjectMatch[1].trim(),
        body: bodyMatch[1].trim(),
        source: "closed-won",
      };
    }
  } catch (error) {
    console.error("Draft generation fell back to template:", error);
  }

  const top = personal
    ? `${firstName(lead.name)},\n\n${personal.split("\n")[0]}\n\n`
    : "";
  if (top && cadence?.startsWith("check-in")) {
    return {
      subject: fallback.subject,
      body: fillTemplate(EMAIL_TEMPLATES["check-in"].body, lead.name),
      source: "template",
    };
  }

  return { ...fallback, source: "template" };
}
