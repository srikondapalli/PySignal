import type { LessonMeta } from "@shared/lessonTypes";

/** Today's date in the browser's local timezone as YYYY-MM-DD. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export interface ProgressRow {
  lessonId: string;
  status: "in_progress" | "completed";
}

/**
 * Compute each lesson's display status.
 * Unlock policy: a lesson is available if it's day 1, or any earlier lesson is
 * completed/in-progress up to the next sequential day. We use a gentle policy:
 * the first not-completed day after the last completed day is available; days
 * beyond that are locked. Lessons with explicit progress rows keep their state.
 */
export function computeStatuses(
  metas: LessonMeta[],
  progress: ProgressRow[],
): Record<string, LessonStatus> {
  const byId: Record<string, "in_progress" | "completed"> = {};
  for (const p of progress) byId[p.lessonId] = p.status;

  const sorted = [...metas].sort((a, b) => a.day - b.day);
  const out: Record<string, LessonStatus> = {};
  // Highest completed day
  let highestCompleted = 0;
  for (const m of sorted) {
    if (byId[m.id] === "completed") highestCompleted = Math.max(highestCompleted, m.day);
  }
  const unlockThrough = highestCompleted + 1; // next day unlocked

  for (const m of sorted) {
    const explicit = byId[m.id];
    if (explicit === "completed") out[m.id] = "completed";
    else if (explicit === "in_progress") out[m.id] = "in_progress";
    else if (m.day <= unlockThrough) out[m.id] = "available";
    else out[m.id] = "locked";
  }
  return out;
}

/** Current daily streak given activity dates (YYYY-MM-DD, any order). */
export function computeStreak(dates: string[], today: string = localDateStr()): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  // Streak counts back from today, or from yesterday if today has no activity yet.
  const start = new Date(today + "T00:00:00");
  let cursor = new Date(start);
  if (!set.has(localDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(localDateStr(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(localDateStr(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

