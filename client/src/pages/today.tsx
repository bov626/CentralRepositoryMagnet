import Layout from "@/components/layout";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { format } from "date-fns";
import { Loader2, ChevronDown, X, Phone, Mail, PlayCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { SalesPulseCard, type MoneyView } from "@/components/sales-pulse-card";
import { CallMetric, type CallStats } from "@/components/call-metric";
import { NextStepTeach } from "@/components/next-step-teach";
import { auditScoreFromLead, jobTitleFromLead } from "@shared/audit";
import { RoastResumeLink } from "@/components/roast-resume-link";
import { CopyLeadName } from "@/components/copy-lead-email";
import { isEmailHistoryItem, isIgnoredEmail } from "@shared/email";

type AuditCall = {
  id: string;
  name: string;
  email: string | null;
  summary?: string | null;
  followUpAngle?: string | null;
  auditPdfUrl?: string | null;
  jobTitle?: string | null;
  auditScore?: number | null;
};

type TodayEmail = {
  date: string;
  action?: string;
  type?: string;
  subject?: string;
  summary?: string;
  direction?: string;
  gmailThreadId?: string;
};

type TodayItem = {
  lead: {
    id: string;
    name: string;
    email: string | null;
    company?: string | null;
    stage: string;
    summary?: string | null;
    followUpAngle?: string | null;
    nextStepAi?: string | null;
    nextStepManual?: string | null;
    recordingLink?: string | null;
    history?: TodayEmail[];
    emailThreads?: Array<{
      date: string;
      subject: string;
      summary: string;
      direction: string;
    }>;
  };
  reason: string;
  cadence: string | null;
  priority?: number;
  preview?: boolean;
};

function emailsForLead(lead: TodayItem["lead"]): TodayEmail[] {
  const history = Array.isArray(lead.history) ? lead.history : [];
  const fromHistory = history.filter((item) => isEmailHistoryItem(item) && !isIgnoredEmail(item));
  const source = fromHistory.length
    ? fromHistory
    : (lead.emailThreads || []).filter((item) => !isIgnoredEmail(item));
  return source.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function TodayPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const today = new Date();

  const { data, isLoading } = useQuery<{
    count: number;
    items: TodayItem[];
    calls?: CallStats;
    auditCalls?: AuditCall[];
    money?: MoneyView;
  }>({
    queryKey: ["today-focus"],
    queryFn: async () => {
      const res = await fetch("/api/today-focus");
      if (!res.ok) throw new Error("Failed to load today's focus");
      return res.json();
    },
  });

  const { data: syncStatus } = useQuery<{
    running: boolean;
    done: number;
    total: number;
    failed: number;
    current: string | null;
  }>({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/email/sync-status");
      if (!res.ok) throw new Error("Failed to load sync status");
      return res.json();
    },
    refetchInterval: 4000,
  });

  const items = data?.items || [];
  const theyEmailed = items.filter((item) => item.priority === 0);
  const afterCall = items.filter((item) => item.priority === 1);
  const followUps = items.filter((item) => (item.priority ?? 2) > 1);
  const auditCalls = data?.auditCalls || [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-border/60 pb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {format(today, "EEEE · MMMM d")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Today's Focus</h1>
            <p className="text-muted-foreground mt-2">
              {isLoading
                ? "Loading queue…"
                : [
                    theyEmailed.length
                      ? `${theyEmailed.length} ${theyEmailed.length === 1 ? "reply owed" : "replies owed"}`
                      : null,
                    afterCall.length
                      ? `${afterCall.length} after a call`
                      : null,
                    followUps.length
                      ? `${followUps.length} ${followUps.length === 1 ? "follow-up" : "follow-ups"}`
                      : null,
                    auditCalls.length
                      ? `${auditCalls.length} audit ${auditCalls.length === 1 ? "call" : "calls"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Nobody to email today."}
            </p>
            {syncStatus?.running && (
              <p className="text-sm text-primary mt-2">
                Reading every card for next steps — {syncStatus.done} / {syncStatus.total}
                {syncStatus.current ? ` · ${syncStatus.current}` : ""}. This can take a while.
              </p>
            )}
          </div>
          {data?.money && <SalesPulseCard money={data.money} />}
        </header>

        {data?.calls && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Calls</h2>
            <CallMetric
              calls={data.calls}
              onOpenLead={(leadId) => setSelectedLeadId(leadId)}
            />
          </section>
        )}

        {theyEmailed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-[0.18em] text-red-400">
              They emailed · no reply ({theyEmailed.length})
            </h2>
            <div className="space-y-3">
              {theyEmailed.map((item) => (
                <QueueRow
                  key={item.lead.id}
                  item={item}
                  onOpenLead={() => setSelectedLeadId(item.lead.id)}
                />
              ))}
            </div>
          </section>
        )}

        {afterCall.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              After a call · no email ({afterCall.length})
            </h2>
            <div className="space-y-3">
              {afterCall.map((item) => (
                <QueueRow
                  key={item.lead.id}
                  item={item}
                  onOpenLead={() => setSelectedLeadId(item.lead.id)}
                />
              ))}
            </div>
          </section>
        )}

        {(isLoading || followUps.length > 0 || (theyEmailed.length === 0 && afterCall.length === 0 && auditCalls.length === 0)) && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Follow-ups</h2>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : followUps.length > 0 ? (
              followUps.map((item) => (
                <QueueRow
                  key={item.lead.id}
                  item={item}
                  onOpenLead={() => setSelectedLeadId(item.lead.id)}
                />
              ))
            ) : (
              <div className="p-10 text-center border border-dashed border-border/60 rounded-md">
                <p className="text-muted-foreground">You're all caught up for today.</p>
              </div>
            )}
          </div>
        )}

        {auditCalls.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Audit calls · ask for feedback ({auditCalls.length})
            </h2>
            <div className="space-y-2">
              {auditCalls.map((lead) => (
                <AuditCallRow
                  key={lead.id}
                  lead={lead}
                  onOpenLead={() => setSelectedLeadId(lead.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <LeadDetails leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </Layout>
  );
}

function gmailSearchUrl(email: string) {
  const query = `(from:${email} OR to:${email}) -in:drafts`;
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

function AuditCallRow({
  lead,
  onOpenLead,
}: {
  lead: AuditCall;
  onOpenLead: () => void;
}) {
  const queryClient = useQueryClient();
  const called = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}/audit-called`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to mark called");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not mark called", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-md border border-border bg-card p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <CopyLeadName name={lead.name} email={lead.email} className="block max-w-full" />
        <button type="button" onClick={onOpenLead} className="text-left">
          <p className="text-sm text-muted-foreground truncate mt-0.5">{lead.email || "No email"}</p>
        </button>
        {(jobTitleFromLead(lead) || auditScoreFromLead(lead) != null) && (
          <p className="text-sm text-foreground mt-1">
            {[
              jobTitleFromLead(lead),
              auditScoreFromLead(lead) != null ? `Score ${auditScoreFromLead(lead)}/100` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <p className="text-sm text-foreground mt-2">
          Call them. Ask what was useful and what was missing. Then we redo the audit.
        </p>
        {lead.auditPdfUrl && (
          <a
            href={lead.auditPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            Open their PDF
          </a>
        )}
        {lead.email && (
          <div className="mt-2">
            <RoastResumeLink email={lead.email} />
          </div>
        )}
        {lead.email && (
          <a
            href={gmailSearchUrl(lead.email)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground mt-2 ml-3 inline-block"
          >
            Open in Gmail
          </a>
        )}
      </div>
      <Button onClick={() => called.mutate()} disabled={called.isPending} className="gap-2 shrink-0">
        {called.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
        Called
      </Button>
    </div>
  );
}

function QueueRow({ item, onOpenLead }: { item: TodayItem; onOpenLead: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const emails = emailsForLead(item.lead);

  const dismiss = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${item.lead.id}/dismiss-today`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to dismiss");
      return data;
    },
    onSuccess: () => {
      queryClient.setQueryData(["today-focus"], (current: { items?: TodayItem[]; count?: number } | undefined) => {
        if (!current?.items) return current;
        const items = current.items.filter((row) => row.lead.id !== item.lead.id);
        return { ...current, items, count: items.length };
      });
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div
      className={cn(
        "rounded-md border bg-card overflow-hidden",
        item.preview ? "border-dashed border-border" : "border-border",
      )}
    >
      <div className="flex items-stretch">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(!open);
            }
          }}
          className="min-w-0 flex-1 flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/30 cursor-pointer"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CopyLeadName name={item.lead.name} email={item.lead.email} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                {item.reason}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {item.lead.followUpAngle || item.lead.nextStepManual || item.lead.email || "No email"}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        </div>
        <button
          type="button"
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending || !!item.preview}
          title="Remove from Today"
          aria-label={`Remove ${item.lead.name} from Today`}
          className="shrink-0 px-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
        >
          {dismiss.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border p-4 space-y-5">
          <NextStepTeach lead={item.lead} />
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" />
                Fathom call summary
              </h3>
              {item.lead.recordingLink && (
                <a
                  href={item.lead.recordingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View recording <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {item.lead.summary ? (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {item.lead.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No Fathom notes on this card yet.</p>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email exchanges
            </h3>
            {emails.length > 0 ? (
              <div className="space-y-4 border-l-2 border-muted pl-4 ml-1">
                {emails.map((email, i) => (
                  <div key={`${email.gmailThreadId || email.date}-${i}`} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {email.direction === "in" ? "Received" : "Sent"}
                    </p>
                    <p className="text-sm font-medium text-foreground">{email.subject || email.action}</p>
                    {email.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{email.summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{format(new Date(email.date), "MMM d, h:mm a")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emails on this card yet.</p>
            )}
          </section>
          <div className="flex items-center gap-3 pt-1">
            {item.lead.email ? (
              <a
                href={gmailSearchUrl(item.lead.email)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Open in Gmail
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">No email</span>
            )}
            {item.lead.email && <RoastResumeLink email={item.lead.email} />}
            <button
              type="button"
              onClick={onOpenLead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              CRM card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
