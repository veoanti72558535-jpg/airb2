import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, AuthLocaleBridge } from "@/lib/i18n";
import { ThemeProvider, AuthThemeBridge } from "@/lib/theme";
import { A11yProvider } from "@/lib/a11y";
import { AuthProvider } from "@/lib/auth-context";
import { warnIfNotConfigured } from "@/lib/supabase-check";
import AuthPage from "@/pages/AuthPage";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import { PerfMonitorProvider } from "@/lib/perf-monitor";
import { PerfOverlay } from "@/components/devtools/PerfOverlay";

// ── Lazy-loaded pages (F1 — code splitting) ──────────────────────────────
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const QuickCalc = lazy(() => import("@/pages/QuickCalc"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const AirgunDetailPage = lazy(() => import("@/pages/AirgunDetailPage"));
const ProjectileDetailPage = lazy(() => import("@/pages/ProjectileDetailPage"));
const OpticDetailPage = lazy(() => import("@/pages/OpticDetailPage"));
const ReticlesPage = lazy(() => import("@/pages/ReticlesPage"));
const ReticleDetailPage = lazy(() => import("@/pages/ReticleDetailPage"));
const SessionsPage = lazy(() => import("@/pages/SessionsPage"));
const SessionDetailPage = lazy(() => import("@/pages/SessionDetailPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const ConversionsPage = lazy(() => import("@/pages/ConversionsPage"));
const DocsPage = lazy(() => import("@/pages/DocsPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminAiPage = lazy(() => import("@/pages/AdminAiPage"));
const AdminAiSimulationPage = lazy(() => import("@/pages/AdminAiSimulationPage"));
import { RequireAdmin } from "@/components/auth/RequireAdmin";
const CrossValidationPage = lazy(() => import("@/pages/CrossValidationPage"));
const ChronoPage = lazy(() => import("@/pages/ChronoPage"));
const TargetAnalysisPage = lazy(() => import("@/pages/TargetAnalysisPage"));
// CompetitionPrepPage merged into FieldTargetCompPage; route now redirects.
const ScopeViewPage = lazy(() => import("@/pages/ScopeViewPage"));
const FieldModePage = lazy(() => import("@/pages/FieldModePage"));
const RangeSimulatorPage = lazy(() => import("@/pages/RangeSimulatorPage"));
const BallisticChatPage = lazy(() => import("@/pages/BallisticChatPage"));
const FieldTargetCompPage = lazy(() => import("@/pages/FieldTargetCompPage"));
const ShootingDiaryPage = lazy(() => import("@/pages/ShootingDiaryPage"));
const DesignSystemPage = lazy(() => import("@/pages/DesignSystemPage"));
const PerfDebugPage = lazy(() => import("@/pages/PerfDebugPage"));
const ThemeStudioPage = lazy(() => import("@/pages/ThemeStudioPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

/** Suspense fallback — shown while a lazy-loaded page chunk is fetched. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <AuthPage />;
  return <>{children}</>;
}

/**
 * Sits inside AuthProvider (so it can read auth) AND inside ThemeProvider
 * (so AuthThemeBridge can patch the theme user id). Renders nothing.
 */
function ThemeUserBinder() {
  const { user } = useAuth();
  return <AuthThemeBridge userId={user?.id ?? null} />;
}

warnIfNotConfigured();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <A11yProvider>
      <I18nProvider>
        <AuthProvider>
          <ThemeUserBinder />
          <AuthLocaleBridge />
          <AuthGuard>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PerfMonitorProvider>
            <Layout>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calc" element={<QuickCalc />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/library/airgun/:id" element={<AirgunDetailPage />} />
                <Route path="/library/projectile/:id" element={<ProjectileDetailPage />} />
                <Route path="/library/optic/:id" element={<OpticDetailPage />} />
                <Route path="/library/reticles" element={<ReticlesPage />} />
                <Route path="/library/reticles/:id" element={<ReticleDetailPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/sessions/:id" element={<SessionDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/conversions" element={<ConversionsPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* Friendly alias — /preferences deep-links to the unified
                    Preferences tab inside the Settings hub. */}
                <Route path="/preferences" element={<Navigate to="/settings?tab=preferences" replace />} />
                <Route path="/admin" element={<AdminPage />} />
                {/*
                  /admin/ai keeps its own SignInCard for the 'anon' state —
                  the guard only hides admin-only content from authenticated
                  non-admins.
                */}
                <Route
                  path="/admin/ai"
                  element={
                    <RequireAdmin signInFallback={<AdminAiPage />}>
                      <AdminAiPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/ai/simulation"
                  element={
                    <RequireAdmin>
                      <AdminAiSimulationPage />
                    </RequireAdmin>
                  }
                />
                <Route path="/cross-validation" element={<CrossValidationPage />} />
                <Route path="/chrono" element={<ChronoPage />} />
                <Route path="/target-analysis" element={<TargetAnalysisPage />} />
                <Route path="/competition-prep" element={<Navigate to="/ft-competition" replace />} />
                <Route path="/scope-view" element={<ScopeViewPage />} />
                <Route path="/field-mode" element={<FieldModePage />} />
                <Route path="/range-simulator" element={<RangeSimulatorPage />} />
                <Route path="/chat" element={<BallisticChatPage />} />
                <Route path="/ft-competition" element={<FieldTargetCompPage />} />
                <Route path="/diary" element={<ShootingDiaryPage />} />
                <Route path="/design-system" element={<DesignSystemPage />} />
                <Route path="/debug/perf" element={<PerfDebugPage />} />
                <Route path="/theme" element={<ThemeStudioPage />} />
                {/* Legacy routes */}
                <Route path="/airguns" element={<LibraryPage />} />
                <Route path="/projectiles" element={<LibraryPage />} />
                <Route path="/optics" element={<LibraryPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </Layout>
            <PerfOverlay />
            </PerfMonitorProvider>
          </BrowserRouter>
          </TooltipProvider>
          </AuthGuard>
        </AuthProvider>
      </I18nProvider>
      </A11yProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
