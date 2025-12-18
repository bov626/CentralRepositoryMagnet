import { useStore, Lead, PipelineType, JumpseatStage, CommunityStage } from "@/lib/data";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, defaultDropAnimationSideEffects, DropAnimation, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./lead-card";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

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
        
        // Fireworks if moved to closed
        if (overId === "closed") {
            triggerFireworks();
        }
      }
    }
    
    setActiveId(null);
  };

  const triggerFireworks = () => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
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
      measuring={{
        droppable: {
            strategy: MeasuringStrategy.Always,
        }
      }}
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
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex-shrink-0 w-[280px] flex flex-col h-full rounded-lg border transition-all duration-200",
            // Dark mode texture enhancement: added grain/noise and slightly lighter background for columns
            "bg-card/30 backdrop-blur-sm border-white/5 shadow-sm",
            isOver ? "bg-card/50 border-primary/30 ring-1 ring-primary/20 shadow-inner" : ""
        )}
    >
      <div className="p-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-md rounded-t-lg z-10">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
        <span className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground border border-white/5">
          {leads.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px] scrollbar-none">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
          ))}
        </SortableContext>
        
        {/* Placeholder effect when empty and dragging over */}
        {leads.length === 0 && (
          <div className={cn(
              "h-24 border-2 border-dashed rounded-md flex items-center justify-center transition-colors",
              isOver ? "border-primary/40 bg-primary/5" : "border-white/5"
          )}>
            <span className={cn("text-xs", isOver ? "text-primary/70" : "text-muted-foreground/30")}>
                {isOver ? "Drop Here" : "Empty"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
