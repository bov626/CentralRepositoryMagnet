const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1';

export interface FathomMeeting {
  title: string;
  meeting_title: string;
  recording_id: number;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  recording_start_time: string;
  recording_end_time: string;
  calendar_invitees_domains_type: string;
  transcript_language: string;
  calendar_invitees: Array<{
    name: string;
    email: string;
    email_domain: string;
    is_external: boolean;
    matched_speaker_display_name?: string;
  }>;
  recorded_by: {
    name: string;
    email: string;
    email_domain: string;
    team?: string;
  };
  transcript?: Array<{
    speaker: {
      display_name: string;
      matched_calendar_invitee_email?: string;
    };
    text: string;
    timestamp: string;
  }>;
  default_summary?: {
    template_name: string;
    markdown_formatted: string;
  };
  action_items?: Array<{
    description: string;
    user_generated: boolean;
    completed: boolean;
    recording_timestamp: string;
    recording_playback_url: string;
    assignee?: {
      name: string;
      email: string;
      team?: string;
    };
  }>;
}

export interface FathomMeetingsResponse {
  limit: number | null;
  next_cursor: string | null;
  items: FathomMeeting[];
}

function getFathomApiKey(): string {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    throw new Error('FATHOM_API_KEY is not configured. Please add your Fathom API key.');
  }
  return apiKey;
}

export async function listMeetings(options?: {
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeTranscript?: boolean;
  createdAfter?: string;
  limit?: number;
}): Promise<FathomMeetingsResponse> {
  const apiKey = getFathomApiKey();
  
  const params = new URLSearchParams();
  params.set('calendar_invitees_domains_type', 'one_or_more_external');
  
  if (options?.includeSummary) {
    params.set('include_summary', 'true');
  }
  if (options?.includeActionItems) {
    params.set('include_action_items', 'true');
  }
  if (options?.includeTranscript) {
    params.set('include_transcript', 'true');
  }
  if (options?.createdAfter) {
    params.set('created_after', options.createdAfter);
  }
  
  const response = await fetch(`${FATHOM_API_BASE}/meetings?${params.toString()}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fathom API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

export async function getMeeting(recordingId: number): Promise<FathomMeeting | null> {
  const apiKey = getFathomApiKey();
  
  const params = new URLSearchParams();
  params.set('include_summary', 'true');
  params.set('include_action_items', 'true');
  params.set('include_transcript', 'true');
  
  const response = await fetch(`${FATHOM_API_BASE}/meetings?${params.toString()}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Fathom API error: ${response.status}`);
  }
  
  const data: FathomMeetingsResponse = await response.json();
  return data.items.find(m => m.recording_id === recordingId) || null;
}

export function extractLeadDataFromMeeting(meeting: FathomMeeting): {
  name: string;
  email: string;
  company: string | null;
  summary: string;
  keyTakeaways: string[];
  recordingLink: string;
} {
  const externalAttendee = meeting.calendar_invitees.find(inv => inv.is_external);
  
  const name = externalAttendee?.name || meeting.title.split(' - ')[0] || 'Unknown';
  const email = externalAttendee?.email || '';
  const company = externalAttendee?.email_domain 
    ? externalAttendee.email_domain.split('.')[0].charAt(0).toUpperCase() + externalAttendee.email_domain.split('.')[0].slice(1)
    : null;
  
  const summary = meeting.default_summary?.markdown_formatted
    ?.replace(/^##\s*Summary\s*/i, '')
    .replace(/\n/g, ' ')
    .trim() || '';
  
  const keyTakeaways = meeting.action_items?.map(item => item.description) || [];
  
  return {
    name,
    email,
    company,
    summary,
    keyTakeaways,
    recordingLink: meeting.url,
  };
}

export function isFathomConfigured(): boolean {
  return !!process.env.FATHOM_API_KEY;
}
