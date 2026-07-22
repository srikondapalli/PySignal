import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { STATIC_MODE, useCourseAuth as useAuth } from "@/lib/api";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Lesson from "./pages/Lesson";
import Notebook from "./pages/Notebook";
import CheatSheet from "./pages/CheatSheet";

/** Wraps authenticated routes: shows a sign-in prompt when logged out. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Radio className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display mb-1.5 text-2xl font-semibold tracking-tight">
            Sign in to continue
          </h1>
          <p className="max-w-sm text-[14px] text-muted-foreground">
            Your lessons, notes, quiz scores, and streak are saved to your account.
          </p>
        </div>
        <Button onClick={() => startLogin()} className="h-10 px-6">
          Sign in
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route path={"/lesson/:id"}>
        <RequireAuth>
          <Lesson />
        </RequireAuth>
      </Route>
      <Route path={"/notebook"}>
        <RequireAuth>
          <Notebook />
        </RequireAuth>
      </Route>
      {/* Cheat sheet is globally accessible, even logged out */}
      <Route path={"/cheatsheet"} component={CheatSheet} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * In the static GitHub Pages build there is no server-side SPA fallback, so
 * we route with the URL hash (e.g. /#/lesson/day-01) — deep links always
 * resolve to index.html. The full-stack build keeps clean paths.
 */
function AppRouter() {
  if (STATIC_MODE) {
    return (
      <WouterRouter hook={useHashLocation}>
        <Router />
      </WouterRouter>
    );
  }
  return <Router />;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
