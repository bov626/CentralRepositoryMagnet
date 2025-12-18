import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Lead, useStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, AlertCircle, PlayCircle, ExternalLink, CheckCircle2, Linkedin, X, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface LeadDetailsProps {
  leadId: string | null;
  onClose: () => void;
}

export function LeadDetails({ leadId, onClose }: LeadDetailsProps) {
  const { leads, updateLead, deleteLead } = useStore();
  const lead = leads.find((l) => l.id === leadId);
  const [notes, setNotes] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [editableName, setEditableName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (lead) {
      setNotes(lead.summary || "");
      setLinkedInUrl(lead.linkedIn || "");
      setFollowUpDate(lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : "");
      setEditableName(lead.name || "");
    }
  }, [lead]);

  const handleAddTag = () => {
    if (!lead || !newTag.trim()) return;
    const updatedTags = [...lead.tags, newTag.trim()];
    updateLead(lead.id, { tags: updatedTags });
    setNewTag("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!lead) return;
    const updatedTags = lead.tags.filter(t => t !== tagToRemove);
    updateLead(lead.id, { tags: updatedTags });
  };

  if (!lead) return null;

  const handleSaveName = () => {
    if (editableName.trim() && editableName !== lead.name) {
      updateLead(lead.id, { name: editableName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveNotes = () => {
    updateLead(lead.id, { summary: notes });
  };

  const handleSaveLinkedIn = () => {
    updateLead(lead.id, { linkedIn: linkedInUrl });
  };

  const handleSaveFollowUp = (dateValue: string) => {
    updateLead(lead.id, { 
      nextFollowUp: dateValue ? new Date(dateValue).toISOString() : null 
    });
  };

  const handleClearFollowUp = () => {
    setFollowUpDate("");
    updateLead(lead.id, { nextFollowUp: null });
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-l border-border p-0 gap-0">
        <div className="p-6 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    {isEditingName ? (
                      <input
                        type="text"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        className="text-2xl font-bold tracking-tight text-foreground bg-transparent border-b-2 border-primary focus:outline-none w-full"
                        autoFocus
                        data-testid="input-lead-name"
                      />
                    ) : (
                      <h2 
                        className="text-2xl font-bold tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setIsEditingName(true)}
                        title="Click to edit name"
                      >
                        {lead.name}
                      </h2>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="text-muted-foreground hover:text-primary text-sm">
                        {lead.email}
                      </a>
                    )}
                    {lead.company && <p className="text-muted-foreground font-medium text-sm">{lead.company}</p>}
                </div>
                <div className="flex gap-2 items-center">
                    {lead.actionNeeded && (
                        <Badge variant="destructive" className="animate-pulse">Action Needed</Badge>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {lead.tags.map(tag => (
                    <Badge 
                        key={tag} 
                        variant="outline" 
                        className="bg-background/50 backdrop-blur-sm px-2 py-0.5 text-xs font-mono group/tag flex items-center gap-1"
                    >
                        {tag}
                        <button 
                            onClick={() => handleRemoveTag(tag)}
                            className="opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity"
                            data-testid={`button-remove-tag-${tag}`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                {isAddingTag ? (
                    <div className="flex items-center gap-1">
                        <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="Tag name..."
                            className="h-6 w-24 text-xs px-2"
                            autoFocus
                            data-testid="input-new-tag"
                        />
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleAddTag} data-testid="button-save-tag">
                            <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setIsAddingTag(false); setNewTag(""); }}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsAddingTag(true)}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-0.5 border border-dashed border-muted-foreground/30 rounded hover:border-primary transition-colors"
                        data-testid="button-add-tag"
                    >
                        <Plus className="h-3 w-3" /> Add Tag
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3">
                 {/* LinkedIn Field */}
                <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0077b5]" />
                    <Input 
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        onBlur={handleSaveLinkedIn}
                        placeholder="Paste LinkedIn URL..."
                        className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:border-primary px-1 w-full max-w-[300px]"
                    />
                    {linkedInUrl && (
                        <a href={linkedInUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Created {format(new Date(lead.history[0].date), "MMM d")}</span>
                    </div>
                </div>

                {/* Editable Follow-up Date */}
                <div className="flex items-center gap-2 mt-3">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-muted-foreground">Follow-up:</span>
                    <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setFollowUpDate(newDate);
                          handleSaveFollowUp(newDate);
                        }}
                        className="bg-transparent border border-border/50 rounded px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        data-testid="input-follow-up-date"
                    />
                    {followUpDate && (
                        <button
                            onClick={handleClearFollowUp}
                            className="text-muted-foreground hover:text-red-400 p-1"
                            title="Clear date"
                            data-testid="button-clear-follow-up"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="p-6 space-y-8">
            {/* Call Recording & Summary */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" /> Fathom Call Summary
                    </h3>
                    {lead.recordingLink && (
                        <a href={lead.recordingLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View Recording <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
                <div className="bg-muted/30 rounded-md p-4 border border-border/50">
                    <Textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        onBlur={handleSaveNotes}
                        className="min-h-[150px] bg-transparent border-none resize-none focus-visible:ring-0 p-0 text-sm leading-relaxed"
                        placeholder="Paste Fathom summary here..."
                    />
                </div>
            </section>

            <Separator />

            {/* Strategic Info */}
            <div className="grid grid-cols-1 gap-6">
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Key Blocker
                    </h3>
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
                        {lead.blocker || "No blocker identified yet."}
                    </div>
                </section>

                <section className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Decision Trigger
                    </h3>
                    <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-200 text-sm">
                        {lead.decisionTrigger || "What needs to happen for them to buy?"}
                    </div>
                </section>
            </div>

            <Separator />
            
            {/* History Log */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity History</h3>
                <div className="space-y-4 border-l-2 border-muted pl-4 ml-1">
                    {(lead.history as Array<{date: string; action: string}>).slice().reverse().map((item, i) => (
                        <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted border-2 border-background" />
                            <p className="text-sm text-foreground">{item.action}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, h:mm a")}</p>
                        </div>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Delete Lead */}
            <section className="pt-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="destructive" 
                            className="w-full bg-red-600 hover:bg-red-700"
                            data-testid="button-delete-lead"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lead
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{lead.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    deleteLead(lead.id);
                                    onClose();
                                }}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid="button-confirm-delete"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
