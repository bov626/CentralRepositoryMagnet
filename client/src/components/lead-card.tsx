import { useSortable, defaultAnimateLayoutChanges, AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead, useStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, Mail, Video } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { auditScoreFromLead, jobTitleFromLead } from "@shared/audit";

const animateLayoutChanges: AnimateLayoutChanges = (args) => 
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isOverlay?: boolean;
}

export function LeadCard({ lead, onClick, isOverlay }: LeadCardProps) {
  const { setEmailingLead } = useStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: lead.id,
    animateLayoutChanges,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Heavy, satisfying easing with slight overshoot for that "click into place" feel
    transition: transition || 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const isOverdue = lead.nextFollowUp && isPast(new Date(lead.nextFollowUp)) && !isToday(new Date(lead.nextFollowUp));
  const isDueToday = lead.nextFollowUp && isToday(new Date(lead.nextFollowUp));
  const jobTitle = jobTitleFromLead(lead);
  const auditScore = auditScoreFromLead(lead);

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setEmailingLead(lead);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-card p-3 rounded-md border border-white/5 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none hover:border-white/10 hover:bg-card/80",
        isDragging && "opacity-30",
        isOverlay && "opacity-100 shadow-xl ring-2 ring-primary rotate-2 scale-105 cursor-grabbing z-50 bg-card",
        (lead.actionItems || []).length > 0 && "border-l-4 border-l-orange-500"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {(lead.recordingLink || lead.fathomRecordingId) && (
            <span title="Has Fathom recording">
              <Video className="h-3 w-3 text-primary shrink-0" />
            </span>
          )}
          <h4 className="font-semibold text-sm leading-tight text-card-foreground truncate">
            {lead.name}
          </h4>
          <button 
              onClick={handleEmailClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-primary shrink-0"
              title={`Email ${lead.email || lead.name}`}
              data-testid={`button-email-${lead.id}`}
          >
              <Mail className="h-3 w-3" />
          </button>
        </div>
        {(lead.actionItems || []).length > 0 && (
           <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0 ml-1" title="Action Needed" />
        )}
      </div>
      {(jobTitle || auditScore != null) && (
        <p className="text-xs text-muted-foreground truncate mb-2">
          {[jobTitle, auditScore != null ? `${auditScore}/100` : null].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {lead.tags.slice(0, 4).map((tag) => (
          <span 
            key={tag} 
            className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground border border-secondary-foreground/10"
          >
            {tag}
          </span>
        ))}
        {lead.tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground">+</span>
        )}
      </div>

      {lead.nextFollowUp && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
           <div className="flex items-center gap-1">
              <Clock className={cn("h-3 w-3", isOverdue ? "text-red-400" : isDueToday ? "text-orange-400" : "")} />
              <span className={cn(isOverdue ? "text-red-400 font-medium" : isDueToday ? "text-orange-400 font-medium" : "")}>
                  {format(new Date(lead.nextFollowUp), "MMM d")}
              </span>
           </div>
        </div>
      )}
    </div>
  );
}
