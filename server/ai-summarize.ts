import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const NEXT_STEP_MODELS = ["gpt-4o", "gpt-4o-mini"];

export async function summarizeClientNeeds(meetingSummary: string, actionItems: string[]): Promise<string> {
  const prompt = `You are analyzing a sales call summary. Extract ONLY information about the CLIENT/PROSPECT - their needs, goals, pain points, situation, and responses. 

IGNORE all information about:
- The salesperson's pitch or service offering
- What the salesperson said or offered
- The salesperson's methodology or approach

Focus ONLY on:
- Client's current situation and background
- Client's goals and what they want to achieve
- Client's pain points and challenges
- Client's reactions, concerns, or objections
- Any specific details about the client (job, industry, timeline, etc.)

Meeting Summary:
${meetingSummary}

${actionItems.length > 0 ? `Action Items:\n${actionItems.join('\n')}` : ''}

Provide a concise 2-4 sentence summary focusing ONLY on the client. Start directly with the client's name or situation, no intro phrases.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that extracts client information from meeting notes. Be concise and focus only on the prospect's perspective." 
        },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 300,
    });

    return response.choices[0]?.message?.content?.trim() || meetingSummary;
  } catch (error: any) {
    console.error("AI summarization error:", error);
    return meetingSummary;
  }
}

export async function classifyCallIntent(summary: string): Promise<"this_cohort" | "later" | "unclear"> {
  const text = (summary || "").toLowerCase();
  if (!text) return "unclear";
  if (/(not this cohort|next cohort|when i.?m ready|maybe next year|later this year|not right now|can.?t do this cohort)/i.test(text)) {
    return "later";
  }
  if (/(this cohort|ready to go|ready to start|let.?s do it|in this round)/i.test(text)) {
    return "this_cohort";
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    return "unclear";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Classify sales-call intent. Reply with only one word: this_cohort, later, or unclear.",
        },
        {
          role: "user",
          content: summary.slice(0, 2000),
        },
      ],
      max_completion_tokens: 10,
    });
    const raw = (response.choices[0]?.message?.content || "").trim().toLowerCase();
    if (raw.includes("later")) return "later";
    if (raw.includes("this_cohort") || raw.includes("this cohort")) return "this_cohort";
    return "unclear";
  } catch {
    return "unclear";
  }
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…`;
}

export async function summarizeNextStep(input: {
  name: string;
  pipeline?: string | null;
  stage?: string | null;
  source?: string | null;
  tags?: string[] | null;
  jobTitle?: string | null;
  auditScore?: number | null;
  summary?: string | null;
  keyTakeaways?: string[] | null;
  actionItems?: string[] | null;
  nextFollowUp?: string | Date | null;
  cadenceAnchor?: string | Date | null;
  history?: Array<{ date?: string; action?: string }>;
  threads: Array<{ subject: string; summary: string; direction: string; date: string }>;
  examples?: Array<{ guessed: string; actual: string }>;
}): Promise<string> {
  const last = [...input.threads].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).at(-1);
  const fallback = (() => {
    if (input.stage === "bought") {
      return "Bought. No sales follow-up.";
    }
    if (input.stage === "backlog") {
      return "No pitch call yet. Get them on a call before sending a close email.";
    }
    if (last?.direction === "in") {
      return `They emailed last (${last.subject}). Reply and push the sale forward.`;
    }
    if (input.stage === "pitch-call") {
      return "Call happened. Send the service outline and ask how they want to move forward.";
    }
    if (input.stage === "decision-pending") {
      return "They're deciding this cohort. Short bump: one slot left, refund if an offer lands.";
    }
    if (input.stage === "future-client") {
      return "Not this cohort. Don't pitch. Check in only if a 3/6/9/12-month date is due.";
    }
    if (last?.direction === "out") {
      return `You last wrote “${last.subject}”. Waiting on them — bump only if a follow-up date is due.`;
    }
    return "Read the latest thread and pick the next sales ask.";
  })();

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const threadBlock = clip(
    [...input.threads]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t) => `${t.direction === "in" ? "THEY" : "YOU"} (${String(t.date).slice(0, 10)}): ${t.subject}\n${t.summary}`)
      .join("\n\n"),
    24000,
  );

  const exampleBlock = (input.examples || [])
    .filter((e) => e.guessed && e.actual)
    .slice(-40)
    .map((e) => `Guessed: ${e.guessed}\nWilson would: ${e.actual}`)
    .join("\n\n");

  const historyBlock = (input.history || [])
    .slice(-20)
    .map((h) => `${String(h.date || "").slice(0, 10)} ${h.action || ""}`.trim())
    .filter(Boolean)
    .join("\n");

  const followUp =
    input.nextFollowUp instanceof Date
      ? input.nextFollowUp.toISOString().slice(0, 10)
      : input.nextFollowUp
        ? String(input.nextFollowUp).slice(0, 10)
        : "none";
  const callDate =
    input.cadenceAnchor instanceof Date
      ? input.cadenceAnchor.toISOString().slice(0, 10)
      : input.cadenceAnchor
        ? String(input.cadenceAnchor).slice(0, 10)
        : "none";

  const userContent = `${exampleBlock ? `Wilson's corrections — match this judgment, not generic CRM advice:\n${exampleBlock}\n\n` : ""}Lead: ${input.name}
Offer: ${input.pipeline === "community" ? "Skool community" : "Jumpseat agency"}
Stage: ${input.stage || "unknown"}
Source: ${input.source || "unknown"}
Tags: ${(input.tags || []).join(", ") || "none"}
Job title: ${input.jobTitle || "unknown"}
OE audit score: ${input.auditScore != null ? `${input.auditScore}/100` : "none"}
Last sales call: ${callDate}
Follow-up date on the card: ${followUp}
Open action items: ${(input.actionItems || []).filter(Boolean).join("; ") || "none"}
Takeaways: ${(input.keyTakeaways || []).filter(Boolean).join("; ") || "none"}

Call / card notes:
${clip(input.summary || "none", 6000)}

CRM history:
${historyBlock || "none"}

Email (oldest to newest, full text when available):
${threadBlock || "none"}`;

  const system = `You are Wilson's sales brain for Jumpseat (J2 / second-income agency) and Skool (community, not Stripe). He will grind every card. Be specific enough that he can act without re-reading the thread.

Rules:
- First sentence is the next action. Then 1-3 sentences of why, citing what they said or what he promised.
- Do not write generic "follow up" or "nurture the relationship." Name the email, call, or wait.
- Who spoke last matters. If he is waiting on them and nothing is due, say wait. If they asked something unanswered, answer that.
- Jumpseat vs Skool: do not mix offers. Closed/bought/disqualified: no chase.
- Audits with no pitch call: call for feedback on the report before a close email.
- Future Client: not this cohort. Do not pitch. Check-in only if a 3/6/9/12 date is due.
- Never invent a meeting, payment, or promise that is not in the notes or email.
- Match Wilson's corrections when they exist. His actual next step beats a textbook sales move.
- No greeting, no markdown, no bullet list.`;

  for (const model of NEXT_STEP_MODELS) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        max_completion_tokens: 280,
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (error) {
      console.error(`[next-step] ${model} failed`, error);
    }
  }
  return fallback;
}
