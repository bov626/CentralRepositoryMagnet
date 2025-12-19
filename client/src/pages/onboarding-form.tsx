import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, ChevronRight, ChevronLeft, Upload, FileText, Link, X, ArrowLeft, Sparkles, Trophy } from "lucide-react";
import { Link as RouterLink } from "wouter";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragMoveEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import confetti from "canvas-confetti";

const STEPS = [
  { id: 'name', title: 'Your Information', group: 'name' },
  { id: 'resume', title: 'Resume', group: 'resume' },
  { id: 'linkedin', title: 'LinkedIn', group: 'linkedin' },
  { id: 'coverletter', title: 'Cover Letter', group: 'coverletter' },
  { id: 'career', title: 'Career Narrative', group: 'career' },
  { id: 'career2', title: 'Career Narrative Part 2', group: 'career' },
  { id: 'puzzle', title: 'Palate Cleanser', group: 'puzzle' },
  { id: 'thinking', title: 'How You Think', group: 'thinking' },
  { id: 'thinking2', title: 'How You Think Part 2', group: 'thinking' },
  { id: 'trivia', title: 'Trivia', group: 'trivia' },
  { id: 'perspective', title: 'Perspective', group: 'perspective' },
  { id: 'perspective2', title: 'Perspective Part 2', group: 'perspective' },
  { id: 'results', title: 'Results', group: 'results' },
];

const UNIQUE_GROUPS = Array.from(new Set(STEPS.filter(s => s.group !== 'results').map(s => s.group)));

const CROSS_GRID = [
  [false, false, true, true, false, false],
  [false, false, true, true, false, false],
  [true, true, true, true, true, true],
  [true, true, true, true, true, true],
  [false, false, true, true, false, false],
  [false, false, true, true, false, false],
];

const PUZZLE_PIECES = [
  { id: 1, shape: [[1,1,1],[0,1,0]], color: 'bg-pink-500' },
  { id: 2, shape: [[1,1],[1,0],[1,0]], color: 'bg-blue-500' },
  { id: 3, shape: [[1,1],[1,1]], color: 'bg-green-400' },
  { id: 4, shape: [[0,1,1],[1,1,0]], color: 'bg-teal-400' },
  { id: 5, shape: [[1],[1],[1],[1]], color: 'bg-yellow-400' },
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [clickedContinue, setClickedContinue] = useState(false);
  const [tipShown, setTipShown] = useState(false);
  const [continueCount, setContinueCount] = useState(0);
  const [cheerMessage, setCheerMessage] = useState<string | null>(null);
  const [wowShown, setWowShown] = useState(false);
  const [wowStep] = useState(() => {
    const validSteps = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10];
    return validSteps[Math.floor(Math.random() * validSteps.length)];
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const duration = 1800;
    const interval = 20;
    const steps = duration / interval;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      const easeOut = 1 - Math.pow(1 - step / steps, 3);
      setLoadingProgress(Math.min(easeOut * 100, 100));
      
      if (step >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsLoading(false);
          setTimeout(() => setShowContent(true), 50);
        }, 200);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, []);
  const [name, setName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [noLinkedIn, setNoLinkedIn] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [prevTotalPoints, setPrevTotalPoints] = useState(0);
  const [topPointsAnimation, setTopPointsAnimation] = useState<number | null>(null);
  const [displayedTopPoints, setDisplayedTopPoints] = useState(0);
  const [isCountingUp, setIsCountingUp] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState<number | null>(null);
  const [awardedSteps, setAwardedSteps] = useState<Set<number>>(new Set());
  const [easterEggClaimed, setEasterEggClaimed] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeScanning, setResumeScanning] = useState(false);
  const [resumeScanMessage, setResumeScanMessage] = useState<string | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [coverLetterMessage, setCoverLetterMessage] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Map<number, {row: number, col: number}>>(new Map());
  const [availablePieces, setAvailablePieces] = useState(PUZZLE_PIECES.map(p => p.id));
  const [previewCells, setPreviewCells] = useState<{cells: string[], valid: boolean, color: string} | null>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<number | null>(null);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzlePickups, setPuzzlePickups] = useState(0);
  const [puzzleTimeSpent, setPuzzleTimeSpent] = useState(0);
  const [puzzleShowNo, setPuzzleShowNo] = useState(false);
  
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
  
  const [triviaQ1, setTriviaQ1] = useState<string | null>(null);
  const [triviaQ1Correct, setTriviaQ1Correct] = useState(false);
  const [triviaQ2, setTriviaQ2] = useState<string | null>(null);
  const [triviaQ2Message, setTriviaQ2Message] = useState<string | null>(null);
  const [triviaQ2WilsonCount, setTriviaQ2WilsonCount] = useState(0);
  const [triviaQ2MrBeastCount, setTriviaQ2MrBeastCount] = useState(0);
  const [triviaQ2Correct, setTriviaQ2Correct] = useState(false);
  const [triviaQ2CustomAnswer, setTriviaQ2CustomAnswer] = useState("");
  const [triviaQ3, setTriviaQ3] = useState<string | null>(null);
  const [triviaQ3Correct, setTriviaQ3Correct] = useState(false);
  const [triviaQ4, setTriviaQ4] = useState<string | null>(null);
  const [triviaQ4Correct, setTriviaQ4Correct] = useState(false);
  const [triviaQ4HalfPoints, setTriviaQ4HalfPoints] = useState(false);
  const [triviaQ4Message, setTriviaQ4Message] = useState<string | null>(null);
  const [triviaQ5Selections, setTriviaQ5Selections] = useState<Set<string>>(new Set());
  const [triviaQ5Wrong, setTriviaQ5Wrong] = useState<Set<string>>(new Set());
  const [triviaQ5Message, setTriviaQ5Message] = useState<string | null>(null);
  const [triviaQ5Correct, setTriviaQ5Correct] = useState(false);
  const [triviaPointsAwarded, setTriviaPointsAwarded] = useState<Set<number>>(new Set());
  const [triviaPointsAnimation, setTriviaPointsAnimation] = useState<{question: number, points: number} | null>(null);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [resultsShown, setResultsShown] = useState(false);
  const [showAward, setShowAward] = useState(false);
  
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
    dinnerPartyExplanation: "",
    bestJob: "",
    unusuallyGoodAt: "",
    principlesQuotes: "",
    bookOrMovie: "",
    optimizeFor: "",
    whenBreaks: "",
    misconception: "",
    nonObviousThing: "",
    sabbatical: "",
    noticeFirst: "",
  });

  const updateAnswer = (key: keyof typeof answers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const currentGroup = STEPS[Math.max(highestStep, currentStep)].group;
  const rawGroupIndex = UNIQUE_GROUPS.indexOf(currentGroup);
  const currentGroupIndex = rawGroupIndex === -1 ? UNIQUE_GROUPS.length - 1 : rawGroupIndex;
  
  const calculateProgress = () => {
    if (currentStep === 12) return 100;
    const stepId = STEPS[currentStep].id;
    const group = STEPS[currentStep].group;
    const multiPartGroups = ['career', 'thinking', 'perspective'];
    
    let completedGroups = currentGroupIndex;
    let subProgress = 0;
    
    if (multiPartGroups.includes(group)) {
      const isSecondPart = stepId.endsWith('2');
      subProgress = isSecondPart ? 1 : 0.5;
    } else {
      subProgress = 1;
    }
    
    return ((completedGroups + subProgress) / UNIQUE_GROUPS.length) * 100;
  };
  
  const progress = calculateProgress();

  useEffect(() => {
    if (currentStep > highestStep) {
      setHighestStep(currentStep);
    }
  }, [currentStep, highestStep]);

  useEffect(() => {
    if (totalPoints > prevTotalPoints) {
      const diff = totalPoints - prevTotalPoints;
      if (prevTotalPoints > 0) {
        setTopPointsAnimation(diff);
        setIsCountingUp(true);
        
        const startValue = prevTotalPoints;
        const endValue = totalPoints;
        const duration = 800;
        const steps = 20;
        const increment = (endValue - startValue) / steps;
        const stepTime = duration / steps;
        let current = startValue;
        
        const timer = setInterval(() => {
          current += increment;
          if (current >= endValue) {
            setDisplayedTopPoints(endValue);
            clearInterval(timer);
            setIsCountingUp(false);
            setTimeout(() => setTopPointsAnimation(null), 500);
          } else {
            setDisplayedTopPoints(Math.floor(current));
          }
        }, stepTime);
      } else {
        setDisplayedTopPoints(totalPoints);
      }
    }
    setPrevTotalPoints(totalPoints);
  }, [totalPoints]);

  useEffect(() => {
    if (currentStep === 12 && !resultsShown) {
      let current = 0;
      const target = totalPoints;
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      const stepTime = duration / steps;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setDisplayedPoints(target);
          clearInterval(timer);
          setResultsShown(true);
          
          if (totalPoints >= 2500) {
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.6 }
            });
            setTimeout(() => {
              confetti({
                particleCount: 150,
                spread: 120,
                origin: { y: 0.5 }
              });
            }, 500);
            setTimeout(() => setShowAward(true), 1000);
          } else if (totalPoints >= 2000) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          }
        } else {
          setDisplayedPoints(Math.floor(current));
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [currentStep, totalPoints, resultsShown]);

  const triggerCheer = () => {
    setContinueCount(prev => prev + 1);
    
    if (currentStep === 4) {
      setCheerMessage("yeahhhhh");
      setTimeout(() => setCheerMessage(null), 1000);
      return;
    }
    
    if (!wowShown && currentStep === wowStep) {
      setWowShown(true);
      setCheerMessage("Wow");
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

  useEffect(() => {
    const sudokuComplete = sudokuGrid.every((row, ri) => row.every((cell, ci) => cell === SUDOKU_SOLUTION[ri][ci]));
    if (sudokuComplete && puzzleMode === 'sudoku' && !awardedSteps.has(6)) {
      setTotalPoints(prev => prev + 250);
      setPointsAnimation(250);
      setTimeout(() => setPointsAnimation(null), 1500);
      setAwardedSteps(prev => new Set(Array.from(prev).concat(6)));
    }
  }, [sudokuGrid, puzzleMode, awardedSteps]);

  useEffect(() => {
    if (currentStep === 6 && !puzzleSolved) {
      const timer = setInterval(() => {
        setPuzzleTimeSpent(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, puzzleSolved]);

  useEffect(() => {
    if ((puzzlePickups >= 4 || puzzleTimeSpent >= 60) && !puzzleShowNo) {
      setPuzzleShowNo(true);
    }
  }, [puzzlePickups, puzzleTimeSpent, puzzleShowNo]);

  const canProceed = () => {
    if (currentStep === 0) return name.trim() !== "";
    if (currentStep === 1) return resumeFile !== null;
    if (currentStep === 2) return noLinkedIn || linkedIn.trim() !== "";
    return true;
  };

  const calculateStepPoints = () => {
    let points = 0;
    
    if (currentStep === 0) {
      if (name.trim().length > 0) points += 100;
    } else if (currentStep === 1) {
      if (resumeFile) points += 100;
    } else if (currentStep === 2) {
      if (linkedIn.trim().length > 4 && !noLinkedIn) points += 100;
    } else if (currentStep === 3) {
      if (coverLetterFile) points += 100;
    } else if (currentStep === 4) {
      if (answers.careerHistory.length > 4) points += 100;
      if (answers.dinnerPartyExplanation.length > 4) points += 100;
    } else if (currentStep === 5) {
      if (answers.bestJob.length > 4) points += 100;
      if (answers.unusuallyGoodAt.length > 4) points += 100;
    } else if (currentStep === 6) {
      if (puzzleSolved) points += 250;
      const sudokuComplete = sudokuGrid.every((row, ri) => row.every((cell, ci) => cell === SUDOKU_SOLUTION[ri][ci]));
      if (sudokuComplete && puzzleMode === 'sudoku') points += 250;
    } else if (currentStep === 7) {
      if (answers.principlesQuotes.length > 4) points += 100;
      if (answers.bookOrMovie.length > 4) points += 100;
    } else if (currentStep === 8) {
      if (answers.optimizeFor.length > 4) points += 100;
      if (answers.whenBreaks.length > 4) points += 100;
    } else if (currentStep === 9) {
      // Trivia points are awarded immediately per question
    } else if (currentStep === 10) {
      if (answers.misconception.length > 4) points += 100;
      if (answers.nonObviousThing.length > 4) points += 100;
    } else if (currentStep === 11) {
      if (answers.sabbatical.length > 4) points += 100;
      if (answers.noticeFirst.length > 4) points += 100;
    }
    
    return points;
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
    
    if (!awardedSteps.has(currentStep)) {
      const stepPoints = calculateStepPoints();
      if (stepPoints > 0) {
        setPointsAnimation(stepPoints);
        setTotalPoints(prev => prev + stepPoints);
        setTimeout(() => setPointsAnimation(null), 1500);
        setAwardedSteps(prev => new Set(Array.from(prev).concat(currentStep)));
      }
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
    if (file) {
      setResumeFile(file);
      setResumeScanning(true);
      setResumeScanMessage("Scanning resume...");
      setTimeout(() => {
        setResumeScanMessage("Wow this is really bad.");
      }, 1500);
      setTimeout(() => {
        setResumeScanMessage("Just kidding, you can continue now.");
        setResumeScanning(false);
      }, 2500);
      setTimeout(() => {
        setResumeScanMessage(null);
      }, 4500);
    }
  };

  const handleCoverLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      setCoverLetterMessage("Wow that's rare, someone that actually uses cover letters");
      setTimeout(() => setCoverLetterMessage(null), 4000);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const tier = totalPoints >= 2500 ? 'God Tier Status' :
                   totalPoints >= 2000 ? 'Gamer Status' :
                   totalPoints >= 1500 ? 'Operator Status' : 'NPC Status';

      const formData = {
        name,
        linkedIn: noLinkedIn ? "N/A" : linkedIn,
        resumeFileName: resumeFile?.name || "",
        coverLetterFileName: coverLetterFile?.name || "",
        answers,
        totalPoints,
        tier,
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

  useEffect(() => {
    if (submitted) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.5 }
        });
      }, 300);
    }
  }, [submitted]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img 
              src="/jumpseat-logo.png" 
              alt="Jumpseat" 
              className="h-10 w-auto mx-auto mb-8 opacity-80"
            />
          </div>
          <div className="space-y-3">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-75 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-center text-zinc-500 text-sm">
              {loadingProgress < 100 ? 'Preparing your session...' : 'Ready'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-8">
          <h1 className="text-6xl font-bold tracking-tight animate-in zoom-in duration-500">
            Hell Yeah
          </h1>
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <p className="text-zinc-400 text-lg">
              If you haven't already.
            </p>
            <a 
              href="https://calendly.com/wyedoyoudothis/onboarding-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-105"
            >
              Book your first onboarding call
            </a>
          </div>
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 mt-8">
            <p className="text-zinc-500">
              If you did. Then you are done for now.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all duration-300"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-2xl mx-auto px-6 py-12">
        <div className={`flex items-center justify-between mb-8 transition-all duration-700 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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

        <div className={`mb-12 text-center relative transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-block mb-4">
            <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">Onboarding</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="bg-red-600 px-5 py-2 inline-block">Session I</span>
          </h1>
          {currentStep > 0 && (
            <div className="mb-2 flex flex-col items-center h-12">
              <span className={`text-lg font-semibold text-amber-400 transition-transform duration-100 ${isCountingUp ? 'scale-110' : 'scale-100'}`}>
                {displayedTopPoints} pts
              </span>
              <span 
                className={`text-sm font-bold text-green-400 transition-opacity duration-300 ${topPointsAnimation !== null ? 'opacity-100' : 'opacity-0'}`}
              >
                +{topPointsAnimation ?? 0}
              </span>
            </div>
          )}
          {currentStep === 0 && (
            <p className="text-zinc-400 text-sm">
              Complete this before our first call.
            </p>
          )}
        </div>

        {currentStep < 12 && (
          <div className={`mb-12 transition-all duration-700 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-zinc-400 font-medium">
                Part {currentGroupIndex + 1} of {UNIQUE_GROUPS.length}
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
        )}

        <div className={`min-h-[400px] transition-all duration-700 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
                <h2 className="text-2xl font-light tracking-tight">
                  Now, let's determine a starting{' '}
                  <span 
                    onClick={() => {
                      if (!easterEggClaimed) {
                        setEasterEggClaimed(true);
                        setTotalPoints(prev => prev + 50);
                        setPointsAnimation(50);
                        setTimeout(() => setPointsAnimation(null), 1500);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${easterEggClaimed ? 'text-emerald-400' : 'text-zinc-300 hover:text-zinc-100'}`}
                    style={{
                      animation: easterEggClaimed ? 'none' : 'subtle-sparkle 2s ease-in-out infinite',
                    }}
                  >point</span>.
                </h2>
                <style>{`
                  @keyframes subtle-sparkle {
                    0%, 100% { text-shadow: 0 0 2px rgba(255, 255, 255, 0.4), 0 0 6px rgba(255, 215, 0, 0.3); }
                    50% { text-shadow: 0 0 6px rgba(255, 255, 255, 0.7), 0 0 12px rgba(255, 215, 0, 0.5); }
                  }
                `}</style>
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
                    onClick={() => !resumeScanning && resumeInputRef.current?.click()}
                    className={`group relative border rounded-xl p-10 text-center transition-all duration-300 overflow-hidden ${
                      resumeScanning
                        ? 'border-red-500/50 bg-zinc-900/50 cursor-wait'
                        : resumeFile 
                          ? 'border-emerald-500/50 bg-emerald-500/5 cursor-pointer' 
                          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer'
                    }`}
                  >
                    {resumeScanning && (
                      <div 
                        className="absolute top-0 left-0 h-1 bg-red-500"
                        style={{
                          animation: 'scanLine 1.5s ease-in-out infinite'
                        }}
                      />
                    )}
                    <style>{`
                      @keyframes scanLine {
                        0% { width: 0%; left: 0; }
                        50% { width: 100%; left: 0; }
                        100% { width: 0%; left: 100%; }
                      }
                    `}</style>
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${resumeScanning ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                          <FileText className={`h-6 w-6 ${resumeScanning ? 'text-red-400' : 'text-emerald-400'}`} />
                        </div>
                        <span className={`font-medium ${resumeScanning ? 'text-red-400' : 'text-emerald-400'}`}>{resumeFile.name}</span>
                        {!resumeScanning && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setResumeFile(null); setResumeScanMessage(null); }}
                            className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
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
                  {resumeScanMessage && (
                    <p className={`text-sm mt-3 text-center animate-in fade-in duration-300 ${
                      resumeScanMessage.includes('bad') ? 'text-red-400' : 
                      resumeScanMessage.includes('kidding') ? 'text-emerald-400' : 
                      'text-zinc-400'
                    }`}>
                      {resumeScanMessage}
                    </p>
                  )}
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
                  {coverLetterMessage && (
                    <p className="text-sm mt-3 text-center text-amber-400 animate-in fade-in duration-300">
                      {coverLetterMessage}
                    </p>
                  )}
                  {!coverLetterMessage && (
                    <p className="text-center text-sm text-zinc-600 mt-4">
                      No cover letter? No problem - just click Continue.
                    </p>
                  )}
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
                    If someone at a dinner party asked what you do, how would you explain it?
                  </label>
                  <Textarea
                    value={answers.dinnerPartyExplanation}
                    onChange={(e) => updateAnswer('dinnerPartyExplanation', e.target.value)}
                    placeholder="Your dinner party explanation..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Career Narrative Part 2</h2>
                <p className="text-zinc-500 text-sm">Your experiences and strengths</p>
              </div>

              <div className="space-y-8">
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

          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-light tracking-tight mb-2">
                  {puzzleMode === 'blocks' ? (
                    <>
                      Can you make the blocks fit?
                      {puzzleShowNo && !puzzleSolved && (
                        <button
                          type="button"
                          onClick={() => {
                            setPuzzleSolved(true);
                            if (!awardedSteps.has(6)) {
                              setTotalPoints(prev => prev + 250);
                              setPointsAnimation(250);
                              setTimeout(() => setPointsAnimation(null), 1500);
                              setAwardedSteps(prev => new Set(Array.from(prev).concat(6)));
                            }
                          }}
                          className="ml-3 px-4 py-1 text-lg font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors animate-in fade-in duration-300"
                        >
                          No
                        </button>
                      )}
                    </>
                  ) : 'Complete the sudoku'}
                </h2>
                {puzzleSolved && puzzleMode === 'blocks' ? (
                  <span className="text-emerald-400 font-medium animate-in fade-in duration-300">
                    Correct, it is impossible
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    optional
                  </span>
                )}
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
                    setPuzzlePickups(prev => prev + 1);
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
                    <div className={`relative ${puzzleSolved ? 'opacity-40 pointer-events-none' : ''}`}>
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
                      
                      {puzzleSolved && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="h-24 w-24 text-emerald-500 animate-in zoom-in duration-300" />
                        </div>
                      )}
                    </div>

                    {!puzzleSolved && (
                      <div className="flex flex-wrap justify-center gap-4 max-w-xs">
                        {availablePieces.map(pieceId => {
                          const piece = PUZZLE_PIECES.find(p => p.id === pieceId)!;
                          return (
                            <DraggablePiece key={pieceId} piece={piece} />
                          );
                        })}
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

          {currentStep === 7 && (
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
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">How You Think Part 2</h2>
                <p className="text-zinc-500 text-sm">Your instincts and problem-solving</p>
              </div>

              <div className="space-y-8">
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

          {currentStep === 9 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-light tracking-tight mb-2">Trivia</h2>
                <p className="text-zinc-500 text-sm">A little brain break</p>
              </div>

              <div className="space-y-8">
                {/* Question 1 */}
                <div className={`space-y-3 p-4 rounded-xl transition-all ${triviaQ1Correct ? 'bg-zinc-900/30 opacity-60' : ''}`}>
                  <div className="relative">
                    {triviaPointsAnimation?.question === 1 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-sm font-bold text-yellow-400">+{triviaPointsAnimation.points}</span>
                      </div>
                    )}
                    <label className="text-sm font-medium text-zinc-300">
                      1. What everyday object was originally invented to stop horses from slipping?
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Rubber tires', 'Concrete', 'Asphalt', 'Sandpaper'].map(option => (
                      <button
                        key={option}
                        type="button"
                        disabled={triviaQ1Correct}
                        onClick={() => {
                          setTriviaQ1(option);
                          if (option === 'Sandpaper') {
                            setTriviaQ1Correct(true);
                            if (!triviaPointsAwarded.has(1)) {
                              setTotalPoints(prev => prev + 100);
                              setTriviaPointsAnimation({question: 1, points: 100});
                              setTimeout(() => setTriviaPointsAnimation(null), 1500);
                              setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(1)));
                            }
                          }
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          triviaQ1 === option 
                            ? option === 'Sandpaper' 
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                              : 'bg-red-500/20 border-red-500 text-red-400'
                            : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2 - after Q1 correct */}
                {triviaQ1Correct && (
                  <div className={`space-y-3 p-4 rounded-xl transition-all animate-in fade-in duration-500 ${triviaQ2Correct ? 'bg-zinc-900/30 opacity-60' : ''}`}>
                    <div className="relative">
                      {triviaPointsAnimation?.question === 2 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-sm font-bold text-yellow-400">+{triviaPointsAnimation.points}</span>
                        </div>
                      )}
                      <label className="text-sm font-medium text-zinc-300">
                        2. Who is the best YouTuber?
                      </label>
                    </div>
                    {triviaQ2Message && (
                      <p className="text-sm text-amber-400 animate-in fade-in duration-300">{triviaQ2Message}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {['Wilson Wye', 'PewDiePie', 'Ali Abdaal', 'Mr. Beast'].map(option => (
                        <button
                          key={option}
                          type="button"
                          disabled={triviaQ2Correct}
                          onClick={() => {
                            setTriviaQ2(option);
                            if (option === 'Wilson Wye') {
                              const count = triviaQ2WilsonCount + 1;
                              setTriviaQ2WilsonCount(count);
                              if (count === 1) setTriviaQ2Message("Do you think I am that vain?");
                              else if (count === 2) setTriviaQ2Message("No really, I am not.");
                              else {
                                setTriviaQ2Message("Alright, flattery goes a long way.");
                                setTriviaQ2Correct(true);
                                if (!triviaPointsAwarded.has(2)) {
                                  setTotalPoints(prev => prev + 200);
                                  setTriviaPointsAnimation({question: 2, points: 200});
                                  setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                  setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(2)));
                                }
                              }
                            } else if (option === 'Mr. Beast') {
                              const count = triviaQ2MrBeastCount + 1;
                              setTriviaQ2MrBeastCount(count);
                              if (count === 1) setTriviaQ2Message("Aren't you too old for him?");
                              else setTriviaQ2Message("He really isn't.");
                            } else {
                              setTriviaQ2Correct(true);
                              setTriviaQ2Message(null);
                              if (!triviaPointsAwarded.has(2)) {
                                setTotalPoints(prev => prev + 100);
                                setTriviaPointsAnimation({question: 2, points: 100});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(2)));
                              }
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            triviaQ2 === option && triviaQ2Correct
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : triviaQ2 === option && option === 'Mr. Beast'
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                      <div className="col-span-2">
                        <Input
                          placeholder="Other (type your own)"
                          value={triviaQ2CustomAnswer}
                          onChange={(e) => setTriviaQ2CustomAnswer(e.target.value)}
                          disabled={triviaQ2Correct}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && triviaQ2CustomAnswer.trim().length > 0) {
                              setTriviaQ2(triviaQ2CustomAnswer);
                              setTriviaQ2Correct(true);
                              if (!triviaPointsAwarded.has(2)) {
                                setTotalPoints(prev => prev + 100);
                                setTriviaPointsAnimation({question: 2, points: 100});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(2)));
                              }
                            }
                          }}
                          className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Question 3 - after Q2 correct */}
                {triviaQ2Correct && (
                  <div className={`space-y-3 p-4 rounded-xl transition-all animate-in fade-in duration-500 ${triviaQ3Correct ? 'bg-zinc-900/30 opacity-60' : ''}`}>
                    <div className="relative">
                      {triviaPointsAnimation?.question === 3 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-sm font-bold text-yellow-400">+{triviaPointsAnimation.points}</span>
                        </div>
                      )}
                      <label className="text-sm font-medium text-zinc-300">
                        3. The "Q" in Q-tips stands for what?
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['Quality', 'Quick', 'Question', 'Quarter'].map(option => (
                        <button
                          key={option}
                          type="button"
                          disabled={triviaQ3Correct}
                          onClick={() => {
                            setTriviaQ3(option);
                            if (option === 'Quality') {
                              setTriviaQ3Correct(true);
                              if (!triviaPointsAwarded.has(3)) {
                                setTotalPoints(prev => prev + 100);
                                setTriviaPointsAnimation({question: 3, points: 100});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(3)));
                              }
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            triviaQ3 === option 
                              ? option === 'Quality' 
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                : 'bg-red-500/20 border-red-500 text-red-400'
                              : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question 4 - after Q3 correct */}
                {triviaQ3Correct && (
                  <div className={`space-y-3 p-4 rounded-xl transition-all animate-in fade-in duration-500 ${triviaQ4Correct || triviaQ4HalfPoints ? 'bg-zinc-900/30 opacity-60' : ''}`}>
                    <div className="relative">
                      {triviaPointsAnimation?.question === 4 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-sm font-bold text-yellow-400">+{triviaPointsAnimation.points}</span>
                        </div>
                      )}
                      <label className="text-sm font-medium text-zinc-300">
                        <span 
                          onClick={() => {
                            if (!triviaQ4Correct && !triviaQ4HalfPoints) {
                              setTriviaQ4('hidden');
                              setTriviaQ4Correct(true);
                              setTriviaQ4Message("Smart.");
                              if (!triviaPointsAwarded.has(4)) {
                                setTotalPoints(prev => prev + 100);
                                setTriviaPointsAnimation({question: 4, points: 100});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(4)));
                              }
                            }
                          }}
                          className="cursor-pointer hover:bg-zinc-700/50 hover:rounded-full hover:ring-2 hover:ring-zinc-500 px-1 transition-all"
                        >4</span>. What is 12÷(3+1)×2−2?
                      </label>
                    </div>
                    {triviaQ4Message && (
                      <p className="text-sm text-amber-400 animate-in fade-in duration-300">{triviaQ4Message}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {['1', '8', '10', 'I hate math'].map(option => (
                        <button
                          key={option}
                          type="button"
                          disabled={triviaQ4Correct || triviaQ4HalfPoints}
                          onClick={() => {
                            if (option === 'I hate math') {
                              setTriviaQ4(option);
                              setTriviaQ4HalfPoints(true);
                              setTriviaQ4Message(null);
                              if (!triviaPointsAwarded.has(4)) {
                                setTotalPoints(prev => prev + 50);
                                setTriviaPointsAnimation({question: 4, points: 50});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(4)));
                              }
                            } else {
                              setTriviaQ4Message("P.E.M.D.A.S.");
                              setTriviaQ4(null);
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            triviaQ4 === option 
                              ? triviaQ4Correct || option === 'I hate math'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                : 'border-zinc-700 text-zinc-300'
                              : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question 5 - after Q4 correct or half points */}
                {(triviaQ4Correct || triviaQ4HalfPoints) && (
                  <div className={`space-y-3 p-4 rounded-xl transition-all animate-in fade-in duration-500 ${triviaQ5Correct ? 'bg-zinc-900/30 opacity-60' : ''}`}>
                    <div className="relative">
                      {triviaPointsAnimation?.question === 5 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-sm font-bold text-yellow-400">+{triviaPointsAnimation.points}</span>
                        </div>
                      )}
                      <label className="text-sm font-medium text-zinc-300">
                        5. Bananas are classified as what?
                      </label>
                    </div>
                    {triviaQ5Message && (
                      <p className="text-sm text-amber-400 animate-in fade-in duration-300">{triviaQ5Message}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {['Fruits', 'Berries', 'Herbs', 'Drupes'].map(option => (
                        <button
                          key={option}
                          type="button"
                          disabled={triviaQ5Correct}
                          onClick={() => {
                            if (option === 'Drupes') {
                              setTriviaQ5Message("What even is a drupe??");
                              return;
                            }
                            if (option === 'Herbs') {
                              setTriviaQ5Message("Nope, that's not right.");
                              setTriviaQ5Wrong(prev => new Set(Array.from(prev).concat(option)));
                              return;
                            }
                            const newSelections = new Set(Array.from(triviaQ5Selections).concat(option));
                            setTriviaQ5Selections(newSelections);
                            if (newSelections.has('Fruits') && newSelections.has('Berries')) {
                              setTriviaQ5Correct(true);
                              setTriviaQ5Message(null);
                              if (!triviaPointsAwarded.has(5)) {
                                setTotalPoints(prev => prev + 100);
                                setTriviaPointsAnimation({question: 5, points: 100});
                                setTimeout(() => setTriviaPointsAnimation(null), 1500);
                                setTriviaPointsAwarded(prev => new Set(Array.from(prev).concat(5)));
                              }
                            } else {
                              setTriviaQ5Message("and?");
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                            triviaQ5Selections.has(option)
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : triviaQ5Wrong.has(option)
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 10 && (
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
                    What's one interesting or non-obvious thing about you that doesn't usually come up professionally?
                  </label>
                  <Textarea
                    value={answers.nonObviousThing}
                    onChange={(e) => updateAnswer('nonObviousThing', e.target.value)}
                    placeholder="Something interesting about you..."
                    className="min-h-[100px] bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white placeholder:text-zinc-600 rounded-xl resize-none transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 11 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Perspective & Differentiation Part 2</h2>
                <p className="text-zinc-500 text-sm">Motivation and observation</p>
              </div>

              <div className="space-y-8">
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

          {currentStep === 12 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-light tracking-tight">Your Score</h2>
                  <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                    {displayedPoints.toLocaleString()}
                  </div>
                </div>

                {resultsShown && (
                  <div className="animate-in fade-in zoom-in duration-500 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-medium text-white">
                        Good work, you reached{' '}
                        <span className={
                          totalPoints >= 2500 ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400' :
                          totalPoints >= 2000 ? 'text-purple-400' :
                          totalPoints >= 1500 ? 'text-blue-400' :
                          'text-zinc-400'
                        }>
                          {totalPoints >= 2500 ? 'God Tier Status' :
                           totalPoints >= 2000 ? 'Gamer Status' :
                           totalPoints >= 1500 ? 'Operator Status' :
                           'NPC Status'}
                        </span>
                      </h3>
                      <div className="text-sm text-zinc-400 max-w-md mx-auto">
                        {totalPoints >= 2500 ? (
                          <p className="text-yellow-400 font-medium">Perfect score! You found every point possible.</p>
                        ) : totalPoints >= 2000 ? (
                          <p>Nice! The highest possible was 2,500.</p>
                        ) : totalPoints >= 1500 ? (
                          <p>Appreciate you not going above and beyond. You are ready for Overemployment.</p>
                        ) : (
                          <p>Did you even try? Just playing, we'll go over these on call.</p>
                        )}
                      </div>
                      <p className="text-zinc-500">Too bad these points are useless.</p>
                    </div>

                    {showAward && totalPoints >= 2500 && (
                      <div className="animate-in zoom-in duration-700 flex flex-col items-center gap-4 p-8">
                        <div className="relative">
                          <Trophy className="h-24 w-24 text-yellow-400" />
                          <div className="absolute inset-0 animate-pulse">
                            <Trophy className="h-24 w-24 text-yellow-400 opacity-50" />
                          </div>
                        </div>
                        <span className="text-lg font-medium text-yellow-400">Perfection Achieved</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-10 mt-10 border-t border-zinc-800/50">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
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
                </div>
              </div>
            </div>
          )}
        </div>

        {currentStep < 12 && (
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
                {pointsAnimation !== null && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-sm font-bold text-yellow-400">+{pointsAnimation}</span>
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
        </div>)}
      </div>
    </div>
  );
}
