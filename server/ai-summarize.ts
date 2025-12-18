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
