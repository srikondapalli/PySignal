import { useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Play,
} from "lucide-react";
import { useCourseAuth as useAuth } from "@/lib/api";
import { api as trpc, useApiUtils } from "@/lib/api";
import { CourseLayout } from "@/components/CourseLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeStatuses, computeStreak, localDateStr } from "@/lib/courseUtils";
import { WEEKS } from "@shared/lessonTypes";

/**
 * Progress dashboard: completion %, streak, quiz scores, and the curriculum map.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { data: metas, isLoading: metasLoading } = trpc.curriculum.list.useQuery(undefined, {
    staleTime: Infinity,
  });
  const { data: summary, isLoading: summaryLoading } = trpc.progress.summary.useQuery();

  const statuses = useMemo(
    () => computeStatuses(metas ?? [], summary?.progress ?? []),
    [metas, summary],
  );
  const streak = useMemo(() => computeStreak(summary?.activityDates ?? []), [summary]);

  const completed = (summary?.progress ?? []).filter((p) => p.status === "completed").length;
  const pct = Math.round((completed / 14) * 100);
  const bestScores = summary?.bestScores ?? {};
  const quizzesTaken = Object.keys(bestScores).length;
  const avgScore =
    quizzesTaken > 0
      ? Math.round(
          (Object.values(bestScores).reduce((s, b) => s + b.score / b.total, 0) / quizzesTaken) *
            100,
        )
      : null;

  // Next lesson: first available or in_progress by day order
  const nextLesson = useMemo(() => {
    const sorted = [...(metas ?? [])].sort((a, b) => a.day - b.day);
    return (
      sorted.find((m) => statuses[m.id] === "in_progress") ??
      sorted.find((m) => statuses[m.id] === "available")
    );
  }, [metas, statuses]);

  const loading = metasLoading || summaryLoading;
  const firstName = (user?.name || "Engineer").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const stats = [
    {
      icon: CheckCircle2,
      label: "Lessons completed",
      value: `${completed} / 14`,
      sub: `${pct}% of the course`,
    },
    {
      icon: Flame,
      label: "Daily streak",
      value: `${streak} ${streak === 1 ? "day" : "days"}`,
      sub: streak > 0 ? "Keep it alive today" : "Open a lesson to start",
    },
    {
      icon: Award,
      label: "Average quiz score",
      value: avgScore !== null ? `${avgScore}%` : "—",
      sub: `${quizzesTaken} ${quizzesTaken === 1 ? "quiz" : "quizzes"} taken`,
    },
    {
      icon: CalendarDays,
      label: "Active days",
      value: String((summary?.activityDates ?? []).length),
      sub: "Total study days logged",
    },
  ];

  return (
    <CourseLayout>
      <div className="container max-w-5xl py-8 lg:py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[13px] text-muted-foreground">{today}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Welcome back, {firstName}
            </h1>
          </div>
          {nextLesson && (
            <Link href={`/lesson/${nextLesson.id}`}>
              <Button className="h-10 gap-2">
                <Play className="h-4 w-4" />
                {statuses[nextLesson.id] === "in_progress" ? "Continue" : "Start"} Day{" "}
                {nextLesson.day}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
            : stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4.5 shadow-sm">
                  <div className="mb-2.5 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5 text-gold" />
                    {s.label}
                  </div>
                  <div className="font-display text-2xl font-semibold tracking-tight">{s.value}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
        </div>

        {/* Overall progress bar */}
        <div className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13.5px] font-medium">
              <GraduationCap className="h-4 w-4 text-gold" />
              14-day completion
            </div>
            <span className="font-mono text-[13px] font-medium">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex gap-1">
            {[...(metas ?? [])]
              .sort((a, b) => a.day - b.day)
              .map((m) => (
                <div
                  key={m.id}
                  title={`Day ${m.day}: ${m.title}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    statuses[m.id] === "completed"
                      ? "bg-success"
                      : statuses[m.id] === "in_progress"
                        ? "bg-gold"
                        : "bg-muted"
                  }`}
                />
              ))}
          </div>
        </div>

        {/* Curriculum map with quiz scores */}
        {WEEKS.map((week) => (
          <div key={week.label} className="mb-8">
            <h2 className="font-display mb-3.5 text-lg font-semibold tracking-tight">
              {week.label}
            </h2>
            <div className="grid gap-2.5">
              {(metas ?? [])
                .filter((m) => (week.days as readonly number[]).includes(m.day))
                .map((m) => {
                  const st = statuses[m.id] ?? "locked";
                  const best = bestScores[m.id];
                  const locked = st === "locked";
                  const row = (
                    <div
                      className={`flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-200 ${
                        locked ? "opacity-55" : "hover:border-gold/40 hover:shadow-sm"
                      }`}>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[13px] font-semibold ${
                          st === "completed"
                            ? "bg-success/15 text-success"
                            : st === "in_progress"
                              ? "bg-gold/15 text-gold"
                              : "bg-muted text-muted-foreground"
                        }`}>
                        {String(m.day).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{m.title}</div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {m.duration}
                          </span>
                          <span>{m.sectionCount} sections</span>
                          <span className="hidden sm:inline">{m.exerciseCount} exercises</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {best && (
                          <span
                            className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                              best.score / best.total >= 0.8
                                ? "bg-success/12 text-success"
                                : "bg-accent text-accent-foreground"
                            }`}>
                            Quiz {best.score}/{best.total}
                          </span>
                        )}
                        {st === "completed" ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                        ) : st === "in_progress" ? (
                          <span className="text-[11.5px] font-medium text-gold">In progress</span>
                        ) : locked ? (
                          <span className="text-[11.5px] text-muted-foreground">Locked</span>
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                  return locked ? (
                    <div key={m.id}>{row}</div>
                  ) : (
                    <Link key={m.id} href={`/lesson/${m.id}`}>
                      {row}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </CourseLayout>
  );
}

