type GranolaNote = {
  id: string;
  title?: string;
  summary_text?: string;
  summary_markdown?: string;
  created_at?: string;
  updated_at?: string;
  attendees?: Array<{ email?: string; name?: string }>;
};

export function isGranolaConfigured(): boolean {
  return !!process.env.GRANOLA_API_KEY;
}

async function granolaFetch(path: string): Promise<any> {
  const key = process.env.GRANOLA_API_KEY;
  if (!key) throw new Error("GRANOLA_API_KEY not configured");
  const res = await fetch(`https://public-api.granola.ai/v1${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Granola API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function findGranolaNoteForEmail(
  email: string,
  around: Date,
): Promise<{ id: string; summary: string } | null> {
  if (!isGranolaConfigured() || !email) return null;
  try {
    const since = new Date(around.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const data = await granolaFetch(`/notes?created_after=${encodeURIComponent(since)}&page_size=30`);
    const notes: GranolaNote[] = data.notes || data.items || [];
    const match = notes.find((note) =>
      (note.attendees || []).some((a) => a.email?.toLowerCase() === email.toLowerCase()),
    );
    if (!match) return null;
    const summary = (match.summary_text || match.summary_markdown || "").trim();
    if (!summary) return null;
    return { id: match.id, summary: summary.slice(0, 2000) };
  } catch (error) {
    console.error("Granola lookup failed:", error);
    return null;
  }
}

export function mergeCallNotes(granola: string | null, fathom: string): string {
  if (!granola) return fathom;
  if (!fathom) return granola;
  return `${granola.trim()}\n\n--- Fathom ---\n${fathom.trim()}`;
}
