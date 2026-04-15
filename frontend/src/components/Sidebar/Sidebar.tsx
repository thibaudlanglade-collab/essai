import { MessageSquare, Zap, Mic, Calendar, Mail, Settings2, Bot, Sun, Moon } from "lucide-react";
import logoSynthese from "@/assets/logo-synthese.png";
import { cn } from "@/lib/utils";
import { SidebarSection } from "./SidebarSection";
import { FeatureItem } from "./FeatureItem";
import type { Feature } from "@/types";

interface Props {
  features: Feature[];
  selectedId: string | null;
  onSelect: (feature: Feature) => void;
  onChatAssistantClick?: () => void;
  chatAssistantModeActive?: boolean;
  onSmartExtractClick?: () => void;
  smartModeActive?: boolean;
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
  onHomeClick?: () => void;
  dark?: boolean;
  onToggleDark?: () => void;
}

/* ── NavItem ─────────────────────────────────────────────────────────────── */

function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  badge?: number;
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
  features,
  selectedId,
  onSelect,
  onChatAssistantClick,
  chatAssistantModeActive,
  onSmartExtractClick,
  smartModeActive,
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
  onHomeClick,
  dark,
  onToggleDark,
}: Props) {
  return (
    <aside className="fixed left-0 top-[41px] bottom-0 w-60 bg-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 dark:bg-gradient-to-b border-r border-gray-200 dark:border-gray-800 flex flex-col z-40">
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
        <NavItem
          icon={MessageSquare}
          label="Discuter avec Synthèse"
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
          icon={Mic}
          label="Transcripteur de réunions"
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

        {features.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-3 text-xs font-semibold text-violet-400/70 dark:text-gray-500 uppercase tracking-wider">
                Features
              </span>
            </div>
            <SidebarSection>
              <div className="flex flex-col gap-0.5">
                {features.map((f) => (
                  <FeatureItem
                    key={f.id}
                    feature={f}
                    isActive={f.id === selectedId}
                    onClick={() => onSelect(f)}
                  />
                ))}
              </div>
            </SidebarSection>
          </>
        )}
      </nav>

      {/* Bottom: dark mode toggle */}
      <div className="p-3 border-t border-violet-100/60 dark:border-gray-800">
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
        >
          {dark ? (
            <>
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Mode clair</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-violet-500" />
              <span>Mode sombre</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
