import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, AlertCircle, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [fathomConnected, setFathomConnected] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(true);

  const handleConnect = (service: string) => {
    if (service === "fathom") {
        setFathomConnected(!fathomConnected);
        toast({
            title: fathomConnected ? "Disconnected Fathom" : "Connected to Fathom",
            description: fathomConnected 
                ? "Automatic call syncing has been disabled." 
                : "Your calls will now automatically appear in the backlog.",
        });
    } else {
        setGcalConnected(!gcalConnected);
        toast({
            title: gcalConnected ? "Disconnected Google Calendar" : "Connected to Google Calendar",
            description: gcalConnected 
                ? "Meeting syncing has been disabled." 
                : "Upcoming meetings will now sync to your dashboard.",
        });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Integrations</h1>
            <p className="text-muted-foreground">Manage your connections to external tools.</p>
        </header>

        <div className="grid gap-6">
            {/* Fathom Integration */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <span className="font-bold text-indigo-500">F</span>
                            </div>
                            <div>
                                <CardTitle className="text-lg">Fathom AI</CardTitle>
                                <CardDescription>Sync call summaries and recordings automatically.</CardDescription>
                            </div>
                        </div>
                        {fathomConnected ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 flex gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground flex gap-1">
                                <AlertCircle className="h-3 w-3" /> Not Connected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Auto-create leads from calls</p>
                            <p className="text-xs text-muted-foreground">Automatically create backlog cards when a sales call ends.</p>
                        </div>
                        <Switch checked={fathomConnected} onCheckedChange={() => handleConnect("fathom")} />
                    </div>
                </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <span className="font-bold text-blue-500">G</span>
                            </div>
                            <div>
                                <CardTitle className="text-lg">Google Calendar</CardTitle>
                                <CardDescription>Sync upcoming meetings to your "Today" view.</CardDescription>
                            </div>
                        </div>
                        {gcalConnected ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 flex gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground flex gap-1">
                                <AlertCircle className="h-3 w-3" /> Not Connected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Sync scheduled meetings</p>
                            <p className="text-xs text-muted-foreground">Show upcoming pitch calls in your daily task list.</p>
                        </div>
                        <Switch checked={gcalConnected} onCheckedChange={() => handleConnect("gcal")} />
                    </div>
                </CardContent>
            </Card>
            
            {/* Future Integrations Teaser */}
             <div className="mt-8 p-6 rounded-lg border border-dashed border-border/50 text-center bg-muted/20">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Need more integrations?</h3>
                <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mb-4">
                    Connect Slack, HubSpot, or Email in the full version.
                </p>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                    <ExternalLink className="h-4 w-4" /> View Roadmap
                </Button>
            </div>
        </div>
      </div>
    </Layout>
  );
}
