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

export function NextStepTeach({ lead }: { lead: LeadLike }) {
  const queryClient = useQueryClient();
  const guessed = (lead.nextStepAi || lead.followUpAngle || "").trim();
  const saved = (lead.nextStepManual || "").trim();
  const [actual, setActual] = useState(saved);

  useEffect(() => {
    setActual(saved);
  }, [lead.id, saved]);

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
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save next step", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-md border border-primary/40 bg-primary/10 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-primary">Next step</p>
      {guessed && guessed !== saved && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Guessed: </span>
          {guessed}
        </p>
      )}
      <Textarea
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        placeholder="What you would actually do"
        className="min-h-[72px] bg-background/60 text-sm"
      />
      <Button
        size="sm"
        onClick={() => save.mutate()}
        disabled={save.isPending || !actual.trim()}
      >
        {save.isPending ? "Saving…" : saved ? "Update next step" : "Save next step"}
      </Button>
    </div>
  );
}
