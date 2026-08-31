export function parseAuditScore(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export function jobTitleFromLead(lead: {
  jobTitle?: string | null;
  summary?: string | null;
}): string | null {
  const stored = (lead.jobTitle || "").trim();
  if (stored) return stored;
  const match = (lead.summary || "").match(/Overemployed Risk Audit — (.+)/);
  const fromSummary = match?.[1]?.trim().split("\n")[0] || "";
  return fromSummary || null;
}

export function auditScoreFromLead(lead: { auditScore?: number | null }): number | null {
  if (lead.auditScore == null) return null;
  return Number.isFinite(lead.auditScore) ? lead.auditScore : null;
}
