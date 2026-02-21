import { useStore, OnboardingStage, Lead } from "@/lib/data";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Phone, FileText, Linkedin, CheckCircle2, User, ExternalLink, ChevronDown, ChevronUp, Trophy, Gamepad2, Wrench, Bot, Calendar, Download, MessageSquare, Lightbulb, StickyNote, Upload, FolderOpen, X } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface OnboardingSubmission {
  id: string;
  name: string;
  tier: string;
  totalPoints: number;
  answers: Record<string, any>;
  resumePath: string | null;
  coverLetterPath: string | null;
  linkedIn: string | null;
  submittedAt: string;
}

const ONBOARDING_COLUMNS: { id: OnboardingStage; title: string; icon: React.ReactNode }[] = [
  { id: "future-cohort", title: "Future Cohort", icon: <Calendar className="h-4 w-4" /> },
  { id: "call-1", title: "Call #1", icon: <Phone className="h-4 w-4" /> },
  { id: "call-2", title: "Call #2", icon: <Phone className="h-4 w-4" /> },
  { id: "document-creation", title: "Document Creation", icon: <FileText className="h-4 w-4" /> },
  { id: "apply-ready", title: "Apply Ready", icon: <CheckCircle2 className="h-4 w-4" /> },
];

function OnboardingCard({ lead, onOpenDetail }: { lead: Lead; onOpenDetail: (lead: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`onboarding-card-${lead.id}`}
      className={cn(
        "bg-zinc-800 border border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(lead);
          }}
          data-testid={`open-detail-${lead.id}`}
        >
          <p className="font-medium text-sm text-foreground truncate hover:text-primary transition-colors">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
          )}
        </div>
      </div>
    </div>
  );
}

async function uploadFileToStorage(file: File): Promise<string | null> {
  try {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, objectPath } = await res.json();
    
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!uploadRes.ok) throw new Error("Failed to upload file");
    
    return objectPath;
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}

function LeadDetailPanel({ lead, open, onClose }: { lead: Lead | null; open: boolean; onClose: () => void }) {
  const { updateLead } = useStore();
  const [summary, setSummary] = useState(lead?.summary || '');
  const [coverLetterIdeas, setCoverLetterIdeas] = useState(lead?.coverLetterIdeas || '');
  const [notes, setNotes] = useState(lead?.onboardingNotes || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const resumeARef = useRef<HTMLInputElement>(null);
  const resumeBRef = useRef<HTMLInputElement>(null);
  const coverLetterARef = useRef<HTMLInputElement>(null);
  const coverLetterBRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lead) {
      setSummary(lead.summary || '');
      setCoverLetterIdeas(lead.coverLetterIdeas || '');
      setNotes(lead.onboardingNotes || '');
    }
  }, [lead?.id]);

  const handleFileUpload = async (file: File, field: 'resumePathA' | 'resumePathB' | 'coverLetterPathA' | 'coverLetterPathB') => {
    if (!lead) return;
    setUploading(field);
    const path = await uploadFileToStorage(file);
    if (path) {
      updateLead(lead.id, { [field]: path });
      toast({ title: "File Uploaded", description: `${file.name} uploaded successfully` });
    } else {
      toast({ title: "Upload Failed", description: "Could not upload file", variant: "destructive" });
    }
    setUploading(null);
  };

  const handleRemoveFile = (field: 'resumePathA' | 'resumePathB' | 'coverLetterPathA' | 'coverLetterPathB') => {
    if (!lead) return;
    updateLead(lead.id, { [field]: null });
    toast({ title: "File Removed" });
  };

  const handleSaveSummary = () => {
    if (!lead) return;
    setSaving(true);
    updateLead(lead.id, { summary });
    setTimeout(() => setSaving(false), 500);
  };

  const handleSaveCoverLetter = () => {
    if (!lead) return;
    setSaving(true);
    updateLead(lead.id, { coverLetterIdeas });
    setTimeout(() => setSaving(false), 500);
  };

  const handleSaveNotes = () => {
    if (!lead) return;
    setSaving(true);
    updateLead(lead.id, { onboardingNotes: notes });
    setTimeout(() => setSaving(false), 500);
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] bg-zinc-900 border-zinc-800 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-zinc-800">
          <SheetTitle className="text-xl text-foreground flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>{lead.name}</span>
              {lead.company && (
                <p className="text-sm font-normal text-muted-foreground">{lead.company}</p>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="fathom" className="mt-4">
          <TabsList className="w-full bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="fathom" className="flex-1 gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <MessageSquare className="h-4 w-4" />
              Fathom
            </TabsTrigger>
            <TabsTrigger value="cover-letter" className="flex-1 gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Lightbulb className="h-4 w-4" />
              Cover Letter
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1 gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <FolderOpen className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fathom" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Call Summary</h3>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter Fathom call summary..."
                className="min-h-[300px] bg-zinc-800 border-zinc-700 resize-none"
                data-testid="input-fathom-summary"
              />
            </div>
            <Button 
              onClick={handleSaveSummary} 
              disabled={saving}
              className="w-full"
              data-testid="btn-save-summary"
            >
              {saving ? 'Saving...' : 'Save Summary'}
            </Button>
          </TabsContent>

          <TabsContent value="cover-letter" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Cover Letter Ideas</h3>
              <Textarea
                value={coverLetterIdeas}
                onChange={(e) => setCoverLetterIdeas(e.target.value)}
                placeholder="Jot down cover letter ideas, key points to highlight..."
                className="min-h-[300px] bg-zinc-800 border-zinc-700 resize-none"
                data-testid="input-cover-letter-ideas"
              />
            </div>
            <Button 
              onClick={handleSaveCoverLetter} 
              disabled={saving}
              className="w-full"
              data-testid="btn-save-cover-letter"
            >
              {saving ? 'Saving...' : 'Save Cover Letter Ideas'}
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General notes about this client..."
                className="min-h-[300px] bg-zinc-800 border-zinc-700 resize-none"
                data-testid="input-notes"
              />
            </div>
            <Button 
              onClick={handleSaveNotes} 
              disabled={saving}
              className="w-full"
              data-testid="btn-save-notes"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </Button>
          </TabsContent>

          <TabsContent value="files" className="mt-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Resumes</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Resume A</label>
                  <input
                    type="file"
                    ref={resumeARef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resumePathA');
                    }}
                  />
                  {lead?.resumePathA ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
                      <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <a 
                        href={lead.resumePathA} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 hover:underline truncate flex-1"
                      >
                        View File
                      </a>
                      <button
                        onClick={() => handleRemoveFile('resumePathA')}
                        className="p-1 hover:bg-red-900/50 rounded"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => resumeARef.current?.click()}
                      disabled={uploading === 'resumePathA'}
                      className="w-full p-3 border-2 border-dashed border-zinc-700 rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                    >
                      {uploading === 'resumePathA' ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload A
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Resume B</label>
                  <input
                    type="file"
                    ref={resumeBRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resumePathB');
                    }}
                  />
                  {lead?.resumePathB ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
                      <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <a 
                        href={lead.resumePathB} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 hover:underline truncate flex-1"
                      >
                        View File
                      </a>
                      <button
                        onClick={() => handleRemoveFile('resumePathB')}
                        className="p-1 hover:bg-red-900/50 rounded"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => resumeBRef.current?.click()}
                      disabled={uploading === 'resumePathB'}
                      className="w-full p-3 border-2 border-dashed border-zinc-700 rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                    >
                      {uploading === 'resumePathB' ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload B
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Cover Letters</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Cover Letter A</label>
                  <input
                    type="file"
                    ref={coverLetterARef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'coverLetterPathA');
                    }}
                  />
                  {lead?.coverLetterPathA ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <a 
                        href={lead.coverLetterPathA} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline truncate flex-1"
                      >
                        View File
                      </a>
                      <button
                        onClick={() => handleRemoveFile('coverLetterPathA')}
                        className="p-1 hover:bg-red-900/50 rounded"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverLetterARef.current?.click()}
                      disabled={uploading === 'coverLetterPathA'}
                      className="w-full p-3 border-2 border-dashed border-zinc-700 rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                    >
                      {uploading === 'coverLetterPathA' ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload A
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Cover Letter B</label>
                  <input
                    type="file"
                    ref={coverLetterBRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'coverLetterPathB');
                    }}
                  />
                  {lead?.coverLetterPathB ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <a 
                        href={lead.coverLetterPathB} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline truncate flex-1"
                      >
                        View File
                      </a>
                      <button
                        onClick={() => handleRemoveFile('coverLetterPathB')}
                        className="p-1 hover:bg-red-900/50 rounded"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverLetterBRef.current?.click()}
                      disabled={uploading === 'coverLetterPathB'}
                      className="w-full p-3 border-2 border-dashed border-zinc-700 rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                    >
                      {uploading === 'coverLetterPathB' ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload B
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function getTierIcon(tier: string) {
  if (tier.includes('Perfectionist')) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (tier.includes('Main Character')) return <Trophy className="h-5 w-5 text-purple-400" />;
  if (tier.includes('Gamer')) return <Gamepad2 className="h-5 w-5 text-emerald-400" />;
  if (tier.includes('Operator')) return <Wrench className="h-5 w-5 text-blue-400" />;
  return <Bot className="h-5 w-5 text-zinc-400" />;
}

function getTierColor(tier: string) {
  if (tier.includes('Perfectionist')) return 'from-yellow-400 via-amber-500 to-yellow-400';
  if (tier.includes('Main Character')) return 'from-purple-400 to-purple-600';
  if (tier.includes('Gamer')) return 'from-emerald-400 to-emerald-600';
  if (tier.includes('Operator')) return 'from-blue-400 to-blue-600';
  return 'from-zinc-400 to-zinc-600';
}

function SubmissionCard({ submission }: { submission: OnboardingSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const answers = submission.answers || {};

  const answerLabels: Record<string, string> = {
    careerHistory: 'Full career history',
    bestJob: 'Best job ever',
    careerChoice: 'How they chose their career',
    mentors: 'Teachers & mentors',
    beyondJobDescription: 'Beyond job description',
    colleaguesComeToYouFor: 'What colleagues come to them for',
    targetRoles: 'Target role titles',
    impactPerRole: 'Key impact per role',
    impactMetrics: 'Impact metrics',
    principlesQuotes: 'Guiding quote or idea',
    bookOrMovie: 'Book or movie seen more than once',
    unlistedAccomplishment: 'Unlisted accomplishment',
    hobbiesSideProjects: 'Hobbies & side projects',
    sabbatical: 'Sabbatical plans',
    anythingElse: 'Anything else',
  };

  const hasResume = !!submission.resumePath;
  const hasCoverLetter = !!submission.coverLetterPath;
  const hasLinkedIn = !!submission.linkedIn && submission.linkedIn !== "N/A";

  return (
    <div 
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300"
      data-testid={`submission-card-${submission.id}`}
    >
      <div 
        className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getTierIcon(submission.tier)}
            <span className={cn(
              "font-bold text-transparent bg-clip-text bg-gradient-to-r",
              getTierColor(submission.tier)
            )}>
              {submission.tier}
            </span>
          </div>
          <div className="flex-1">
            <span className="font-medium text-foreground">{submission.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-amber-400 font-semibold">{submission.totalPoints.toLocaleString()} pts</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(submission.submittedAt), 'MMM d, yyyy')}</span>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                hasResume ? "border-emerald-600 text-emerald-400 hover:bg-emerald-950" : "opacity-40 cursor-not-allowed"
              )}
              disabled={!hasResume}
              onClick={() => {
                if (hasResume) window.open(submission.resumePath!, '_blank');
              }}
              data-testid={`btn-resume-${submission.id}`}
            >
              <Download className="h-3.5 w-3.5" />
              Resume
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                hasCoverLetter ? "border-blue-600 text-blue-400 hover:bg-blue-950" : "opacity-40 cursor-not-allowed"
              )}
              disabled={!hasCoverLetter}
              onClick={() => {
                if (hasCoverLetter) window.open(submission.coverLetterPath!, '_blank');
              }}
              data-testid={`btn-cover-letter-${submission.id}`}
            >
              <Download className="h-3.5 w-3.5" />
              Cover Letter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs",
                hasLinkedIn ? "border-sky-600 text-sky-400 hover:bg-sky-950" : "opacity-40 cursor-not-allowed"
              )}
              disabled={!hasLinkedIn}
              onClick={() => {
                if (hasLinkedIn) window.open(submission.linkedIn!, '_blank');
              }}
              data-testid={`btn-linkedin-${submission.id}`}
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(answers).map(([key, value]) => {
              if (!value || (typeof value === 'string' && !value.trim())) return null;
              if (key === 'resumeFileName' || key === 'coverLetterFileName' || key === 'linkedIn') return null;
              const label = answerLabels[key] || key;
              return (
                <div key={key} className="space-y-1" data-testid={`answer-${key}-${submission.id}`}>
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">{label}</span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{String(value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingColumn({ 
  column, 
  leads,
  onOpenDetail
}: { 
  column: { id: OnboardingStage; title: string; icon: React.ReactNode }; 
  leads: Lead[];
  onOpenDetail: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-shrink-0 w-[220px] h-full">
      <div 
        ref={setNodeRef}
        className={cn(
          "bg-zinc-900 border border-zinc-700/50 rounded-xl p-3 h-full flex flex-col transition-colors",
          isOver && "border-primary bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700/50 shrink-0">
          <span className="text-primary">{column.icon}</span>
          <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-zinc-800 px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[100px] flex-1 overflow-y-auto">
            {leads.map((lead) => (
              <OnboardingCard key={lead.id} lead={lead} onOpenDetail={onOpenDetail} />
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Drop leads here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { leads, moveOnboardingLead } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: submissions = [] } = useQuery<OnboardingSubmission[]>({
    queryKey: ['/api/onboarding-submissions'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding-submissions');
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    },
  });

  const onboardingLeads = leads.filter(l => l.onboardingStage);

  const getLeadsByStage = (stage: OnboardingStage) => {
    return onboardingLeads.filter(l => l.onboardingStage === stage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const targetColumn = ONBOARDING_COLUMNS.find(col => col.id === overId);
    if (targetColumn) {
      moveOnboardingLead(leadId, targetColumn.id);
      return;
    }

    const overLead = onboardingLeads.find(l => l.id === overId);
    if (overLead && overLead.onboardingStage) {
      const lead = onboardingLeads.find(l => l.id === leadId);
      if (lead && lead.onboardingStage !== overLead.onboardingStage) {
        moveOnboardingLead(leadId, overLead.onboardingStage);
      }
    }
  };

  const activeLead = activeId ? onboardingLeads.find(l => l.id === activeId) : null;

  return (
    <Layout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
            Onboarding Pipeline
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track new clients through the onboarding process. Leads automatically appear here when moved to "Closed".
          </p>
        </div>

        {/* Top half: Onboarding Pipeline */}
        <div className="flex-1 min-h-0 flex flex-col" style={{ height: '45%', minHeight: '300px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0" style={{ height: '100%' }}>
              {ONBOARDING_COLUMNS.map((column) => (
                <OnboardingColumn
                  key={column.id}
                  column={column}
                  leads={getLeadsByStage(column.id)}
                  onOpenDetail={setSelectedLead}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead && (
                <div className="bg-zinc-800 border border-primary rounded-lg p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activeLead.name}</p>
                      {activeLead.company && (
                        <p className="text-xs text-muted-foreground">{activeLead.company}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {onboardingLeads.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No clients in onboarding yet</p>
                <p className="text-sm">Move leads to "Closed" in the Pipeline to start onboarding them.</p>
              </div>
            </div>
          )}
        </div>

        {/* Link to questionnaire */}
        <div className="py-3 border-t border-border shrink-0">
          <Link href="/questions1" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            Open Client Onboarding Questionnaire
          </Link>
        </div>

        {/* Bottom half: Submitted Forms */}
        {submissions.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col border-t border-border pt-4" style={{ maxHeight: '45%' }} data-testid="submissions-section">
            <h2 className="text-xl font-bold text-foreground mb-4 shrink-0">Submitted Forms</h2>
            <div className="overflow-y-auto flex-1 min-h-0 space-y-3 pr-2">
              {submissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          </div>
        )}
      </div>

      <LeadDetailPanel 
        lead={selectedLead} 
        open={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
      />
    </Layout>
  );
}
