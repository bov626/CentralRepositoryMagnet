import Layout from "@/components/layout";
import { useStore, Lead } from "@/lib/data";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { CheckSquare, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  const { leads } = useStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const today = new Date();
  
  const dueToday = leads.filter(l => l.nextFollowUp && isToday(new Date(l.nextFollowUp)));
  const overdue = leads.filter(l => l.nextFollowUp && isPast(new Date(l.nextFollowUp)) && !isToday(new Date(l.nextFollowUp)));
  const waitingOnMe = leads.filter(l => l.actionNeeded && !isToday(new Date(l.nextFollowUp || ""))); // Avoid duplicates if it's already in due today
  
  // Mock pitch calls for today (in reality this would filter by stage + date)
  const pitchCalls = leads.filter(l => l.stage === "pitch-call" && (l.nextFollowUp ? isToday(new Date(l.nextFollowUp)) : true));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Today's Focus</h1>
            <p className="text-muted-foreground">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </header>

        {/* Pitch Calls Section */}
        <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                Pitch Calls ({pitchCalls.length})
            </h2>
            <div className="grid gap-3">
                {pitchCalls.length > 0 ? pitchCalls.map(lead => (
                    <TaskCard key={lead.id} lead={lead} type="pitch" onClick={() => setSelectedLeadId(lead.id)} />
                )) : (
                    <EmptyState message="No pitch calls scheduled for today." />
                )}
            </div>
        </section>

        {/* Overdue Section */}
        {overdue.length > 0 && (
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue Follow-ups ({overdue.length})
                </h2>
                <div className="grid gap-3">
                    {overdue.map(lead => (
                        <TaskCard key={lead.id} lead={lead} type="overdue" onClick={() => setSelectedLeadId(lead.id)} />
                    ))}
                </div>
            </section>
        )}

        {/* Due Today Section */}
        <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Due Today ({dueToday.length})
            </h2>
            <div className="grid gap-3">
                {dueToday.length > 0 ? dueToday.map(lead => (
                    <TaskCard key={lead.id} lead={lead} type="due" onClick={() => setSelectedLeadId(lead.id)} />
                )) : (
                    <EmptyState message="You're all caught up for today!" />
                )}
            </div>
        </section>

        {/* Waiting On Me */}
        {waitingOnMe.length > 0 && (
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    Action Required ({waitingOnMe.length})
                </h2>
                <div className="grid gap-3">
                    {waitingOnMe.map(lead => (
                        <TaskCard key={lead.id} lead={lead} type="action" onClick={() => setSelectedLeadId(lead.id)} />
                    ))}
                </div>
            </section>
        )}
      </div>

      <LeadDetails leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </Layout>
  );
}

function TaskCard({ lead, type, onClick }: { lead: Lead, type: 'pitch' | 'overdue' | 'due' | 'action', onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all cursor-pointer group shadow-sm",
                type === 'overdue' ? "border-red-500/30 bg-red-500/5" : "border-border"
            )}
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border",
                    type === 'pitch' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                    type === 'overdue' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                    type === 'action' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                    "bg-green-500/10 border-green-500/20 text-green-500"
                )}>
                    {type === 'pitch' ? <Clock className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.company || "No Company"} • <span className="capitalize">{lead.stage.replace('-', ' ')}</span></p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {lead.nextFollowUp && (
                    <div className={cn(
                        "text-xs font-mono px-2 py-1 rounded",
                        type === 'overdue' ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-muted"
                    )}>
                        {format(new Date(lead.nextFollowUp), "MMM d")}
                    </div>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="p-8 text-center border-2 border-dashed border-border/50 rounded-lg">
            <p className="text-muted-foreground">{message}</p>
        </div>
    )
}
