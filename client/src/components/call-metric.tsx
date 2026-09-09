import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  sold?: boolean;
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
  sold?: number;
  closeRate?: number;
  weeksAgo?: number;
  rangeLabel?: string;
  error?: string;
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

function ReconnectCalendarButton() {
  const queryClient = useQueryClient();
  const reconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar/reconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not check Calendar");
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ["today-focus"] });
        queryClient.invalidateQueries({ queryKey: ["calls-week"] });
        toast({ title: "Calendar connected" });
        return;
      }
      toast({
        title: "Calendar still failing",
        description: data.error || "The Replit Calendar connector did not give this app a token.",
        variant: "destructive",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Could not retry Calendar", description: error.message, variant: "destructive" });
    },
  });

  return (
    <button
      type="button"
      onClick={() => reconnect.mutate()}
      disabled={reconnect.isPending}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
    >
      {reconnect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
      {reconnect.isPending ? "Checking…" : "Retry Calendar"}
    </button>
  );
}

export function CallMetric({
  calls,
  onOpenLead,
}: {
  calls: CallStats;
  onOpenLead: (leadId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [weeksAgo, setWeeksAgo] = useState(0);

  const { data: weekCalls, isFetching } = useQuery<CallStats>({
    queryKey: ["calls-week", weeksAgo],
    queryFn: async () => {
      const res = await fetch(`/api/calls/week?weeksAgo=${weeksAgo}`);
      if (!res.ok) throw new Error("Failed to load that week");
      return res.json();
    },
    enabled: weeksAgo > 0,
    placeholderData: (previous) => previous,
  });

  const view = weeksAgo === 0 ? calls : weekCalls;
  const days = view?.days || [];
  const events = view?.weekEvents || view?.todayEvents || [];
  const sold = view?.sold ?? 0;
  const week = view?.week ?? 0;
  const closeRate = view?.closeRate ?? (week ? Math.round((sold / week) * 100) : 0);

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
      queryClient.invalidateQueries({ queryKey: ["calls-week"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    },
  });

  if (!calls.configured) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calls</p>
          <p className="text-sm text-muted-foreground mt-1">Google Calendar is not connected.</p>
          {calls.error && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">{calls.error}</p>
          )}
        </div>
        <ReconnectCalendarButton />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-6">
        <div className="flex items-center gap-1 self-center">
          <button
            type="button"
            onClick={() => setWeeksAgo((n) => Math.min(26, n + 1))}
            disabled={weeksAgo >= 26 || isFetching}
            title="Previous week"
            aria-label="Previous week"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeeksAgo((n) => Math.max(0, n - 1))}
            disabled={weeksAgo === 0 || isFetching}
            title="Newer week"
            aria-label="Newer week"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm">
          <span className={cn("text-2xl font-bold tabular-nums", sold > 0 && "text-emerald-400")}>
            {sold}
          </span>
          <span className="text-muted-foreground ml-2">sold</span>
        </p>
        <p className="text-sm">
          <span className="text-2xl font-bold tabular-nums">{week}</span>
          <span className="text-muted-foreground ml-2">{weeksAgo === 0 ? "this week" : "calls"}</span>
        </p>
        <p className="text-sm">
          <span className={cn("text-2xl font-bold tabular-nums", closeRate > 0 && "text-emerald-400")}>
            {closeRate}%
          </span>
          <span className="text-muted-foreground ml-2">close</span>
        </p>
        {weeksAgo > 0 && view?.rangeLabel && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center">
            {isFetching ? "Loading…" : view.rangeLabel}
          </span>
        )}
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
                      event.sold
                        ? "bg-emerald-500/20"
                        : day.isToday
                          ? "bg-red-500/15"
                          : "bg-muted/50",
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
                      <span
                        className={cn(
                          "block text-[10px] tabular-nums leading-tight",
                          event.sold ? "text-emerald-400/80" : "text-muted-foreground",
                        )}
                      >
                        {callTime(event.start)}
                      </span>
                      <span
                        className={cn(
                          "block text-xs font-medium truncate leading-tight",
                          event.sold && "text-emerald-300",
                        )}
                      >
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
