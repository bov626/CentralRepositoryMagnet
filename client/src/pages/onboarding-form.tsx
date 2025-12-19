import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, ChevronRight, ChevronLeft, Upload, FileText, Link, X, ArrowLeft, Sparkles } from "lucide-react";
import { Link as RouterLink } from "wouter";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragMoveEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

const STEPS = [
  { id: 'name', title: 'Your Information' },
  { id: 'resume', title: 'Resume' },
  { id: 'linkedin', title: 'LinkedIn' },
  { id: 'coverletter', title: 'Cover Letter' },
  { id: 'career', title: 'Career Narrative' },
  { id: 'puzzle', title: 'Palate Cleanser' },
  { id: 'thinking', title: 'How You Think' },
  { id: 'perspective', title: 'Perspective' },
];

const CROSS_GRID = [
  [false, false, true, true, false, false],
  [false, false, true, true, false, false],
  [true, true, true, true, true, true],
  [true, true, true, true, true, true],
  [false, false, true, true, false, false],
  [false, false, true, true, false, false],
];

const PUZZLE_PIECES = [
  { id: 1, shape: [[1,1],[1,0]], color: 'bg-rose-400' },
  { id: 2, shape: [[1],[1],[1]], color: 'bg-sky-400' },
  { id: 3, shape: [[1,1]], color: 'bg-emerald-400' },
  { id: 4, shape: [[1,1],[1,1]], color: 'bg-amber-400' },
  { id: 5, shape: [[1,0],[1,1]], color: 'bg-cyan-400' },
  { id: 6, shape: [[1],[1]], color: 'bg-violet-400' },
  { id: 7, shape: [[1,1,1]], color: 'bg-pink-400' },
  { id: 8, shape: [[1]], color: 'bg-orange-400' },
];

const SUDOKU_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const SUDOKU_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function DraggablePiece({ piece }: { piece: typeof PUZZLE_PIECES[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: piece.id,
  });
  
  const cols = Math.max(...piece.shape.map(r => r.length));
  
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing select-none ${isDragging ? 'opacity-70 z-50' : 'hover:scale-105 transition-transform'}`}
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
        {piece.shape.map((row, ri) => 
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={`w-7 h-7 rounded-sm ${cell ? piece.color : 'bg-transparent'}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PlacedPiece({ piece, onRemove }: { piece: typeof PUZZLE_PIECES[0]; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${piece.id}`,
    data: { pieceId: piece.id, source: 'board' },
  });
  
  const cols = Math.max(...piece.shape.map(r => r.length));
  
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: 'none',
  };

  if (isDragging) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onRemove}
      className="cursor-grab active:cursor-grabbing select-none hover:opacity-80"
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 28px)` }}>
        {piece.shape.map((row, ri) => 
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={`w-7 h-7 rounded-sm ${cell ? piece.color : 'bg-transparent'}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GridCell({ id, isValidCell, previewColor }: { id: string; isValidCell: boolean; previewColor?: string | null }) {
  const { setNodeRef } = useDroppable({ id });
  
  if (!isValidCell) {
    return <div className="w-7 h-7" />;
  }
  
  return (
    <div
      ref={setNodeRef}
      className={`w-7 h-7 rounded-sm border transition-all duration-100 ${
        previewColor ? `${previewColor} opacity-50 border-transparent` : 'bg-slate-700 border-slate-600'
      }`}
    />
  );
}

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [clickedContinue, setClickedContinue] = useState(false);
  const [tipShown, setTipShown] = useState(false);
  const [continueCount, setContinueCount] = useState(0);
  const [cheerMessage, setCheerMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [noLinkedIn, setNoLinkedIn] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [placements, setPlacements] = useState<Map<number, {row: number, col: number}>>(new Map());
  const [availablePieces, setAvailablePieces] = useState(PUZZLE_PIECES.map(p => p.id));
  const [previewCells, setPreviewCells] = useState<{cells: string[], valid: boolean, color: string} | null>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<number | null>(null);
  
  const getOccupiedCells = (excludePieceId?: number) => {
    const occupied = new Set<string>();
    placements.forEach((pos, pieceId) => {
      if (pieceId === excludePieceId) return;
      const piece = PUZZLE_PIECES.find(p => p.id === pieceId);
      if (!piece) return;
      for (let h = 0; h < piece.shape.length; h++) {
        for (let w = 0; w < piece.shape[h].length; w++) {
          if (piece.shape[h][w]) {
            occupied.add(`${pos.row + h}-${pos.col + w}`);
          }
        }
      }
    });
    return occupied;
  };
  
  const filledCells = Array.from(placements.entries()).reduce((count, [pieceId]) => {
    const piece = PUZZLE_PIECES.find(p => p.id === pieceId);
    if (!piece) return count;
    return count + piece.shape.flat().filter(Boolean).length;
  }, 0);
  const totalCells = CROSS_GRID.flat().filter(Boolean).length;
  const puzzleComplete = filledCells === totalCells;
  const [puzzleMode, setPuzzleMode] = useState<'blocks' | 'sudoku'>('blocks');
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>(
    SUDOKU_PUZZLE.map(row => [...row])
  );
  
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const [answers, setAnswers] = useState({
    careerHistory: "",
    whyLoveJob: "",
    dinnerPartyExplanation: "",
    bestJob: "",
    unusuallyGoodAt: "",
    principlesQuotes: "",
    bookOrMovie: "",
    optimizeFor: "",
    whenBreaks: "",
    misconception: "",
    betterThanResume: "",
    nonObviousThing: "",
    sabbatical: "",
    noticeFirst: "",
  });

  const updateAnswer = (key: keyof typeof answers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const progress = (Math.max(highestStep, currentStep) / STEPS.length) * 100;

  useEffect(() => {
    if (currentStep > highestStep) {
      setHighestStep(currentStep);
    }
  }, [currentStep, highestStep]);

  const triggerCheer = () => {
    setContinueCount(prev => prev + 1);
    if ((continueCount + 1) % 2 === 0 && Math.random() < 0.2) {
      const cheers = ["Woah", "Nice", "Wow"];
      const randomCheer = cheers[Math.floor(Math.random() * cheers.length)];
      setCheerMessage(randomCheer);
      setTimeout(() => setCheerMessage(null), 1000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        if (currentStep < STEPS.length - 1) {
          triggerCheer();
          handleNext();
        } else if (!submitting) {
          handleSubmit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, submitting, name, resumeFile, linkedIn, noLinkedIn, continueCount]);

  const canProceed = () => {
    if (currentStep === 0) return name.trim() !== "";
    if (currentStep === 1) return resumeFile !== null;
    if (currentStep === 2) return noLinkedIn || linkedIn.trim() !== "";
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0 && !name.trim()) {
      toast({ title: "Required Field", description: "Please enter your name to continue", variant: "destructive" });
      return;
    }
    if (currentStep === 1 && !resumeFile) {
      toast({ title: "Resume Required", description: "Please upload your resume to continue", variant: "destructive" });
      return;
    }
    if (currentStep === 2 && !noLinkedIn && !linkedIn.trim()) {
      toast({ title: "LinkedIn Required", description: "Please enter your LinkedIn URL or check N/A", variant: "destructive" });
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      if (currentStep === 1) {
        setClickedContinue(false);
      }
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setResumeFile(file);
  };

  const handleCoverLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverLetterFile(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = {
        name,
        linkedIn: noLinkedIn ? "N/A" : linkedIn,
        resumeFileName: resumeFile?.name || "",
        coverLetterFileName: coverLetterFile?.name || "",
        answers,
      };

      const response = await fetch('/api/onboarding-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit form');

      setSubmitted(true);
      toast({ title: "Form Submitted!", description: "Your responses have been sent. We'll be in touch soon." });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message || "Could not submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-light tracking-tight">Thank You</h1>
          <p className="text-zinc-400 leading-relaxed">
            Your onboarding questionnaire has been submitted successfully. 
            We'll review your responses and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <img 
            src="/jumpseat-logo.png" 
            alt="Jumpseat" 
            className="h-8 w-auto"
          />
          <RouterLink href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors duration-200">
            <ArrowLeft className="h-4 w-4" />
            Back
          </RouterLink>
        </div>

        <div className="mb-12 text-center">
          <div className="inline-block mb-4">
            <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">Onboarding</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            <span className="bg-red-600 px-5 py-2 inline-block">Session I</span>
          </h1>
          {currentStep === 0 && (
            <p className="text-zinc-400 text-sm">
              Complete this before our first call.
            </p>
          )}
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-zinc-400 font-medium">
              Part {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-zinc-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 ease-out rounded-full relative"
              style={{ width: `${progress}%` }}
            >
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {currentStep === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-light tracking-tight">Let's start with a softball. Who are you?</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your first name"
                    className="h-14 bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-light tracking-tight">Now, let's determine a starting point.</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Current Resume <span className="text-red-400">*</span></label>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className={`group relative border rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                      resumeFile 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-emerald-400" />
                        </div>
                        <span className="text-emerald-400 font-medium">{resumeFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                          className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                          <Upload className="h-7 w-7 text-zinc-500 group-hover:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-base text-zinc-400">Click to upload your resume</p>
                          <p className="text-xs text-zinc-600 mt-1">PDF, DOC, or DOCX</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-light tracking-tight">Where can we find you online?</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">LinkedIn Profile <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Link className="h-4 w-4 text-zinc-600" />
                    </div>
                    <Input
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="h-14 bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl pl-12 transition-all duration-200"
                      disabled={noLinkedIn}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Checkbox
                      id="no-linkedin"
                      checked={noLinkedIn}
                      onCheckedChange={(checked) => {
                        setNoLinkedIn(checked === true);
                        if (checked) setLinkedIn("");
                      }}
                      className="border-zinc-700 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <label htmlFor="no-linkedin" className="text-sm text-zinc-500 cursor-pointer">
                      I don't have a LinkedIn profile
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-light tracking-tight">Do you have a cover letter?</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Cover Letter <span className="text-zinc-600">(optional)</span></label>
                  <input
                    ref={coverLetterInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCoverLetterChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => coverLetterInputRef.current?.click()}
                    className={`group relative border rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                      coverLetterFile 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    {coverLetterFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-emerald-400" />
                        </div>
                        <span className="text-emerald-400 font-medium">{coverLetterFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCoverLetterFile(null); }}
                          className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                          <Upload className="h-7 w-7 text-zinc-500 group-hover:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-base text-zinc-400">Click to upload cover letter</p>
                          <p className="text-xs text-zinc-600 mt-1">PDF, DOC, or DOCX</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm text-zinc-600 mt-4">
                    No cover letter? No problem - just click Continue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Career Narrative</h2>
                <p className="text-zinc-500 text-sm">How you got here and how you see your work</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300 leading-relaxed">
                    Bring me up to date on your full career, how did we get here? Include everything, even the random jobs you worked for a week during the summer.
                  </label>
                  <Textarea
                    value={answers.careerHistory}
                    onChange={(e) => updateAnswer('careerHistory', e.target.value)}
                    placeholder="Your career journey..."
                    className="min-h-[140px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    You say you love your job, contextualize it for me. Why?
                  </label>
                  <Textarea
                    value={answers.whyLoveJob}
                    onChange={(e) => updateAnswer('whyLoveJob', e.target.value)}
                    placeholder="What makes you love what you do..."
                    className="min-h-[120px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    If someone at a dinner party asked what you do, how would you explain it?
                  </label>
                  <Textarea
                    value={answers.dinnerPartyExplanation}
                    onChange={(e) => updateAnswer('dinnerPartyExplanation', e.target.value)}
                    placeholder="Your dinner party explanation..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What is the best job you've ever had and what made it great?
                  </label>
                  <Textarea
                    value={answers.bestJob}
                    onChange={(e) => updateAnswer('bestJob', e.target.value)}
                    placeholder="Your best job experience..."
                    className="min-h-[120px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What are you unusually good at?
                  </label>
                  <Textarea
                    value={answers.unusuallyGoodAt}
                    onChange={(e) => updateAnswer('unusuallyGoodAt', e.target.value)}
                    placeholder="Your unique strengths..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-light tracking-tight mb-2">
                  {puzzleMode === 'blocks' ? 'Can you make the blocks fit?' : 'Complete the sudoku'}
                </h2>
                <span className="text-xs text-zinc-500">
                  optional
                </span>
              </div>

              {puzzleMode === 'blocks' ? (
                <DndContext 
                  sensors={sensors}
                  onDragStart={(event) => {
                    const activeId = String(event.active.id);
                    const pieceId = activeId.startsWith('placed-') 
                      ? Number(activeId.replace('placed-', '')) 
                      : Number(activeId);
                    setDraggingPieceId(pieceId);
                  }}
                  onDragMove={(event: DragMoveEvent) => {
                    const { active, over } = event;
                    if (!over) {
                      setPreviewCells(null);
                      return;
                    }
                    
                    const activeId = String(active.id);
                    const pieceId = activeId.startsWith('placed-') 
                      ? Number(activeId.replace('placed-', '')) 
                      : Number(activeId);
                    const piece = PUZZLE_PIECES.find(p => p.id === pieceId);
                    if (!piece) return;
                    
                    const [row, col] = (over.id as string).split('-').map(Number);
                    if (isNaN(row) || isNaN(col)) {
                      setPreviewCells(null);
                      return;
                    }
                    
                    const occupied = getOccupiedCells(pieceId);
                    const cells: string[] = [];
                    let canPlace = true;
                    
                    for (let h = 0; h < piece.shape.length; h++) {
                      for (let w = 0; w < piece.shape[h].length; w++) {
                        if (!piece.shape[h][w]) continue;
                        const r = row + h;
                        const c = col + w;
                        const cellKey = `${r}-${c}`;
                        cells.push(cellKey);
                        if (r >= 6 || c >= 6 || !CROSS_GRID[r]?.[c] || occupied.has(cellKey)) {
                          canPlace = false;
                        }
                      }
                    }
                    
                    setPreviewCells({ cells, valid: canPlace, color: piece.color });
                  }}
                  onDragEnd={(event: DragEndEvent) => {
                    setPreviewCells(null);
                    setDraggingPieceId(null);
                    const { active, over } = event;
                    
                    const activeId = String(active.id);
                    const isFromBoard = activeId.startsWith('placed-');
                    const pieceId = isFromBoard 
                      ? Number(activeId.replace('placed-', '')) 
                      : Number(activeId);
                    const piece = PUZZLE_PIECES.find(p => p.id === pieceId);
                    if (!piece) return;
                    
                    if (!over) {
                      if (isFromBoard) {
                        setPlacements(prev => {
                          const next = new Map(prev);
                          next.delete(pieceId);
                          return next;
                        });
                        setAvailablePieces(prev => [...prev, pieceId]);
                      }
                      return;
                    }
                    
                    const [row, col] = (over.id as string).split('-').map(Number);
                    if (isNaN(row) || isNaN(col)) {
                      if (isFromBoard) {
                        setPlacements(prev => {
                          const next = new Map(prev);
                          next.delete(pieceId);
                          return next;
                        });
                        setAvailablePieces(prev => [...prev, pieceId]);
                      }
                      return;
                    }
                    
                    const occupied = getOccupiedCells(pieceId);
                    let canPlace = true;
                    for (let h = 0; h < piece.shape.length; h++) {
                      for (let w = 0; w < piece.shape[h].length; w++) {
                        if (!piece.shape[h][w]) continue;
                        const cellKey = `${row + h}-${col + w}`;
                        if (row + h >= 6 || col + w >= 6 || !CROSS_GRID[row + h][col + w] || occupied.has(cellKey)) {
                          canPlace = false;
                          break;
                        }
                      }
                      if (!canPlace) break;
                    }
                    
                    if (canPlace) {
                      setPlacements(prev => {
                        const next = new Map(prev);
                        next.set(pieceId, { row, col });
                        return next;
                      });
                      if (!isFromBoard) {
                        setAvailablePieces(prev => prev.filter(id => id !== pieceId));
                      }
                    } else if (isFromBoard) {
                      setPlacements(prev => {
                        const next = new Map(prev);
                        next.delete(pieceId);
                        return next;
                      });
                      setAvailablePieces(prev => [...prev, pieceId]);
                    }
                  }}
                  onDragCancel={() => {
                    setPreviewCells(null);
                    setDraggingPieceId(null);
                  }}
                >
                  <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                      <div className="grid grid-cols-6 gap-0.5 p-3 bg-zinc-900/30 rounded-xl">
                        {CROSS_GRID.map((row, rowIndex) => (
                          row.map((isValid, colIndex) => {
                            const cellId = `${rowIndex}-${colIndex}`;
                            const isPreview = previewCells?.cells.includes(cellId);
                            const previewColor = isPreview && previewCells?.valid ? previewCells.color : null;
                            return (
                              <GridCell
                                key={cellId}
                                id={cellId}
                                isValidCell={isValid}
                                previewColor={previewColor}
                              />
                            );
                          })
                        ))}
                      </div>
                      
                      {Array.from(placements.entries()).map(([pieceId, pos]) => {
                        if (pieceId === draggingPieceId) return null;
                        const piece = PUZZLE_PIECES.find(p => p.id === pieceId);
                        if (!piece) return null;
                        const cols = Math.max(...piece.shape.map(r => r.length));
                        return (
                          <div
                            key={pieceId}
                            className="absolute"
                            style={{
                              top: `${12 + pos.row * 30}px`,
                              left: `${12 + pos.col * 30}px`,
                            }}
                          >
                            <PlacedPiece 
                              piece={piece} 
                              onRemove={() => {
                                setPlacements(prev => {
                                  const next = new Map(prev);
                                  next.delete(pieceId);
                                  return next;
                                });
                                setAvailablePieces(prev => [...prev, pieceId]);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 max-w-xs">
                      {availablePieces.map(pieceId => {
                        const piece = PUZZLE_PIECES.find(p => p.id === pieceId)!;
                        return (
                          <DraggablePiece key={pieceId} piece={piece} />
                        );
                      })}
                    </div>

                    {puzzleComplete && (
                      <div className="flex items-center gap-2 text-emerald-400 animate-in fade-in duration-500">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-medium">Puzzle Complete!</span>
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </DndContext>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="grid grid-cols-9 gap-0 bg-zinc-900/50 rounded-xl border border-zinc-800 p-2 overflow-hidden">
                    {sudokuGrid.map((row, rowIndex) => (
                      row.map((cell, colIndex) => {
                        const isOriginal = SUDOKU_PUZZLE[rowIndex][colIndex] !== 0;
                        const isCorrect = cell === SUDOKU_SOLUTION[rowIndex][colIndex];
                        const borderRight = colIndex === 2 || colIndex === 5;
                        const borderBottom = rowIndex === 2 || rowIndex === 5;
                        
                        return (
                          <input
                            key={`${rowIndex}-${colIndex}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={cell === 0 ? '' : cell}
                            disabled={isOriginal}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (val >= '1' && val <= '9')) {
                                const newGrid = sudokuGrid.map(r => [...r]);
                                newGrid[rowIndex][colIndex] = val === '' ? 0 : parseInt(val);
                                setSudokuGrid(newGrid);
                              }
                            }}
                            className={`w-9 h-9 text-center text-lg font-medium bg-transparent border border-zinc-700 focus:outline-none focus:border-red-500 transition-colors ${
                              isOriginal ? 'text-white' : cell !== 0 ? (isCorrect ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-400'
                            } ${borderRight ? 'border-r-2 border-r-zinc-500' : ''} ${borderBottom ? 'border-b-2 border-b-zinc-500' : ''}`}
                          />
                        );
                      })
                    ))}
                  </div>

                  {sudokuGrid.every((row, ri) => row.every((cell, ci) => cell === SUDOKU_SOLUTION[ri][ci])) && (
                    <div className="flex items-center gap-2 text-emerald-400 animate-in fade-in duration-500">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">Sudoku Complete!</span>
                      <Sparkles className="h-5 w-5" />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setPuzzleMode(puzzleMode === 'blocks' ? 'sudoku' : 'blocks')}
                  className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-full hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  {puzzleMode === 'blocks' ? 'I prefer sudoku' : 'I prefer blocks'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">How You Think</h2>
                <p className="text-zinc-500 text-sm">Patterns, principles, and instincts</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    Are there any ideas, quotes or principles you come back to?
                  </label>
                  <p className="text-xs text-zinc-600 italic leading-relaxed">
                    Examples: "The opposite of love is not hate, it is indifference." • "Everything in life is simple, yet nothing is easy."
                  </p>
                  <Textarea
                    value={answers.principlesQuotes}
                    onChange={(e) => updateAnswer('principlesQuotes', e.target.value)}
                    placeholder="Ideas, quotes, or principles you live by..."
                    className="min-h-[120px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    Tell me about a book or movie you have seen more than once.
                  </label>
                  <Textarea
                    value={answers.bookOrMovie}
                    onChange={(e) => updateAnswer('bookOrMovie', e.target.value)}
                    placeholder="A book or movie you revisit..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What do you tend to optimize for instinctively?
                  </label>
                  <Textarea
                    value={answers.optimizeFor}
                    onChange={(e) => updateAnswer('optimizeFor', e.target.value)}
                    placeholder="What you naturally prioritize..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    When something breaks, where do you look first?
                  </label>
                  <Textarea
                    value={answers.whenBreaks}
                    onChange={(e) => updateAnswer('whenBreaks', e.target.value)}
                    placeholder="Your troubleshooting instinct..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Perspective & Differentiation</h2>
                <p className="text-zinc-500 text-sm">What doesn't show up on a resume</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What's the biggest misconception people have about you at work?
                  </label>
                  <Textarea
                    value={answers.misconception}
                    onChange={(e) => updateAnswer('misconception', e.target.value)}
                    placeholder="Common misconceptions about you..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What's something you're better at than your resume currently shows?
                  </label>
                  <Textarea
                    value={answers.betterThanResume}
                    onChange={(e) => updateAnswer('betterThanResume', e.target.value)}
                    placeholder="Hidden strengths not on your resume..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What's one interesting or non-obvious thing about you that doesn't usually come up professionally?
                  </label>
                  <Textarea
                    value={answers.nonObviousThing}
                    onChange={(e) => updateAnswer('nonObviousThing', e.target.value)}
                    placeholder="Something interesting about you..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    If your company gave you a one-year paid sabbatical, how would you spend it?
                  </label>
                  <p className="text-xs text-zinc-600 italic">
                    This is less about fantasy, more about motivation and direction.
                  </p>
                  <Textarea
                    value={answers.sabbatical}
                    onChange={(e) => updateAnswer('sabbatical', e.target.value)}
                    placeholder="How you'd spend a sabbatical..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">
                    What do you notice first when you enter a new system or organization?
                  </label>
                  <Textarea
                    value={answers.noticeFirst}
                    onChange={(e) => updateAnswer('noticeFirst', e.target.value)}
                    placeholder="What you observe in new environments..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-10 mt-10 border-t border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))}
              className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1 border border-zinc-800 rounded"
            >
              DEV: Skip
            </button>
          </div>

          {currentStep < STEPS.length - 1 ? (
            <div className="flex items-center gap-3">
              {clickedContinue && currentStep === 1 && !tipShown && (
                <span 
                  className="text-xs text-zinc-500 animate-in fade-in duration-500"
                  ref={(el) => { if (el && !tipShown) setTipShown(true); }}
                >
                  Tip: Press Enter to continue faster
                </span>
              )}
              <div className="relative">
                {cheerMessage && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">{cheerMessage}</span>
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => { setClickedContinue(true); triggerCheer(); handleNext(); }}
                  disabled={!canProceed()}
                  className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-500/20 disabled:opacity-30 disabled:shadow-none px-8"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-500/20 disabled:opacity-50 px-8"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
