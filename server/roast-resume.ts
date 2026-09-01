export type RoastResumeHit = {
  configured: boolean;
  found: boolean;
  url: string | null;
};

type TableGuess = {
  table: string;
  emailColumn: string;
  idColumns: string[];
};

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

function tableGuess(): TableGuess {
  return {
    table: process.env.ROAST_TABLE || "submissions",
    emailColumn: process.env.ROAST_EMAIL_COLUMN || "email",
    idColumns: process.env.ROAST_ID_COLUMN
      ? [process.env.ROAST_ID_COLUMN]
      : ["id", "document", "document_id", "resume_id", "uuid"],
  };
}

function idsFromRow(row: Record<string, unknown>, columns: string[]): string[] {
  const values: string[] = [];
  for (const col of columns) {
    const raw = row[col] ?? row[col.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (raw == null) continue;
    const text = String(raw).trim();
    if (!text) continue;
    values.push(text);
    const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) values.push(uuid[0]);
    const file = text.match(/resume_[0-9a-f-]{36}\.pdf/i);
    if (file) values.push(file[0]);
  }
  return [...new Set(values)];
}

function filePathsFor(id: string): string[] {
  if (/^https?:\/\//i.test(id)) return [];
  if (id.toLowerCase().endsWith(".pdf")) return [id.replace(/^\//, "")];
  return [`resume_${id}.pdf`, `${id}.pdf`, `resume_${id}`, id];
}

async function signedUrl(url: string, key: string, bucket: string, path: string): Promise<string | null> {
  const res = await fetch(`${url}/storage/v1/object/sign/${bucket}/${path}`, {
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

async function openResume(url: string, key: string, bucket: string, ids: string[]): Promise<string | null> {
  for (const id of ids) {
    if (/^https?:\/\//i.test(id)) return id;
    for (const path of filePathsFor(id)) {
      const signed = await signedUrl(url, key, bucket, path);
      if (signed) return signed;
    }
  }
  return null;
}

export async function lookupRoastResume(email: string | null | undefined): Promise<RoastResumeHit> {
  const empty: RoastResumeHit = { configured: false, found: false, url: null };
  const { url, key, bucket } = roastConfig();
  if (!url || !key) return empty;
  const address = String(email || "").trim().toLowerCase();
  if (!address) return { configured: true, found: false, url: null };

  const guess = tableGuess();

  const filter = `${guess.emailColumn}=ilike.${encodeURIComponent(address)}`;
  const res = await fetch(`${url}/rest/v1/${guess.table}?${filter}&select=*&limit=5`, {
    headers: { ...headers(key), Prefer: "return=representation" },
  });
  if (!res.ok) {
    console.error("[roast] query failed", res.status, await res.text().catch(() => ""));
    return { configured: true, found: false, url: null };
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const match =
    rows.find((row) => String(row[guess.emailColumn] || "").trim().toLowerCase() === address) || rows[0];
  if (!match) return { configured: true, found: false, url: null };

  const ids = idsFromRow(match, guess.idColumns);
  const fileUrl = await openResume(url, key, bucket, ids);
  return { configured: true, found: !!fileUrl, url: fileUrl };
}
