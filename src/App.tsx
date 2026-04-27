import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";
import { warnIfNotConfigured } from "@/lib/supabase-check";
import AuthPage from "@/pages/AuthPage";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import QuickCalc from "@/pages/QuickCalc";
import LibraryPage from "@/pages/LibraryPage";
import AirgunDetailPage from "@/pages/AirgunDetailPage";
import ProjectileDetailPage from "@/pages/ProjectileDetailPage";
import OpticDetailPage from "@/pages/OpticDetailPage";
import ReticlesPage from "@/pages/ReticlesPage";
import ReticleDetailPage from "@/pages/ReticleDetailPage";
import SessionsPage from "@/pages/SessionsPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import ComparePage from "@/pages/ComparePage";
import ConversionsPage from "@/pages/ConversionsPage";
import DocsPage from "@/pages/DocsPage";
import SearchPage from "@/pages/SearchPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import AdminAiPage from "@/pages/AdminAiPage";
import CrossValidationPage from "@/pages/CrossValidationPage";
import ChronoPage from "@/pages/ChronoPage";
import TargetAnalysisPage from "@/pages/TargetAnalysisPage";
import CompetitionPrepPage from "@/pages/CompetitionPrepPage";
import ScopeViewPage from "@/pages/ScopeViewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

warnIfNotConfigured();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AuthGuard>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
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
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/ai" element={<AdminAiPage />} />
                <Route path="/cross-validation" element={<CrossValidationPage />} />
                <Route path="/chrono" element={<ChronoPage />} />
                <Route path="/target-analysis" element={<TargetAnalysisPage />} />
                <Route path="/competition-prep" element={<CompetitionPrepPage />} />
                <Route path="/scope-view" element={<ScopeViewPage />} />
                {/* Legacy routes */}
                <Route path="/airguns" element={<LibraryPage />} />
                <Route path="/projectiles" element={<LibraryPage />} />
                <Route path="/optics" element={<LibraryPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
          </TooltipProvider>
          </AuthGuard>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
