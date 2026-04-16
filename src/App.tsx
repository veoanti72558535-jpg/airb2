import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import QuickCalc from "@/pages/QuickCalc";
import LibraryPage from "@/pages/LibraryPage";
import SessionsPage from "@/pages/SessionsPage";
import ConversionsPage from "@/pages/ConversionsPage";
import DocsPage from "@/pages/DocsPage";
import SearchPage from "@/pages/SearchPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calc" element={<QuickCalc />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/conversions" element={<ConversionsPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                {/* Legacy routes */}
                <Route path="/airguns" element={<LibraryPage />} />
                <Route path="/projectiles" element={<LibraryPage />} />
                <Route path="/optics" element={<LibraryPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
