import { useMemo, useState } from "react";
import { BookMarked, Search } from "lucide-react";
import { CourseLayout } from "@/components/CourseLayout";
import { Input } from "@/components/ui/input";
import { CHEAT_SHEET } from "@shared/cheatsheet";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * MATLAB → Python cheat sheet. Globally accessible (topbar + sidebar links).
 * Works for both authenticated (inside CourseLayout) and public visitors.
 */
export default function CheatSheet() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHEAT_SHEET;
    return CHEAT_SHEET.map((cat) => ({
      ...cat,
      rows: cat.rows.filter(
        (r) =>
          r.matlab.toLowerCase().includes(q) ||
          r.python.toLowerCase().includes(q) ||
          (r.note ?? "").toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.rows.length > 0);
  }, [query]);

  const body = (
    <div className="container max-w-5xl py-8 lg:py-10">
      <div className="mb-7">
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-gold">
          <BookMarked className="h-4 w-4" />
          Quick reference
        </div>
        <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">
          MATLAB → Python Cheat Sheet
        </h1>
        <p className="max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
          Every idiom a signal processing engineer reaches for, translated. Keep this open in a
          second tab while you work through the lessons.
        </p>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search e.g. fft, filter, transpose, awgn…"
          className="bg-card pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          No entries match "{query}".
        </div>
      )}

      <div className="grid gap-8">
        {filtered.map((cat) => (
          <section key={cat.id}>
            <h2 className="font-display mb-1 text-xl font-semibold tracking-tight">{cat.title}</h2>
            <p className="mb-3.5 text-[13px] text-muted-foreground">{cat.description}</p>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-left">
                    <th className="w-[35%] px-4 py-2.5 font-semibold text-orange-600 dark:text-orange-400">
                      MATLAB
                    </th>
                    <th className="w-[40%] px-4 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      Python
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.rows.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-2.5 align-top font-mono text-[12px]">{r.matlab}</td>
                      <td className="px-4 py-2.5 align-top font-mono text-[12px]">{r.python}</td>
                      <td className="px-4 py-2.5 align-top text-[12px] text-muted-foreground">
                        {r.note ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background">{body}</div>;
  }
  return <CourseLayout>{body}</CourseLayout>;
}
