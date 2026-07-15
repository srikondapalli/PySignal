/** Shared types describing the curriculum content shape. */
export interface LessonSection {
  heading: string;
  content: string;
  code: string | null;
  codeTitle: string | null;
  matlabComparison: string | null;
}

export interface LessonExercise {
  title: string;
  prompt: string;
  hint: string;
  solution: string;
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Quiz question with the answer stripped (sent to client before submission). */
export interface QuizQuestionPublic {
  question: string;
  options: string[];
}

export interface Lesson {
  id: string;
  day: number;
  title: string;
  subtitle: string;
  duration: string;
  objectives: string[];
  sections: LessonSection[];
  exercises: LessonExercise[];
  quiz: QuizQuestion[];
}

/** Lightweight lesson metadata for the curriculum tree / sidebar. */
export interface LessonMeta {
  id: string;
  day: number;
  title: string;
  subtitle: string;
  duration: string;
  sectionCount: number;
  exerciseCount: number;
  quizCount: number;
}

/** Week groupings for the sidebar tree. */
export const WEEKS = [
  { label: "Week 1 — Python & DSP Foundations", days: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Week 2 — Wireless System Design", days: [8, 9, 10, 11, 12, 13, 14] },
] as const;
