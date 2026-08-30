export type TodayCall = {
  id: string;
  title: string;
  start: string;
  attendees: Array<{ name?: string | null; email?: string | null }>;
  leadId?: string | null;
};

export type CallStats = {
  configured: boolean;
  today: number;
  week: number;
  todayEvents: TodayCall[];
};

export function CallMetric({ calls }: { calls: CallStats }) {
  if (!calls.configured) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3 min-w-[220px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calls</p>
        <p className="text-sm text-muted-foreground mt-1">Google Calendar is not connected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-3 min-w-[260px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calls</p>
      <div className="flex items-end gap-6 mt-1">
        <div>
          <p className="text-4xl font-bold tabular-nums tracking-tight leading-none">{calls.today}</p>
          <p className="text-xs text-muted-foreground mt-1">today</p>
        </div>
        <div className="pb-0.5">
          <p className="text-2xl font-semibold tabular-nums leading-none text-foreground/80">{calls.week}</p>
          <p className="text-xs text-muted-foreground mt-1">this week</p>
        </div>
      </div>
    </div>
  );
}
