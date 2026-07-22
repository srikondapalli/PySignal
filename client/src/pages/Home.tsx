import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Award,
  BookMarked,
  Code2,
  FlaskConical,
  LineChart,
  NotebookPen,
  Radio,
  Waves,
} from "lucide-react";
import { useCourseAuth as useAuth } from "@/lib/api";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { api as trpc, useApiUtils } from "@/lib/api";
import { WEEKS } from "@shared/lessonTypes";

/**
 * Public landing page. Redirects authenticated users to the dashboard.
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: metas } = trpc.curriculum.list.useQuery(undefined, { staleTime: Infinity });

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/dashboard");
  }, [loading, isAuthenticated, navigate]);

  const features = [
    {
      icon: Code2,
      title: "Annotated, runnable code",
      text: "Every concept ships with copy-ready NumPy/SciPy code you can run locally — commented line by line, with real-world parameter values.",
    },
    {
      icon: BookMarked,
      title: "Built for MATLAB users",
      text: "Side-by-side MATLAB-to-Python comparisons and a global cheat sheet translate twenty years of muscle memory in days, not months.",
    },
    {
      icon: FlaskConical,
      title: "Exercises & solutions",
      text: "Three hands-on exercises per day, from guided to challenge level, each with a complete worked solution and explanation.",
    },
    {
      icon: Award,
      title: "Quizzes with retakes",
      text: "Six-question quizzes validate each day's theory. Retake any quiz, track your best score, and review per-question explanations.",
    },
    {
      icon: LineChart,
      title: "Progress & streaks",
      text: "A dashboard tracks completed lessons, quiz scores, your daily streak, and overall completion across the 14 days.",
    },
    {
      icon: NotebookPen,
      title: "Notes that persist",
      text: "Take notes inside every lesson plus a general engineering notebook — all saved to your account across devices.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Radio className="h-4.5 w-4.5" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              PySignal Academy
            </span>
          </div>
          <Button onClick={() => startLogin()} className="h-9">
            Sign in to start
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-grid-paper border-b border-border">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <Waves className="h-3.5 w-3.5 text-gold" />
              A 14-day intensive for engineers moving from MATLAB
            </div>
            <h1 className="font-display mb-5 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">
              Master Python for signal processing &{" "}
              <span className="text-gold">wireless system design</span>
            </h1>
            <p className="mb-8 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
              From NumPy fundamentals to a working WLAN packet decoder: fourteen structured days
              covering FFT analysis, filter design, QAM & OFDM, channel modeling, RF front-end
              impairments, link budgets, and MIMO — all in production-grade Python.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => startLogin()} className="h-11 gap-2 px-6">
                Begin Day 1 <ArrowRight className="h-4 w-4" />
              </Button>
              <span className="text-[13px] text-muted-foreground">
                Free • Progress saved to your account
              </span>
            </div>
          </div>

          {/* Curriculum preview card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              The 14-day path
            </div>
            <div className="grid gap-1">
              {WEEKS.map((week) => (
                <div key={week.label} className="mb-2">
                  <div className="mb-1 text-[11.5px] font-medium text-gold">{week.label}</div>
                  {(metas ?? [])
                    .filter((m) => (week.days as readonly number[]).includes(m.day))
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-baseline gap-2.5 rounded px-1.5 py-[3px] text-[13px]">
                        <span className="w-5 shrink-0 text-right font-mono text-[10.5px] text-muted-foreground">
                          {String(m.day).padStart(2, "0")}
                        </span>
                        <span className="truncate text-foreground/85">{m.title}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 lg:py-20">
        <h2 className="font-display mb-3 text-center text-3xl font-semibold tracking-tight">
          Everything a transitioning engineer needs
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-[15px] text-muted-foreground">
          Designed for practitioners: rigorous theory, idiomatic code, and measurable progress.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-sans text-[15px] font-semibold">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-secondary/60">
        <div className="container flex flex-col items-center py-16 text-center">
          <h2 className="font-display mb-4 max-w-xl text-3xl font-semibold tracking-tight">
            Two weeks from MATLAB habits to Python fluency
          </h2>
          <p className="mb-7 max-w-lg text-[15px] text-muted-foreground">
            Sign in to unlock Day 1, track your streak, and start building real wireless
            simulations today.
          </p>
          <Button size="lg" onClick={() => startLogin()} className="h-11 gap-2 px-7">
            Start the course <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-[12.5px] text-muted-foreground sm:flex-row">
          <span>PySignal Academy — Python for Signal Processing & Wireless System Design</span>
          <Link href="/cheatsheet" className="hover:text-foreground">
            MATLAB → Python Cheat Sheet
          </Link>
        </div>
      </footer>
    </div>
  );
}
