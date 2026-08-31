import { google } from "googleapis";
import type { EmailThread } from "@shared/email";

let connectionSettings: any;

function isInsufficientPermission(error: any): boolean {
  const status = error?.code || error?.status || error?.response?.status;
  const message = String(error?.message || "");
  return (
    status === 403 ||
    message.toLowerCase().includes("insufficient") ||
    message.toLowerCase().includes("insufficientpermissions")
  );
}

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=google-mail",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Gmail not connected");
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

function headerOf(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string,
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    ""
  );
}

function directionFor(from: string, leadEmail: string): "in" | "out" {
  return from.toLowerCase().includes(leadEmail.toLowerCase()) ? "in" : "out";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBody(data?: string | null): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function collectBodies(payload: any): { plain: string; html: string } {
  if (!payload) return { plain: "", html: "" };
  const mime = String(payload.mimeType || "");
  const body = decodeBody(payload.body?.data);
  let plain = mime.startsWith("text/plain") ? body : "";
  let html = mime.startsWith("text/html") ? body : "";
  for (const part of payload.parts || []) {
    const inner = collectBodies(part);
    if (inner.plain) plain += (plain ? "\n" : "") + inner.plain;
    if (inner.html) html += inner.html;
  }
  return { plain, html };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function messageText(payload: any, snippet: string): string {
  const bodies = collectBodies(payload);
  const text = (bodies.plain || htmlToText(bodies.html) || snippet || "").trim();
  return text.slice(0, 4000);
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ id?: string; threadId?: string }> {
  const gmail = await getUncachableGmailClient();

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: result.data.id || undefined,
    threadId: result.data.threadId || undefined,
  };
}

export async function isGmailConfigured(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export type GmailSearchHit = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
};

export async function getMessage(id: string): Promise<GmailSearchHit | null> {
  try {
    const gmail = await getUncachableGmailClient();
    const result = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    });

    if (result.data.labelIds?.includes("DRAFT")) {
      return null;
    }

    const headers = result.data.payload?.headers;
    const internal = result.data.internalDate
      ? new Date(Number(result.data.internalDate)).toISOString()
      : new Date().toISOString();

    return {
      id: result.data.id || id,
      threadId: result.data.threadId || id,
      subject: headerOf(headers, "Subject") || "(no subject)",
      from: headerOf(headers, "From"),
      to: headerOf(headers, "To"),
      date: internal,
      snippet: (result.data.snippet || "").trim(),
    };
  } catch (error: any) {
    if (isInsufficientPermission(error)) {
      throw new Error(
        "Gmail token is missing read access. Reconnect Gmail with send, receive, and manage permissions.",
      );
    }
    throw error;
  }
}

export async function getMessageFull(id: string): Promise<GmailSearchHit | null> {
  try {
    const gmail = await getUncachableGmailClient();
    const result = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    if (result.data.labelIds?.includes("DRAFT")) {
      return null;
    }

    const headers = result.data.payload?.headers;
    const internal = result.data.internalDate
      ? new Date(Number(result.data.internalDate)).toISOString()
      : new Date().toISOString();

    return {
      id: result.data.id || id,
      threadId: result.data.threadId || id,
      subject: headerOf(headers, "Subject") || "(no subject)",
      from: headerOf(headers, "From"),
      to: headerOf(headers, "To"),
      date: internal,
      snippet: messageText(result.data.payload, result.data.snippet || ""),
    };
  } catch (error: any) {
    if (isInsufficientPermission(error)) {
      throw new Error(
        "Gmail token is missing read access. Reconnect Gmail with send, receive, and manage permissions.",
      );
    }
    throw error;
  }
}

export async function searchEmails(
  query: string,
  maxResults = 50,
): Promise<GmailSearchHit[]> {
  try {
    const gmail = await getUncachableGmailClient();
    const listed = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const ids = listed.data.messages || [];
    const messages: GmailSearchHit[] = [];
    for (const item of ids) {
      if (!item.id) continue;
      const message = await getMessage(item.id);
      if (message) messages.push(message);
    }
    return messages;
  } catch (error: any) {
    if (isInsufficientPermission(error)) {
      throw new Error(
        "Gmail token is missing read access. Reconnect Gmail with send, receive, and manage permissions.",
      );
    }
    throw error;
  }
}

export async function searchThreadsForLead(leadEmail: string): Promise<{
  threads: EmailThread[];
  draftThreadIds: string[];
}> {
  const gmail = await getUncachableGmailClient();
  const query = `${leadEmail} -in:spam -in:trash -in:drafts -is:draft`;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const listed = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
      pageToken,
    });
    for (const item of listed.data.messages || []) {
      if (item.id) ids.push(item.id);
    }
    pageToken = listed.data.nextPageToken || undefined;
  } while (pageToken && ids.length < 100);

  const threads: EmailThread[] = [];
  for (const id of ids.slice(0, 100)) {
    const hit = await getMessageFull(id);
    await sleep(120);
    if (!hit) continue;
    threads.push({
      gmailThreadId: hit.threadId,
      gmailMessageId: hit.id,
      subject: hit.subject,
      summary: hit.snippet,
      date: hit.date,
      from: hit.from,
      to: hit.to,
      direction: directionFor(hit.from, leadEmail),
    });
  }

  const drafts = await gmail.users.messages.list({
    userId: "me",
    q: `${leadEmail} in:drafts`,
    maxResults: 40,
  });
  const draftThreadIds = Array.from(
    new Set(
      (drafts.data.messages || [])
        .map((m) => m.threadId)
        .filter((id): id is string => !!id),
    ),
  );

  return {
    threads: threads.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    draftThreadIds,
  };
}
