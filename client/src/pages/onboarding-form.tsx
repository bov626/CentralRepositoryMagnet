import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { id: 'info', title: 'Your Information', icon: '👤' },
  { id: 'career', title: 'Career Narrative', icon: '📖' },
  { id: 'thinking', title: 'How You Think', icon: '🧠' },
  { id: 'perspective', title: 'Perspective', icon: '🔍' },
];

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

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
      return name.trim() !== "" && email.trim() !== "";
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0 && (!name.trim() || !email.trim())) {
      toast({
        title: "Required Fields",
        description: "Please enter your name and email to continue",
        variant: "destructive",
      });
      return;
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/onboarding-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, answers }),
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground">
            Your onboarding questionnaire has been submitted successfully. 
            We'll review your responses and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Onboarding Session I</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            This will take approx. 1 hour
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Part {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="min-h-[400px]">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-6">
                <span className="text-2xl">👤</span>
                <div>
                  <h2 className="text-xl font-semibold">Your Information</h2>
                  <p className="text-sm text-muted-foreground">Let's start with the basics</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-muted/30 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-muted/30 h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-6">
                <span className="text-2xl">📖</span>
                <div>
                  <h2 className="text-xl font-semibold">Career Narrative</h2>
                  <p className="text-sm text-muted-foreground">How you got here and how you see your work</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Bring me up to date on your full career, how did we get here? Include everything, even the random jobs you worked for a week during the summer.
                  </label>
                  <Textarea
                    value={answers.careerHistory}
                    onChange={(e) => updateAnswer('careerHistory', e.target.value)}
                    placeholder="Your career journey..."
                    className="min-h-[120px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    You say you love your job, contextualize it for me. Why?
                  </label>
                  <Textarea
                    value={answers.whyLoveJob}
                    onChange={(e) => updateAnswer('whyLoveJob', e.target.value)}
                    placeholder="What makes you love what you do..."
                    className="min-h-[100px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    If someone at a dinner party asked what you do, how would you explain it?
                  </label>
                  <Textarea
                    value={answers.dinnerPartyExplanation}
                    onChange={(e) => updateAnswer('dinnerPartyExplanation', e.target.value)}
                    placeholder="Your dinner party explanation..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What is the best job you've ever had and what made it great?
                  </label>
                  <Textarea
                    value={answers.bestJob}
                    onChange={(e) => updateAnswer('bestJob', e.target.value)}
                    placeholder="Your best job experience..."
                    className="min-h-[100px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What are you unusually good at?
                  </label>
                  <Textarea
                    value={answers.unusuallyGoodAt}
                    onChange={(e) => updateAnswer('unusuallyGoodAt', e.target.value)}
                    placeholder="Your unique strengths..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-6">
                <span className="text-2xl">🧠</span>
                <div>
                  <h2 className="text-xl font-semibold">How You Think</h2>
                  <p className="text-sm text-muted-foreground">Patterns, principles, and instincts</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Are there any ideas, quotes or principles you come back to?
                  </label>
                  <p className="text-xs text-muted-foreground italic">
                    Examples: "The opposite of love is not hate, it is indifference." • "Everything in life is simple, yet nothing is easy."
                  </p>
                  <Textarea
                    value={answers.principlesQuotes}
                    onChange={(e) => updateAnswer('principlesQuotes', e.target.value)}
                    placeholder="Ideas, quotes, or principles you live by..."
                    className="min-h-[100px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tell me about a book or movie you have seen more than once.
                  </label>
                  <Textarea
                    value={answers.bookOrMovie}
                    onChange={(e) => updateAnswer('bookOrMovie', e.target.value)}
                    placeholder="A book or movie you revisit..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What do you tend to optimize for instinctively?
                  </label>
                  <Textarea
                    value={answers.optimizeFor}
                    onChange={(e) => updateAnswer('optimizeFor', e.target.value)}
                    placeholder="What you naturally prioritize..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    When something breaks, where do you look first?
                  </label>
                  <Textarea
                    value={answers.whenBreaks}
                    onChange={(e) => updateAnswer('whenBreaks', e.target.value)}
                    placeholder="Your troubleshooting instinct..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-6">
                <span className="text-2xl">🔍</span>
                <div>
                  <h2 className="text-xl font-semibold">Perspective & Differentiation</h2>
                  <p className="text-sm text-muted-foreground">What doesn't show up on a resume</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What's the biggest misconception people have about you at work?
                  </label>
                  <Textarea
                    value={answers.misconception}
                    onChange={(e) => updateAnswer('misconception', e.target.value)}
                    placeholder="Common misconceptions about you..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What's something you're better at than your resume currently shows?
                  </label>
                  <Textarea
                    value={answers.betterThanResume}
                    onChange={(e) => updateAnswer('betterThanResume', e.target.value)}
                    placeholder="Hidden strengths not on your resume..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What's one interesting or non-obvious thing about you that doesn't usually come up professionally?
                  </label>
                  <Textarea
                    value={answers.nonObviousThing}
                    onChange={(e) => updateAnswer('nonObviousThing', e.target.value)}
                    placeholder="Something interesting about you..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    If your company gave you a one-year paid sabbatical, how would you spend it?
                  </label>
                  <p className="text-xs text-muted-foreground italic">
                    This is less about fantasy, more about motivation and direction.
                  </p>
                  <Textarea
                    value={answers.sabbatical}
                    onChange={(e) => updateAnswer('sabbatical', e.target.value)}
                    placeholder="How you'd spend a sabbatical..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What do you notice first when you enter a new system or organization?
                  </label>
                  <Textarea
                    value={answers.noticeFirst}
                    onChange={(e) => updateAnswer('noticeFirst', e.target.value)}
                    placeholder="What you observe in new environments..."
                    className="min-h-[80px] bg-muted/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-8 border-t border-border mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
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
