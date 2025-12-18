import Layout from "@/components/layout";
import { UnifiedKanbanBoard } from "@/components/kanban-board";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function PipelinePage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Search Bar */}
        <div className="flex justify-center py-4 px-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-muted/50 border-border/50"
              data-testid="input-search-leads"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <UnifiedKanbanBoard onLeadClick={setSelectedLeadId} searchQuery={searchQuery} />
        </div>
      </div>

      <LeadDetails leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </Layout>
  );
}
