import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Linkedin, User, ExternalLink, ChevronDown, ChevronUp, Calendar, Mail, Search, Inbox, X, RotateCcw, Trophy, Gamepad2, Wrench, Bot } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

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

const ANSWER_LABELS: Record<string, string> = {
  qualifiedTitle: "Qualified title",
  targetRoles: "Qualified title",
  careerChoice: "How they chose their career",
  impactPerRole: "Key impact per role",
  impactMetrics: "Impact metrics",
  unlistedAccomplishment: "Unlisted accomplishment",
  hobbiesSideProjects: "Hobbies & side projects",
  minSalary: "Minimum yearly salary",
  phone: "Phone (WhatsApp)",
};

// Address lives on the Hub client. Qualified title and target role are the same answer.
const HIDDEN_ANSWER_KEYS = new Set([
  "email",
  "hubClientId",
  "linkedIn",
  "resumeFileName",
  "coverLetterFileName",
  "_archived",
  "addressStreet",
  "addressApt",
  "addressCity",
  "addressState",
  "addressZip",
  "addressCountry",
]);

function isArchived(submission: OnboardingSubmission): boolean {
  return submission.answers?._archived === true;
}

function scoreRank(points: number): string {
  if (points >= 1950) return "Perfectionist";
  if (points >= 1650) return "Main Character";
  if (points >= 1350) return "Gamer Status";
  if (points >= 800) return "Operator Status";
  return "NPC Status";
}

function tierIcon(tier: string) {
  if (tier.includes("Perfectionist")) return <Trophy className="h-6 w-6 text-yellow-400" />;
  if (tier.includes("Main Character")) return <Trophy className="h-6 w-6 text-purple-400" />;
  if (tier.includes("Gamer")) return <Gamepad2 className="h-6 w-6 text-emerald-400" />;
  if (tier.includes("Operator")) return <Wrench className="h-6 w-6 text-blue-400" />;
  return <Bot className="h-6 w-6 text-zinc-400" />;
}

function tierColor(tier: string) {
  if (tier.includes("Perfectionist")) return "from-yellow-400 via-amber-500 to-yellow-400";
  if (tier.includes("Main Character")) return "from-purple-400 to-purple-600";
  if (tier.includes("Gamer")) return "from-emerald-400 to-emerald-600";
  if (tier.includes("Operator")) return "from-blue-400 to-blue-600";
  return "from-zinc-400 to-zinc-600";
}

function submissionEmail(submission: OnboardingSubmission): string | null {
  const raw = submission.answers?.email;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function normalizeLinkedIn(value: string | null): string | null {
  if (!value || value === "N/A") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatAnswer(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function SubmissionRow({
  submission,
  archived = false,
  onArchive,
}: {
  submission: OnboardingSubmission;
  archived?: boolean;
  onArchive: (archived: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const answers = submission.answers || {};
  const email = submissionEmail(submission);
  const linkedIn = normalizeLinkedIn(submission.linkedIn);
  const submitted = new Date(submission.submittedAt);
  const submittedLabel = Number.isNaN(submitted.getTime())
    ? "Unknown date"
    : format(submitted, "MMM d, yyyy, h:mm a");

  const qualifiedTitle = typeof answers.qualifiedTitle === "string" ? answers.qualifiedTitle.trim() : "";
  const answerEntries = Object.entries(answers).filter(([key, value]) => {
    if (HIDDEN_ANSWER_KEYS.has(key)) return false;
    if (key === "targetRoles" && qualifiedTitle) return false;
    if (key === "qualifiedTitle" && !qualifiedTitle) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && !value.trim()) return false;
    return true;
  });
  const points = submission.totalPoints || 0;
  const rank = (submission.tier || "").trim() || scoreRank(points);

  return (
    <div
      className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
      data-testid={`submission-card-${submission.id}`}
    >
      <button
        type="button"
        onClick={() => onArchive(!archived)}
        className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-white"
        aria-label={archived ? "Restore form" : "Archive form"}
        data-testid={archived ? `btn-restore-${submission.id}` : `btn-archive-${submission.id}`}
      >
        {archived ? <RotateCcw className="h-3.5 w-3.5" /> : <X className="h-4 w-4" />}
      </button>
      <div className="p-4 pr-12 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          data-testid={`toggle-answers-${submission.id}`}
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{submission.name}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
              <span className="inline-flex items-center gap-1 min-w-0">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{email || "No email"}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{submittedLabel}</span>
              </span>
            </div>
          </div>
        </button>

        <div className="flex w-full items-center justify-center gap-3 lg:w-56 shrink-0" data-testid={`score-${submission.id}`}>
          {tierIcon(rank)}
          <div className="text-center">
            <p className={cn("text-lg font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r", tierColor(rank))}>
              {rank}
            </p>
            <p className="text-base font-semibold tabular-nums text-amber-400">{points.toLocaleString()} pts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[7.5rem_6.75rem_8.75rem_7.25rem] shrink-0">
          {linkedIn ? (
            <a
              href={linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-sky-700 text-sky-400 hover:bg-sky-950 transition-colors"
              data-testid={`btn-linkedin-${submission.id}`}
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-zinc-800 text-zinc-600">
              <Linkedin className="h-3.5 w-3.5" />
              No LinkedIn
            </span>
          )}
          {submission.resumePath ? (
            <a
              href={`/api/onboarding-submissions/${submission.id}/file/resume`}
              download
              className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-emerald-700 text-emerald-400 hover:bg-emerald-950 transition-colors"
              data-testid={`btn-resume-${submission.id}`}
            >
              <FileText className="h-3.5 w-3.5" />
              Resume
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-zinc-800 text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              No resume
            </span>
          )}
          {submission.coverLetterPath ? (
            <a
              href={`/api/onboarding-submissions/${submission.id}/file/cover-letter`}
              download
              className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-blue-700 text-blue-400 hover:bg-blue-950 transition-colors"
              data-testid={`btn-cover-letter-${submission.id}`}
            >
              <FileText className="h-3.5 w-3.5" />
              Cover letter
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border border-zinc-800 text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              No cover letter
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex w-full items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-expanded={expanded}
            data-testid={`btn-expand-${submission.id}`}
          >
            {expanded ? "Hide answers" : "View answers"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-4 pb-4 border-b border-zinc-800">
            {submission.tier && <span>Tier: <span className="text-foreground/80">{submission.tier}</span></span>}
            <span>Points: <span className="text-foreground/80">{(submission.totalPoints || 0).toLocaleString()}</span></span>
            {typeof answers.resumeFileName === "string" && answers.resumeFileName && (
              <span>Resume file: <span className="text-foreground/80">{answers.resumeFileName}</span></span>
            )}
            {typeof answers.coverLetterFileName === "string" && answers.coverLetterFileName && (
              <span>Cover letter file: <span className="text-foreground/80">{answers.coverLetterFileName}</span></span>
            )}
          </div>
          {answerEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No written answers on this submission.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {answerEntries.map(([key, value]) => (
                <div key={key} className="space-y-1" data-testid={`answer-${key}-${submission.id}`}>
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {ANSWER_LABELS[key] || key}
                  </span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">{formatAnswer(value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading, isError } = useQuery<OnboardingSubmission[]>({
    queryKey: ["/api/onboarding-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding-submissions");
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });

  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const res = await fetch(`/api/onboarding-submissions/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error("Could not archive that form");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-submissions"] });
    },
  });

  const { active, archived } = useMemo(() => {
    const sorted = [...submissions].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    const q = search.trim().toLowerCase();
    const matched = q
      ? sorted.filter((s) => {
          const email = submissionEmail(s) || "";
          return s.name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
        })
      : sorted;
    return {
      active: matched.filter((s) => !isArchived(s)),
      archived: matched.filter((s) => isArchived(s)),
    };
  }, [submissions, search]);

  return (
    <Layout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="mb-4 shrink-0 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
              Onboarding Forms
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Forms submitted from the Hub onboarding quiz, newest first. Onboarding progress itself is tracked in Jumpseat Hub.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9 bg-zinc-900 border-zinc-800"
              data-testid="input-search-submissions"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2" data-testid="submissions-section">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading submissions...</p>
          )}
          {isError && (
            <p className="text-sm text-red-400 py-8 text-center">Could not load onboarding forms.</p>
          )}
          {!isLoading && !isError && active.length === 0 && archived.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">
                  {search.trim() ? "No forms match that search" : "No onboarding forms yet"}
                </p>
                <p className="text-sm">
                  {search.trim()
                    ? "Try a different name or email."
                    : "Submissions from the Hub onboarding quiz will appear here."}
                </p>
              </div>
            </div>
          )}
          {active.map((submission) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              onArchive={(next) => archive.mutate({ id: submission.id, archived: next })}
            />
          ))}
          {archived.length > 0 && (
            <div className="pt-8 space-y-3" data-testid="archived-section">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Archived</h2>
              {archived.map((submission) => (
                <SubmissionRow
                  key={submission.id}
                  submission={submission}
                  archived
                  onArchive={(next) => archive.mutate({ id: submission.id, archived: next })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="py-3 border-t border-border shrink-0 flex items-center justify-between text-sm">
          <span className={cn("text-muted-foreground", submissions.length === 0 && "invisible")}>
            {active.length} active{archived.length > 0 ? `, ${archived.length} archived` : ""}
          </span>
          <Link href="/questions1" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            Open Client Onboarding Questionnaire
          </Link>
        </div>
      </div>
    </Layout>
  );
}
