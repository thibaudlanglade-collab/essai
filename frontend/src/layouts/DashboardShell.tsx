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
import { Menu } from "lucide-react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar/DashboardSidebar";
import { logout } from "@/hooks/useAuth";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";


const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Mon espace",
  "/dashboard/extract": "Smart Extract",
  "/dashboard/automations": "Automatisations",
};


function titleFor(pathname: string): string {
  // Exact match first, then fallback to the closest prefix.
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_TITLES[prefix] : "Mon espace";
}


export default function DashboardShell() {
  const { user } = useOutletContext<AuthContextShape>();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore — we still leave the space
    }
    navigate("/", { replace: true });
  }

  const pageTitle = titleFor(location.pathname);

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
              {pageTitle}
            </h1>
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
    </div>
  );
}
