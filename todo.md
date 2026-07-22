# PySignal Academy — Project TODO

## Setup & Schema
- [x] Database schema: lessons progress, quiz attempts, notes tables
- [x] Design system: premium typography, color palette, global CSS theme

## Curriculum Content (14 days)
- [x] Day 1: Python basics for MATLAB users (MATLAB-to-Python comparisons)
- [x] Day 2: NumPy fundamentals (arrays, broadcasting, vectorization)
- [x] Day 3: Matplotlib & SciPy fundamentals (plotting, signal toolbox)
- [x] Day 4: FFT and spectral analysis
- [x] Day 5: Digital filtering (FIR and IIR)
- [x] Day 6: Digital modulation (BPSK, QPSK, QAM)
- [x] Day 7: Pulse shaping and matched filtering
- [x] Day 8: Channel modeling (AWGN, Rayleigh/Rician fading, multipath)
- [x] Day 9: Synchronization (timing and frequency recovery)
- [x] Day 10: OFDM systems
- [x] Day 11: RF front-end impairments (phase noise, IQ imbalance, PA nonlinearity, CFO)
- [x] Day 12: Link budget analysis
- [x] Day 13: MIMO systems
- [x] Day 14: WLAN packet decoder capstone project
- [x] Each lesson: theory + annotated code examples + exercises with solutions + quiz
- [x] MATLAB-to-Python cheat sheet content

## Backend
- [x] Curriculum data served via API (lessons list, lesson detail)
- [x] Progress API: mark lesson complete, get progress summary
- [x] Quiz API: submit attempt, record score, retake support, best score
- [x] Notes API: per-lesson notes + general notebook (per-user)
- [x] Streak calculation from activity dates (computed client-side in courseUtils.ts using the browser's local timezone; server stores YYYY-MM-DD activity dates — intentional design so streaks respect the learner's timezone)
- [x] Vitest coverage for progress, quiz, and notes procedures

## Frontend
- [x] Landing page (public) with course overview and login CTA
- [x] Sidebar navigation: 14-day curriculum tree with lesson status (locked/in-progress/completed)
- [x] Lesson page: theory, code examples, exercises w/ reveal solutions, quiz tabs
- [x] Syntax-highlighted code blocks with copy-to-clipboard buttons
- [x] Quiz engine UI: multiple choice, scoring, retake button, past attempts
- [x] Progress dashboard: completed lessons, quiz scores, daily streak, 14-day completion %
- [x] Per-lesson notes panel + general notebook page
- [x] Cheat sheet page accessible from every lesson (global nav link)
- [x] Auth flow: login/logout, protected routes
- [x] Elegant visual polish: typography, spacing, micro-interactions, empty states

## Verification
- [x] Run pnpm test (vitest) passing (17 tests, 3 files)
- [x] Screenshot verification of all key pages (desktop + mobile)
- [x] Checkpoint saved

## GitHub Pages static demo + README (new request)
- [x] Static demo mode: env-flag build that skips auth and uses localStorage for progress/quiz/notes
- [x] Static data layer: curriculum JSON bundled into the client build (no tRPC server needed)
- [x] Vite static build config with correct base path for GitHub Pages (/PySignal/)
- [x] SPA routing fallback for Pages (hash routing via wouter useHashLocation)
- [x] GitHub Actions workflow to build and deploy to Pages on push
- [x] Comprehensive README.md (project overview, curriculum table, architecture, local dev, Pages hosting)
- [x] Push all changes to github.com/srikondapalli/PySignal
- [x] Verify Pages build succeeds and site works (live at https://srikondapalli.github.io/PySignal/)
