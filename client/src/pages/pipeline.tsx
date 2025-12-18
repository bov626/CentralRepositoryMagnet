import Layout from "@/components/layout";
import { UnifiedKanbanBoard } from "@/components/kanban-board";
import { LeadDetails } from "@/components/lead-details";
import { useState } from "react";

export default function PipelinePage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <Layout>
      <div className="h-full">
         <UnifiedKanbanBoard onLeadClick={setSelectedLeadId} />
      </div>

      <LeadDetails leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </Layout>
  );
}
