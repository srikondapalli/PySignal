import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getLessonMetas, getLessonPublic, gradeQuiz } from "./curriculum";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  curriculum: router({
    /** Lightweight metadata for the sidebar tree — public so the landing page can show it. */
    list: publicProcedure.query(() => getLessonMetas()),

    /** Full lesson content (quiz answers stripped). Requires login. */
    lesson: protectedProcedure
      .input(z.object({ id: z.string().regex(/^day-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const lesson = getLessonPublic(input.id);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
        // Opening a lesson marks it in_progress (never downgrades completed status)
        await db.markLessonStarted(ctx.user.id, input.id);
        return lesson;
      }),
  }),

  progress: router({
    /** All progress rows + activity dates + quiz best scores for the dashboard/sidebar. */
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [rows, activityDates, attempts] = await Promise.all([
        db.getProgressForUser(ctx.user.id),
        db.getActivityDates(ctx.user.id),
        db.getQuizAttemptsForUser(ctx.user.id),
      ]);
      // Best score per lesson
      const best: Record<string, { score: number; total: number; attempts: number }> = {};
      for (const a of attempts) {
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
      return { progress: rows, activityDates, bestScores: best };
    }),

    /** Mark a lesson complete (or re-open it). Also records activity for the streak. */
    setStatus: protectedProcedure
      .input(
        z.object({
          lessonId: z.string().regex(/^day-\d{2}$/),
          status: z.enum(["in_progress", "completed"]),
          localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertProgress(ctx.user.id, input.lessonId, input.status);
        await db.recordActivity(ctx.user.id, input.localDate);
        return { success: true } as const;
      }),

    /** Record daily activity (called when user opens a lesson). */
    ping: protectedProcedure
      .input(z.object({ localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(async ({ ctx, input }) => {
        await db.recordActivity(ctx.user.id, input.localDate);
        return { success: true } as const;
      }),
  }),

  quiz: router({
    /** Grade answers server-side, record the attempt, return per-question feedback. */
    submit: protectedProcedure
      .input(
        z.object({
          lessonId: z.string().regex(/^day-\d{2}$/),
          answers: z.array(z.number().int().min(-1).max(3)).max(20),
          localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const graded = gradeQuiz(input.lessonId, input.answers);
        if (!graded) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
        await db.insertQuizAttempt(ctx.user.id, input.lessonId, graded.score, graded.total, input.answers);
        await db.recordActivity(ctx.user.id, input.localDate);
        return graded;
      }),

    /** Attempt history for one lesson (newest first). */
    history: protectedProcedure
      .input(z.object({ lessonId: z.string().regex(/^day-\d{2}$/) }))
      .query(({ ctx, input }) => db.getQuizAttemptsForUser(ctx.user.id, input.lessonId)),
  }),

  notes: router({
    /** Get a single note. lessonId "general" = the general notebook. */
    get: protectedProcedure
      .input(z.object({ lessonId: z.string().regex(/^(day-\d{2}|general)$/) }))
      .query(async ({ ctx, input }) => (await db.getNote(ctx.user.id, input.lessonId)) ?? null),

    /** All notes for the notebook page. */
    list: protectedProcedure.query(({ ctx }) => db.getAllNotes(ctx.user.id)),

    /** Create/replace a note's content. */
    save: protectedProcedure
      .input(
        z.object({
          lessonId: z.string().regex(/^(day-\d{2}|general)$/),
          content: z.string().max(65000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertNote(ctx.user.id, input.lessonId, input.content);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
