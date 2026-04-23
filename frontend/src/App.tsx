/**
 * Top-level router for Synthèse.
 *
 * Architecture:
 * - `/welcome` and `/dashboard/*` are protected by `<ProtectedLayout>`,
 *   which calls `/api/auth/me` and redirects to `/expired` on 401/403.
 * - `/expired` is intentionally **not** handled by React: we force a
 *   full page navigation so the backend-rendered HTML is served. This
 *   means the page works even if the SPA bundle is broken or the
 *   session is fully gone.
 * - Everything else (`/`, `/contact`, `/features`, etc.) falls through
 *   to `<LegacyLanding>`, which is the original Synthèse marketing +
 *   demo app. It uses its own CustomEvent-based navigation and does
 *   not update the URL — fine for the public landing surface.
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LegacyLanding from "./LegacyLanding";
import ProtectedLayout from "./layouts/ProtectedLayout";
import DashboardShell from "./layouts/DashboardShell";
import Welcome from "./pages/Welcome";
import DashboardHome from "./pages/DashboardHome";
import ExtractView from "./pages/ExtractView";
import AutomationsView from "./pages/AutomationsView";
import ClientsView from "./pages/ClientsView";
import PhotoToDocumentPage from "./pages/PhotoToDocumentPage";
import EmailsPage from "./pages/EmailsPage";
import TarifsView from "./pages/TarifsView";
import DevisView from "./pages/DevisView";
import BriefingView from "./pages/BriefingView";
import MonEquipeView from "./pages/MonEquipeView";
import AgentRapportPage from "./pages/AgentRapportPage";
import { ChatAssistantView } from "./components/ChatAssistant";

/**
 * Renders nothing and forces a full-page navigation to /expired so the
 * backend serves its HTML page. Used when react-router would otherwise
 * match /expired against the `*` wildcard and hand it to LegacyLanding.
 */
function ExpiredRedirect() {
  useEffect(() => {
    window.location.href = "/expired";
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Prospect-only protected routes */}
        <Route element={<ProtectedLayout />}>
          {/* Welcome is standalone — no sidebar on first-visit */}
          <Route path="/welcome" element={<Welcome />} />
          {/* All /dashboard/* routes share the persistent Synthèse shell */}
          <Route element={<DashboardShell />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/extract" element={<ExtractView />} />
            <Route path="/dashboard/automations" element={<AutomationsView />} />
            <Route path="/dashboard/clients" element={<ClientsView />} />
            <Route path="/dashboard/photo-to-document" element={<PhotoToDocumentPage />} />
            <Route path="/dashboard/emails" element={<EmailsPage />} />
            <Route path="/dashboard/briefing" element={<BriefingView />} />
            <Route path="/dashboard/mon-equipe" element={<MonEquipeView />} />
            <Route path="/dashboard/agent-rapport" element={<AgentRapportPage />} />
            <Route path="/dashboard/settings/tarifs" element={<TarifsView />} />
            <Route path="/dashboard/devis" element={<DevisView />} />
            <Route path="/dashboard/chat-assistant" element={<ChatAssistantView />} />
            <Route path="/dashboard/*" element={<DashboardHome />} />
          </Route>
        </Route>

        {/* Public expired page — always served by the backend */}
        <Route path="/expired" element={<ExpiredRedirect />} />

        {/* Marketing site + public demos */}
        <Route path="*" element={<LegacyLanding />} />
      </Routes>
    </BrowserRouter>
  );
}
