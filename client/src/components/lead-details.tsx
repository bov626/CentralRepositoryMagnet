import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Lead, useStore } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, AlertCircle, PlayCircle, ExternalLink, CheckCircle2, Linkedin, X, Plus, Trash2, Archive, Check, RefreshCw, Mail } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { NextStepTeach } from "@/components/next-step-teach";
import { auditScoreFromLead, jobTitleFromLead } from "@shared/audit";
import { RoastResumeLink } from "@/components/roast-resume-link";

interface LeadDetailsProps {
  leadId: string | null;
  onClose: () => void;
}

export function LeadDetails({ leadId, onClose }: LeadDetailsProps) {
  const { leads, updateLead, deleteLead, archiveLead } = useStore();
  const queryClient = useQueryClient();
  const lead = leads.find((l) => l.id === leadId);
  const [notes, setNotes] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [editableName, setEditableName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [pitchAmount, setPitchAmount] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<"upfront" | "fifty_fifty" | "">("");
  const [amountPaid, setAmountPaid] = useState("");
  const [newActionItem, setNewActionItem] = useState("");
  const [completingItems, setCompletingItems] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);

  // Only sync state when opening a different lead (not on every lead update)
  useEffect(() => {
    if (lead) {
      setNotes(lead.summary || "");
      setLinkedInUrl(lead.linkedIn || "");
      setPitchAmount(lead.pitchAmount || "");
      setPaymentPlan((lead.paymentPlan as "upfront" | "fifty_fifty") || "");
      setAmountPaid(lead.amountPaid ? String(lead.amountPaid) : "");
      // Parse date in local timezone to avoid off-by-one day issues
      if (lead.nextFollowUp) {
        const date = new Date(lead.nextFollowUp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setFollowUpDate(`${year}-${month}-${day}`);
      } else {
        setFollowUpDate("");
      }
      setEditableName(lead.name || "");
      setNewActionItem("");
    }
  }, [leadId]);

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

  const jobTitle = jobTitleFromLead(lead);
  const auditScore = auditScoreFromLead(lead);

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
    // Store date at noon local time to avoid timezone-related day shifts
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      updateLead(lead.id, { nextFollowUp: date.toISOString() });
    } else {
      updateLead(lead.id, { nextFollowUp: null });
    }
  };

  const handleClearFollowUp = () => {
    setFollowUpDate("");
    updateLead(lead.id, { nextFollowUp: null });
  };

  const handleSavePitchAmount = () => {
    updateLead(lead.id, { pitchAmount: pitchAmount || null });
  };

  const handleSavePayment = (plan: "upfront" | "fifty_fifty" | "", paid: string) => {
    if (!lead) return;
    updateLead(lead.id, {
      paymentPlan: plan || null,
      amountPaid: paid ? Number(paid) : 0,
    });
  };

  const handleAddActionItem = () => {
    if (!lead || !newActionItem.trim()) return;
    const updatedItems = [...(lead.actionItems || []), newActionItem.trim()];
    const dates = [...(lead.actionItemDates || [])];
    while (dates.length < (lead.actionItems || []).length) dates.push(null);
    const needsDate = !lead.nextFollowUp && dates.every((d) => !d);
    const due = needsDate
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    updateLead(lead.id, { actionItems: updatedItems, actionItemDates: [...dates, due] });
    setNewActionItem("");
  };

  const handleRemoveActionItem = (index: number) => {
    if (!lead) return;
    const updatedItems = (lead.actionItems || []).filter((_, i) => i !== index);
    const updatedDates = (lead.actionItemDates || []).filter((_, i) => i !== index);
    updateLead(lead.id, { actionItems: updatedItems, actionItemDates: updatedDates });
  };

  const handleActionItemDate = (index: number, value: string) => {
    if (!lead) return;
    const dates = [...(lead.actionItemDates || [])];
    while (dates.length < (lead.actionItems || []).length) dates.push(null);
    if (value) {
      const [year, month, day] = value.split("-").map(Number);
      dates[index] = new Date(year, month - 1, day, 12, 0, 0).toISOString();
    } else {
      dates[index] = null;
    }
    updateLead(lead.id, { actionItemDates: dates });
  };

  const handleSyncEmails = async () => {
    if (!lead?.email) {
      toast({ title: "No email", description: "Add an email on this lead first.", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(`/api/email/sync/${lead.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: data.mocked ? "Gmail not connected" : "Emails synced",
        description: data.mocked
          ? "Nothing was added. Connect Gmail on Replit and sync again."
          : `Added ${data.added} new thread${data.added === 1 ? "" : "s"}.`,
      });
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCompleteActionItem = (index: number, itemText: string) => {
    if (!lead) return;
    
    // Add to completing animation set
    setCompletingItems(prev => new Set(prev).add(index));
    
    // After animation, remove item and add to history
    setTimeout(() => {
      const updatedItems = (lead.actionItems || []).filter((_, i) => i !== index);
      const updatedDates = (lead.actionItemDates || []).filter((_, i) => i !== index);
      const existingHistory = Array.isArray(lead.history) ? lead.history : [];
      
      updateLead(lead.id, { 
        actionItems: updatedItems,
        actionItemDates: updatedDates,
        history: [...existingHistory, {
          date: new Date().toISOString(),
          action: `Completed: ${itemText}`
        }]
      });
      
      setCompletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 500);
  };

  const handleSheetClose = () => {
    // Save all pending changes before closing
    if (lead) {
      // Save notes if changed
      if (notes !== (lead.summary || "")) {
        updateLead(lead.id, { summary: notes });
      }
      // Save LinkedIn if changed
      if (linkedInUrl !== (lead.linkedIn || "")) {
        updateLead(lead.id, { linkedIn: linkedInUrl });
      }
      // Save name if editing and changed
      if (isEditingName && editableName.trim() !== lead.name) {
        updateLead(lead.id, { name: editableName.trim() });
      }
      // Save pitch amount if changed
      if (pitchAmount !== (lead.pitchAmount || "")) {
        updateLead(lead.id, { pitchAmount: pitchAmount || null });
      }
    }
    onClose();
  };

  // Action Needed is determined by whether there are action items
  const hasActionNeeded = (lead.actionItems || []).length > 0;

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && handleSheetClose()}>
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
                    {lead.email && (
                      <div className="mt-1">
                        <RoastResumeLink email={lead.email} />
                      </div>
                    )}
                    {(jobTitle || auditScore != null || lead.auditPdfUrl) && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overemployed Risk Audit</p>
                        {jobTitle && (
                          <p className="text-sm text-foreground">{jobTitle}</p>
                        )}
                        {auditScore != null && (
                          <p className="text-sm text-foreground">Score {auditScore}/100</p>
                        )}
                        {lead.auditPdfUrl && (
                          <a href={lead.auditPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            Open PDF <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                                    </div>
                <div className="flex gap-2 items-center">
                    {hasActionNeeded && (
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
                <div className="mt-4">
                  <NextStepTeach lead={lead} />
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

            {/* Pitch Amount */}
            <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Pitch Amount
                </h3>
                <Input
                    value={pitchAmount}
                    onChange={(e) => setPitchAmount(e.target.value)}
                    onBlur={handleSavePitchAmount}
                    placeholder="e.g. $8,000 list, $7k upfront, or $4k+$4k"
                    className="bg-muted/30 border-border/50"
                    data-testid="input-pitch-amount"
                />
                <div className="flex gap-2">
                    <select
                      value={paymentPlan}
                      onChange={(e) => {
                        const plan = e.target.value as "upfront" | "fifty_fifty" | "";
                        setPaymentPlan(plan);
                        handleSavePayment(plan, amountPaid);
                      }}
                      className="flex-1 bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Payment plan</option>
                      <option value="fifty_fifty">50/50 — $4k + $4k</option>
                      <option value="upfront">Paid in full — $7k</option>
                    </select>
                    <Input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      onBlur={() => handleSavePayment(paymentPlan, amountPaid)}
                      placeholder="Paid $"
                      className="w-28 bg-muted/30 border-border/50"
                    />
                </div>
            </section>

            <Separator />

            {/* Action Items */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Action Items
                </h3>
                <div className="space-y-2">
                    {(lead.actionItems || []).map((item, index) => {
                        const isCompleting = completingItems.has(index);
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center gap-2 p-3 rounded border transition-all duration-500 ${
                              isCompleting 
                                ? 'bg-green-500/20 border-green-500/40 scale-95 opacity-0' 
                                : 'bg-red-500/10 border-red-500/20'
                            }`}
                          >
                            <button 
                                onClick={() => handleCompleteActionItem(index, item)}
                                className={`p-1 rounded-full transition-all duration-300 ${
                                  isCompleting 
                                    ? 'bg-green-500 text-white scale-110' 
                                    : 'border border-muted-foreground/30 text-muted-foreground hover:border-green-500 hover:text-green-500 hover:bg-green-500/10'
                                }`}
                                title="Mark complete"
                                disabled={isCompleting}
                                data-testid={`button-complete-action-item-${index}`}
                            >
                                <Check className="h-3 w-3" />
                            </button>
                            <span className={`text-sm flex-1 transition-all duration-300 ${
                              isCompleting ? 'line-through text-green-400' : 'text-red-200'
                            }`}>{item}</span>
                            <input
                              type="date"
                              value={
                                lead.actionItemDates?.[index]
                                  ? format(new Date(lead.actionItemDates[index] as string), "yyyy-MM-dd")
                                  : ""
                              }
                              onChange={(e) => handleActionItemDate(index, e.target.value)}
                              className="bg-transparent border border-border/50 rounded px-1 py-0.5 text-xs text-muted-foreground"
                              title="Due date"
                            />
                            <button 
                                onClick={() => handleRemoveActionItem(index)}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                                title="Delete"
                                data-testid={`button-remove-action-item-${index}`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <Input
                            value={newActionItem}
                            onChange={(e) => setNewActionItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddActionItem()}
                            placeholder="Add action item (e.g. Send contract)"
                            className="bg-muted/30 border-border/50"
                            data-testid="input-new-action-item"
                        />
                        <Button 
                            onClick={handleAddActionItem} 
                            size="sm" 
                            variant="outline"
                            data-testid="button-add-action-item"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </section>

            <Separator />
            
            {/* History Log */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity History</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleSyncEmails}
                      disabled={syncing}
                    >
                      <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing…" : "Sync emails"}
                    </Button>
                </div>
                <div className="space-y-4 border-l-2 border-muted pl-4 ml-1">
                    {(lead.history as Array<{
                      date: string;
                      action: string;
                      type?: string;
                      subject?: string;
                      summary?: string;
                      direction?: string;
                    }>).slice().reverse().map((item, i) => (
                        <div key={i} className="relative">
                            <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${
                              item.type === "email" ? "bg-primary" : "bg-muted"
                            }`} />
                            {item.type === "email" ? (
                              <div className="space-y-0.5">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {item.direction === "in" ? "Received" : "Sent"}
                                </p>
                                <p className="text-sm font-medium text-foreground">{item.subject || item.action}</p>
                                {item.summary && (
                                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.summary}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-foreground">{item.action}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, h:mm a")}</p>
                        </div>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Archive & Delete Lead */}
            <section className="pt-4 space-y-2">
                <Button 
                    variant="outline" 
                    className="w-full border-muted-foreground/30 hover:bg-muted"
                    onClick={() => {
                        archiveLead(lead.id);
                        onClose();
                    }}
                    data-testid="button-archive-lead"
                >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive (Hide from Pipeline)
                </Button>
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
