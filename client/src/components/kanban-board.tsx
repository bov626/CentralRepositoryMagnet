import { useStore, Lead, PipelineType, JumpseatStage, CommunityStage } from "@/lib/data";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent, DragOverEvent, DragMoveEvent, defaultDropAnimationSideEffects, DropAnimation, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "./lead-card";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Column Definitions
const JUMPSEAT_COLUMNS: { id: JumpseatStage; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "pitch-call", title: "Pitch Call" },
  { id: "decision-pending", title: "Decision Pending" },
  { id: "nudge-scheduled", title: "Nudge Scheduled" },
  { id: "future-client", title: "Future Client" },
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
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter leads based on search query
  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query))
    );
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [communityCollapsed, setCommunityCollapsed] = useState(false);
  const [dragRotation, setDragRotation] = useState(0);
  const lastX = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragRotation(0);
    lastX.current = 0;
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const currentX = event.delta.x;
    const velocity = currentX - lastX.current;
    lastX.current = currentX;
    
    // Subtle rotation based on horizontal movement (-3 to 3 degrees)
    const rotation = Math.max(-3, Math.min(3, velocity * 0.3));
    setDragRotation(rotation);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = over.id as string;
    
    // Check if over a column
    const jumpseatCol = JUMPSEAT_COLUMNS.find(c => c.id === overId);
    const communityCol = COMMUNITY_COLUMNS.find(c => c.id === overId);
    
    if (jumpseatCol || communityCol) {
      setOverColumnId(overId);
    } else {
      // Over a card - find its column
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        setOverColumnId(overLead.stage);
      }
    }
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
    setOverColumnId(null);
    setDragRotation(0);
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

  // No drop animation - overlay just disappears, card appears in new spot with CSS transition
  const dropAnimation: DropAnimation | null = null;

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
            strategy: MeasuringStrategy.BeforeDragging,
        }
      }}
    >
      <div className="space-y-8 pb-12 h-full flex flex-col">
        {/* Jumpseat Pipeline */}
        <section className="flex-1 min-h-[650px] flex flex-col">
          <div className="mb-4 px-1 shrink-0 space-y-3">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-sm block"></span>
                Jumpseat Pipeline
              </h2>
              <a
                href="https://www.canva.com/design/DAG7gKJfndQ/JPBsVNk6ymFqfNCGN2nr_w/edit"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-md transition-colors"
                data-testid="link-pitch"
              >
                Pitch
              </a>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 bg-muted/50 border-border/50 text-sm"
                data-testid="input-search-leads"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
             {JUMPSEAT_COLUMNS.map((col) => (
                <KanbanColumn 
                   key={col.id} 
                   id={col.id} 
                   title={col.title} 
                   leads={filteredLeads.filter(l => l.pipeline === "jumpseat" && l.stage === col.id)}
                   onLeadClick={onLeadClick}
                   showGhost={overColumnId === col.id && activeId !== null}
                   ghostLead={activeLead}
                   activeId={activeId}
                 />
             ))}
          </div>
        </section>
        
        {/* Community Pipeline - Collapsible */}
        <section className="flex flex-col pt-8 border-t border-white/10">
          <button 
            onClick={() => setCommunityCollapsed(!communityCollapsed)}
            className="flex items-center justify-between mb-4 px-1 shrink-0 w-full text-left hover:opacity-80 transition-opacity"
          >
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {communityCollapsed ? (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="w-2 h-8 bg-secondary rounded-sm block"></span>
              Community Pipeline
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredLeads.filter(l => l.pipeline === "community").length})
              </span>
            </h2>
          </button>
          {!communityCollapsed && (
            <div className="flex-1 min-h-[300px] flex gap-4 overflow-x-auto pb-4">
               {COMMUNITY_COLUMNS.map((col) => (
                  <KanbanColumn 
                     key={col.id} 
                     id={col.id} 
                     title={col.title} 
                     leads={filteredLeads.filter(l => l.pipeline === "community" && l.stage === col.id)}
                     onLeadClick={onLeadClick}
                     showGhost={overColumnId === col.id && activeId !== null}
                     ghostLead={activeLead}
                     activeId={activeId}
                   />
               ))}
            </div>
          )}
        </section>
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? (
             <div 
               className="w-[280px] cursor-grabbing scale-105 shadow-2xl shadow-primary/20"
               style={{ 
                 transform: `rotate(${dragRotation}deg)`,
                 transition: 'transform 100ms ease-out'
               }}
             >
               <LeadCard lead={activeLead} onClick={() => {}} isOverlay />
             </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

function KanbanColumn({ id, title, leads, onLeadClick, showGhost, ghostLead, activeId }: { 
  id: string; 
  title: string; 
  leads: Lead[]; 
  onLeadClick: (id: string) => void;
  showGhost?: boolean;
  ghostLead?: Lead | null;
  activeId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  // Only show ghost if dragging to a different column than where the lead currently is
  const shouldShowGhost = showGhost && ghostLead && ghostLead.stage !== id;
  
  // Filter out the actively dragged card from its original column
  const visibleLeads = activeId ? leads.filter(l => l.id !== activeId) : leads;

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex-shrink-0 w-[280px] flex flex-col h-full rounded-lg border transition-all duration-200",
            "bg-zinc-900/80 border-zinc-700/50 shadow-lg",
            isOver ? "bg-zinc-800/90 border-primary/40 ring-1 ring-primary/30 shadow-inner" : ""
        )}
    >
      <div className="p-3 border-b border-zinc-700/50 flex items-center justify-between sticky top-0 bg-zinc-900/90 backdrop-blur-md rounded-t-lg z-10">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
        <span className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground border border-white/5">
          {leads.length}
        </span>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px] scrollbar-none">
        <SortableContext items={visibleLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
          ))}
        </SortableContext>
        
        {/* Ghost placeholder when dragging */}
        {shouldShowGhost && ghostLead && (
          <div className="bg-primary/10 border-2 border-dashed border-primary/40 rounded-md p-3 animate-pulse">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-sm leading-tight text-primary/70 line-clamp-2">
                {ghostLead.name}
              </h4>
            </div>
            {ghostLead.company && (
              <p className="text-xs text-primary/50 mb-2">{ghostLead.company}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {ghostLead.tags.slice(0, 2).map((tag) => (
                <span 
                  key={tag} 
                  className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary/50 border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {leads.length === 0 && !shouldShowGhost && (
          <div className={cn(
              "h-24 border-2 border-dashed rounded-md flex items-center justify-center transition-colors",
              isOver ? "border-primary/40 bg-primary/5" : "border-zinc-600/30"
          )}>
            <span className={cn("text-xs", isOver ? "text-primary/70" : "text-muted-foreground/50")}>
                {isOver ? "Drop Here" : "Empty"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
