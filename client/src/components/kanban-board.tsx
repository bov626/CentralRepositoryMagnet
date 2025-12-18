import { useStore, Lead, PipelineType, JumpseatStage, CommunityStage } from "@/lib/data";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, defaultDropAnimationSideEffects, DropAnimation, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
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
  { id: "backlog", title: "Backlog" },
  { id: "to-pitch", title: "To Pitch" },
  { id: "would-buy", title: "Would Buy" },
];

interface UnifiedKanbanBoardProps {
  onLeadClick: (id: string) => void;
}

export function UnifiedKanbanBoard({ onLeadClick }: UnifiedKanbanBoardProps) {
  const { leads, moveLead } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

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

    // Determine which pipeline and stage the target belongs to
    let targetPipeline: PipelineType | null = null;
    let targetStage: string | null = null;

    // Check Jumpseat Columns
    const jumpseatCol = JUMPSEAT_COLUMNS.find(c => c.id === overId);
    if (jumpseatCol) {
        targetPipeline = "jumpseat";
        targetStage = jumpseatCol.id;
    }

    // Check Community Columns
    const communityCol = COMMUNITY_COLUMNS.find(c => c.id === overId);
    if (communityCol) {
        targetPipeline = "community";
        targetStage = communityCol.id;
    }

    // If dropped over a card, find that card's column (complex, skipping for now, assuming drop on column)
    // For better UX, we usually implement "sortable" strategy where dropping on a card puts it in that list.
    // But since we are using SortableContext, dnd-kit handles sorting *within* the container.
    // If overId is NOT a column, it might be a card ID.
    if (!targetPipeline) {
        // Find the lead we dropped over
        const overLead = leads.find(l => l.id === overId);
        if (overLead) {
            targetPipeline = overLead.pipeline;
            targetStage = overLead.stage;
        }
    }

    if (targetPipeline && targetStage) {
      const activeLead = leads.find(l => l.id === activeLeadId);
      if (activeLead && (activeLead.stage !== targetStage || activeLead.pipeline !== targetPipeline)) {
        moveLead(activeLeadId, targetPipeline, targetStage);
        
        // Fireworks if moved to closed
        if (targetStage === "closed") {
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
      <div className="space-y-8 pb-12 h-full flex flex-col">
        {/* Jumpseat Pipeline */}
        <section className="flex-1 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-sm block"></span>
              Jumpseat Pipeline
            </h2>
          </div>
          <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
             {JUMPSEAT_COLUMNS.map((col) => (
                <KanbanColumn 
                   key={col.id} 
                   id={col.id} 
                   title={col.title} 
                   leads={leads.filter(l => l.pipeline === "jumpseat" && l.stage === col.id)}
                   onLeadClick={onLeadClick}
                 />
             ))}
          </div>
        </section>
        
        {/* Community Pipeline */}
        <section className="flex-1 min-h-[400px] flex flex-col pt-8 border-t border-white/10">
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-secondary rounded-sm block"></span>
              Community Pipeline
            </h2>
          </div>
          <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
             {COMMUNITY_COLUMNS.map((col) => (
                <KanbanColumn 
                   key={col.id} 
                   id={col.id} 
                   title={col.title} 
                   leads={leads.filter(l => l.pipeline === "community" && l.stage === col.id)}
                   onLeadClick={onLeadClick}
                 />
             ))}
          </div>
        </section>
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

function KanbanColumn({ id, title, leads, onLeadClick }: { id: string, title: string, leads: Lead[], onLeadClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex-shrink-0 w-[280px] flex flex-col h-full rounded-lg border transition-all duration-200",
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
