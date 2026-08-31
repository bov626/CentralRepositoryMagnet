import Layout from "@/components/layout";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { format } from "date-fns";
import { Send, Loader2, ChevronDown, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { SalesPulseCard, type MoneyView } from "@/components/sales-pulse-card";
import { CallMetric, type CallStats } from "@/components/call-metric";
import { NextStepTeach } from "@/components/next-step-teach";
import { auditScoreFromLead, jobTitleFromLead } from "@shared/audit";

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
  };
  reason: string;
  cadence: string | null;
  preview?: boolean;
  draft: {
    subject: string;
    body: string;
    source: "closed-won" | "template";
  };
};

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
  const auditCalls = data?.auditCalls || [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
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
                    items.length
                      ? `${items.length} ${items.length === 1 ? "follow-up" : "follow-ups"}`
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
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Daily focus</h2>
            <CallMetric calls={data.calls} />
            {data.calls.configured && data.calls.todayEvents.length > 0 && (
              <div className="space-y-2">
                {data.calls.todayEvents.map((event) => {
                  const who = event.attendees
                    .map((a) => a.name || a.email)
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => event.leadId && setSelectedLeadId(event.leadId)}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3 text-left",
                        event.leadId && "hover:bg-muted/30",
                      )}
                    >
                      <span className="text-sm font-semibold tabular-nums shrink-0 w-16">
                        {format(new Date(event.start), "h:mm a")}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium truncate block">{who || event.title}</span>
                        {who && <span className="text-sm text-muted-foreground truncate block">{event.title}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
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

        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Follow-ups</h2>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : items.length > 0 ? (
            items.map((item) => (
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
        <button type="button" onClick={onOpenLead} className="text-left">
          <p className="font-semibold truncate">{lead.name}</p>
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
  const [subject, setSubject] = useState(item.draft.subject);
  const [body, setBody] = useState(item.draft.body);

  const send = useMutation({
    mutationFn: async () => {
      if (!item.lead.email) throw new Error("This lead has no email address");
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: item.lead.email,
          subject,
          body,
          leadId: item.lead.id,
          cadence: item.cadence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: data.mocked ? "Logged (not sent)" : "Sent",
        description: data.mocked
          ? `Saved to ${item.lead.name}'s timeline. Real send happens on Replit.`
          : `Sent to ${item.lead.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    },
  });

  const dismiss = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${item.lead.id}/dismiss-today`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to dismiss");
      return data;
    },
    onSuccess: () => {
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
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/30"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{item.lead.name}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                {item.reason}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {item.lead.followUpAngle || item.lead.email || "No email"}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        </button>
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
        <div className="border-t border-border p-4 space-y-3">
          <NextStepTeach lead={item.lead} />
          {item.lead.summary && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
              {item.lead.summary}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Draft {item.draft.source === "closed-won" ? "· from Closed emails" : "· template"}
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] resize-none font-mono text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
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
              <button
                type="button"
                onClick={onOpenLead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                CRM card
              </button>
            </div>
            <Button onClick={() => send.mutate()} disabled={send.isPending || !item.lead.email} className="gap-2">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {send.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
