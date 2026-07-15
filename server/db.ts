import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, lessonProgress, quizAttempts, notes, activityLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Lesson progress
// ---------------------------------------------------------------------------

export async function getProgressForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
}

export async function upsertProgress(userId: number, lessonId: string, status: "in_progress" | "completed") {
  const db = await getDb();
  if (!db) return;
  const completedAt = status === "completed" ? new Date() : null;
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, status, completedAt })
    .onDuplicateKeyUpdate({
      set: status === "completed" ? { status, completedAt } : { status },
    });
}

/** Never downgrade: only sets in_progress if no row exists yet. */
export async function markLessonStarted(userId: number, lessonId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, status: "in_progress" })
    .onDuplicateKeyUpdate({ set: { updatedAt: sql`CURRENT_TIMESTAMP` } });
}

// ---------------------------------------------------------------------------
// Quiz attempts
// ---------------------------------------------------------------------------

export async function insertQuizAttempt(userId: number, lessonId: string, score: number, total: number, answers: number[]) {
  const db = await getDb();
  if (!db) return;
  await db.insert(quizAttempts).values({ userId, lessonId, score, total, answers: JSON.stringify(answers) });
}

export async function getQuizAttemptsForUser(userId: number, lessonId?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = lessonId
    ? and(eq(quizAttempts.userId, userId), eq(quizAttempts.lessonId, lessonId))
    : eq(quizAttempts.userId, userId);
  return db.select().from(quizAttempts).where(where).orderBy(desc(quizAttempts.createdAt));
}

// ---------------------------------------------------------------------------
// Notes (per-lesson + "general" notebook)
// ---------------------------------------------------------------------------

export async function getNote(userId: number, lessonId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
    .limit(1);
  return rows[0];
}

export async function getAllNotes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

export async function upsertNote(userId: number, lessonId: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(notes)
    .values({ userId, lessonId, content })
    .onDuplicateKeyUpdate({ set: { content } });
}

// ---------------------------------------------------------------------------
// Activity log / streak
// ---------------------------------------------------------------------------

/** Record activity for streaks. dateStr = YYYY-MM-DD in the user's local day (client-provided). */
export async function recordActivity(userId: number, dateStr: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(activityLog)
    .values({ userId, activityDate: dateStr })
    .onDuplicateKeyUpdate({ set: { userId } }); // no-op update on duplicate day
}

export async function getActivityDates(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ d: activityLog.activityDate })
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.activityDate));
  return rows.map((r) => r.d);
}
