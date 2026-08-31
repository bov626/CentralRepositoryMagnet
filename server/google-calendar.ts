// Google Calendar Integration
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
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

  return google.calendar({ version: 'v3', auth: oauth2Client });
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

export function denverWeekBounds(now = new Date()): { start: Date; end: Date; todayStart: Date; todayEnd: Date } {
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
  const start = new Date(todayStart.getTime() - (fromMonday[today.weekday] ?? 0) * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end, todayStart, todayEnd };
}

export function denverDayKey(date: Date): string {
  const ymd = denverYmd(date);
  return `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function denverWeekDays(now = new Date()): Array<{
  key: string;
  label: string;
  day: number;
  isToday: boolean;
}> {
  const { start, todayStart } = denverWeekBounds(now);
  const todayKey = denverDayKey(todayStart);
  return WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const ymd = denverYmd(d);
    const key = denverDayKey(d);
    return { key, label, day: ymd.day, isToday: key === todayKey };
  });
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

export async function listSalesCallsBetween(start: Date, end: Date): Promise<SalesCall[]> {
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
