import {
  useStore,
  Lead,
  PipelineType,
  JumpseatStage,
  CommunityStage,
  ApplierStage,
} from "@/lib/data";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragMoveEvent,
  DropAnimation,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "./lead-card";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Search, X, Video, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

// Column Definitions
const JUMPSEAT_COLUMNS: { id: JumpseatStage; title: string }[] = [
  { id: "backlog", title: "New Lead" },
  { id: "pitch-call", title: "Pitch Call" },
  { id: "decision-pending", title: "Decision Pending" },
  { id: "future-client", title: "Future Client" },
  { id: "closed", title: "Closed" },
  { id: "disqualified", title: "Disqualified" },
];

const COMMUNITY_COLUMNS: { id: CommunityStage; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "to-pitch", title: "To Pitch" },
  { id: "would-buy", title: "Would Buy" },
  { id: "bought", title: "Bought" },
];

const APPLIER_COLUMNS: { id: ApplierStage; title: string }[] = [
  { id: "interview", title: "Interview" },
  { id: "to_hire", title: "To Hire" },
  { id: "onboarded", title: "Onboarded" },
];

// Default stages when dropping on a tab
const DEFAULT_STAGES: Record<PipelineType, string> = {
  jumpseat: "backlog",
  community: "backlog",
  appliers: "interview",
};

type ActiveTab = "jumpseat" | "community" | "appliers";

interface UnifiedKanbanBoardProps {
  onLeadClick: (id: string) => void;
}

// Droppable Tab Component
function DroppableTab({
  pipeline,
  isActive,
  onClick,
  children,
  activeId,
}: {
  pipeline: PipelineType;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab-${pipeline}`,
    data: { type: "tab", pipeline },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-[1px] rounded-t-md",
        isActive && pipeline === "jumpseat" && "border-primary text-primary",
        isActive &&
          pipeline === "community" &&
          "border-secondary text-secondary-foreground",
        isActive &&
          pipeline === "appliers" &&
          "border-emerald-500 text-emerald-400",
        !isActive &&
          "border-transparent text-muted-foreground hover:text-foreground",
        // Highlight when dragging over
        isOver &&
          activeId &&
          "bg-primary/20 border-primary ring-2 ring-primary/50 scale-105",
      )}
    >
      {children}
    </button>
  );
}

export function UnifiedKanbanBoard({ onLeadClick }: UnifiedKanbanBoardProps) {
  const { leads, moveLead } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("jumpseat");

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
  const [dragRotation, setDragRotation] = useState(0);
  const lastX = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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

    // Check if over a tab
    if (overId.startsWith("tab-")) {
      setOverColumnId(overId);
      return;
    }

    // Check if over a column
    const jumpseatCol = JUMPSEAT_COLUMNS.find((c) => c.id === overId);
    const communityCol = COMMUNITY_COLUMNS.find((c) => c.id === overId);
    const applierCol = APPLIER_COLUMNS.find((c) => c.id === overId);

    if (jumpseatCol || communityCol || applierCol) {
      setOverColumnId(overId);
    } else {
      // Over a card - find its column
      const overLead = leads.find((l) => l.id === overId);
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
    const overId = over.id as string;

    let targetPipeline: PipelineType | null = null;
    let targetStage: string | null = null;

    // Check if dropped on a tab
    if (overId.startsWith("tab-")) {
      const pipeline = overId.replace("tab-", "") as PipelineType;
      targetPipeline = pipeline;
      targetStage = DEFAULT_STAGES[pipeline];
    }

    // Check Jumpseat Columns
    if (!targetPipeline) {
      const jumpseatCol = JUMPSEAT_COLUMNS.find((c) => c.id === overId);
      if (jumpseatCol) {
        targetPipeline = "jumpseat";
        targetStage = jumpseatCol.id;
      }
    }

    // Check Community Columns
    if (!targetPipeline) {
      const communityCol = COMMUNITY_COLUMNS.find((c) => c.id === overId);
      if (communityCol) {
        targetPipeline = "community";
        targetStage = communityCol.id;
      }
    }

    // Check Applier Columns
    if (!targetPipeline) {
      const applierCol = APPLIER_COLUMNS.find((c) => c.id === overId);
      if (applierCol) {
        targetPipeline = "appliers";
        targetStage = applierCol.id;
      }
    }

    // If dropped over a card, find that card's column
    if (!targetPipeline) {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) {
        targetPipeline = overLead.pipeline;
        targetStage = overLead.stage;
      }
    }

    if (targetPipeline && targetStage) {
      const activeLead = leads.find((l) => l.id === activeLeadId);
      if (
        activeLead &&
        (activeLead.stage !== targetStage ||
          activeLead.pipeline !== targetPipeline)
      ) {
        moveLead(activeLeadId, targetPipeline, targetStage);

        // Fireworks if moved to closed or onboarded
        if (targetStage === "closed" || targetStage === "onboarded") {
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

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const dropAnimation: DropAnimation | null = null;
  const activeLead = leads.find((l) => l.id === activeId);

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
        },
      }}
    >
      <div className="space-y-6 pb-12 h-full flex flex-col">
        {/* Tab Navigation - Now Droppable */}
        <div className="flex items-center gap-1 border-b border-border/50">
          <DroppableTab
            pipeline="jumpseat"
            isActive={activeTab === "jumpseat"}
            onClick={() => setActiveTab("jumpseat")}
            activeId={activeId}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-4 bg-primary rounded-sm block"></span>
              Jumpseat Pipeline
              <span className="text-xs opacity-70 tabular-nums">
                ({filteredLeads.filter((l) => l.pipeline === "jumpseat").length}
                )
              </span>
            </span>
          </DroppableTab>
          <DroppableTab
            pipeline="community"
            isActive={activeTab === "community"}
            onClick={() => setActiveTab("community")}
            activeId={activeId}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-4 bg-secondary rounded-sm block"></span>
              Community Pipeline
              <span className="text-xs opacity-70 tabular-nums">
                (
                {filteredLeads.filter((l) => l.pipeline === "community").length}
                )
              </span>
            </span>
          </DroppableTab>
          <DroppableTab
            pipeline="appliers"
            isActive={activeTab === "appliers"}
            onClick={() => setActiveTab("appliers")}
            activeId={activeId}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Appliers Pipeline
              <span className="text-xs opacity-70 tabular-nums">
                ({filteredLeads.filter((l) => l.pipeline === "appliers").length}
                )
              </span>
            </span>
          </DroppableTab>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-4 px-1">
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
          {activeTab === "jumpseat" && (
            <a
              href="https://www.canva.com/design/DAG7gKJfndQ/JPBsVNk6ymFqfNCGN2nr_w/edit"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-md transition-colors"
              data-testid="link-pitch"
            >
              Pitch
            </a>
          )}
        </div>

        {/* Jumpseat Pipeline */}
        {activeTab === "jumpseat" && (
          <section className="flex-1 min-h-[650px] flex flex-col">
            <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
              {JUMPSEAT_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  leads={filteredLeads.filter(
                    (l) =>
                      l.pipeline === "jumpseat" &&
                      (l.stage === col.id ||
                        (col.id === "future-client" && l.stage === "nudge-scheduled")),
                  )}
                  onLeadClick={onLeadClick}
                  showGhost={overColumnId === col.id && activeId !== null}
                  ghostLead={activeLead}
                  activeId={activeId}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-1">
              <Video className="h-3 w-3 text-primary" />
              <span>= Enhanced with Fathom notes</span>
            </div>
          </section>
        )}

        {/* Community Pipeline */}
        {activeTab === "community" && (
          <section className="flex-1 min-h-[500px] flex flex-col">
            <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
              {COMMUNITY_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  leads={filteredLeads.filter(
                    (l) => l.pipeline === "community" && l.stage === col.id,
                  )}
                  onLeadClick={onLeadClick}
                  showGhost={overColumnId === col.id && activeId !== null}
                  ghostLead={activeLead}
                  activeId={activeId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Appliers Pipeline */}
        {activeTab === "appliers" && (
          <section className="flex-1 min-h-[650px] flex flex-col">
            <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-4">
              {APPLIER_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  leads={filteredLeads.filter(
                    (l) => l.pipeline === "appliers" && l.stage === col.id,
                  )}
                  onLeadClick={onLeadClick}
                  showGhost={overColumnId === col.id && activeId !== null}
                  ghostLead={activeLead}
                  activeId={activeId}
                  colorScheme="emerald"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-1">
              <Video className="h-3 w-3 text-emerald-500" />
              <span>= Enhanced with Fathom notes</span>
            </div>
          </section>
        )}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? (
            <div
              className={cn(
                "w-[280px] cursor-grabbing scale-105 shadow-2xl",
                activeLead.pipeline === "appliers"
                  ? "shadow-emerald-500/20"
                  : "shadow-primary/20",
              )}
              style={{
                transform: `rotate(${dragRotation}deg)`,
                transition: "transform 100ms ease-out",
              }}
            >
              <LeadCard lead={activeLead} onClick={() => {}} isOverlay />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

function KanbanColumn({
  id,
  title,
  leads,
  onLeadClick,
  showGhost,
  ghostLead,
  activeId,
  colorScheme = "default",
}: {
  id: string;
  title: string;
  leads: Lead[];
  onLeadClick: (id: string) => void;
  showGhost?: boolean;
  ghostLead?: Lead | null;
  activeId?: string | null;
  colorScheme?: "default" | "emerald";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const shouldShowGhost = showGhost && ghostLead && ghostLead.stage !== id;
  const visibleLeads = activeId
    ? leads.filter((l) => l.id !== activeId)
    : leads;

  const isEmerald = colorScheme === "emerald";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] flex flex-col h-full rounded-lg border transition-all duration-200",
        "bg-zinc-900/80 border-zinc-700/50 shadow-lg",
        isOver &&
          !isEmerald &&
          "bg-zinc-800/90 border-primary/40 ring-1 ring-primary/30 shadow-inner",
        isOver &&
          isEmerald &&
          "bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-inner",
      )}
    >
      <div
        className={cn(
          "p-3 border-b flex items-center justify-between sticky top-0 backdrop-blur-md rounded-t-lg z-10",
          isEmerald
            ? "border-emerald-700/30 bg-emerald-900/20"
            : "border-zinc-700/50 bg-zinc-900/90",
        )}
      >
        <h3
          className={cn(
            "font-medium text-sm uppercase tracking-wider",
            isEmerald ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {title}
        </h3>
        <span
          className={cn(
            "text-xs font-mono px-1.5 py-0.5 rounded border",
            isEmerald
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-white/5 text-muted-foreground border-white/5",
          )}
        >
          {leads.length}
        </span>
      </div>

      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[150px] scrollbar-none">
        <SortableContext
          items={visibleLeads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead.id)}
            />
          ))}
        </SortableContext>

        {shouldShowGhost && ghostLead && (
          <div
            className={cn(
              "border-2 border-dashed rounded-md p-3 animate-pulse",
              isEmerald
                ? "bg-emerald-500/10 border-emerald-500/40"
                : "bg-primary/10 border-primary/40",
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <h4
                className={cn(
                  "font-semibold text-sm leading-tight line-clamp-2",
                  isEmerald ? "text-emerald-400/70" : "text-primary/70",
                )}
              >
                {ghostLead.name}
              </h4>
            </div>
            {ghostLead.company && (
              <p
                className={cn(
                  "text-xs mb-2",
                  isEmerald ? "text-emerald-400/50" : "text-primary/50",
                )}
              >
                {ghostLead.company}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {ghostLead.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-sm border",
                    isEmerald
                      ? "bg-emerald-500/10 text-emerald-400/50 border-emerald-500/20"
                      : "bg-primary/10 text-primary/50 border-primary/20",
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {leads.length === 0 && !shouldShowGhost && (
          <div
            className={cn(
              "h-24 border-2 border-dashed rounded-md flex items-center justify-center transition-colors",
              isOver && isEmerald && "border-emerald-500/40 bg-emerald-500/5",
              isOver && !isEmerald && "border-primary/40 bg-primary/5",
              !isOver && "border-zinc-600/30",
            )}
          >
            <span
              className={cn(
                "text-xs",
                isOver && isEmerald && "text-emerald-400/70",
                isOver && !isEmerald && "text-primary/70",
                !isOver && "text-muted-foreground/50",
              )}
            >
              {isOver ? "Drop Here" : "Empty"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
