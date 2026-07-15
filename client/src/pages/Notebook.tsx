import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, NotebookPen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CourseLayout } from "@/components/CourseLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownText } from "@/components/MarkdownText";

/**
 * The Notebook page: a general (course-wide) notebook plus an index of all
 * per-lesson notes the user has written.
 */
export default function Notebook() {
  const utils = trpc.useUtils();
  const { data: metas } = trpc.curriculum.list.useQuery(undefined, { staleTime: Infinity });
  const { data: allNotes, isLoading } = trpc.notes.list.useQuery();
  const { data: general, isLoading: generalLoading } = trpc.notes.get.useQuery({
    lessonId: "general",
  });

  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!generalLoading && !loadedRef.current) {
      setText(general?.content ?? "");
      loadedRef.current = true;
    }
  }, [generalLoading, general]);

  const save = trpc.notes.save.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.notes.get.invalidate({ lessonId: "general" });
      utils.notes.list.invalidate();
    },
  });

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save.mutate({ lessonId: "general", content: text }), 1200);
    return () => clearTimeout(t);
  }, [text, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const lessonNotes = useMemo(
    () => (allNotes ?? []).filter((n) => n.lessonId !== "general" && n.content.trim().length > 0),
    [allNotes],
  );
  const titleFor = (lessonId: string) => {
    const m = (metas ?? []).find((x) => x.id === lessonId);
    return m ? `Day ${m.day} — ${m.title}` : lessonId;
  };

  return (
    <CourseLayout>
      <div className="container max-w-4xl py-8 lg:py-10">
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-gold">
            <NotebookPen className="h-4 w-4" />
            Your engineering notebook
          </div>
          <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">Notebook</h1>
          <p className="max-w-2xl text-[14.5px] text-muted-foreground">
            A general notebook for course-wide insights, plus everything you've captured inside
            individual lessons.
          </p>
        </div>

        {/* General notebook */}
        <div className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">General notes</h2>
            <span className="text-[11.5px] text-muted-foreground">
              {save.isPending ? "Saving…" : dirty ? "Unsaved changes" : "Saved automatically"}
            </span>
          </div>
          {generalLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
              placeholder="Cross-lesson insights, environment setup commands, useful snippets, project ideas…"
              className="min-h-[220px] resize-y font-mono text-[13px] leading-relaxed"
            />
          )}
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-card text-xs"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ lessonId: "general", content: text })}>
              Save now
            </Button>
          </div>
        </div>

        {/* Per-lesson notes index */}
        <h2 className="font-display mb-4 text-lg font-semibold tracking-tight">
          Lesson notes ({lessonNotes.length})
        </h2>
        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : lessonNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <p className="mb-1 text-[14px] font-medium">No lesson notes yet</p>
            <p className="text-[13px] text-muted-foreground">
              Open any lesson and click "My notes" to start capturing insights.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {lessonNotes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <Link
                    href={`/lesson/${n.lessonId}`}
                    className="group flex items-center gap-1.5 text-[13.5px] font-semibold hover:text-gold">
                    {titleFor(n.lessonId)}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(n.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="max-h-44 overflow-hidden">
                  <MarkdownText className="!text-[13px]">{n.content}</MarkdownText>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CourseLayout>
  );
}
