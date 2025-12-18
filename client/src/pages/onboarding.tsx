import { useStore, OnboardingStage, Lead } from "@/lib/data";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Phone, FileText, Linkedin, CheckCircle2, User, ExternalLink } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";

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
      </div>
    </Layout>
  );
}
