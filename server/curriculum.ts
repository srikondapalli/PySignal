/**
 * Loads the 14 lesson JSON files from shared/lessons at startup and caches them.
 * Content is static course material bundled with the app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Lesson, LessonMeta, QuizQuestionPublic } from "../shared/lessonTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Works in dev (server/ -> ../shared/lessons) and prod build (dist/ -> resolve from cwd)
function lessonsDir(): string {
  const candidates = [
    path.resolve(__dirname, "../shared/lessons"),
    path.resolve(process.cwd(), "shared/lessons"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("lessons directory not found");
}

let cache: Lesson[] | null = null;

export function getAllLessons(): Lesson[] {
  if (!cache) {
    const dir = lessonsDir();
    cache = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Lesson)
      .sort((a, b) => a.day - b.day);
  }
  return cache;
}

export function getLesson(id: string): Lesson | undefined {
  return getAllLessons().find((l) => l.id === id);
}

export function getLessonMetas(): LessonMeta[] {
  return getAllLessons().map((l) => ({
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

/** Lesson payload with quiz answers stripped — used for the lesson page. */
export function getLessonPublic(id: string) {
  const l = getLesson(id);
  if (!l) return undefined;
  const quiz: QuizQuestionPublic[] = l.quiz.map((q) => ({
    question: q.question,
    options: q.options,
  }));
  return { ...l, quiz };
}

/** Grade a set of answers server-side. answers[i] = selected option index or -1. */
export function gradeQuiz(id: string, answers: number[]) {
  const l = getLesson(id);
  if (!l) return undefined;
  const results = l.quiz.map((q, i) => ({
    correct: answers[i] === q.correctIndex,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
  const score = results.filter((r) => r.correct).length;
  return { score, total: l.quiz.length, results };
}
