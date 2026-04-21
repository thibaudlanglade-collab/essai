/**
 * Sidebar for the prospect's authenticated space.
 *
 * Reuses the visual language of `components/Sidebar/Sidebar.tsx` (the
 * marketing landing sidebar) but routes via React Router `<NavLink>`
 * instead of CustomEvents, and flags each item's state:
 *  - "active" → clickable, routes to /dashboard/<feature>
 *  - "soon"   → grisé, tooltip "Disponible à partir de Sprint X"
 *  - "demo"   → clickable mais mène vers la version vitrine
 *
 * Progress of the sprints is reflected directly here: as Sprint 4, 5, 6
 * land, their items flip from "soon" to "active". No plumbing change in
 * this file except flipping one flag per item.
 */
import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  Camera,
  FileText,
  LayoutGrid,
  Lightbulb,
  Link2,
  Mail,
  MessageSquare,
  Mic,
  Settings2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import logoSynthese from "@/assets/logo-synthese.png";
import { cn } from "@/lib/utils";


type ItemStatus = "active" | "soon" | "demo";


interface NavItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  status: ItemStatus;
  soonLabel?: string;
  endProp?: boolean;
}


function Item({ icon: Icon, label, to, status, soonLabel, endProp }: NavItemProps) {
  const base =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all duration-150";

  if (status === "soon") {
    return (
      <div
        className={cn(
          base,
          "text-gray-400 cursor-not-allowed select-none",
        )}
        title={soonLabel ?? "Disponible dans votre version définitive"}
      >
        <Icon className="h-5 w-5 shrink-0 text-gray-300" />
        <span className="flex-1 truncate">{label}</span>
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
          Bientôt
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={to ?? "/dashboard"}
      end={endProp}
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-violet-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "h-5 w-5 shrink-0",
              isActive ? "text-violet-600" : "text-gray-400",
            )}
          />
          <span className="flex-1 truncate">{label}</span>
          {status === "demo" && (
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase tracking-wide">
              Démo
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}


function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-2">
      <span className="px-3 text-[11px] font-bold text-gray-900 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}


interface SidebarProps {
  daysLeft: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}


export default function DashboardSidebar({
  daysLeft,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <NavLink
          to="/dashboard"
          end
          className="h-16 px-5 flex items-center gap-3 border-b border-violet-100/60 w-full hover:bg-gray-50 transition-colors"
        >
          <img
            src={logoSynthese}
            alt="Synthèse"
            className="w-8 h-8 rounded-lg object-contain shrink-0"
          />
          <span className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-blue-600 bg-clip-text text-transparent tracking-tight">
            Synthèse
          </span>
        </NavLink>

        {/* Days-left banner */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
            Votre essai
          </p>
          <p className="text-sm text-gray-900">
            {daysLeft > 1
              ? `${daysLeft} jours restants`
              : daysLeft === 1
                ? "Dernier jour"
                : "Essai terminé"}
          </p>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {/* Start-here featured */}
          <div className="pt-2 pb-1">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all duration-150",
                  isActive
                    ? "bg-violet-100 text-violet-700"
                    : "bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700",
                )
              }
            >
              <Lightbulb className="h-5 w-5 shrink-0 text-violet-500" />
              <span className="flex-1 truncate">Mon espace</span>
            </NavLink>
          </div>

          <SectionHeader label="Fonctionnalités" />
          <Item
            icon={MessageSquare}
            label="Assistant Synthèse"
            status="soon"
            soonLabel="Arrive en Sprint 4"
          />
          <Item
            icon={Zap}
            label="Smart Extract"
            to="/dashboard/extract"
            status="active"
          />
          <Item
            icon={FileText}
            label="Email → Devis"
            status="soon"
            soonLabel="Arrive en Sprint 5"
          />
          <Item
            icon={Camera}
            label="Photo → PDF/Excel"
            status="soon"
            soonLabel="Disponible dans votre version définitive"
          />
          <Item
            icon={Mic}
            label="Transcripteur"
            status="soon"
            soonLabel="Disponible dans votre version définitive"
          />
          <Item
            icon={Calendar}
            label="Planificateur"
            status="soon"
            soonLabel="Disponible dans votre version définitive"
          />
          <Item
            icon={Mail}
            label="Emails"
            status="soon"
            soonLabel="Arrive en Sprint 6 (Gmail readonly)"
          />

          <SectionHeader label="Outils" />
          <Item
            icon={Settings2}
            label="Automatisations"
            to="/dashboard/automations"
            status="active"
          />
          <Item
            icon={Link2}
            label="Connexions"
            status="soon"
            soonLabel="Arrive en Sprint 6"
          />

          <SectionHeader label="Agents IA" />
          <Item
            icon={Bot}
            label="Mes agents IA"
            status="soon"
            soonLabel="Arrive en Sprint 5"
          />
          <Item
            icon={BarChart3}
            label="Rapport client"
            status="soon"
            soonLabel="Arrive en Sprint 4"
          />

          <SectionHeader label="Et encore plus" />
          <Item
            icon={ShieldCheck}
            label="RGPD / Sécurité"
            status="soon"
            soonLabel="Page vitrine — Sprint 6"
          />
          <Item
            icon={LayoutGrid}
            label="Par secteur"
            status="soon"
            soonLabel="Page vitrine — Sprint 6"
          />
          <Item
            icon={Building2}
            label="Qui sommes-nous"
            status="soon"
            soonLabel="Page vitrine — Sprint 6"
          />
          <Item
            icon={Sparkles}
            label="Tarification"
            status="soon"
            soonLabel="Page vitrine — Sprint 6"
          />
        </nav>
      </aside>
    </>
  );
}
