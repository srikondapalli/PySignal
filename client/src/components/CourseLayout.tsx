import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  Flame,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  NotebookPen,
  Radio,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeStatuses, computeStreak, type LessonStatus } from "@/lib/courseUtils";
import { WEEKS } from "@shared/lessonTypes";

function StatusIcon({ status }: { status: LessonStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />;
  if (status === "in_progress") return <Activity className="h-3.5 w-3.5 shrink-0 text-gold" />;
  if (status === "locked") return <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />;
  return <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />;
}

/**
 * Global course shell: sidebar with the 14-day curriculum tree (per-lesson
 * status), topbar with streak + cheat sheet access from anywhere.
 */
export function CourseLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: metas } = trpc.curriculum.list.useQuery(undefined, { staleTime: Infinity });
  const { data: summary } = trpc.progress.summary.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const statuses = useMemo(
    () => computeStatuses(metas ?? [], summary?.progress ?? []),
    [metas, summary],
  );
  const streak = useMemo(() => computeStreak(summary?.activityDates ?? []), [summary]);
  const completedCount = useMemo(
    () => (summary?.progress ?? []).filter((p) => p.status === "completed").length,
    [summary],
  );
  const pct = Math.round((completedCount / 14) * 100);

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Radio className="h-4.5 w-4.5" />
        </div>
        <Link href="/dashboard" className="min-w-0" onClick={() => setMobileOpen(false)}>
          <div className="font-display text-[15px] font-semibold leading-tight tracking-tight">
            PySignal Academy
          </div>
          <div className="text-[11px] text-muted-foreground">Python for RF & DSP engineers</div>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="border-b border-sidebar-border px-3 py-3">
        {[
          { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/notebook", icon: NotebookPen, label: "Notebook" },
          { href: "/cheatsheet", icon: BookMarked, label: "MATLAB → Python Cheat Sheet" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
              location === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Curriculum tree */}
      <ScrollArea className="flex-1 px-3 py-3">
        {WEEKS.map((week) => (
          <div key={week.label} className="mb-4">
            <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {week.label}
            </div>
            {(metas ?? [])
              .filter((m) => (week.days as readonly number[]).includes(m.day))
              .map((m) => {
                const st = statuses[m.id] ?? "locked";
                const active = location === `/lesson/${m.id}`;
                const locked = st === "locked";
                const inner = (
                  <div
                    className={`flex items-center gap-2 rounded-md px-2.5 py-[7px] text-[12.5px] transition-colors duration-150 ${
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : locked
                          ? "cursor-not-allowed text-muted-foreground/50"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}>
                    <span className="w-4 shrink-0 text-right font-mono text-[10.5px] text-muted-foreground/70">
                      {m.day}
                    </span>
                    <StatusIcon status={st} />
                    <span className="truncate">{m.title}</span>
                  </div>
                );
                return locked ? (
                  <Tooltip key={m.id}>
                    <TooltipTrigger asChild>
                      <div>{inner}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[210px] text-xs">
                      Complete Day {m.day - 1} to unlock this lesson.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link key={m.id} href={`/lesson/${m.id}`} onClick={() => setMobileOpen(false)}>
                    {inner}
                  </Link>
                );
              })}
          </div>
        ))}
      </ScrollArea>

      {/* Footer: progress + user */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Course progress</span>
          <span className="font-mono font-medium text-foreground">{pct}%</span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="min-w-0 text-[12px] text-muted-foreground">
            <span className="block truncate">{user?.name || "Learner"}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => logout()}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[290px] bg-sidebar shadow-xl">
            <button
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent"
              onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[280px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:flex">
              <ChevronLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium">
                  <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-gold" : "text-muted-foreground/50"}`} />
                  <span className="font-mono">{streak}</span>
                  <span className="hidden text-muted-foreground sm:inline">day streak</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Consecutive days of study activity
              </TooltipContent>
            </Tooltip>
            <Link href="/cheatsheet">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-card text-[12.5px]">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cheat Sheet</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
