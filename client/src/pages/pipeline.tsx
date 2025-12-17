import Layout from "@/components/layout";
import { KanbanBoard } from "@/components/kanban-board";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";
import { useStore } from "@/lib/data";

export default function PipelinePage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        {/* Jumpseat Pipeline */}
        <section className="h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-sm block"></span>
              Jumpseat Pipeline
            </h2>
          </div>
          <div className="flex-1 min-h-0">
             <KanbanBoard pipeline="jumpseat" onLeadClick={setSelectedLeadId} />
          </div>
        </section>
        
        {/* Community Pipeline */}
        <section className="h-[450px] flex flex-col pt-8 border-t border-border/40">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="w-2 h-8 bg-secondary rounded-sm block"></span>
              Community Pipeline
            </h2>
          </div>
          <div className="flex-1 min-h-0">
             <KanbanBoard pipeline="community" onLeadClick={setSelectedLeadId} />
          </div>
        </section>
      </div>

      <LeadDetails leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </Layout>
  );
}
