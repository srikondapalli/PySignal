import { describe, expect, it } from "vitest";
import { getAllLessons, getLessonMetas, getLessonPublic, gradeQuiz } from "./curriculum";

describe("curriculum content", () => {
  it("loads all 14 lessons in day order", () => {
    const lessons = getAllLessons();
    expect(lessons).toHaveLength(14);
    expect(lessons.map((l) => l.day)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it("every lesson has required structure", () => {
    for (const l of getAllLessons()) {
      expect(l.id).toMatch(/^day-\d{2}$/);
      expect(l.title.length).toBeGreaterThan(3);
      expect(l.objectives.length).toBeGreaterThanOrEqual(3);
      expect(l.sections.length).toBeGreaterThanOrEqual(5);
      expect(l.exercises.length).toBe(3);
      expect(l.quiz.length).toBe(6);
      for (const q of l.quiz) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.explanation.length).toBeGreaterThan(5);
      }
      for (const ex of l.exercises) {
        expect(ex.solution.length).toBeGreaterThan(20);
        expect(ex.hint.length).toBeGreaterThan(5);
      }
      // At least some sections carry code examples
      expect(l.sections.filter((s) => s.code).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("day-01 contains MATLAB comparisons (required by course spec)", () => {
    const d1 = getAllLessons().find((l) => l.id === "day-01")!;
    expect(d1.sections.filter((s) => s.matlabComparison).length).toBeGreaterThanOrEqual(3);
  });

  it("metas expose counts without content payload", () => {
    const metas = getLessonMetas();
    expect(metas).toHaveLength(14);
    expect(metas[0]).toHaveProperty("sectionCount");
    expect(metas[0]).not.toHaveProperty("sections");
  });

  it("public lesson strips quiz answers", () => {
    const pub = getLessonPublic("day-01")!;
    expect(pub.quiz[0]).not.toHaveProperty("correctIndex");
    expect(pub.quiz[0]).not.toHaveProperty("explanation");
    expect(pub.quiz[0].options).toHaveLength(4);
  });

  it("returns undefined for unknown lessons", () => {
    expect(getLessonPublic("day-99")).toBeUndefined();
    expect(gradeQuiz("day-99", [])).toBeUndefined();
  });
});

describe("quiz grading", () => {
  it("grades perfect and imperfect answer sets correctly", () => {
    const lesson = getAllLessons()[0];
    const perfect = lesson.quiz.map((q) => q.correctIndex);
    const g1 = gradeQuiz(lesson.id, perfect)!;
    expect(g1.score).toBe(6);
    expect(g1.total).toBe(6);
    expect(g1.results.every((r) => r.correct)).toBe(true);

    // All wrong: pick (correctIndex + 1) % 4
    const wrong = lesson.quiz.map((q) => (q.correctIndex + 1) % 4);
    const g2 = gradeQuiz(lesson.id, wrong)!;
    expect(g2.score).toBe(0);
    expect(g2.results.every((r) => !r.correct)).toBe(true);
    // Feedback includes the right answer for review
    expect(g2.results[0].correctIndex).toBe(lesson.quiz[0].correctIndex);
  });

  it("treats unanswered (-1) as incorrect", () => {
    const lesson = getAllLessons()[0];
    const g = gradeQuiz(lesson.id, lesson.quiz.map(() => -1))!;
    expect(g.score).toBe(0);
  });
});
