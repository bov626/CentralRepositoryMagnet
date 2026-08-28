import Layout from "@/components/layout";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { format } from "date-fns";
import { Send, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatDollars } from "@shared/money";

type TodayItem = {
  lead: {
    id: string;
    name: string;
    email: string | null;
    company?: string | null;
    stage: string;
    summary?: string | null;
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
    money?: {
      agency: { closed: number; paid: number; toCollect: number; paidSource?: "stripe" | "crm" };
      community: { members: number; mrr: number; mrrGrowth: number };
    };
    stripe?: { configured: boolean };
  }>({
    queryKey: ["today-focus"],
    queryFn: async () => {
      const res = await fetch("/api/today-focus");
      if (!res.ok) throw new Error("Failed to load today's focus");
      return res.json();
    },
  });

  const items = data?.items || [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-border/60 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {format(today, "EEEE · MMMM d")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Today's Focus</h1>
          <p className="text-muted-foreground mt-2">
            {isLoading
              ? "Loading queue…"
              : items.length === 0
                ? "Nobody to email today."
                : `${items.length} ${items.length === 1 ? "person" : "people"} to email. Open, edit, send.`}
          </p>
        </header>

        {data?.money && (
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-md p-4 bg-card">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Jumpseat</p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">
                {formatDollars(data.money.agency.paid)}
                <span className="text-sm font-normal text-muted-foreground"> paid</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.money.agency.closed} closed this month · {formatDollars(data.money.agency.toCollect)} to collect
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {data.money.agency.paidSource === "stripe"
                  ? "Stripe this month"
                  : "Add STRIPE_SECRET_KEY for live totals"}
              </p>
            </div>
            <div className="border border-border rounded-md p-4 bg-card">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Skool</p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">
                {formatDollars(data.money.community.mrr)}
                <span className="text-sm font-normal text-muted-foreground"> MRR</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.money.community.members} members · {data.money.community.mrrGrowth >= 0 ? "+" : ""}
                {formatDollars(data.money.community.mrrGrowth)} this month
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
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

  return (
    <div
      className={cn(
        "rounded-md border bg-card overflow-hidden",
        item.preview ? "border-dashed border-border" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/30"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{item.lead.name}</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
              {item.reason}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {item.lead.email || "No email"} · {item.draft.subject}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-3">
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
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onOpenLead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Open full card
            </button>
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
