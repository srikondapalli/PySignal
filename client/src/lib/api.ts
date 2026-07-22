/**
 * API facade: a drop-in surface matching the tRPC hook call-sites used by the
 * app, switchable between two backends:
 *
 *  - Server mode (default): delegates to the real tRPC client + Manus auth.
 *  - Static mode (VITE_STATIC_MODE=1, GitHub Pages build): serves curriculum
 *    from bundled JSON and persists progress/quiz/notes to localStorage.
 *
 * Pages import { api, useApiUtils, useCourseAuth } from "@/lib/api" and use
 * them exactly like trpc / trpc.useUtils() / useAuth().
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import * as store from "@/lib/staticStore";

export const STATIC_MODE = import.meta.env.VITE_STATIC_MODE === "1";

// ---------------------------------------------------------------------------
// Small hook helpers for static mode
// ---------------------------------------------------------------------------

/** Re-render when the localStorage store changes. */
function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => store.subscribe(() => setV((x) => x + 1)), []);
  return v;
}

function useStaticQuery<T>(compute: () => T, deps: unknown[] = []) {
  const version = useStoreVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(compute, [version, ...deps]);
  return { data, isLoading: false as const, error: null };
}

interface MutationOpts<TInput, TOutput> {
  onSuccess?: (data: TOutput, vars: TInput) => void;
  onError?: (e: { message: string }) => void;
}

function useStaticMutation<TInput, TOutput>(
  run: (input: TInput) => TOutput,
  opts?: MutationOpts<TInput, TOutput>,
) {
  const mutate = useCallback(
    (input: TInput) => {
      try {
        const out = run(input);
        opts?.onSuccess?.(out, input);
      } catch (e) {
        opts?.onError?.({ message: e instanceof Error ? e.message : String(e) });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return { mutate, mutateAsync: async (i: TInput) => mutate(i), isPending: false as const };
}

// ---------------------------------------------------------------------------
// Static-mode implementations of every hook the app uses
// ---------------------------------------------------------------------------
const staticApi = {
  curriculum: {
    list: {
      useQuery: (_input?: undefined, _opts?: unknown) =>
        useStaticQuery(() => store.staticLessonMetas()),
    },
    lesson: {
      useQuery: (input: { id: string }, _opts?: unknown) => {
        const version = useStoreVersion();
        // Mark in_progress once per lesson visit (mirrors server behavior)
        useEffect(() => {
          if (store.staticLessonPublic(input.id)) store.markLessonStarted(input.id);
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [input.id]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const data = useMemo(() => store.staticLessonPublic(input.id), [input.id, version]);
        return {
          data,
          isLoading: false as const,
          error: data ? null : { message: "Lesson not found" },
        };
      },
    },
  },
  progress: {
    summary: {
      useQuery: (_input?: undefined, _opts?: unknown) => useStaticQuery(() => store.buildSummary()),
    },
    setStatus: {
      useMutation: (
        opts?: MutationOpts<
          { lessonId: string; status: "in_progress" | "completed"; localDate: string },
          { success: true }
        >,
      ) =>
        useStaticMutation((input) => {
          store.upsertProgress(input.lessonId, input.status);
          store.recordActivity(input.localDate);
          return { success: true } as const;
        }, opts),
    },
    ping: {
      useMutation: (opts?: MutationOpts<{ localDate: string }, { success: true }>) =>
        useStaticMutation((input) => {
          store.recordActivity(input.localDate);
          return { success: true } as const;
        }, opts),
    },
  },
  quiz: {
    submit: {
      useMutation: (
        opts?: MutationOpts<
          { lessonId: string; answers: number[]; localDate: string },
          ReturnType<typeof store.staticGradeQuiz> & object
        >,
      ) =>
        useStaticMutation((input) => {
          const graded = store.staticGradeQuiz(input.lessonId, input.answers);
          if (!graded) throw new Error("Lesson not found");
          store.insertQuizAttempt(input.lessonId, graded.score, graded.total, input.answers);
          store.recordActivity(input.localDate);
          return graded;
        }, opts),
    },
    history: {
      useQuery: (input: { lessonId: string }, _opts?: unknown) =>
        useStaticQuery(
          () =>
            store
              .loadState()
              .quizAttempts.filter((a) => a.lessonId === input.lessonId)
              .map((a) => ({ ...a, createdAt: new Date(a.createdAt) })),
          [input.lessonId],
        ),
    },
  },
  notes: {
    get: {
      useQuery: (input: { lessonId: string }, _opts?: unknown) =>
        useStaticQuery(
          () => store.loadState().notes.find((n) => n.lessonId === input.lessonId) ?? null,
          [input.lessonId],
        ),
    },
    list: {
      useQuery: (_input?: undefined, _opts?: unknown) =>
        useStaticQuery(() =>
          [...store.loadState().notes]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((n) => ({ ...n, updatedAt: new Date(n.updatedAt) })),
        ),
    },
    save: {
      useMutation: (opts?: MutationOpts<{ lessonId: string; content: string }, { success: true }>) =>
        useStaticMutation((input) => {
          store.upsertNote(input.lessonId, input.content);
          return { success: true } as const;
        }, opts),
    },
  },
};

/** No-op invalidations in static mode: the store subscription re-renders consumers. */
const staticUtils = {
  curriculum: { list: { invalidate: async () => {} }, lesson: { invalidate: async () => {} } },
  progress: { summary: { invalidate: async () => {} } },
  quiz: { history: { invalidate: async (_i?: unknown) => {} } },
  notes: {
    get: { invalidate: async (_i?: unknown) => {} },
    list: { invalidate: async () => {} },
  },
};

// ---------------------------------------------------------------------------
// Public facade
// ---------------------------------------------------------------------------

// The static implementation intentionally mirrors the tRPC hook surface at
// every call-site the app uses. Typing the facade as the tRPC client keeps
// full inference in pages; the static object structurally satisfies those
// call sites (verified by the shared test suite + static build).
export const api = (STATIC_MODE ? (staticApi as unknown as typeof trpc) : trpc);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useApiUtils(): any {
  // Hooks must not be called conditionally across renders — STATIC_MODE is a
  // build-time constant, so each bundle takes exactly one branch forever.
  if (STATIC_MODE) return staticUtils;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return trpc.useUtils();
}

const GUEST_USER = {
  id: 0,
  name: "Guest Engineer",
  email: null as string | null,
  role: "user" as const,
};

/** Auth facade: real Manus auth on the server build, local guest in static mode. */
export function useCourseAuth() {
  if (STATIC_MODE) {
    return {
      user: GUEST_USER,
      loading: false as const,
      error: null,
      isAuthenticated: true as const,
      logout: async () => {},
    };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth();
}
