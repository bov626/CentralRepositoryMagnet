import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isOverlay?: boolean;
}

export function LeadCard({ lead, onClick, isOverlay }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = lead.nextFollowUp && isPast(new Date(lead.nextFollowUp)) && !isToday(new Date(lead.nextFollowUp));
  const isDueToday = lead.nextFollowUp && isToday(new Date(lead.nextFollowUp));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-card hover:bg-card/80 p-3 rounded-md border border-border shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none",
        isDragging && "opacity-30",
        isOverlay && "opacity-100 shadow-xl ring-2 ring-primary rotate-2 scale-105 cursor-grabbing z-50",
        lead.actionNeeded && "border-l-4 border-l-orange-500"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm leading-tight text-card-foreground line-clamp-2">
          {lead.name}
        </h4>
        {lead.actionNeeded && (
           <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" title="Action Needed" />
        )}
      </div>

      {lead.company && (
        <p className="text-xs text-muted-foreground mb-3 truncate">{lead.company}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {lead.tags.slice(0, 3).map((tag) => (
          <span 
            key={tag} 
            className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground border border-secondary-foreground/10"
          >
            {tag}
          </span>
        ))}
        {lead.tags.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground">+</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
         <div className="flex items-center gap-1">
             {lead.nextFollowUp ? (
                 <>
                    <Clock className={cn("h-3 w-3", isOverdue ? "text-red-400" : isDueToday ? "text-orange-400" : "")} />
                    <span className={cn(isOverdue ? "text-red-400 font-medium" : isDueToday ? "text-orange-400 font-medium" : "")}>
                        {format(new Date(lead.nextFollowUp), "MMM d")}
                    </span>
                 </>
             ) : (
                 <span className="text-muted-foreground/50 italic">No date</span>
             )}
         </div>
      </div>
    </div>
  );
}
