export type RoastResumeHit = {
  configured: boolean;
  found: boolean;
  url: string | null;
};

const TABLES = ["submissions", "Submissions"];
const EMAIL_KEYS = ["email", "Email", "e_mail", "user_email", "email_address"];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FILE_RE = /resume_[0-9a-f-]{36}\.pdf/gi;

function roastConfig() {
  const url = (process.env.ROAST_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.ROAST_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  const bucket = process.env.ROAST_BUCKET || "resumes";
  return { url, key, bucket };
}

export function isRoastConfigured(): boolean {
  const { url, key } = roastConfig();
  return !!(url && key);
}

function headers(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

function emailOf(row: Record<string, unknown>): string {
  for (const key of EMAIL_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value.includes("@")) return value.trim().toLowerCase();
  }
  for (const value of Object.values(row)) {
    if (typeof value === "string" && value.includes("@")) return value.trim().toLowerCase();
  }
  return "";
}

function collectTokens(value: unknown, into: string[]): void {
  if (value == null) return;
  if (typeof value === "string") {
    const text = value.trim();
    if (text) into.push(text);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const item of value) collectTokens(item, into);
    return;
  }
  if (typeof value === "object") {
    collectTokens(JSON.stringify(value), into);
    for (const item of Object.values(value as Record<string, unknown>)) collectTokens(item, into);
  }
}

function fileHints(row: Record<string, unknown>): string[] {
  const tokens: string[] = [];
  collectTokens(row, tokens);
  const hints: string[] = [];
  for (const text of tokens) {
    hints.push(text.replace(/^\//, ""));
    for (const uuid of text.match(UUID_RE) || []) hints.push(uuid);
    for (const file of text.match(FILE_RE) || []) hints.push(file);
  }
  return [...new Set(hints)];
}

function pathsFor(hint: string): string[] {
  if (/^https?:\/\//i.test(hint)) return [];
  const clean = hint.replace(/^\/+/, "");
  if (clean.toLowerCase().endsWith(".pdf")) return [clean, clean.replace(/^resumes\//, "")];
  return [`resume_${clean}.pdf`, `${clean}.pdf`, `resume_${clean}`, clean];
}

async function signedUrl(url: string, key: string, bucket: string, path: string): Promise<string | null> {
  const res = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encodeURI(path)}`, {
    method: "POST",
    headers: { ...headers(key), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 * 60 * 6 }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const signed = data.signedURL || data.signedUrl;
  if (!signed) return null;
  if (signed.startsWith("http")) return signed;
  return `${url}${signed.startsWith("/") ? "" : "/"}${signed}`;
}

async function fetchRows(url: string, key: string, table: string, email: string): Promise<Record<string, unknown>[]> {
  const encoded = encodeURIComponent(email);
  const queries = [
    `email=eq.${encoded}`,
    `Email=eq.${encoded}`,
    `email=ilike.${encoded}`,
    `or=(email.eq.${encoded},Email.eq.${encoded})`,
  ];
  for (const query of queries) {
    const res = await fetch(`${url}/rest/v1/${table}?${query}&select=*&limit=10`, {
      headers: { ...headers(key), Prefer: "return=representation" },
    });
    if (!res.ok) {
      if (res.status !== 400 && res.status !== 404) {
        console.error("[roast] query failed", table, res.status, await res.text().catch(() => ""));
      }
      continue;
    }
    const rows = (await res.json()) as Record<string, unknown>[];
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

export async function lookupRoastResume(email: string | null | undefined): Promise<RoastResumeHit> {
  const empty: RoastResumeHit = { configured: false, found: false, url: null };
  const { url, key, bucket } = roastConfig();
  if (!url || !key) return empty;
  const address = String(email || "").trim().toLowerCase();
  if (!address) return { configured: true, found: false, url: null };

  const tables = process.env.ROAST_TABLE ? [process.env.ROAST_TABLE] : TABLES;
  let match: Record<string, unknown> | undefined;
  for (const table of tables) {
    const rows = await fetchRows(url, key, table, address);
    match = rows.find((row) => emailOf(row) === address) || rows[0];
    if (match) break;
  }
  if (!match) return { configured: true, found: false, url: null };

  const hints = fileHints(match);
  for (const hint of hints) {
    if (/^https?:\/\//i.test(hint)) return { configured: true, found: true, url: hint };
    for (const path of pathsFor(hint)) {
      const signed = await signedUrl(url, key, bucket, path);
      if (signed) return { configured: true, found: true, url: signed };
    }
  }

  console.error("[roast] submission found but no file in resumes bucket", Object.keys(match));
  return { configured: true, found: false, url: null };
}
