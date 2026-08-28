import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

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
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for cost efficiency on simple summarization
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
    // Fall back to original summary if AI fails
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

export async function summarizeNextStep(input: {
  name: string;
  stage?: string | null;
  summary?: string | null;
  threads: Array<{ subject: string; summary: string; direction: string; date: string }>;
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

  const threadBlock = [...input.threads]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((t) => `${t.direction === "in" ? "THEY" : "YOU"} (${t.date.slice(0, 10)}): ${t.subject}\n${t.summary}`)
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You help Wilson close Jumpseat (second-income / J2) sales. Reply with 1-2 short sentences. First sentence is the next action he should take. No greeting, no markdown.",
        },
        {
          role: "user",
          content: `Lead: ${input.name}
Stage: ${input.stage || "unknown"}
Call notes: ${(input.summary || "none").slice(0, 800)}

Recent email:
${threadBlock || "none"}`,
        },
      ],
      max_completion_tokens: 120,
    });
    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}
