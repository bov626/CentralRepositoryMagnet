import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type LeadLike = {
  id: string;
  followUpAngle?: string | null;
  nextStepAi?: string | null;
  nextStepManual?: string | null;
};

function seedText(lead: LeadLike): string {
  return (lead.followUpAngle || lead.nextStepManual || lead.nextStepAi || "").trim();
}

export function NextStepTeach({ lead }: { lead: LeadLike }) {
  const queryClient = useQueryClient();
  const guessed = (lead.nextStepAi || lead.followUpAngle || "").trim();
  const saved = (lead.nextStepManual || "").trim();
  const live = seedText(lead);
  const moved = !!(saved && live && saved !== live);
  const [actual, setActual] = useState(() => seedText(lead));

  useEffect(() => {
    setActual(seedText(lead));
  }, [lead.id]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      const next = actual.trim();
      queryClient.setQueryData(["leads"], (old: Array<LeadLike> | undefined) =>
        old?.map((row) =>
          row.id === lead.id
            ? { ...row, nextStepManual: next, followUpAngle: next }
            : row,
        ),
      );
      queryClient.setQueryData(["today-focus"], (old: { items?: Array<{ lead: LeadLike }> } | undefined) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((row) =>
            row.lead.id === lead.id
              ? { ...row, lead: { ...row.lead, nextStepManual: next, followUpAngle: next } }
              : row,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
      toast({ title: "Next step saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save next step", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-md border border-primary/40 bg-primary/10 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-primary">Next step</p>
      {moved && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">You said: </span>
          {saved}
        </p>
      )}
      {!moved && guessed && guessed !== saved && guessed !== actual.trim() && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Guessed: </span>
          {guessed}
        </p>
      )}
      <Textarea
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        placeholder="What you would actually do next"
        className="min-h-[72px] bg-background/60 text-sm"
      />
      <Button
        type="button"
        size="sm"
        onClick={() => save.mutate()}
        disabled={save.isPending || !actual.trim()}
      >
        {save.isPending ? "Saving…" : saved ? "Update next step" : "Save next step"}
      </Button>
    </div>
  );
}
