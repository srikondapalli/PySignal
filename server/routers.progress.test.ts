import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getProgressForUser: vi.fn(),
    getActivityDates: vi.fn(),
    getQuizAttemptsForUser: vi.fn(),
    upsertProgress: vi.fn(),
    recordActivity: vi.fn(),
    markLessonStarted: vi.fn(),
    insertQuizAttempt: vi.fn(),
    getNote: vi.fn(),
    getAllNotes: vi.fn(),
    upsertNote: vi.fn(),
  };
});

function ctx(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "test-user",
      email: "t@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => vi.clearAllMocks());

describe("progress router", () => {
  it("summary aggregates best quiz scores per lesson", async () => {
    vi.mocked(db.getProgressForUser).mockResolvedValue([
      { id: 1, userId: 7, lessonId: "day-01", status: "completed", startedAt: new Date(), completedAt: new Date(), updatedAt: new Date() },
    ] as never);
    vi.mocked(db.getActivityDates).mockResolvedValue(["2026-07-15", "2026-07-14"]);
    vi.mocked(db.getQuizAttemptsForUser).mockResolvedValue([
      { id: 1, userId: 7, lessonId: "day-01", score: 4, total: 6, answers: "[]", createdAt: new Date() },
      { id: 2, userId: 7, lessonId: "day-01", score: 6, total: 6, answers: "[]", createdAt: new Date() },
    ] as never);

    const caller = appRouter.createCaller(ctx());
    const s = await caller.progress.summary();
    expect(s.bestScores["day-01"]).toEqual({ score: 6, total: 6, attempts: 2 });
    expect(s.activityDates).toHaveLength(2);
    expect(s.progress).toHaveLength(1);
  });

  it("setStatus records completion and activity", async () => {
    const caller = appRouter.createCaller(ctx());
    const r = await caller.progress.setStatus({
      lessonId: "day-03",
      status: "completed",
      localDate: "2026-07-15",
    });
    expect(r.success).toBe(true);
    expect(db.upsertProgress).toHaveBeenCalledWith(7, "day-03", "completed");
    expect(db.recordActivity).toHaveBeenCalledWith(7, "2026-07-15");
  });

  it("rejects malformed lesson ids", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(
      caller.progress.setStatus({ lessonId: "lesson-1; DROP TABLE", status: "completed", localDate: "2026-07-15" } as never),
    ).rejects.toThrow();
  });
});

describe("quiz router", () => {
  it("submit grades server-side and persists the attempt", async () => {
    const caller = appRouter.createCaller(ctx());
    const r = await caller.quiz.submit({
      lessonId: "day-01",
      answers: [-1, -1, -1, -1, -1, -1],
      localDate: "2026-07-15",
    });
    expect(r.total).toBe(6);
    expect(r.score).toBe(0);
    expect(db.insertQuizAttempt).toHaveBeenCalledWith(7, "day-01", 0, 6, [-1, -1, -1, -1, -1, -1]);
    expect(db.recordActivity).toHaveBeenCalled();
  });
});

describe("notes router", () => {
  it("saves per-lesson and general notes", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.notes.save({ lessonId: "day-02", content: "IQ noise: N0/2 per dimension" });
    expect(db.upsertNote).toHaveBeenCalledWith(7, "day-02", "IQ noise: N0/2 per dimension");
    await caller.notes.save({ lessonId: "general", content: "venv setup: python3 -m venv .venv" });
    expect(db.upsertNote).toHaveBeenCalledWith(7, "general", "venv setup: python3 -m venv .venv");
  });

  it("rejects invalid note scopes", async () => {
    const caller = appRouter.createCaller(ctx());
    await expect(caller.notes.save({ lessonId: "random-key", content: "x" } as never)).rejects.toThrow();
  });
});

describe("curriculum router", () => {
  it("lesson marks started and strips answers", async () => {
    const caller = appRouter.createCaller(ctx());
    const lesson = await caller.curriculum.lesson({ id: "day-01" });
    expect(db.markLessonStarted).toHaveBeenCalledWith(7, "day-01");
    expect((lesson.quiz[0] as Record<string, unknown>).correctIndex).toBeUndefined();
  });

  it("list is public and returns 14 metas", async () => {
    const anonCtx = { ...ctx(), user: null } as unknown as TrpcContext;
    const caller = appRouter.createCaller(anonCtx);
    const metas = await caller.curriculum.list();
    expect(metas).toHaveLength(14);
  });
});

