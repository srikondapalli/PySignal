import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tracks per-user progress on each lesson (day 1-14).
 * status: not_started (implicit by absence), in_progress, completed
 */
export const lessonProgress = mysqlTable(
  "lesson_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    lessonId: varchar("lessonId", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["in_progress", "completed"]).notNull().default("in_progress"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("user_lesson_idx").on(t.userId, t.lessonId)],
);

export type LessonProgress = typeof lessonProgress.$inferSelect;

/**
 * Every quiz attempt is recorded (supports retakes & history).
 */
export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: varchar("lessonId", { length: 32 }).notNull(),
  score: int("score").notNull(),
  total: int("total").notNull(),
  answers: text("answers"), // JSON array of selected option indices
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;

/**
 * Notes: per-lesson notes (lessonId set) and general notebook (lessonId = "general").
 */
export const notes = mysqlTable(
  "notes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    lessonId: varchar("lessonId", { length: 32 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("user_note_idx").on(t.userId, t.lessonId)],
);

export type Note = typeof notes.$inferSelect;

/**
 * Activity log used for daily streak calculation.
 * One row per user per day (date stored as YYYY-MM-DD string in user-agnostic UTC).
 */
export const activityLog = mysqlTable(
  "activity_log",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    activityDate: varchar("activityDate", { length: 10 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_day_idx").on(t.userId, t.activityDate)],
);

export type ActivityLog = typeof activityLog.$inferSelect;
