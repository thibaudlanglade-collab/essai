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
  Camera,
  Euro,
  FileText,
  Lightbulb,
  Mail,
  MessageSquare,
  Settings2,
  Sparkles,
  Sunrise,
  Users,
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
            to="/dashboard/chat-assistant"
            status="active"
          />
          <Item
            icon={Zap}
            label="Smart Extract"
            to="/dashboard/extract"
            status="active"
          />
          <Item
            icon={FileText}
            label="Devis"
            to="/dashboard/devis"
            status="active"
          />
          <Item
            icon={Camera}
            label="Photo → PDF/Excel"
            to="/dashboard/photo-to-document"
            status="active"
          />
          <Item
            icon={Mail}
            label="Emails"
            to="/dashboard/emails"
            status="active"
          />

          <SectionHeader label="Outils" />
          <Item
            icon={Sunrise}
            label="Briefing du jour"
            to="/dashboard/briefing"
            status="active"
          />
          <Item
            icon={Users}
            label="Mon équipe"
            to="/dashboard/mon-equipe"
            status="active"
          />
          <Item
            icon={Settings2}
            label="Automatisations"
            to="/dashboard/automations"
            status="active"
          />

          <SectionHeader label="Paramètres" />
          <Item
            icon={Euro}
            label="Grille tarifaire"
            to="/dashboard/settings/tarifs"
            status="active"
          />

          <SectionHeader label="Agents IA" />
          <Item
            icon={Sparkles}
            label="Agent Rapport client"
            to="/dashboard/agent-rapport"
            status="active"
          />
          <Item
            icon={BarChart3}
            label="Rapport client (Q&A)"
            to="/dashboard/clients"
            status="active"
          />
        </nav>
      </aside>
    </>
  );
}
