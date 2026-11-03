import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Linkedin, User, ExternalLink, ChevronDown, ChevronUp, Calendar, Mail, Search, Inbox } from "lucide-react";
import Layout from "@/components/layout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  targetRoles: "Target role titles (and most qualified for)",
  careerChoice: "How they chose their career",
  impactPerRole: "Key impact per role",
  impactMetrics: "Impact metrics",
  unlistedAccomplishment: "Unlisted accomplishment",
  hobbiesSideProjects: "Hobbies & side projects",
  minSalary: "Minimum yearly salary",
  addressStreet: "Address: street",
  addressApt: "Address: apt / suite / unit",
  addressCity: "Address: city",
  addressState: "Address: state",
  addressZip: "Address: ZIP",
  addressCountry: "Address: country",
  phone: "Phone (WhatsApp)",
};

// Keys shown in the row header or used as metadata, not as free text answers.
const HIDDEN_ANSWER_KEYS = new Set([
  "email",
  "hubClientId",
  "linkedIn",
  "resumeFileName",
  "coverLetterFileName",
]);

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

function SubmissionRow({ submission }: { submission: OnboardingSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const answers = submission.answers || {};
  const email = submissionEmail(submission);
  const linkedIn = normalizeLinkedIn(submission.linkedIn);
  const submitted = new Date(submission.submittedAt);
  const submittedLabel = Number.isNaN(submitted.getTime())
    ? "Unknown date"
    : format(submitted, "MMM d, yyyy, h:mm a");

  const answerEntries = Object.entries(answers).filter(([key, value]) => {
    if (HIDDEN_ANSWER_KEYS.has(key)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && !value.trim()) return false;
    return true;
  });

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
      data-testid={`submission-card-${submission.id}`}
    >
      <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
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

        <div className="flex items-center gap-2 flex-shrink-0 md:pl-2">
          {linkedIn ? (
            <a
              href={linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-sky-700 text-sky-400 hover:bg-sky-950 transition-colors"
              data-testid={`btn-linkedin-${submission.id}`}
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 text-zinc-600">
              <Linkedin className="h-3.5 w-3.5" />
              No LinkedIn
            </span>
          )}
          {submission.resumePath ? (
            <a
              href={submission.resumePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-emerald-700 text-emerald-400 hover:bg-emerald-950 transition-colors"
              data-testid={`btn-resume-${submission.id}`}
            >
              <FileText className="h-3.5 w-3.5" />
              Resume
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              No resume
            </span>
          )}
          {submission.coverLetterPath && (
            <a
              href={submission.coverLetterPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-blue-700 text-blue-400 hover:bg-blue-950 transition-colors"
              data-testid={`btn-cover-letter-${submission.id}`}
            >
              <FileText className="h-3.5 w-3.5" />
              Cover letter
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
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

  const { data: submissions = [], isLoading, isError } = useQuery<OnboardingSubmission[]>({
    queryKey: ["/api/onboarding-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding-submissions");
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });

  const visible = useMemo(() => {
    const sorted = [...submissions].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) => {
      const email = submissionEmail(s) || "";
      return s.name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });
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
          {!isLoading && !isError && visible.length === 0 && (
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
          {visible.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
        </div>

        <div className="py-3 border-t border-border shrink-0 flex items-center justify-between text-sm">
          <span className={cn("text-muted-foreground", visible.length === 0 && "invisible")}>
            {visible.length} of {submissions.length} form{submissions.length === 1 ? "" : "s"}
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
