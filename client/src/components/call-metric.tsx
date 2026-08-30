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
      <div className="rounded-xl border border-dashed border-border px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calls</p>
        <p className="text-sm text-muted-foreground mt-1">Google Calendar is not connected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-end gap-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</p>
        <p className="text-5xl font-bold tabular-nums tracking-tight leading-none mt-1">{calls.today}</p>
        <p className="text-xs text-muted-foreground mt-1.5">calls</p>
      </div>
      <div className="pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">This week</p>
        <p className="text-3xl font-semibold tabular-nums leading-none mt-1">{calls.week}</p>
        <p className="text-xs text-muted-foreground mt-1.5">calls</p>
      </div>
    </div>
  );
}
