import { useStore, Lead, PipelineType, JumpseatStage, CommunityStage } from "@/lib/data";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, defaultDropAnimationSideEffects, DropAnimation } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./lead-card";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Column Definitions
const JUMPSEAT_COLUMNS: { id: JumpseatStage; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "pitch-call", title: "Pitch Call" },
  { id: "decision-pending", title: "Decision Pending" },
  { id: "nudge-scheduled", title: "Nudge Scheduled" },
  { id: "closed", title: "Closed" },
  { id: "disqualified", title: "Disqualified" },
];

const COMMUNITY_COLUMNS: { id: CommunityStage; title: string }[] = [
  { id: "new-leads", title: "New Leads" },
  { id: "to-pitch", title: "To Pitch" },
  { id: "too-expensive", title: "Too Expensive" },
  { id: "would-buy", title: "Would Buy" },
  { id: "nurture", title: "Nurture" },
  { id: "unsubscribe", title: "Not a Fit" },
];

interface KanbanBoardProps {
  pipeline: PipelineType;
  onLeadClick: (id: string) => void;
}

export function KanbanBoard({ pipeline, onLeadClick }: KanbanBoardProps) {
  const { leads, moveLead } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = pipeline === "jumpseat" ? JUMPSEAT_COLUMNS : COMMUNITY_COLUMNS;
  
  // Filter leads for this pipeline
  const pipelineLeads = leads.filter(l => l.pipeline === pipeline);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeLeadId = active.id as string;
    const overId = over.id as string; // This will be the column ID or another card ID

    // If dropped over a column container (which we'll make droppable)
    const isOverColumn = columns.some(col => col.id === overId);
    
    if (isOverColumn) {
      const activeLead = leads.find(l => l.id === activeLeadId);
      if (activeLead && activeLead.stage !== overId) {
        moveLead(activeLeadId, pipeline, overId);
      }
    }
    
    // Note: Reordering within a column isn't implemented in the store yet (just stage changes), 
    // so we'll skip detailed reordering logic for this prototype and focus on stage moves.

    setActiveId(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
           const colLeads = pipelineLeads.filter(l => l.stage === col.id);
           
           return (
             <KanbanColumn 
               key={col.id} 
               id={col.id} 
               title={col.title} 
               leads={colLeads}
               onLeadClick={onLeadClick}
             />
           );
        })}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? (
             <div className="w-[280px] rotate-2 cursor-grabbing">
               <LeadCard lead={activeLead} onClick={() => {}} isOverlay />
             </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

import { useDroppable } from "@dnd-kit/core";

function KanbanColumn({ id, title, leads, onLeadClick }: { id: string, title: string, leads: Lead[], onLeadClick: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-[280px] flex flex-col h-full bg-muted/30 rounded-lg border border-border/40">
      <div className="p-3 border-b border-border/40 flex items-center justify-between sticky top-0 bg-muted/30 backdrop-blur-md rounded-t-lg z-10">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
        <span className="text-xs font-mono bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground">
          {leads.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="h-24 border-2 border-dashed border-muted/50 rounded-md flex items-center justify-center">
            <span className="text-xs text-muted-foreground/50">Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}
