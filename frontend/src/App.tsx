import { useEffect, useRef, useState } from "react";
import { Sparkles, CalendarCheck } from "lucide-react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Topbar } from "./components/Topbar/Topbar";
import WorkflowLauncher from "./components/WorkflowLauncher/WorkflowLauncher";
import ProgressPanel from "./components/ProgressPanel/ProgressPanel";
import ResultPanel from "./components/ResultPanel/ResultPanel";
import { PlannerLauncher } from "./components/PlannerLauncher";
import { TeamPlannerView } from "./components/TeamPlanner";
import { EmailsView } from "./components/Emails";
import { AutomationsView } from "./components/Automations";
import { PhotoToDocumentView } from "./components/PhotoToDocument";
import { MeetingTranscriberView } from "./components/MeetingTranscriber";
import { ChatAssistantView } from "./components/ChatAssistant";
import { AgentsIaView } from "./components/AgentsIa";
import HomeView from "./pages/HomeView";
import RgpdView from "./pages/RgpdView";
import FeaturesView from "./pages/FeaturesView";
import ComprendreView from "./pages/ComprendreView";
import AgentRapportDemo from "./components/AgentRapportDemo";
import { useFeatures } from "./hooks/useFeatures";
import { useWorkflowRun } from "./hooks/useWorkflowRun";
import type { Feature } from "./types";
import { getTodayBriefing } from "./api/emailsClient";

const PAGE_TITLES: Record<string, string> = {
  home: "Synthèse",
  "chat-assistant": "Discuter avec Synthèse",
  smart: "Smart Extract",
  "photo-to-document": "Photo → PDF/Excel",
  "meeting-transcriber": "Transcripteur de réunions",
  planner: "Planificateur",
  emails: "Emails",
  automations: "Automatisations",
  "agents-ia": "Mes agents IA",
  "agent-rapport": "Agent Rapport client",
  rgpd: "RGPD",
  features: "Fonctionnalités par secteur",
  comprendre: "Comprendre Synthèse",
  classic: "Synthèse",
};

export default function App() {
  const { loading, error: featuresError } = useFeatures();
  const [selected, setSelected] = useState<Feature | null>(null);
  const { run, start, reset } = useWorkflowRun();
  const [activeMode, setActiveMode] = useState<"home" | "classic" | "chat-assistant" | "smart" | "photo-to-document" | "meeting-transcriber" | "planner" | "emails" | "automations" | "agents-ia" | "agent-rapport" | "rgpd" | "features" | "comprendre">("home");

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Scroll container ref — reset scroll on page change
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeMode]);

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("synthese-dark", "false");
  }, []);

  // Briefing badge: poll every 5 minutes at the App level
  const [briefingBadgeCount, setBriefingBadgeCount] = useState(0);
  const briefingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkBriefing = () => {
    getTodayBriefing()
      .then((b) => {
        setBriefingBadgeCount(b && !b.is_read ? 1 : 0);
      })
      .catch(() => {/* non-fatal */});
  };

  useEffect(() => {
    const timer = setTimeout(checkBriefing, 3000);
    briefingPollRef.current = setInterval(checkBriefing, 5 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      if (briefingPollRef.current) clearInterval(briefingPollRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeMode === "emails") {
      const timer = setTimeout(checkBriefing, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRun(file: File) {
    if (selected) start(selected.id, file);
  }

  function handleChatAssistantClick() {
    reset();
    setSelected(null);
    setActiveMode("chat-assistant");
  }

  function handleSmartExtractClick() {
    reset();
    setSelected(null);
    setActiveMode("smart");
  }

  function handleMeetingTranscriberClick() {
    reset();
    setSelected(null);
    setActiveMode("meeting-transcriber");
  }

  function handlePlannerClick() {
    reset();
    setSelected(null);
    setActiveMode("planner");
  }

  function handleEmailsClick() {
    reset();
    setSelected(null);
    setActiveMode("emails");
  }

  function handleAutomationsClick() {
    reset();
    setSelected(null);
    setActiveMode("automations");
  }

  function handleAgentsIaClick() {
    reset();
    setSelected(null);
    setActiveMode("agents-ia");
  }

  function handleAgentRapportClick() {
    reset();
    setSelected(null);
    setActiveMode("agent-rapport");
  }

  function handleRgpdClick() {
    reset();
    setSelected(null);
    setActiveMode("rgpd");
  }

  function handleFeaturesClick() {
    reset();
    setSelected(null);
    setActiveMode("features");
  }

  function handleHomeClick() {
    reset();
    setSelected(null);
    setActiveMode("home");
  }

  function handleComprendreClick() {
    reset();
    setSelected(null);
    setActiveMode("comprendre");
  }

  const pageTitle = selected?.name ?? PAGE_TITLES[activeMode] ?? "Synthèse";

  const BOOKING_LINK = "#";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Demo banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 px-3 sm:px-6 py-2 sm:py-2.5 text-center">
        <span className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
          <Sparkles className="inline h-3 w-3 mr-1 sm:mr-1.5" />
          <span className="hidden sm:inline">Mode démo — vous explorez une version exemple de Synthèse.</span>
          <span className="sm:hidden">Mode démo</span>
          <a href={BOOKING_LINK} className="underline font-medium ml-1 hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
            Parlons de votre activité
          </a>
        </span>
      </div>

      {/* Floating CTA */}
      <a
        href={BOOKING_LINK}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs sm:text-sm font-medium rounded-full hover:from-violet-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
      >
        <CalendarCheck className="h-4 w-4" />
        <span className="hidden sm:inline">Réserver une démo</span>
        <span className="sm:hidden">Démo</span>
      </a>

      {/* Sidebar */}
      <Sidebar
        onChatAssistantClick={() => { handleChatAssistantClick(); setSidebarOpen(false); }}
        chatAssistantModeActive={activeMode === "chat-assistant"}
        onSmartExtractClick={() => { handleSmartExtractClick(); setSidebarOpen(false); }}
        smartModeActive={activeMode === "smart"}
        onPhotoToDocumentClick={() => { reset(); setSelected(null); setActiveMode("photo-to-document"); setSidebarOpen(false); }}
        photoToDocumentModeActive={activeMode === "photo-to-document"}
        onMeetingTranscriberClick={() => { handleMeetingTranscriberClick(); setSidebarOpen(false); }}
        meetingTranscriberModeActive={activeMode === "meeting-transcriber"}
        onPlannerClick={() => { handlePlannerClick(); setSidebarOpen(false); }}
        plannerModeActive={activeMode === "planner"}
        onEmailsClick={() => { handleEmailsClick(); setSidebarOpen(false); }}
        emailsModeActive={activeMode === "emails"}
        emailsBadgeCount={briefingBadgeCount}
        onAutomationsClick={() => { handleAutomationsClick(); setSidebarOpen(false); }}
        automationsModeActive={activeMode === "automations"}
        onAgentsIaClick={() => { handleAgentsIaClick(); setSidebarOpen(false); }}
        agentsIaModeActive={activeMode === "agents-ia"}
        onAgentRapportClick={() => { handleAgentRapportClick(); setSidebarOpen(false); }}
        agentRapportModeActive={activeMode === "agent-rapport"}
        onRgpdClick={() => { handleRgpdClick(); setSidebarOpen(false); }}
        rgpdModeActive={activeMode === "rgpd"}
        onFeaturesClick={() => { handleFeaturesClick(); setSidebarOpen(false); }}
        featuresModeActive={activeMode === "features"}
        onHomeClick={() => { handleHomeClick(); setSidebarOpen(false); }}
        onComprendreClick={() => { handleHomeClick(); setSidebarOpen(false); }}
        comprenderModeActive={activeMode === "home"}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main area offset by sidebar + demo banner */}
      <div className="lg:ml-60 flex flex-col h-screen pt-[41px]">
        {/* Topbar */}
        <Topbar pageTitle={pageTitle} onMenuClick={() => setSidebarOpen(true)} />

        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {activeMode === "home" && <HomeView onComprendreClick={handleComprendreClick} onRgpdClick={handleRgpdClick} />}

          {activeMode === "comprendre" && <ComprendreView />}

          {activeMode === "rgpd" && <RgpdView />}

          {activeMode === "features" && <FeaturesView />}

          {activeMode === "chat-assistant" && (
            <ChatAssistantView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "smart" && <PlannerLauncher />}

          {activeMode === "photo-to-document" && (
            <PhotoToDocumentView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "meeting-transcriber" && (
            <MeetingTranscriberView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "automations" && (
            <AutomationsView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "agents-ia" && (
            <AgentsIaView />
          )}

          {activeMode === "agent-rapport" && (
            <AgentRapportDemo onBack={() => setActiveMode("agents-ia")} />
          )}

          {activeMode === "emails" && (
            <EmailsView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "planner" && (
            <TeamPlannerView onExit={() => setActiveMode("classic")} />
          )}

          {activeMode === "classic" && (
            <>
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-8">
                  {loading && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading features…</p>
                  )}
                  {featuresError && (
                    <p className="text-sm text-red-500">Error: {featuresError}</p>
                  )}
                  {!loading && !featuresError && (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-7 w-7 text-violet-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.25}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-base font-medium text-gray-900 dark:text-white">Select a feature</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose a workflow from the sidebar.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-8 max-w-2xl px-8 py-8">
                  {(run.phase === "idle" || run.phase === "running") && (
                    <WorkflowLauncher
                      feature={selected}
                      onRun={handleRun}
                      isRunning={run.phase === "running"}
                    />
                  )}

                  {run.steps.length > 0 && (
                    <ProgressPanel steps={run.steps} />
                  )}

                  {run.phase === "error" && (
                    <div className="flex flex-col gap-2 px-4 py-3 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-medium text-red-600">Pipeline failed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{run.errorMessage}</p>
                      <button
                        onClick={reset}
                        className="self-start text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors mt-1"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {run.phase === "done" && run.result !== undefined && (
                    <ResultPanel
                      result={run.result}
                      feature={selected}
                      onReset={reset}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
