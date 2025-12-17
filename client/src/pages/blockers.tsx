import Layout from "@/components/layout";
import { useStore, Blocker } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, MessageSquare } from "lucide-react";

export default function BlockersPage() {
  const { blockers } = useStore();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Blockers Library</h1>
            <p className="text-muted-foreground">Pattern recognition for sales objections.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blockers.map((blocker) => (
                <BlockerCard key={blocker.id} blocker={blocker} />
            ))}
        </div>
      </div>
    </Layout>
  );
}

function BlockerCard({ blocker }: { blocker: Blocker }) {
    return (
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <Badge variant="outline" className="capitalize bg-secondary/50 text-secondary-foreground border-secondary-foreground/20">
                        {blocker.category}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Users className="h-3 w-3" />
                        {blocker.count}
                    </div>
                </div>
                <CardTitle className="text-lg font-medium leading-tight mt-3">
                    "{blocker.text}"
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-md border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" /> Response Playbook
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {blocker.response}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
