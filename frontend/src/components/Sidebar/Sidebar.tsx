import { MessageSquare, Zap, Mic, Calendar, Mail, Settings2, Bot, Camera, ShieldCheck, LayoutGrid, BarChart3, Lightbulb, Building2, Sparkles, Rocket, Scale } from "lucide-react";
import logoSynthese from "@/assets/logo-synthese.png";
import { cn } from "@/lib/utils";


interface Props {
  onChatAssistantClick?: () => void;
  chatAssistantModeActive?: boolean;
  onSmartExtractClick?: () => void;
  smartModeActive?: boolean;
  onPhotoToDocumentClick?: () => void;
  photoToDocumentModeActive?: boolean;
  onMeetingTranscriberClick?: () => void;
  meetingTranscriberModeActive?: boolean;
  onPlannerClick?: () => void;
  plannerModeActive?: boolean;
  onEmailsClick?: () => void;
  emailsModeActive?: boolean;
  emailsBadgeCount?: number;
  onAutomationsClick?: () => void;
  automationsModeActive?: boolean;
  onAgentsIaClick?: () => void;
  agentsIaModeActive?: boolean;
  onAgentRapportClick?: () => void;
  agentRapportModeActive?: boolean;
  onRgpdClick?: () => void;
  rgpdModeActive?: boolean;
  onFeaturesClick?: () => void;
  featuresModeActive?: boolean;
  onQuiSommesNousClick?: () => void;
  quiSommesNousModeActive?: boolean;
  onTarificationClick?: () => void;
  tarificationModeActive?: boolean;
  onPourquoiClick?: () => void;
  pourquoiModeActive?: boolean;
  onHomeClick?: () => void;
  onComprendreClick?: () => void;
  comprenderModeActive?: boolean;
  onDemoClick?: () => void;
  demoModeActive?: boolean;
  demoLabel?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/* ── NavItem ─────────────────────────────────────────────────────────────── */

function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
  demo,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  badge?: number;
  demo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left",
        "transition-all duration-150",
        isActive
          ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-violet-700 dark:from-violet-500/20 dark:to-blue-500/20 dark:text-violet-300"
          : "text-gray-600 hover:bg-white/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {demo && (
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase tracking-wide">
          Démo
        </span>
      )}
      {badge != null && badge > 0 && (
        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold px-1.5">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

export function Sidebar({
  onChatAssistantClick,
  chatAssistantModeActive,
  onSmartExtractClick,
  smartModeActive,
  onPhotoToDocumentClick,
  photoToDocumentModeActive,
  onMeetingTranscriberClick,
  meetingTranscriberModeActive,
  onPlannerClick,
  plannerModeActive,
  onEmailsClick,
  emailsModeActive,
  emailsBadgeCount = 0,
  onAutomationsClick,
  automationsModeActive,
  onAgentsIaClick,
  agentsIaModeActive,
  onAgentRapportClick,
  agentRapportModeActive,
  onRgpdClick,
  rgpdModeActive,
  onFeaturesClick,
  featuresModeActive,
  onQuiSommesNousClick,
  quiSommesNousModeActive,
  onTarificationClick,
  tarificationModeActive,
  onPourquoiClick,
  pourquoiModeActive,
  onHomeClick,
  onComprendreClick,
  comprenderModeActive,
  onDemoClick,
  demoModeActive,
  demoLabel = "Obtenir un aperçu",
  mobileOpen,
  onMobileClose,
}: Props) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
    <aside className={cn(
      "fixed left-0 top-[41px] bottom-0 w-60 bg-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 dark:bg-gradient-to-b border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-transform duration-200 ease-in-out",
      "lg:translate-x-0 lg:z-40",
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo / Brand – clickable, navigates to home */}
      <button
        onClick={onHomeClick}
        className="h-16 px-5 flex items-center gap-3 border-b border-violet-100/60 dark:border-gray-800 w-full text-left cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
      >
        <img
          src={logoSynthese}
          alt="Synthèse"
          className="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        <span className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent tracking-tight">
          Synthèse
        </span>
      </button>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* ── "Start here" featured item ───────────────────── */}
        <div className="pt-2 pb-1">
          <button
            onClick={onComprendreClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all duration-150",
              comprenderModeActive
                ? "bg-violet-100 text-violet-700"
                : "bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
            )}
          >
            <Lightbulb className="h-5 w-5 shrink-0 text-violet-500" />
            <span className="flex-1 truncate">Comprendre Synthèse</span>
          </button>
        </div>

        <NavItem
          icon={Scale}
          label="Notre différence"
          isActive={pourquoiModeActive ?? false}
          onClick={onPourquoiClick}
        />

        {/* ── Obtenir une démo — primary CTA ──────────────── */}
        <div className="pb-1">
          <button
            onClick={onDemoClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold w-full text-left transition-all duration-150 shadow-sm",
              demoModeActive
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                : "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 hover:shadow-md"
            )}
          >
            <Rocket className="h-5 w-5 shrink-0 text-white" />
            <span className="flex-1 truncate">{demoLabel}</span>
          </button>
        </div>

        {/* ── Section Fonctionnalités ──────────────────────── */}
        <div className="pt-3 pb-2">
          <span className="px-3 text-[11px] font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">
            Fonctionnalités
          </span>
        </div>
        <NavItem
          icon={MessageSquare}
          label="Assistant Synthèse"
          isActive={chatAssistantModeActive ?? false}
          onClick={onChatAssistantClick}
        />
        <NavItem
          icon={Zap}
          label="Smart Extract"
          isActive={smartModeActive ?? false}
          onClick={onSmartExtractClick}
        />
        <NavItem
          icon={Camera}
          label="Photo → PDF/Excel"
          isActive={photoToDocumentModeActive ?? false}
          onClick={onPhotoToDocumentClick}
        />
        <NavItem
          icon={Mic}
          label="Transcripteur"
          isActive={meetingTranscriberModeActive ?? false}
          onClick={onMeetingTranscriberClick}
        />
        <NavItem
          icon={Calendar}
          label="Planificateur"
          isActive={plannerModeActive ?? false}
          onClick={onPlannerClick}
        />
        <NavItem
          icon={Mail}
          label="Emails"
          isActive={emailsModeActive ?? false}
          onClick={onEmailsClick}
          badge={emailsBadgeCount}
        />
        {/* ── Section Outils ──────────────────────────────── */}
        <div className="pt-5 pb-2">
          <span className="px-3 text-[11px] font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">
            Outils
          </span>
        </div>
        <NavItem
          icon={Settings2}
          label="Automatisations"
          isActive={automationsModeActive ?? false}
          onClick={onAutomationsClick}
        />

        {/* ── Section Agents IA ──────────────────────────── */}
        <div className="pt-5 pb-2">
          <span className="px-3 text-[11px] font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">
            Agents IA
          </span>
        </div>
        <NavItem
          icon={Bot}
          label="Mes agents IA"
          isActive={agentsIaModeActive ?? false}
          onClick={onAgentsIaClick}
        />
        <NavItem
          icon={BarChart3}
          label="Rapport client"
          isActive={agentRapportModeActive ?? false}
          onClick={onAgentRapportClick}
          demo
        />

        {/* ── Section ET encore plus ─────────────────────── */}
        <div className="pt-5 pb-2">
          <span className="px-3 text-[11px] font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">
            ET encore plus
          </span>
        </div>
        <NavItem
          icon={ShieldCheck}
          label="RGPD"
          isActive={rgpdModeActive ?? false}
          onClick={onRgpdClick}
        />
        <NavItem
          icon={LayoutGrid}
          label="Par secteur"
          isActive={featuresModeActive ?? false}
          onClick={onFeaturesClick}
        />
        <NavItem
          icon={Building2}
          label="Qui sommes-nous"
          isActive={quiSommesNousModeActive ?? false}
          onClick={onQuiSommesNousClick}
        />
        <NavItem
          icon={Sparkles}
          label="Tarification"
          isActive={tarificationModeActive ?? false}
          onClick={onTarificationClick}
        />

      </nav>

    </aside>
    </>
  );
}
