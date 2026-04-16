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
import AirgunsPage from "@/pages/AirgunsPage";
import ProjectilesPage from "@/pages/ProjectilesPage";
import OpticsPage from "@/pages/OpticsPage";
import SessionsPage from "@/pages/SessionsPage";
import ConversionsPage from "@/pages/ConversionsPage";
import NotFound from "./pages/NotFound.tsx";

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
                <Route path="/airguns" element={<AirgunsPage />} />
                <Route path="/projectiles" element={<ProjectilesPage />} />
                <Route path="/optics" element={<OpticsPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/conversions" element={<ConversionsPage />} />
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
