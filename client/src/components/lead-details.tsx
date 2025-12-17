import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Lead, useStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, AlertCircle, PlayCircle, ExternalLink, CheckCircle2, Linkedin } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface LeadDetailsProps {
  leadId: string | null;
  onClose: () => void;
}

export function LeadDetails({ leadId, onClose }: LeadDetailsProps) {
  const { leads, updateLead } = useStore();
  const lead = leads.find((l) => l.id === leadId);
  const [notes, setNotes] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");

  useEffect(() => {
    if (lead) {
      setNotes(lead.summary || "");
      setLinkedInUrl(lead.linkedIn || "");
    }
  }, [lead]);

  if (!lead) return null;

  const handleSaveNotes = () => {
    updateLead(lead.id, { summary: notes });
  };

  const handleSaveLinkedIn = () => {
    updateLead(lead.id, { linkedIn: linkedInUrl });
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-l border-border p-0 gap-0">
        <div className="p-6 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{lead.name}</h2>
                    {lead.company && <p className="text-muted-foreground font-medium">{lead.company}</p>}
                </div>
                <div className="flex gap-2">
                    {lead.actionNeeded && (
                        <Badge variant="destructive" className="animate-pulse">Action Needed</Badge>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {lead.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-background/50 backdrop-blur-sm px-2 py-0.5 text-xs font-mono">{tag}</Badge>
                ))}
            </div>

            <div className="flex flex-col gap-3">
                 {/* LinkedIn Field */}
                <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0077b5]" />
                    <Input 
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        onBlur={handleSaveLinkedIn}
                        placeholder="Paste LinkedIn URL..."
                        className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary px-1 w-full max-w-[300px]"
                    />
                    {linkedInUrl && (
                        <a href={linkedInUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Created {format(new Date(lead.history[0].date), "MMM d")}</span>
                    </div>
                    {lead.nextFollowUp && (
                        <div className="flex items-center gap-1.5 text-orange-400">
                            <Clock className="h-4 w-4" />
                            <span>Follow-up: {format(new Date(lead.nextFollowUp), "MMM d")}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="p-6 space-y-8">
            {/* Call Recording & Summary */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" /> Fathom Call Summary
                    </h3>
                    {lead.recordingLink && (
                        <a href={lead.recordingLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View Recording <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
                <div className="bg-muted/30 rounded-md p-4 border border-border/50">
                    <Textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        onBlur={handleSaveNotes}
                        className="min-h-[150px] bg-transparent border-none resize-none focus-visible:ring-0 p-0 text-sm leading-relaxed"
                        placeholder="Paste Fathom summary here..."
                    />
                </div>
            </section>

            <Separator />

            {/* Strategic Info */}
            <div className="grid grid-cols-1 gap-6">
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Key Blocker
                    </h3>
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                        {lead.blocker || "No blocker identified yet."}
                    </div>
                </section>

                <section className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Decision Trigger
                    </h3>
                    <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-200 text-sm">
                        {lead.decisionTrigger || "What needs to happen for them to buy?"}
                    </div>
                </section>
            </div>

            <Separator />
            
            {/* History Log */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity History</h3>
                <div className="space-y-4 border-l-2 border-muted pl-4 ml-1">
                    {lead.history.slice().reverse().map((item, i) => (
                        <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted border-2 border-background" />
                            <p className="text-sm text-foreground">{item.action}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, h:mm a")}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
