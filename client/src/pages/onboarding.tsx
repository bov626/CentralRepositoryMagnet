import { useStore, OnboardingStage, Lead } from "@/lib/data";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Phone, FileText, Linkedin, CheckCircle2, User, ExternalLink, ChevronDown, ChevronUp, Trophy, Gamepad2, Wrench, Bot, Calendar, Download } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface OnboardingSubmission {
  id: string;
  name: string;
  tier: string;
  totalPoints: number;
  answers: Record<string, any>;
  resumePath: string | null;
  coverLetterPath: string | null;
  linkedIn: string | null;
  submittedAt: string;
}

const ONBOARDING_COLUMNS: { id: OnboardingStage; title: string; icon: React.ReactNode }[] = [
  { id: "call-1", title: "Call #1", icon: <Phone className="h-4 w-4" /> },
  { id: "call-2", title: "Call #2", icon: <Phone className="h-4 w-4" /> },
  { id: "cover-letter", title: "Cover Letter", icon: <FileText className="h-4 w-4" /> },
  { id: "resume", title: "Resume", icon: <FileText className="h-4 w-4" /> },
  { id: "linkedin", title: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
  { id: "apply-ready", title: "Apply Ready", icon: <CheckCircle2 className="h-4 w-4" /> },
];

function OnboardingCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`onboarding-card-${lead.id}`}
      className={cn(
        "bg-zinc-800 border border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getTierIcon(tier: string) {
  if (tier.includes('God')) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (tier.includes('Gamer')) return <Gamepad2 className="h-5 w-5 text-purple-400" />;
  if (tier.includes('Operator')) return <Wrench className="h-5 w-5 text-blue-400" />;
  return <Bot className="h-5 w-5 text-zinc-400" />;
}

function getTierColor(tier: string) {
  if (tier.includes('God')) return 'from-yellow-400 via-amber-500 to-yellow-400';
  if (tier.includes('Gamer')) return 'from-purple-400 to-purple-600';
  if (tier.includes('Operator')) return 'from-blue-400 to-blue-600';
  return 'from-zinc-400 to-zinc-600';
}

function SubmissionCard({ submission }: { submission: OnboardingSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const answers = submission.answers || {};

  const answerLabels: Record<string, string> = {
    careerHistory: 'Full career history',
    whyLoveJob: 'Why you love your job',
    dinnerPartyExplanation: 'Dinner party explanation',
    bestJob: 'Best job ever',
    unusuallyGoodAt: 'Unusually good at',
    principlesQuotes: 'Principles/quotes',
    bookOrMovie: 'Book or movie seen more than once',
    optimizeFor: 'What you optimize for',
    whenBreaks: 'When something breaks',
    misconception: 'Biggest misconception',
    betterThanResume: 'Better than resume shows',
    nonObviousThing: 'Non-obvious thing',
    sabbatical: 'Sabbatical plans',
    noticeFirst: 'What you notice first',
  };

  const hasResume = !!submission.resumePath;
  const hasCoverLetter = !!submission.coverLetterPath;
  const hasLinkedIn = !!submission.linkedIn && submission.linkedIn !== "N/A";

  return (
    <div 
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300"
      data-testid={`submission-card-${submission.id}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              hasResume ? "border-emerald-600 text-emerald-400 hover:bg-emerald-950" : "opacity-40 cursor-not-allowed"
            )}
            disabled={!hasResume}
            onClick={(e) => {
              e.stopPropagation();
              if (hasResume) window.open(submission.resumePath!, '_blank');
            }}
            data-testid={`btn-resume-${submission.id}`}
          >
            <Download className="h-3.5 w-3.5" />
            Resume
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              hasCoverLetter ? "border-blue-600 text-blue-400 hover:bg-blue-950" : "opacity-40 cursor-not-allowed"
            )}
            disabled={!hasCoverLetter}
            onClick={(e) => {
              e.stopPropagation();
              if (hasCoverLetter) window.open(submission.coverLetterPath!, '_blank');
            }}
            data-testid={`btn-cover-letter-${submission.id}`}
          >
            <Download className="h-3.5 w-3.5" />
            Cover Letter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 text-xs",
              hasLinkedIn ? "border-sky-600 text-sky-400 hover:bg-sky-950" : "opacity-40 cursor-not-allowed"
            )}
            disabled={!hasLinkedIn}
            onClick={(e) => {
              e.stopPropagation();
              if (hasLinkedIn) window.open(submission.linkedIn!, '_blank');
            }}
            data-testid={`btn-linkedin-${submission.id}`}
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </Button>
        </div>

        <div 
          className="cursor-pointer hover:bg-zinc-800/50 -mx-4 -mb-4 p-4 pt-2 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getTierIcon(submission.tier)}
              <span className={cn(
                "font-bold text-transparent bg-clip-text bg-gradient-to-r",
                getTierColor(submission.tier)
              )}>
                {submission.tier}
              </span>
            </div>
            <div className="flex-1">
              <span className="font-medium text-foreground">{submission.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-amber-400 font-semibold">{submission.totalPoints.toLocaleString()} pts</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(submission.submittedAt), 'MMM d, yyyy')}</span>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(answers).map(([key, value]) => {
              if (!value || (typeof value === 'string' && !value.trim())) return null;
              if (key === 'resumeFileName' || key === 'coverLetterFileName' || key === 'linkedIn') return null;
              const label = answerLabels[key] || key;
              return (
                <div key={key} className="space-y-1" data-testid={`answer-${key}-${submission.id}`}>
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">{label}</span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{String(value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingColumn({ 
  column, 
  leads 
}: { 
  column: { id: OnboardingStage; title: string; icon: React.ReactNode }; 
  leads: Lead[] 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-1 min-w-[200px] max-w-[280px]">
      <div 
        ref={setNodeRef}
        className={cn(
          "bg-zinc-900 border border-zinc-700/50 rounded-xl p-3 h-full transition-colors",
          isOver && "border-primary bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700/50">
          <span className="text-primary">{column.icon}</span>
          <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-zinc-800 px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px]">
            {leads.map((lead) => (
              <OnboardingCard key={lead.id} lead={lead} />
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Drop leads here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { leads, moveOnboardingLead } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: submissions = [] } = useQuery<OnboardingSubmission[]>({
    queryKey: ['/api/onboarding-submissions'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding-submissions');
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
  });

  const onboardingLeads = leads.filter(l => l.onboardingStage);

  const getLeadsByStage = (stage: OnboardingStage) => {
    return onboardingLeads.filter(l => l.onboardingStage === stage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const targetColumn = ONBOARDING_COLUMNS.find(col => col.id === overId);
    if (targetColumn) {
      moveOnboardingLead(leadId, targetColumn.id);
      return;
    }

    const overLead = onboardingLeads.find(l => l.id === overId);
    if (overLead && overLead.onboardingStage) {
      const lead = onboardingLeads.find(l => l.id === leadId);
      if (lead && lead.onboardingStage !== overLead.onboardingStage) {
        moveOnboardingLead(leadId, overLead.onboardingStage);
      }
    }
  };

  const activeLead = activeId ? onboardingLeads.find(l => l.id === activeId) : null;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
            Onboarding Pipeline
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track new clients through the onboarding process. Leads automatically appear here when moved to "Closed".
          </p>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {ONBOARDING_COLUMNS.map((column) => (
              <OnboardingColumn
                key={column.id}
                column={column}
                leads={getLeadsByStage(column.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="bg-zinc-800 border border-primary rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activeLead.name}</p>
                    {activeLead.company && (
                      <p className="text-xs text-muted-foreground">{activeLead.company}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {onboardingLeads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No clients in onboarding yet</p>
              <p className="text-sm">Move leads to "Closed" in the Pipeline to start onboarding them.</p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border">
          <Link href="/onboarding-form" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            Open Client Onboarding Questionnaire
          </Link>
        </div>

        {submissions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border" data-testid="submissions-section">
            <h2 className="text-xl font-bold text-foreground mb-4">Submitted Forms</h2>
            <div className="space-y-3">
              {submissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
