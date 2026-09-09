// Google Calendar Integration
import { google } from "googleapis";

let connectionSettings: any;

type ReplitToken = { header: string; label: string };

function replitAuthTokens(): ReplitToken[] {
  const tokens: ReplitToken[] = [];
  if (process.env.REPL_IDENTITY) tokens.push({ header: "repl " + process.env.REPL_IDENTITY, label: "workspace" });
  if (process.env.WEB_REPL_RENEWAL) tokens.push({ header: "depl " + process.env.WEB_REPL_RENEWAL, label: "publish" });
  return tokens;
}

function connectorNameOf(conn: any): string {
  return String(conn?.connector_name || conn?.connectorName || conn?.name || conn?.connector || "").toLowerCase();
}

function looksLikeCalendar(conn: any): boolean {
  const name = connectorNameOf(conn);
  return name.includes("calendar") || name.includes("google-workspace") || name.includes("google_workspace");
}

function calendarAccessToken(settings: any): string | null {
  const s = settings?.settings || settings || {};
  const oauth = s.oauth || {};
  const creds = oauth.credentials || s.credentials || {};
  const token = s.token || {};
  return (
    s.access_token ||
    oauth.access_token ||
    creds.access_token ||
    token.access_token ||
    s.accessToken ||
    null
  );
}

function calendarExpiresAt(settings: any): Date | null {
  const s = settings?.settings || settings || {};
  const raw = s.expires_at || s.expiresAt || s.oauth?.credentials?.expiry_date || s.oauth?.expires_at;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resetCalendarConnection() {
  connectionSettings = null;
}

export function calendarReconnectUrl(): string {
  return "https://replit.com/integrations";
}

async function listReplitConnections(auth: ReplitToken, query: string): Promise<any[]> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME || "connectors.replit.com";
  const res = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true${query}`, {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: auth.header,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Calendar connector HTTP ${res.status}`);
  }
  return Array.isArray(data.items) ? data.items : [];
}

async function loadCalendarConnection(): Promise<{ conn: any; via: string }> {
  const auths = replitAuthTokens();
  if (!auths.length) {
    throw new Error("This published app has no Replit identity, so it cannot read Calendar.");
  }

  const queries = [
    "&connector_names=google-calendar",
    "&connector_names=google-workspace",
    "",
  ];
  const seen: string[] = [];
  let lastError = "";

  for (const auth of auths) {
    for (const query of queries) {
      try {
        const items = await listReplitConnections(auth, query);
        for (const item of items) {
          const name = connectorNameOf(item) || "unnamed";
          if (!seen.includes(`${auth.label}:${name}`)) seen.push(`${auth.label}:${name}`);
        }
        const match =
          items.find((item) => looksLikeCalendar(item) && calendarAccessToken(item)) ||
          items.find((item) => looksLikeCalendar(item)) ||
          (query.includes("google-calendar") ? items[0] : undefined);
        if (match && calendarAccessToken(match)) {
          return { conn: match, via: `${auth.label}:${connectorNameOf(match) || "google-calendar"}` };
        }
      } catch (error: any) {
        lastError = error?.message || String(error);
      }
    }
  }

  const found = seen.length ? `Saw ${seen.join(", ")}.` : "Replit returned no connectors for this app.";
  throw new Error(
    lastError
      ? `${lastError} ${found}`
      : `Google Calendar is connected in Replit, but this app did not get a Calendar token. ${found}`,
  );
}

async function getAccessToken() {
  const stillGood =
    connectionSettings &&
    calendarAccessToken(connectionSettings) &&
    calendarExpiresAt(connectionSettings) &&
    calendarExpiresAt(connectionSettings)!.getTime() - Date.now() > 2 * 60 * 1000;
  if (stillGood) return calendarAccessToken(connectionSettings);

  const { conn } = await loadCalendarConnection();
  connectionSettings = conn;
  const accessToken = calendarAccessToken(connectionSettings);
  if (!accessToken) {
    connectionSettings = null;
    throw new Error("Google Calendar connection is missing an access token.");
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function probeCalendarConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  resetCalendarConnection();
  try {
    const calendar = await getGoogleCalendarClient();
    const now = new Date();
    await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      maxResults: 1,
      singleEvents: true,
    });
    return { ok: true };
  } catch (error: any) {
    const googleMessage = error?.response?.data?.error?.message || error?.message;
    return { ok: false, error: googleMessage || "Google Calendar is not connected" };
  }
}

const DENVER = "America/Denver";

const WILSON_EMAILS = new Set([
  "wyedoyoudothis@gmail.com",
  "wwhunsinger@gmail.com",
]);

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function isWilsonEmail(email?: string | null): boolean {
  return WILSON_EMAILS.has(normalizeEmail(email));
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const tz = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value || "GMT-00:00";
  const match = tz.match(/GMT([+-])(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000;
}

function denverMidnight(year: number, month: number, day: number): Date {
  const asUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = zoneOffsetMs(new Date(asUtc), DENVER);
  return new Date(asUtc - offset);
}

function denverYmd(date: Date): { year: number; month: number; day: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

export function denverWeekBounds(now = new Date(), weeksAgo = 0): { start: Date; end: Date; todayStart: Date; todayEnd: Date } {
  const today = denverYmd(now);
  const todayStart = denverMidnight(today.year, today.month, today.day);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const fromMonday: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const weeks = Math.max(0, weeksAgo);
  const start = new Date(
    todayStart.getTime() - ((fromMonday[today.weekday] ?? 0) + weeks * 7) * 24 * 60 * 60 * 1000,
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end, todayStart, todayEnd };
}

export function denverDayKey(date: Date): string {
  const ymd = denverYmd(date);
  return `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function denverWeekDays(now = new Date(), weeksAgo = 0): Array<{
  key: string;
  label: string;
  day: number;
  isToday: boolean;
}> {
  const { start, todayStart } = denverWeekBounds(now, weeksAgo);
  const todayKey = denverDayKey(todayStart);
  return WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const ymd = denverYmd(d);
    const key = denverDayKey(d);
    return { key, label, day: ymd.day, isToday: weeksAgo === 0 && key === todayKey };
  });
}

export function denverWeekRangeLabel(start: Date, endExclusive: Date): string {
  const last = new Date(endExclusive.getTime() - 1);
  const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...options }).format(date);
  const startMonth = fmt(start, { month: "short" });
  const startDay = fmt(start, { day: "numeric" });
  const endMonth = fmt(last, { month: "short" });
  const endDay = fmt(last, { day: "numeric" });
  if (startMonth === endMonth) return `${startMonth} ${startDay} – ${endDay}`;
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

function isTimedMeeting(event: {
  status?: string | null;
  start?: { dateTime?: string | null; date?: string | null };
}): boolean {
  if (event.status === "cancelled") return false;
  return !!event.start?.dateTime;
}

export type SalesCall = {
  id: string;
  title: string;
  start: string;
  recurringEventId?: string | null;
  attendees: Array<{ name?: string | null; email?: string | null }>;
};

export function matchCallsToLeads(
  calls: SalesCall[],
  leadsByEmail: Map<string, { id: string; name: string; sold?: boolean }>,
): Array<SalesCall & { leadId: string | null; leadName: string | null; sold: boolean; dayKey: string }> {
  return calls.map((event) => {
    const match = event.attendees
      .map((a) => a.email?.trim().toLowerCase())
      .find((email) => email && leadsByEmail.has(email));
    const lead = match ? leadsByEmail.get(match) : undefined;
    return {
      ...event,
      dayKey: denverDayKey(new Date(event.start)),
      leadId: lead?.id || null,
      leadName: lead?.name || null,
      sold: !!lead?.sold,
    };
  });
}

export async function listRecentMatchedCalls(
  leadsByEmail: Map<string, { id: string; name: string }>,
  now = new Date(),
): Promise<Array<{ leadId: string; start: string }>> {
  const lookback = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const calls = await listSalesCallsBetween(lookback, now);
  return matchCallsToLeads(calls, leadsByEmail)
    .filter((event): event is typeof event & { leadId: string } => !!event.leadId)
    .map((event) => ({ leadId: event.leadId, start: event.start }));
}

function isGoogleAuthError(error: any): boolean {
  const status = error?.code || error?.status || error?.response?.status;
  const message = String(error?.message || "").toLowerCase();
  return status === 401 || status === 403 || message.includes("invalid_grant") || message.includes("invalid credentials");
}

export async function listSalesCallsBetween(start: Date, end: Date): Promise<SalesCall[]> {
  const run = async () => {
    const calendar = await getGoogleCalendarClient();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 150,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (response.data.items || [])
      .filter((event) => isTimedMeeting(event))
      .map((event) => ({
        id: event.id || `${event.start?.dateTime}-${event.summary}`,
        title: event.summary || "Call",
        start: event.start?.dateTime || "",
        recurringEventId: event.recurringEventId || null,
        attendees: (event.attendees || [])
          .filter((a) => !a.self && !isWilsonEmail(a.email))
          .map((a) => ({ name: a.displayName || null, email: a.email || null })),
      }))
      .filter((event) => event.attendees.length > 0);
  };

  try {
    return await run();
  } catch (error) {
    if (!isGoogleAuthError(error)) throw error;
    resetCalendarConnection();
    return await run();
  }
}

export async function getUpcomingEvents(maxResults: number = 20) {
  const calendar = await getGoogleCalendarClient();
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: maxResults * 3, // Fetch more to filter down
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  
  // Filter to only include meetings with other attendees (not solo placeholder events)
  const salesMeetings = events.filter(event => {
    const attendees = event.attendees || [];
    // Must have at least one attendee who isn't the organizer/self
    const externalAttendees = attendees.filter(a => !a.self && !a.organizer);
    return externalAttendees.length > 0 || attendees.length > 1;
  });

  return salesMeetings.slice(0, maxResults);
}

export async function createEvent(summary: string, description: string, startTime: Date, endTime: Date, attendeeEmail?: string) {
  const calendar = await getGoogleCalendarClient();
  
  const event: any = {
    summary,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/New_York',
    },
  };

  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }];
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
}
