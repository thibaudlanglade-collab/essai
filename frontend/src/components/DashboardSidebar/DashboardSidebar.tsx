/**
 * Workspace sidebar — shown only on trial/dashboard pages (/#dashboard, /#smart,
 * /#chat-assistant, ...). Distinct from the marketing Sidebar so the trial
 * feels like its own space.
 *
 * Mirrors TE-main's DashboardSidebar layout:
 *  - brand + "Votre essai — X jours restants" card
 *  - "Mon espace" featured item
 *  - Fonctionnalités / Outils / Paramètres / Agents IA sections
 *  - "Bientôt" badges for items whose pages don't exist yet in this repo
 *
 * Unlike TE-main, navigation goes through the hash router (navigate("/x")
 * dispatches NAVIGATE_EVENT). Active state is driven by the `activeMode`
 * prop — the one thing App.tsx already tracks.
 */
import type { ComponentType } from "react";
import {
  BarChart3,
  Bot,
  Calendar,
  Camera,
  Euro,
  FileText,
  Lightbulb,
  Mail,
  MessageSquare,
  Mic,
  Settings2,
  Sparkles,
  Sunrise,
  Users,
  Zap,
} from "lucide-react";
import logoSynthese from "@/assets/logo-synthese.png";
import { cn } from "@/lib/utils";
import { useNavigate } from "@/lib/navigate";

type ItemStatus = "active" | "soon" | "demo";

interface ItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  mode?: string;
  activeMode: string;
  status: ItemStatus;
  soonLabel?: string;
  onClick?: () => void;
}

function Item({ icon: Icon, label, mode, activeMode, status, soonLabel, onClick }: ItemProps) {
  const base =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all duration-150";

  if (status === "soon") {
    return (
      <div
        className={cn(base, "text-gray-400 cursor-not-allowed select-none")}
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

  const isActive = mode !== undefined && activeMode === mode;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        isActive
          ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-violet-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-violet-600" : "text-gray-400")} />
      <span className="flex-1 truncate">{label}</span>
      {status === "demo" && (
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase tracking-wide">
          Démo
        </span>
      )}
    </button>
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

interface Props {
  activeMode: string;
  daysLeft: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function DashboardSidebar({
  activeMode,
  daysLeft,
  mobileOpen,
  onMobileClose,
}: Props) {
  const navigate = useNavigate();
  const go = (path: string) => () => {
    onMobileClose();
    navigate(path);
  };

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
          "fixed left-0 top-[41px] bottom-0 w-60 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:z-40",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand — clicking goes to Mon espace */}
        <button
          type="button"
          onClick={go("/dashboard")}
          className="h-16 px-5 flex items-center gap-3 border-b border-violet-100/60 w-full hover:bg-gray-50 transition-colors text-left"
        >
          <img
            src={logoSynthese}
            alt="Synthèse"
            className="w-8 h-8 rounded-lg object-contain shrink-0"
          />
          <span className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-blue-600 bg-clip-text text-transparent tracking-tight">
            Synthèse
          </span>
        </button>

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
          {/* Featured: Mon espace (home of the workspace) */}
          <div className="pt-2 pb-1">
            <button
              type="button"
              onClick={go("/dashboard")}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all duration-150",
                activeMode === "dashboard"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700",
              )}
            >
              <Lightbulb className="h-5 w-5 shrink-0 text-violet-500" />
              <span className="flex-1 truncate">Mon espace</span>
            </button>
          </div>

          <SectionHeader label="Fonctionnalités" />
          <Item
            icon={MessageSquare}
            label="Assistant Synthèse"
            mode="chat-assistant"
            activeMode={activeMode}
            status="active"
            onClick={go("/chat-assistant")}
          />
          <Item
            icon={Zap}
            label="Smart Extract"
            mode="smart"
            activeMode={activeMode}
            status="active"
            onClick={go("/smart")}
          />
          <Item
            icon={FileText}
            label="Devis"
            activeMode={activeMode}
            status="soon"
            soonLabel="Arrive dans votre version définitive"
          />
          <Item
            icon={Camera}
            label="Photo → PDF/Excel"
            mode="photo-to-document"
            activeMode={activeMode}
            status="active"
            onClick={go("/photo-to-document")}
          />
          <Item
            icon={Mic}
            label="Transcripteur"
            mode="meeting-transcriber"
            activeMode={activeMode}
            status="active"
            onClick={go("/meeting-transcriber")}
          />
          <Item
            icon={Calendar}
            label="Planificateur"
            mode="planner"
            activeMode={activeMode}
            status="active"
            onClick={go("/planner")}
          />
          <Item
            icon={Mail}
            label="Emails"
            mode="emails"
            activeMode={activeMode}
            status="active"
            onClick={go("/emails")}
          />

          <SectionHeader label="Outils" />
          <Item
            icon={Sunrise}
            label="Briefing du jour"
            mode="briefing"
            activeMode={activeMode}
            status="active"
            onClick={go("/briefing")}
          />
          <Item
            icon={Users}
            label="Mon équipe"
            mode="mon-equipe"
            activeMode={activeMode}
            status="active"
            onClick={go("/mon-equipe")}
          />
          <Item
            icon={Settings2}
            label="Automatisations"
            mode="automations"
            activeMode={activeMode}
            status="active"
            onClick={go("/automations")}
          />

          <SectionHeader label="Paramètres" />
          <Item
            icon={Euro}
            label="Grille tarifaire"
            mode="tarifs"
            activeMode={activeMode}
            status="active"
            onClick={go("/tarifs")}
          />

          <SectionHeader label="Agents IA" />
          <Item
            icon={Sparkles}
            label="Agent Rapport client"
            mode="agent-rapport"
            activeMode={activeMode}
            status="demo"
            onClick={go("/agent-rapport")}
          />
          <Item
            icon={Bot}
            label="Mes agents IA"
            mode="agents-ia"
            activeMode={activeMode}
            status="active"
            onClick={go("/agents-ia")}
          />
          <Item
            icon={BarChart3}
            label="Rapport client (Q&A)"
            activeMode={activeMode}
            status="soon"
            soonLabel="Arrive dans votre version définitive"
          />
        </nav>
      </aside>
    </>
  );
}
