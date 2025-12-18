import Layout from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Video, Clock, Users, Download, CheckCircle2, ExternalLink, AlertCircle, Key, RefreshCw, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/data";
import { useState, useEffect } from "react";

interface FathomAttendee {
  name: string;
  email: string;
  email_domain: string;
  is_external: boolean;
}

interface FathomMeeting {
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
  calendar_invitees: FathomAttendee[];
  default_summary?: {
    template_name: string;
    markdown_formatted: string;
  };
  action_items?: Array<{
    description: string;
    completed: boolean;
  }>;
}

interface FathomResponse {
  items: FathomMeeting[];
  next_cursor: string | null;
}

export default function FathomPage() {
  const queryClient = useQueryClient();
  const { leads } = useStore();
  
  // Track dismissed (hidden) meeting IDs in localStorage
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('fathom_dismissed');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const dismissMeeting = (recordingId: number) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(recordingId);
    setDismissedIds(newDismissed);
    localStorage.setItem('fathom_dismissed', JSON.stringify(Array.from(newDismissed)));
    toast.success("Meeting hidden from list");
  };

  // Get set of imported recording IDs from existing leads (check fathomRecordingId first, then parse recordingLink)
  const importedRecordingIds = new Set(
    leads
      .filter(l => l.fathomRecordingId || l.recordingLink)
      .map(l => {
        if (l.fathomRecordingId) return l.fathomRecordingId;
        const match = l.recordingLink?.match(/\/calls\/(\d+)/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((id): id is number => id !== null)
  );

  const { data: status } = useQuery<{ configured: boolean }>({
    queryKey: ["fathom-status"],
    queryFn: async () => {
      const res = await fetch("/api/fathom/status");
      return res.json();
    },
  });

  const { data: meetings, isLoading, error, refetch, isFetching } = useQuery<FathomResponse>({
    queryKey: ["fathom-meetings"],
    queryFn: async () => {
      const res = await fetch("/api/fathom/meetings");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch meetings");
      }
      return res.json();
    },
    enabled: status?.configured === true,
  });

  const importMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      const res = await fetch(`/api/fathom/import/${recordingId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import meeting");
      }
      return res.json();
    },
    onSuccess: (data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      // Check if this was an enhancement (lead already existed) or new import
      const wasEnhancement = leads.some(l => l.email && l.email === data.email);
      toast.success(wasEnhancement 
        ? `Enhanced "${data.name}" with Fathom call data` 
        : `Imported "${data.name}" as a new lead`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Split meetings into available, imported, and dismissed
  const availableMeetings = meetings?.items.filter(m => 
    !importedRecordingIds.has(m.recording_id) && !dismissedIds.has(m.recording_id)
  ) || [];
  const importedMeetings = meetings?.items.filter(m => importedRecordingIds.has(m.recording_id)) || [];
  const dismissedMeetings = meetings?.items.filter(m => dismissedIds.has(m.recording_id)) || [];

  if (!status?.configured) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-20">
          <div className="text-center p-12 border-2 border-dashed border-border rounded-xl bg-card">
            <Key className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Connect Fathom</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              To import meeting notes from Fathom, you'll need to add your Fathom API key. 
              You can find this in your Fathom account settings.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
              <p className="font-medium mb-2">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to <a href="https://fathom.video/settings" target="_blank" rel="noreferrer" className="text-primary hover:underline">fathom.video/settings</a></li>
                <li>Navigate to API Tokens</li>
                <li>Create a new API token</li>
                <li>Add it as FATHOM_API_KEY in your Replit Secrets</li>
              </ol>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              Fathom Meetings
            </h1>
            <p className="text-muted-foreground">
              Import meeting notes directly into your pipeline
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2",
              isFetching && "opacity-50 cursor-wait"
            )}
            data-testid="button-refresh-fathom"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Loading meetings from Fathom...
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400">{(error as Error).message}</p>
          </div>
        )}

        {meetings && (
          <div className="space-y-8">
            {/* Available Meetings */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                Available to Import ({availableMeetings.length})
              </h2>
              {availableMeetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  All meetings have been imported
                </div>
              ) : (
                <div className="space-y-4">
                  {availableMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.recording_id}
                      meeting={meeting}
                      isImported={false}
                      isImporting={importMutation.isPending && importMutation.variables === meeting.recording_id}
                      onImport={() => importMutation.mutate(meeting.recording_id)}
                      onDismiss={() => dismissMeeting(meeting.recording_id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Imported Meetings */}
            {importedMeetings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Already Imported ({importedMeetings.length})
                </h2>
                <div className="space-y-4 opacity-60">
                  {importedMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.recording_id}
                      meeting={meeting}
                      isImported={true}
                      isImporting={false}
                      onImport={() => importMutation.mutate(meeting.recording_id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function MeetingCard({
  meeting,
  isImported,
  isImporting,
  onImport,
  onDismiss,
}: {
  meeting: FathomMeeting;
  isImported: boolean;
  isImporting: boolean;
  onImport: () => void;
  onDismiss?: () => void;
}) {
  const externalAttendees = meeting.calendar_invitees?.filter(a => a.is_external) || [];
  const startTime = meeting.recording_start_time ? new Date(meeting.recording_start_time) : null;
  const summary = meeting.default_summary?.markdown_formatted
    ?.replace(/^##\s*Summary\s*/i, '')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 200);

  return (
    <div
      className={cn(
        "p-5 rounded-lg border bg-card transition-all",
        isImported ? "border-green-500/30 bg-green-500/5" : "border-border hover:border-primary/30"
      )}
      data-testid={`card-meeting-${meeting.recording_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Video className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold text-lg truncate">{meeting.title || meeting.meeting_title}</h3>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {startTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(startTime, "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
            {externalAttendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {externalAttendees.map(a => a.name || a.email).join(", ")}
              </span>
            )}
          </div>

          {summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {summary}...
            </p>
          )}

          {meeting.action_items && meeting.action_items.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {meeting.action_items.slice(0, 3).map((item, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20"
                >
                  {item.description.slice(0, 40)}{item.description.length > 40 ? '...' : ''}
                </span>
              ))}
              {meeting.action_items.length > 3 && (
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                  +{meeting.action_items.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onDismiss && !isImported && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-md hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
              title="Hide this meeting"
              data-testid={`button-dismiss-${meeting.recording_id}`}
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <a
            href={meeting.url}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Open in Fathom"
            data-testid={`link-fathom-${meeting.recording_id}`}
          >
            <ExternalLink className="h-5 w-5" />
          </a>

          {isImported ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Imported</span>
            </div>
          ) : (
            <button
              onClick={onImport}
              disabled={isImporting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium",
                isImporting
                  ? "bg-primary/50 text-primary-foreground cursor-wait"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              data-testid={`button-import-${meeting.recording_id}`}
            >
              <Download className="h-4 w-4" />
              {isImporting ? "Importing..." : "Import as Lead"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
