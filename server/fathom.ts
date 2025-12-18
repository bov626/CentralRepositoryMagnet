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
  params.set('calendar_invitees_domains_type', 'all');
  
  let cursor: string | null = null;
  
  // Paginate through all meetings to find the one we want
  do {
    if (cursor) {
      params.set('cursor', cursor);
    }
    
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
    const meeting = data.items.find(m => m.recording_id === recordingId);
    
    if (meeting) {
      return meeting;
    }
    
    cursor = data.next_cursor;
  } while (cursor);
  
  return null;
}

export function extractLeadDataFromMeeting(meeting: FathomMeeting): {
  name: string;
  email: string;
  company: string | null;
  summary: string;
  actionItems: string[];
  recordingLink: string;
  nextFollowUp: string | null;
} {
  // Find external attendee - check is_external flag first, then fall back to anyone who isn't the recorder
  const recorderEmail = meeting.recorded_by?.email?.toLowerCase();
  let prospect = meeting.calendar_invitees.find(inv => inv.is_external);
  
  // Fallback: find any attendee whose email doesn't match the recorder
  if (!prospect && meeting.calendar_invitees.length > 0) {
    prospect = meeting.calendar_invitees.find(inv => 
      inv.email && inv.email.toLowerCase() !== recorderEmail
    );
  }
  
  const name = prospect?.name || prospect?.matched_speaker_display_name || meeting.title.split(' - ')[0] || 'Unknown';
  const email = prospect?.email || '';
  const company = prospect?.email_domain 
    ? prospect.email_domain.split('.')[0].charAt(0).toUpperCase() + prospect.email_domain.split('.')[0].slice(1)
    : null;
  
  // Extract only the high-level summary section, strip markdown formatting
  let summary = '';
  const rawSummary = meeting.default_summary?.markdown_formatted || '';
  
  // Helper function to clean markdown
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/^#+\s*/gm, '')                  // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1')        // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')            // Remove italic
      .replace(/^\s*[-*]\s*/gm, '')             // Remove bullet points
      .replace(/\n+/g, ' ')                     // Collapse newlines
      .replace(/\s+/g, ' ')                     // Collapse whitespace
      .trim();
  };
  
  // Try to extract just Key Takeaways section (most useful for sales notes)
  const takeawaysMatch = rawSummary.match(/##\s*Key Takeaways\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (takeawaysMatch) {
    summary = cleanMarkdown(takeawaysMatch[1]).slice(0, 600);
  } else {
    // Fallback to Summary section
    const summaryMatch = rawSummary.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      summary = cleanMarkdown(summaryMatch[1]).slice(0, 600);
    } else {
      // Last resort: clean the whole thing but take first portion
      summary = cleanMarkdown(rawSummary).slice(0, 400);
    }
  }
  
  const actionItems = meeting.action_items?.map(item => item.description) || [];
  
  // Set follow-up date: if there are action items, set follow-up for 3 days from now
  let nextFollowUp: string | null = null;
  if (meeting.action_items && meeting.action_items.length > 0) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    nextFollowUp = followUpDate.toISOString();
  }
  
  return {
    name,
    email,
    company,
    summary,
    actionItems,
    recordingLink: meeting.url,
    nextFollowUp,
  };
}

export function isFathomConfigured(): boolean {
  return !!process.env.FATHOM_API_KEY;
}
