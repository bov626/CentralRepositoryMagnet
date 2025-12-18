import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, ChevronRight, ChevronLeft, Upload, FileText, Link, X, ArrowLeft } from "lucide-react";
import { Link as RouterLink } from "wouter";

const STEPS = [
  { id: 'name', title: 'Your Information', icon: '👤' },
  { id: 'documents', title: 'Your Information', icon: '👤' },
  { id: 'career', title: 'Career Narrative', icon: '📖' },
  { id: 'thinking', title: 'How You Think', icon: '🧠' },
  { id: 'perspective', title: 'Perspective', icon: '🔍' },
];

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [noLinkedIn, setNoLinkedIn] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);

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

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    if (currentStep === 0) {
      return name.trim() !== "";
    }
    if (currentStep === 1) {
      const hasResume = resumeFile !== null;
      const hasLinkedIn = noLinkedIn || linkedIn.trim() !== "";
      return hasResume && hasLinkedIn;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0 && !name.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 1) {
      if (!resumeFile) {
        toast({
          title: "Resume Required",
          description: "Please upload your resume to continue",
          variant: "destructive",
        });
        return;
      }
      if (!noLinkedIn && !linkedIn.trim()) {
        toast({
          title: "LinkedIn Required",
          description: "Please enter your LinkedIn URL or check N/A",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleCoverLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
    }
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSubmitted(true);
      toast({
        title: "Form Submitted!",
        description: "Your responses have been sent. We'll be in touch soon.",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit form",
        variant: "destructive",
      });
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
          <p className="text-zinc-400 text-sm">
            Complete this before our first call.
          </p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-zinc-400 font-medium">
              Part {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-zinc-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="min-h-[450px]">
          {currentStep === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Your Information</h2>
                <p className="text-zinc-500 text-sm">Let's start with the basics</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">First Name</label>
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
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight mb-2">Your Information</h2>
                <p className="text-zinc-500 text-sm">Documents and links</p>
              </div>
              
              <div className="space-y-8">
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
                    className={`group relative border rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      resumeFile 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-emerald-400 font-medium">{resumeFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumeFile(null);
                          }}
                          className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                          <Upload className="h-6 w-6 text-zinc-500 group-hover:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Click to upload your resume</p>
                          <p className="text-xs text-zinc-600 mt-1">PDF, DOC, or DOCX</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                    className={`group relative border rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                      coverLetterFile 
                        ? 'border-emerald-500/50 bg-emerald-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    {coverLetterFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">{coverLetterFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverLetterFile(null);
                          }}
                          className="ml-2 p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <Upload className="h-5 w-5 text-zinc-600" />
                        <p className="text-sm text-zinc-500">Upload cover letter</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
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

          {currentStep === 3 && (
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

          {currentStep === 4 && (
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

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-500/20 disabled:opacity-30 disabled:shadow-none px-8"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
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
