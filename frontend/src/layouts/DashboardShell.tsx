/**
 * Layout shell for the prospect's authenticated space (/dashboard/*).
 *
 * Renders the persistent sidebar + topbar, with `<Outlet />` for the
 * active route's content in a scrollable main area. Mirrors the
 * LegacyLanding's structure (fixed sidebar + h-screen flex column +
 * overflow-y-auto main) so the look&feel is consistent between the
 * marketing site and the prospect's test space.
 *
 * Pulls the current prospect (days_left, company_name, logout) from
 * `useAuth`'s outlet context provided by `<ProtectedLayout>`.
 */
import { useState } from "react";
import { Info, Menu } from "lucide-react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar/DashboardSidebar";
import FeatureInfoModal from "@/components/DashboardSidebar/FeatureInfoModal";
import { FEATURE_INFOS } from "@/data/featureInfos";
import { logout } from "@/hooks/useAuth";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";


interface PageMeta {
  title: string;
  infoKey: string;
}

const PAGE_META: Record<string, PageMeta> = {
  "/dashboard": { title: "Mon espace", infoKey: "mon-espace" },
  "/dashboard/chat-assistant": { title: "Assistant Synthèse", infoKey: "assistant-synthese" },
  "/dashboard/extract": { title: "Smart Extract", infoKey: "smart-extract" },
  "/dashboard/photo-to-document": { title: "Photo → PDF / Excel", infoKey: "photo-pdf-excel" },
  "/dashboard/emails": { title: "Emails", infoKey: "emails" },
  "/dashboard/automations": { title: "Automatisations", infoKey: "automatisations" },
  "/dashboard/briefing": { title: "Briefing du jour", infoKey: "briefing" },
  "/dashboard/mon-equipe": { title: "Mon équipe", infoKey: "mon-equipe" },
  "/dashboard/clients": { title: "Rapport client", infoKey: "rapport-client" },
  "/dashboard/agent-rapport": { title: "Agent Rapport client", infoKey: "agent-rapport" },
};


function metaFor(pathname: string): PageMeta {
  // Exact match first, then fallback to the closest prefix.
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const prefix = Object.keys(PAGE_META)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_META[prefix] : PAGE_META["/dashboard"];
}


export default function DashboardShell() {
  const { user } = useOutletContext<AuthContextShape>();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore — we still leave the space
    }
    navigate("/", { replace: true });
  }

  const pageMeta = metaFor(location.pathname);
  const pageInfo = FEATURE_INFOS[pageMeta.infoKey] ?? null;

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardSidebar
        daysLeft={user.days_left}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="lg:ml-60 flex flex-col h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white/70 backdrop-blur-sm border-b border-violet-100/60 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              {pageMeta.title}
            </h1>
            {pageInfo && (
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                title={pageInfo.tooltip}
                aria-label={`En savoir plus sur ${pageMeta.title}`}
                className="group flex items-center justify-center w-8 h-8 rounded-full text-violet-500 hover:text-white hover:bg-gradient-to-r hover:from-violet-500 hover:to-blue-500 hover:shadow-md hover:shadow-violet-200 transition-all"
              >
                <Info className="h-5 w-5 drop-shadow-[0_0_4px_rgba(139,92,246,0.4)] group-hover:drop-shadow-none" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user.prospect_name && (
              <span className="hidden sm:inline text-sm text-gray-600">
                {user.prospect_name}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2 disabled:opacity-60"
            >
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ user }} />
        </main>
      </div>

      <FeatureInfoModal
        open={infoOpen && pageInfo !== null}
        info={pageInfo}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  );
}
