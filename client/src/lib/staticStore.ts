/**
 * Static demo mode data layer (GitHub Pages build).
 *
 * Replaces the tRPC backend with:
 *  - curriculum: lesson JSON bundled into the client at build time
 *  - progress / quiz attempts / notes / activity: browser localStorage
 *
 * Only compiled into the bundle when VITE_STATIC_MODE=1 (see lib/api.ts).
 */
import type { Lesson, LessonMeta, QuizQuestionPublic } from "@shared/lessonTypes";

// ---------------------------------------------------------------------------
// Bundled curriculum
// ---------------------------------------------------------------------------
const modules = import.meta.glob("../../../shared/lessons/*.json", {
  eager: true,
}) as Record<string, { default: Lesson } | Lesson>;

const ALL_LESSONS: Lesson[] = Object.values(modules)
  .map((m) => ("default" in (m as object) ? (m as { default: Lesson }).default : (m as Lesson)))
  .sort((a, b) => a.day - b.day);

export function staticLessonMetas(): LessonMeta[] {
  return ALL_LESSONS.map((l) => ({
    id: l.id,
    day: l.day,
    title: l.title,
    subtitle: l.subtitle,
    duration: l.duration,
    sectionCount: l.sections.length,
    exerciseCount: l.exercises.length,
    quizCount: l.quiz.length,
  }));
}

export function staticLessonPublic(id: string) {
  const l = ALL_LESSONS.find((x) => x.id === id);
  if (!l) return undefined;
  const quiz: QuizQuestionPublic[] = l.quiz.map((q) => ({
    question: q.question,
    options: q.options,
  }));
  return { ...l, quiz };
}

export function staticGradeQuiz(id: string, answers: number[]) {
  const l = ALL_LESSONS.find((x) => x.id === id);
  if (!l) return undefined;
  const results = l.quiz.map((q, i) => ({
    correct: answers[i] === q.correctIndex,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
  const score = results.filter((r) => r.correct).length;
  return { score, total: l.quiz.length, results };
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
const KEY = "pysignal-academy.v1";

export interface StoredState {
  progress: { lessonId: string; status: "in_progress" | "completed" }[];
  quizAttempts: {
    id: number;
    lessonId: string;
    score: number;
    total: number;
    answers: number[];
    createdAt: string; // ISO
  }[];
  notes: { lessonId: string; content: string; updatedAt: string }[];
  activityDates: string[]; // YYYY-MM-DD, unique
  nextId: number;
}

const EMPTY: StoredState = {
  progress: [],
  quizAttempts: [],
  notes: [],
  activityDates: [],
  nextId: 1,
};

export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      progress: parsed.progress ?? [],
      quizAttempts: parsed.quizAttempts ?? [],
      notes: parsed.notes ?? [],
      activityDates: parsed.activityDates ?? [],
      nextId: parsed.nextId ?? 1,
    };
  } catch {
    return { ...EMPTY };
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function saveState(s: StoredState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage full/unavailable — demo mode degrades gracefully
  }
  listeners.forEach((fn) => fn());
}

export function mutateState(fn: (s: StoredState) => void) {
  const s = loadState();
  fn(s);
  saveState(s);
}

// ---------------------------------------------------------------------------
// Domain operations mirroring server/db.ts helpers
// ---------------------------------------------------------------------------
export function upsertProgress(lessonId: string, status: "in_progress" | "completed") {
  mutateState((s) => {
    const row = s.progress.find((p) => p.lessonId === lessonId);
    if (row) row.status = status;
    else s.progress.push({ lessonId, status });
  });
}

export function markLessonStarted(lessonId: string) {
  mutateState((s) => {
    const row = s.progress.find((p) => p.lessonId === lessonId);
    if (!row) s.progress.push({ lessonId, status: "in_progress" });
  });
}

export function recordActivity(dateStr: string) {
  mutateState((s) => {
    if (!s.activityDates.includes(dateStr)) s.activityDates.push(dateStr);
  });
}

export function insertQuizAttempt(lessonId: string, score: number, total: number, answers: number[]) {
  mutateState((s) => {
    s.quizAttempts.unshift({
      id: s.nextId++,
      lessonId,
      score,
      total,
      answers,
      createdAt: new Date().toISOString(),
    });
  });
}

export function upsertNote(lessonId: string, content: string) {
  mutateState((s) => {
    const row = s.notes.find((n) => n.lessonId === lessonId);
    if (row) {
      row.content = content;
      row.updatedAt = new Date().toISOString();
    } else {
      s.notes.push({ lessonId, content, updatedAt: new Date().toISOString() });
    }
  });
}

export function buildSummary() {
  const s = loadState();
  const best: Record<string, { score: number; total: number; attempts: number }> = {};
  for (const a of s.quizAttempts) {
    const b = best[a.lessonId];
    if (!b) best[a.lessonId] = { score: a.score, total: a.total, attempts: 1 };
    else {
      b.attempts += 1;
      if (a.score / a.total > b.score / b.total) {
        b.score = a.score;
        b.total = a.total;
      }
    }
  }
  return {
    progress: s.progress,
    activityDates: [...s.activityDates].sort().reverse(),
    bestScores: best,
  };
}
