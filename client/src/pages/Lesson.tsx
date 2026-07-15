import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  Lightbulb,
  ListChecks,
  NotebookPen,
  RotateCcw,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CourseLayout } from "@/components/CourseLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { MarkdownText } from "@/components/MarkdownText";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { localDateStr } from "@/lib/courseUtils";

// ---------------------------------------------------------------------------
// Notes panel (per-lesson, autosaves on blur / debounce)
// ---------------------------------------------------------------------------
function NotesPanel({ lessonId }: { lessonId: string }) {
  const utils = trpc.useUtils();
  const { data: note, isLoading } = trpc.notes.get.useQuery({ lessonId });
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !loadedRef.current) {
      setText(note?.content ?? "");
      loadedRef.current = true;
    }
  }, [isLoading, note]);

  const save = trpc.notes.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.notes.get.invalidate({ lessonId });
      utils.notes.list.invalidate();
    },
  });

  // Debounced autosave
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save.mutate({ lessonId, content: text }), 1200);
    return () => clearTimeout(t);
  }, [text, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col gap-3">
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        placeholder="Capture derivations, gotchas, parameter values, links to your own experiments…"
        className="min-h-[300px] flex-1 resize-none font-mono text-[13px] leading-relaxed"
      />
      <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
        <span>
          {save.isPending ? "Saving…" : dirty ? "Unsaved changes" : text ? "Saved" : "No notes yet"}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 bg-card text-xs"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ lessonId, content: text })}>
          Save now
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz engine
// ---------------------------------------------------------------------------
interface QuizResult {
  score: number;
  total: number;
  results: { correct: boolean; correctIndex: number; explanation: string }[];
}

function QuizEngine({
  lessonId,
  questions,
}: {
  lessonId: string;
  questions: { question: string; options: string[] }[];
}) {
  const utils = trpc.useUtils();
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const { data: history } = trpc.quiz.history.useQuery({ lessonId });

  const submit = trpc.quiz.submit.useMutation({
    onSuccess: (r) => {
      setResult(r);
      utils.quiz.history.invalidate({ lessonId });
      utils.progress.summary.invalidate();
      const pctVal = Math.round((r.score / r.total) * 100);
      toast(pctVal >= 80 ? `Strong work — ${r.score}/${r.total}` : `Scored ${r.score}/${r.total}`, {
        description:
          pctVal >= 80
            ? "You've got this material down."
            : "Review the explanations below, then retake when ready.",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const allAnswered = answers.every((a) => a >= 0);
  const answeredCount = answers.filter((a) => a >= 0).length;

  const retake = () => {
    setAnswers(questions.map(() => -1));
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Progress + history strip */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-3">
        <div className="text-[13px] text-muted-foreground">
          {result ? (
            <span>
              Result:{" "}
              <span className={`font-semibold ${result.score / result.total >= 0.8 ? "text-success" : "text-foreground"}`}>
                {result.score}/{result.total}
              </span>
            </span>
          ) : (
            <span>
              {answeredCount}/{questions.length} answered
            </span>
          )}
        </div>
        {history && history.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>Past attempts:</span>
            <div className="flex gap-1.5">
              {history.slice(0, 5).map((h) => (
                <span
                  key={h.id}
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
                    h.score / h.total >= 0.8 ? "bg-success/12 text-success" : "bg-muted"
                  }`}>
                  {h.score}/{h.total}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5">
        {questions.map((q, qi) => {
          const picked = answers[qi];
          const res = result?.results[qi];
          return (
            <div key={qi} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3.5 flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                  {qi + 1}
                </span>
                <MarkdownText className="!text-[14px] font-medium">{q.question}</MarkdownText>
              </div>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  let cls =
                    "border-border bg-background hover:border-gold/50 hover:bg-accent/40";
                  if (result && res) {
                    if (oi === res.correctIndex)
                      cls = "border-success/60 bg-success/8 ring-1 ring-success/30";
                    else if (picked === oi && !res.correct)
                      cls = "border-destructive/50 bg-destructive/5";
                    else cls = "border-border bg-background opacity-60";
                  } else if (picked === oi) {
                    cls = "border-gold bg-accent/60 ring-1 ring-gold/40";
                  }
                  return (
                    <button
                      key={oi}
                      disabled={!!result}
                      onClick={() =>
                        setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                      }
                      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-[13.5px] transition-all duration-150 ${cls}`}>
                      <span className="mt-px shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {result && res && (
                <div
                  className={`mt-3.5 rounded-lg px-4 py-3 text-[13px] leading-relaxed ${
                    res.correct ? "bg-success/8 text-foreground/85" : "bg-accent/60 text-foreground/85"
                  }`}>
                  <span className={`font-semibold ${res.correct ? "text-success" : "text-gold"}`}>
                    {res.correct ? "Correct. " : "Not quite. "}
                  </span>
                  {res.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {!result ? (
          <Button
            className="h-10 gap-2 px-6"
            disabled={!allAnswered || submit.isPending}
            onClick={() =>
              submit.mutate({ lessonId, answers, localDate: localDateStr() })
            }>
            <ListChecks className="h-4 w-4" />
            {submit.isPending ? "Grading…" : "Submit answers"}
          </Button>
        ) : (
          <Button variant="outline" className="h-10 gap-2 bg-card px-6" onClick={retake}>
            <RotateCcw className="h-4 w-4" />
            Retake quiz
          </Button>
        )}
        {!result && !allAnswered && (
          <span className="text-[12.5px] text-muted-foreground">
            Answer all {questions.length} questions to submit.
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card with hint + reveal-solution
// ---------------------------------------------------------------------------
function ExerciseCard({
  index,
  ex,
}: {
  index: number;
  ex: { title: string; prompt: string; hint: string; solution: string; explanation: string };
}) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const levels = ["Guided", "Intermediate", "Challenge"];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
          Exercise {index + 1} · {levels[index] ?? "Extra"}
        </span>
      </div>
      <h3 className="font-display mb-3 mt-2 text-lg font-semibold tracking-tight">{ex.title}</h3>
      <MarkdownText>{ex.prompt}</MarkdownText>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-card text-xs"
          onClick={() => setShowHint((s) => !s)}>
          <Lightbulb className="h-3.5 w-3.5 text-gold" />
          {showHint ? "Hide hint" : "Show hint"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 bg-card text-xs"
          onClick={() => setShowSolution((s) => !s)}>
          <FlaskConical className="h-3.5 w-3.5 text-gold" />
          {showSolution ? "Hide solution" : "Reveal solution"}
        </Button>
      </div>

      {showHint && (
        <div className="mt-3.5 rounded-lg border border-gold/30 bg-accent/50 px-4 py-3 text-[13px] leading-relaxed">
          <span className="font-semibold text-gold">Hint: </span>
          {ex.hint}
        </div>
      )}

      {showSolution && (
        <div className="mt-3.5">
          <CodeBlock code={ex.solution} title={`Solution — ${ex.title}`} />
          <div className="rounded-lg bg-secondary/70 px-4 py-3">
            <MarkdownText className="!text-[13px]">{ex.explanation}</MarkdownText>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson page
// ---------------------------------------------------------------------------
export default function Lesson() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: lesson, isLoading, error } = trpc.curriculum.lesson.useQuery(
    { id: lessonId },
    { retry: 1 },
  );
  const { data: metas } = trpc.curriculum.list.useQuery(undefined, { staleTime: Infinity });
  const { data: summary } = trpc.progress.summary.useQuery();

  const ping = trpc.progress.ping.useMutation({
    onSuccess: () => utils.progress.summary.invalidate(),
  });
  const pingedRef = useRef<string | null>(null);
  useEffect(() => {
    if (lesson && pingedRef.current !== lessonId) {
      pingedRef.current = lessonId;
      ping.mutate({ localDate: localDateStr() });
    }
  }, [lesson, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = trpc.progress.setStatus.useMutation({
    onSuccess: (_d, vars) => {
      utils.progress.summary.invalidate();
      if (vars.status === "completed") {
        toast.success(`Day ${lesson?.day} marked complete`, {
          description: "The next lesson is now unlocked.",
        });
      }
    },
  });

  const isCompleted = useMemo(
    () => (summary?.progress ?? []).some((p) => p.lessonId === lessonId && p.status === "completed"),
    [summary, lessonId],
  );

  const { prev, next } = useMemo(() => {
    const sorted = [...(metas ?? [])].sort((a, b) => a.day - b.day);
    const idx = sorted.findIndex((m) => m.id === lessonId);
    return { prev: idx > 0 ? sorted[idx - 1] : null, next: idx >= 0 ? sorted[idx + 1] : null };
  }, [metas, lessonId]);

  if (error) {
    return (
      <CourseLayout>
        <div className="container max-w-3xl py-20 text-center">
          <h1 className="font-display mb-3 text-2xl font-semibold">Lesson unavailable</h1>
          <p className="mb-6 text-muted-foreground">{error.message}</p>
          <Button onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
        </div>
      </CourseLayout>
    );
  }

  return (
    <CourseLayout>
      <div className="container max-w-4xl py-8 lg:py-10">
        {isLoading || !lesson ? (
          <div className="grid gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Lesson header */}
            <div className="mb-7">
              <div className="mb-2.5 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
                <span className="rounded-full bg-primary px-3 py-1 font-mono text-[11px] font-semibold text-primary-foreground">
                  DAY {String(lesson.day).padStart(2, "0")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {lesson.duration}
                </span>
                {isCompleted && (
                  <span className="flex items-center gap-1 font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                  </span>
                )}
              </div>
              <h1 className="font-display mb-2 text-3xl font-semibold leading-tight tracking-tight">
                {lesson.title}
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                {lesson.subtitle}
              </p>
            </div>

            {/* Objectives */}
            <div className="mb-8 rounded-xl border border-border bg-secondary/50 p-5">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <Target className="h-4 w-4 text-gold" />
                Today's objectives
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {lesson.objectives.map((o, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/85">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {o}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs: Lesson | Exercises | Quiz */}
            <Tabs defaultValue="lesson">
              <div className="sticky top-14 z-10 -mx-2 mb-6 bg-background/90 px-2 py-2 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <TabsList className="h-10">
                    <TabsTrigger value="lesson" className="gap-1.5 px-4">
                      <BookOpen className="h-3.5 w-3.5" /> Lesson
                    </TabsTrigger>
                    <TabsTrigger value="exercises" className="gap-1.5 px-4">
                      <FlaskConical className="h-3.5 w-3.5" /> Exercises
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className="gap-1.5 px-4">
                      <ListChecks className="h-3.5 w-3.5" /> Quiz
                    </TabsTrigger>
                  </TabsList>
                  {/* Notes side sheet — always reachable */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-card">
                        <NotebookPen className="h-3.5 w-3.5 text-gold" />
                        <span className="hidden sm:inline">My notes</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                      <SheetHeader>
                        <SheetTitle className="font-display">
                          Notes — Day {lesson.day}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="flex-1 px-4 pb-4">
                        <NotesPanel lessonId={lessonId} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* THEORY */}
              <TabsContent value="lesson">
                <div className="grid gap-9">
                  {lesson.sections.map((s, i) => (
                    <section key={i}>
                      <h2 className="font-display mb-3 text-[22px] font-semibold tracking-tight">
                        <span className="mr-2 font-mono text-[13px] font-medium text-gold">
                          {lesson.day}.{i + 1}
                        </span>
                        {s.heading}
                      </h2>
                      <MarkdownText>{s.content}</MarkdownText>
                      {s.code && <CodeBlock code={s.code} title={s.codeTitle} />}
                      {s.matlabComparison && (
                        <Collapsible>
                          <CollapsibleTrigger className="group mt-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-[12.5px] font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            Compare with MATLAB
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CodeBlock
                              code={s.matlabComparison}
                              language="matlab"
                              title="MATLAB equivalent"
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </section>
                  ))}
                </div>
              </TabsContent>

              {/* EXERCISES */}
              <TabsContent value="exercises">
                <div className="grid gap-5">
                  {lesson.exercises.map((ex, i) => (
                    <ExerciseCard key={i} index={i} ex={ex} />
                  ))}
                </div>
              </TabsContent>

              {/* QUIZ */}
              <TabsContent value="quiz">
                <QuizEngine lessonId={lessonId} questions={lesson.quiz} />
              </TabsContent>
            </Tabs>

            {/* Completion + prev/next footer */}
            <div className="mt-12 border-t border-border pt-6">
              <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-6 text-center shadow-sm">
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="h-7 w-7 text-success" />
                    <div className="text-[14.5px] font-medium">Day {lesson.day} complete</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card text-xs"
                      onClick={() =>
                        setStatus.mutate({
                          lessonId,
                          status: "in_progress",
                          localDate: localDateStr(),
                        })
                      }>
                      Mark as in progress
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-[14.5px] font-medium">
                      Finished the material, exercises, and quiz?
                    </div>
                    <Button
                      className="h-10 gap-2 px-6"
                      disabled={setStatus.isPending}
                      onClick={() =>
                        setStatus.mutate({
                          lessonId,
                          status: "completed",
                          localDate: localDateStr(),
                        })
                      }>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Day {lesson.day} complete
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {prev ? (
                  <Link href={`/lesson/${prev.id}`}>
                    <Button variant="ghost" className="gap-2 text-[13px]">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Day {prev.day}:</span>
                      <span className="max-w-[180px] truncate">{prev.title}</span>
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
                {next && (
                  <Link href={`/lesson/${next.id}`}>
                    <Button variant="ghost" className="gap-2 text-[13px]">
                      <span className="hidden sm:inline">Day {next.day}:</span>
                      <span className="max-w-[180px] truncate">{next.title}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </CourseLayout>
  );
}
