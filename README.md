# PySignal Academy

**A 14-day intensive training platform for MATLAB engineers mastering Python-based signal processing and wireless system design.**

PySignal Academy is a structured, self-paced course that takes an engineer fluent in MATLAB from Python fundamentals to building a working WLAN (802.11a/g OFDM) packet decoder in two weeks. Every lesson pairs theory with annotated, copy-ready Python code built on NumPy, SciPy, and Matplotlib, and reinforces the material with hands-on exercises, worked solutions, and quizzes.

---

## The 14-Day Curriculum

| Day | Lesson | Focus |
|----:|--------|-------|
| 1 | Python Essentials for MATLAB Users | Environments, 0-based indexing, data types, functions, f-strings — with side-by-side MATLAB comparisons |
| 2 | NumPy Fundamentals | ndarrays, vectorization, broadcasting, complex numbers for IQ data |
| 3 | Matplotlib & SciPy for Signal Engineers | Publication-quality plots, `scipy.signal` tour, spectrograms |
| 4 | FFT & Spectral Analysis | DFT/FFT, windowing, leakage, PSD estimation (Welch), spectrograms |
| 5 | Digital Filtering | FIR/IIR design, `firwin`, `iirdesign`, zero-phase filtering, filter analysis |
| 6 | Digital Modulation | BPSK, QPSK, M-QAM, constellation diagrams, symbol mapping, BER vs. Eb/N0 |
| 7 | Pulse Shaping & Matched Filtering | Raised cosine / RRC, ISI, eye diagrams, matched filter SNR gain |
| 8 | Channel Modeling | AWGN, Rayleigh and Rician fading, multipath, Jakes Doppler model |
| 9 | Synchronization | Timing recovery (Gardner), carrier/CFO estimation and correction |
| 10 | OFDM Systems | Cyclic prefix, subcarrier mapping, channel estimation and equalization |
| 11 | RF Front-End Impairments | Phase noise, IQ imbalance, PA nonlinearity (AM/AM, AM/PM), CFO |
| 12 | Link Budget Analysis | Path loss models, noise figure, sensitivity, fade margins, end-to-end budgets |
| 13 | MIMO Systems | Channel capacity, spatial multiplexing, Alamouti STBC, ZF/MMSE detection |
| 14 | Capstone: WLAN Packet Decoder | Full 802.11a/g OFDM receiver: detection, sync, channel estimation, demapping, de-interleaving |

Each lesson contains a theory walkthrough (7–8 sections), annotated Python code examples with copy-to-clipboard, collapsible **"Compare with MATLAB"** panels, three exercises with hints and worked solutions, and a six-question quiz with explanations and unlimited retakes.

## Platform Features

- **Progress tracking** — lesson completion, daily streak, quiz best scores, and overall course percentage on a dashboard; each day unlocks after the previous one is completed.
- **Note-taking** — a per-lesson notes panel (autosaves as you type) plus a general course notebook.
- **Quiz engine** — multiple-choice quizzes graded instantly, with attempt history and retakes.
- **MATLAB → Python cheat sheet** — a searchable reference of equivalent syntax and idioms, reachable from every page.
- **Refined reading experience** — Fraunces/Inter/JetBrains Mono typography, syntax-highlighted code, responsive layout with a curriculum sidebar.

## Two Ways to Run It

This repository supports two build targets from the same codebase:

### 1. Full-stack app (primary)

The complete experience: OAuth sign-in, a MySQL database, and a tRPC API so progress, quiz history, and notes persist per user across devices.

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, wouter, Vite 7 |
| API | tRPC 11 + Express 4 (end-to-end typed, superjson) |
| Database | MySQL via Drizzle ORM (`drizzle/schema.ts`) |
| Auth | Manus OAuth (session cookie, `protectedProcedure`) |
| Tests | Vitest (`server/*.test.ts`) |

The full-stack build is designed to run on the Manus platform, which provides the OAuth service, managed database, and hosting. Running it elsewhere requires supplying equivalents for the environment variables listed in `server/_core/env.ts` (database URL, OAuth endpoints, JWT secret) — see [Development](#development) below.

### 2. Static demo (GitHub Pages)

A zero-backend build of the same site. The entire curriculum, quizzes, and cheat sheet are bundled into the static assets, and your progress, quiz attempts, and notes are stored in the browser's **localStorage** instead of a server. No sign-in required — everything works, but data lives only in the browser you use it in.

```bash
pnpm build:pages     # outputs the static site to dist-pages/
```

The static build (`vite.pages.config.ts`) sets `VITE_STATIC_MODE=1`, which makes `client/src/lib/api.ts` swap the tRPC-backed hooks for localStorage-backed implementations, and switches the router to hash-based URLs (`/#/lesson/day-01`) so deep links work on Pages without server-side rewrites.

## Hosting on GitHub Pages

Deployment is automated with GitHub Actions (`.github/workflows/deploy-pages.yml`). One-time setup:

1. In this repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

The site will be published at:

```
https://<your-username>.github.io/PySignal/
```

> **Note** — the workflow builds with base path `/PySignal/`. If you rename the repository, set the `VITE_PAGES_BASE` environment variable in the workflow (e.g. `/NewName/`), or `/` if you attach a custom domain.

## Development

Prerequisites: Node.js 22+, [pnpm](https://pnpm.io) 10+.

```bash
pnpm install

# Full-stack dev server (requires DATABASE_URL and OAuth env vars)
pnpm dev

# Static demo build + local preview (no env vars needed)
pnpm build:pages
npx serve dist-pages        # or any static file server

# Type checking and tests
pnpm check
pnpm test
```

## Project Structure

```
client/
  src/
    pages/            # Home, Dashboard, Lesson, Notebook, CheatSheet
    components/       # CourseLayout (sidebar shell), CodeBlock, MarkdownText, shadcn/ui
    lib/
      api.ts          # Facade: tRPC hooks (server) vs localStorage hooks (static)
      staticStore.ts  # Static-mode data layer (bundled lessons + localStorage)
      courseUtils.ts  # Lesson unlock policy, streak computation
shared/
  lessons/            # The 14 lesson JSON files (theory, code, exercises, quizzes)
  lessonTypes.ts      # Curriculum content types
  cheatsheet.ts       # MATLAB → Python cheat sheet data
server/
  routers.ts          # tRPC procedures (curriculum, progress, quiz, notes)
  curriculum.ts       # Lesson loading + quiz grading
  db.ts               # Drizzle query helpers
  *.test.ts           # Vitest suites (17 tests)
drizzle/
  schema.ts           # users, lesson_progress, quiz_attempts, notes, activity_log
.github/workflows/
  deploy-pages.yml    # GitHub Pages CI/CD for the static demo
vite.config.ts        # Full-stack build
vite.pages.config.ts  # Static demo build (VITE_STATIC_MODE=1, base /PySignal/)
```

### How lesson content works

All course material lives in `shared/lessons/day-01.json` … `day-14.json` as structured data (sections, code examples, MATLAB comparisons, exercises, quiz questions). The full-stack server reads them at startup and strips quiz answers before sending lessons to the client; the static build bundles them directly and grades quizzes client-side. To edit or extend the curriculum, edit the JSON files — both builds pick up the changes automatically.

## License

MIT — see [`package.json`](package.json). Course content and code examples may be freely reused for personal learning.

---

*Built with [Manus](https://manus.im).*
