import { Loader2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export type TodayCall = {
  id: string;
  title: string;
  start: string;
  dayKey?: string;
  recurringEventId?: string | null;
  attendees: Array<{ name?: string | null; email?: string | null }>;
  leadId?: string | null;
  leadName?: string | null;
};

export type WeekDay = {
  key: string;
  label: string;
  day: number;
  isToday: boolean;
};

export type CallStats = {
  configured: boolean;
  today: number;
  week: number;
  days?: WeekDay[];
  weekEvents?: TodayCall[];
  todayEvents?: TodayCall[];
};

function callTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function callLabel(event: TodayCall): string {
  if (event.leadName) return firstName(event.leadName);
  const attendee = event.attendees[0];
  if (attendee?.name) return firstName(attendee.name);
  if (attendee?.email) return attendee.email.split("@")[0];
  return event.title;
}

export function CallMetric({
  calls,
  onOpenLead,
}: {
  calls: CallStats;
  onOpenLead: (leadId: string) => void;
}) {
  const queryClient = useQueryClient();
  const days = calls.days || [];
  const events = calls.weekEvents || calls.todayEvents || [];

  const dismiss = useMutation({
    mutationFn: async (event: TodayCall) => {
      const res = await fetch("/api/calls/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          recurringEventId: event.recurringEventId,
          title: event.title,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to dismiss");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    },
  });

  if (!calls.configured) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calls</p>
        <p className="text-sm text-muted-foreground mt-1">Google Calendar is not connected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-6">
        <p className="text-sm">
          <span className="text-2xl font-bold tabular-nums">{calls.today}</span>
          <span className="text-muted-foreground ml-2">today</span>
        </p>
        <p className="text-sm">
          <span className="text-2xl font-bold tabular-nums">{calls.week}</span>
          <span className="text-muted-foreground ml-2">this week</span>
        </p>
      </div>

      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-px rounded-md border border-border overflow-hidden bg-border min-w-[640px]">
        {days.map((day) => {
          const dayEvents = events
            .filter((event) => event.dayKey === day.key)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          return (
            <div
              key={day.key}
              className={cn(
                "bg-card min-h-[88px] p-1.5",
                day.isToday && "bg-red-500/10",
              )}
            >
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wider mb-1",
                  day.isToday ? "text-red-400 font-semibold" : "text-muted-foreground",
                )}
              >
                {day.label} {day.day}
              </p>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "group flex items-start gap-0.5 rounded px-1 py-0.5",
                      day.isToday ? "bg-red-500/15" : "bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => event.leadId && onOpenLead(event.leadId)}
                      className={cn(
                        "min-w-0 flex-1 text-left",
                        event.leadId && "hover:text-primary",
                      )}
                    >
                      <span className="block text-[10px] tabular-nums text-muted-foreground leading-tight">
                        {callTime(event.start)}
                      </span>
                      <span className="block text-xs font-medium truncate leading-tight">
                        {callLabel(event)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss.mutate(event)}
                      disabled={dismiss.isPending}
                      title="Doesn't count as a sales call"
                      aria-label={`Don't count ${callLabel(event)}`}
                      className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      {dismiss.isPending && dismiss.variables?.id === event.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
