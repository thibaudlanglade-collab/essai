import { useEffect, useRef, useState } from "react";
import { Sparkles, MessageSquare, Info, X } from "lucide-react";
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
import ContactView from "./pages/ContactView";
import QuiSommesNousView from "./pages/QuiSommesNousView";
import TarificationView from "./pages/TarificationView";
import DemoView from "./pages/DemoView";
import AgentRapportDemo from "./components/AgentRapportDemo";
import Footer from "./components/Footer";
import { useFeatures } from "./hooks/useFeatures";
import { useWorkflowRun } from "./hooks/useWorkflowRun";
import { useNavigate, NAVIGATE_EVENT } from "./lib/navigate";
import type { Feature } from "./types";
import { getTodayBriefing } from "./api/emailsClient";

const PAGE_TITLES: Record<string, string> = {
  home: "Synthèse",
  "chat-assistant": "Assistant Synthèse",
  smart: "Smart Extract",
  "photo-to-document": "Photo → PDF/Excel",
  "meeting-transcriber": "Transcripteur",
  planner: "Planificateur",
  emails: "Emails",
  automations: "Automatisations",
  "agents-ia": "Mes agents IA",
  "agent-rapport": "Rapport client",
  rgpd: "RGPD",
  features: "Par secteur",
  comprendre: "Comprendre Synthèse",
  contact: "Contact",
  "qui-sommes-nous": "Qui sommes-nous",
  tarification: "Tarification",
  demo: "Obtenez votre aperçu",
  classic: "Synthèse",
};

export default function App() {
  const { loading, error: featuresError } = useFeatures();
  const [selected, setSelected] = useState<Feature | null>(null);
  const { run, start, reset } = useWorkflowRun();
  const [activeMode, setActiveMode] = useState<"home" | "classic" | "chat-assistant" | "smart" | "photo-to-document" | "meeting-transcriber" | "planner" | "emails" | "automations" | "agents-ia" | "agent-rapport" | "rgpd" | "features" | "comprendre" | "contact" | "qui-sommes-nous" | "tarification" | "demo">("home");
  const navigate = useNavigate();

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // First-feature-click hint: explain examples are customizable
  const [showCustomizationHint, setShowCustomizationHint] = useState(false);
  function maybeShowCustomizationHint() {
    try {
      if (sessionStorage.getItem("synthese-customization-hint-shown") === "1") return;
      sessionStorage.setItem("synthese-customization-hint-shown", "1");
    } catch {
      // sessionStorage unavailable — still show once per mount
    }
    setShowCustomizationHint(true);
  }

  useEffect(() => {
    if (!showCustomizationHint) return;
    const timer = setTimeout(() => setShowCustomizationHint(false), 5000);
    return () => clearTimeout(timer);
  }, [showCustomizationHint]);

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

  // Listen for navigate("/path") calls from anywhere in the tree
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent<string>).detail;
      reset();
      setSelected(null);
      setActiveMode(mode as typeof activeMode);
      setSidebarOpen(false);
    };
    window.addEventListener(NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(NAVIGATE_EVENT, handler);
  }, [reset]);

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
    maybeShowCustomizationHint();
  }

  function handleSmartExtractClick() {
    reset();
    setSelected(null);
    setActiveMode("smart");
    maybeShowCustomizationHint();
  }

  function handleMeetingTranscriberClick() {
    reset();
    setSelected(null);
    setActiveMode("meeting-transcriber");
    maybeShowCustomizationHint();
  }

  function handlePlannerClick() {
    reset();
    setSelected(null);
    setActiveMode("planner");
    maybeShowCustomizationHint();
  }

  function handleEmailsClick() {
    reset();
    setSelected(null);
    setActiveMode("emails");
    maybeShowCustomizationHint();
  }

  function handleAutomationsClick() {
    reset();
    setSelected(null);
    setActiveMode("automations");
    maybeShowCustomizationHint();
  }

  function handleAgentsIaClick() {
    reset();
    setSelected(null);
    setActiveMode("agents-ia");
    maybeShowCustomizationHint();
  }

  function handleAgentRapportClick() {
    reset();
    setSelected(null);
    setActiveMode("agent-rapport");
    maybeShowCustomizationHint();
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

  function handleQuiSommesNousClick() {
    reset();
    setSelected(null);
    setActiveMode("qui-sommes-nous");
  }

  function handleTarificationClick() {
    reset();
    setSelected(null);
    setActiveMode("tarification");
  }

  function handleDemoClick() {
    reset();
    setSelected(null);
    setActiveMode("demo");
  }

  const pageTitle = selected?.name ?? PAGE_TITLES[activeMode] ?? "Synthèse";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Welcome banner — hidden on /demo (action-oriented page) */}
      {activeMode !== "demo" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-violet-500 to-blue-500 px-3 sm:px-6 py-2 sm:py-2.5 text-center shadow-sm">
          <span className="text-[10px] sm:text-xs text-white">
            <Sparkles className="inline h-3 w-3 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">
              Bienvenue sur Synthèse — explorez librement nos fonctionnalités.
            </span>
            <span className="sm:hidden">Bienvenue sur Synthèse</span>
            <button
              onClick={() => navigate("/contact")}
              className="underline font-medium ml-1 hover:text-white/90 transition-colors"
            >
              Une question&nbsp;? Contactez-nous
            </button>
          </span>
        </div>
      )}

      {/* Floating CTA */}
      <button
        onClick={() => navigate("/contact")}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs sm:text-sm font-medium rounded-full hover:from-violet-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Prendre contact</span>
        <span className="sm:hidden">Contact</span>
      </button>

      {/* First-visit customization hint — discrete toast top-right */}
      {showCustomizationHint && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[52px] sm:top-[60px] right-3 sm:right-4 z-[60] w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-xs animate-toast-in"
        >
          <div className="flex items-start gap-3 rounded-xl border-l-4 border-l-violet-500 border-y border-r border-violet-100 bg-white px-3.5 py-3 shadow-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-blue-100">
              <Info className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1 pt-0.5 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Données d'exemple
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                Tout est personnalisable selon vos besoins et vos workflows.
              </p>
            </div>
            <button
              onClick={() => setShowCustomizationHint(false)}
              aria-label="Fermer"
              className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        onChatAssistantClick={() => { handleChatAssistantClick(); setSidebarOpen(false); }}
        chatAssistantModeActive={activeMode === "chat-assistant"}
        onSmartExtractClick={() => { handleSmartExtractClick(); setSidebarOpen(false); }}
        smartModeActive={activeMode === "smart"}
        onPhotoToDocumentClick={() => { reset(); setSelected(null); setActiveMode("photo-to-document"); setSidebarOpen(false); maybeShowCustomizationHint(); }}
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
        onQuiSommesNousClick={() => { handleQuiSommesNousClick(); setSidebarOpen(false); }}
        quiSommesNousModeActive={activeMode === "qui-sommes-nous"}
        onTarificationClick={() => { handleTarificationClick(); setSidebarOpen(false); }}
        tarificationModeActive={activeMode === "tarification"}
        onHomeClick={() => { handleHomeClick(); setSidebarOpen(false); }}
        onComprendreClick={() => { handleHomeClick(); setSidebarOpen(false); }}
        comprenderModeActive={activeMode === "home"}
        onDemoClick={() => { handleDemoClick(); setSidebarOpen(false); }}
        demoModeActive={activeMode === "demo"}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main area offset by sidebar + demo banner */}
      <div className={`lg:ml-60 flex flex-col h-screen ${activeMode !== "demo" ? "pt-[41px]" : ""}`}>
        {/* Topbar */}
        <Topbar pageTitle={pageTitle} onMenuClick={() => setSidebarOpen(true)} />

        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {activeMode === "home" && <HomeView onComprendreClick={handleComprendreClick} onRgpdClick={handleRgpdClick} />}

          {activeMode === "comprendre" && <ComprendreView />}

          {activeMode === "rgpd" && <RgpdView />}

          {activeMode === "features" && <FeaturesView />}

          {activeMode === "contact" && <ContactView />}

          {activeMode === "qui-sommes-nous" && <QuiSommesNousView />}

          {activeMode === "tarification" && <TarificationView />}

          {activeMode === "demo" && <DemoView />}

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

          <Footer />
        </main>
      </div>
    </div>
  );
}
