import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  FileText,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { useEmails } from "../../hooks/useEmails";
import { listTopics, type EmailTopic } from "../../api/emailTopicsClient";
import TopicBadge from "./TopicBadge";
import PriorityBadge from "./PriorityBadge";
import BriefingModal from "./BriefingModal";
import TopicsSettingsModal from "./TopicsSettingsModal";
import AttachmentsList from "./AttachmentsList";
import EmailsPresentation from "./EmailsPresentation";
import DemoMailbox from "./DemoMailbox";
import EmailHtmlBody from "./EmailHtmlBody";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

const PRIORITY_CHIPS = [
  { value: null, label: "Toutes priorités", activeClass: "bg-gray-100 border-gray-300 text-gray-900" },
  { value: "urgent", label: "Urgent", activeClass: "bg-red-50 border-red-200 text-red-600" },
  { value: "important", label: "Important", activeClass: "bg-amber-50 border-amber-200 text-amber-600" },
  { value: "normal", label: "Normal", activeClass: "bg-blue-50 border-blue-200 text-blue-600" },
  { value: "low", label: "Faible", activeClass: "bg-gray-100 border-gray-200 text-gray-500" },
] as const;

type Props = { onExit: () => void };

export default function EmailsView({ onExit: _onExit }: Props) {
  const navigate = useNavigate();
  const [demoView, setDemoView] = useState<"presentation" | "mailbox" | null>(null);
  const {
    status,
    emails,
    selectedEmail,
    stats,
    loading,
    error,
    selectedEmailId,
    filters,
    briefing,
    briefingLoading,
    draftLoading,
    currentDraft,
    setFilter,
    selectEmail,
    toggleStarred,
    archive,
    triggerSync,
    connectGmail: _connectGmail,
    disconnectGmail,
    markAsRead,
    refreshBriefing,
    doRegenerateBriefing,
    doMarkBriefingRead,
    generateEmailDraft,
    clearDraft,
    sendEmailReply,
  } = useEmails();

  // Topics list for filter chips + badge rendering
  const [topics, setTopics] = useState<EmailTopic[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, EmailTopic>>({});
  useEffect(() => {
    listTopics()
      .then((list) => {
        setTopics(list);
        const map: Record<string, EmailTopic> = {};
        list.forEach((t) => { map[t.name] = t; });
        setTopicsMap(map);
      })
      .catch(() => {/* non-fatal */});
  }, []);

  // Modals
  const [showBriefing, setShowBriefing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Reply drawer state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyInstructions, setReplyInstructions] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // When draft changes, populate the textarea
  useEffect(() => {
    if (currentDraft !== null) {
      setReplyText(currentDraft);
    }
  }, [currentDraft]);

  // When email changes, close the reply drawer
  useEffect(() => {
    setReplyOpen(false);
    clearDraft();
    setReplyText("");
    setReplyInstructions("");
    setReplyError(null);
  }, [selectedEmail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenReply = () => {
    setReplyOpen(true);
    setReplyText("");
    setReplyInstructions("");
    setReplyError(null);
    if (selectedEmail) {
      void generateEmailDraft(selectedEmail.id, "");
    }
  };

  const handleRegenerate = () => {
    if (selectedEmail) {
      void generateEmailDraft(selectedEmail.id, replyInstructions);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      await sendEmailReply(selectedEmail.id, replyText);
      setReplyOpen(false);
      setReplyText("");
    } catch (err) {
      setReplyError(String(err));
    } finally {
      setReplySending(false);
    }
  };

  const hasBriefingBadge = briefing && !briefing.is_read;

  // Resizable split between the email list (left) and the detail pane (right).
  // Persisted in localStorage so the prospect keeps their preferred layout.
  const MIN_LIST_WIDTH = 260;
  const MAX_LIST_WIDTH = 560;
  const [listWidth, setListWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("synthese.emails.listWidth");
      if (stored) {
        const n = parseInt(stored, 10);
        if (!Number.isNaN(n) && n >= MIN_LIST_WIDTH && n <= MAX_LIST_WIDTH) return n;
      }
    } catch { /* localStorage unavailable */ }
    return 340;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      // The split x-origin is the left edge of the dashboard content area
      // (the sidebar is fixed 240px on large screens). Resolve by clientX
      // relative to the aside bounding rect.
      const aside = document.getElementById("emails-list-pane");
      if (!aside) return;
      const rect = aside.getBoundingClientRect();
      const next = Math.min(
        MAX_LIST_WIDTH,
        Math.max(MIN_LIST_WIDTH, e.clientX - rect.left),
      );
      setListWidth(next);
    };
    const onUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem("synthese.emails.listWidth", String(listWidth));
      } catch { /* ignore */ }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, listWidth]);

  // Once Gmail is connected, force the real mailbox — any stale demo state
  // (user clicked "Visualiser la démo" earlier) must not hide the real inbox.
  useEffect(() => {
    if (status?.connected && demoView !== null) {
      setDemoView(null);
    }
  }, [status?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo flow only applies when Gmail is NOT connected.
  if (!status?.connected) {
    if (demoView === "mailbox") {
      return <DemoMailbox onBack={() => setDemoView("presentation")} />;
    }
    return <EmailsPresentation onVisualize={() => setDemoView("mailbox")} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Modals */}
      {showBriefing && (
        <BriefingModal
          briefing={briefing}
          loading={briefingLoading}
          onClose={() => setShowBriefing(false)}
          onRegenerate={() => void doRegenerateBriefing()}
          onGenerate={() => void doRegenerateBriefing()}
          onMarkRead={() => void doMarkBriefingRead()}
        />
      )}
      {showSettings && (
        <TopicsSettingsModal
          onClose={() => {
            setShowSettings(false);
            listTopics()
              .then((list) => {
                setTopics(list);
                const map: Record<string, EmailTopic> = {};
                list.forEach((t) => { map[t.name] = t; });
                setTopicsMap(map);
              })
              .catch(() => {/* non-fatal */});
          }}
        />
      )}

      {/* ── ACTION BAR ─────────────────────────────────────────────────── */}
      {status?.connected && (
        <div className="shrink-0 border-b border-violet-100/60 dark:border-gray-800 flex items-center px-6 py-3 gap-3 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
          {/* Briefing button */}
          <button
            onClick={() => { setShowBriefing(true); void refreshBriefing(); }}
            className={`relative flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all font-medium ${
              hasBriefingBadge
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Briefing du jour
            {hasBriefingBadge && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" />
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900 transition-all"
            title="Paramètres des catégories"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <span className="text-xs text-gray-400">
            {status.email_address}
            {status.last_sync_at && (
              <> · Synchro {timeAgo(status.last_sync_at)}</>
            )}
          </span>
          <button
            onClick={() => void triggerSync()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
          <button
            onClick={() => void disconnectGmail()}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
          >
            Déconnecter
          </button>
        </div>
      )}

      {/* ── ERROR BANNER ────────────────────────────────────────────────── */}
      {error && (
        <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-600 shrink-0">
          {error}
        </div>
      )}

      {/* ── NOT CONNECTED — handled by presentation page above ──────── */}

      {/* ── TWO-PANE LAYOUT ─────────────────────────────────────────────── */}
      {status?.connected && (
        <div className="flex flex-1 min-h-0">

          {/* ── LEFT PANE ───────────────────────────────────────────────── */}
          <aside
            id="emails-list-pane"
            style={{ width: `${listWidth}px` }}
            className="shrink-0 border-r border-violet-100/60 dark:border-gray-800 flex flex-col min-h-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
          >

            {/* Filters header — fixed, does not scroll */}
            <div className="shrink-0 border-b border-gray-100">

              {/* Stats row */}
              {stats && (
                <div className="flex gap-1.5 px-4 pt-4 pb-2 flex-wrap">
                  {(
                    [
                      { label: "Total", value: stats.total },
                      { label: "Non lus", value: stats.unread },
                      { label: "Étoilés", value: stats.starred },
                      { label: "Aujourd'hui", value: stats.today },
                    ] as const
                  ).map(({ label, value }) => (
                    <span
                      key={label}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500"
                    >
                      {label}{" "}
                      <span className="text-gray-900 font-medium">{value}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={filters.search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                               placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Unread / Starred toggles */}
              <div className="flex items-center gap-2 px-4 pb-3">
                <button
                  onClick={() => setFilter("unreadOnly", !filters.unreadOnly)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                    filters.unreadOnly
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Non lus
                </button>
                <button
                  onClick={() => setFilter("starredOnly", !filters.starredOnly)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                    filters.starredOnly
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Étoilés
                </button>
              </div>

              {/* Priority filter chips */}
              <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
                {PRIORITY_CHIPS.map(({ value, label, activeClass }) => {
                  const isActive = filters.priority === value;
                  return (
                    <button
                      key={label}
                      onClick={() => setFilter("priority", isActive ? null : value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isActive
                          ? activeClass
                          : "bg-transparent border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Topic filter chips */}
              {topics.length > 0 && (
                <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
                  <button
                    onClick={() => setFilter("topic", null)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      filters.topic === null
                        ? "bg-gray-100 border-gray-300 text-gray-900"
                        : "bg-transparent border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    Tous
                  </button>
                  {topics.map((t) => {
                    const isActive = filters.topic === t.name;
                    const r = parseInt(t.color.slice(1, 3), 16);
                    const g = parseInt(t.color.slice(3, 5), 16);
                    const b = parseInt(t.color.slice(5, 7), 16);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setFilter("topic", isActive ? null : t.name)}
                        style={
                          isActive
                            ? {
                                backgroundColor: `rgba(${r},${g},${b},0.1)`,
                                borderColor: `rgba(${r},${g},${b},0.3)`,
                                color: t.color,
                              }
                            : undefined
                        }
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isActive
                            ? ""
                            : "bg-transparent border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Email list — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {emails.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Inbox className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Aucun email. Cliquez sur Actualiser pour synchroniser.
                  </p>
                </div>
              )}
              {loading && emails.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-5 w-5 text-gray-300 animate-spin" />
                </div>
              )}
              {emails.map((email) => {
                const senderLabel = email.from_name || email.from_email || "?";
                const initials = senderLabel
                  .replace(/[<>"]/g, "")
                  .split(/[\s@.]+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("") || "?";
                // Stable color from sender string
                let hash = 0;
                for (let i = 0; i < senderLabel.length; i++) {
                  hash = (hash * 31 + senderLabel.charCodeAt(i)) >>> 0;
                }
                const palette = [
                  "bg-violet-100 text-violet-700",
                  "bg-blue-100 text-blue-700",
                  "bg-emerald-100 text-emerald-700",
                  "bg-amber-100 text-amber-700",
                  "bg-rose-100 text-rose-700",
                  "bg-cyan-100 text-cyan-700",
                  "bg-indigo-100 text-indigo-700",
                  "bg-pink-100 text-pink-700",
                ];
                const avatarClass = palette[hash % palette.length];
                const previewText = (email.ai_summary || email.snippet || "").trim();
                return (
                  <button
                    key={email.id}
                    onClick={() => {
                      void selectEmail(email.id);
                      if (!email.is_read) void markAsRead(email.id);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex gap-3 ${
                      selectedEmailId === email.id ? "bg-blue-50/50" : ""
                    } ${!email.is_read ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 pt-0.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarClass}`}
                      >
                        {initials}
                      </div>
                      {!email.is_read && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            email.is_read
                              ? "text-gray-600"
                              : "text-gray-900 font-semibold"
                          }`}
                        >
                          {senderLabel}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {email.is_starred && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          )}
                          <span className={`text-[11px] shrink-0 ${
                            email.is_read ? "text-gray-400" : "text-blue-600 font-medium"
                          }`}>
                            {timeAgo(email.received_at)}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-[13px] truncate ${
                          email.is_read ? "text-gray-600" : "text-gray-900 font-medium"
                        }`}
                      >
                        {email.subject || "(sans objet)"}
                      </p>
                      {previewText && (
                        <div className="mt-1 flex items-start gap-1.5">
                          {email.ai_summary && (
                            <Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-violet-400" />
                          )}
                          <p className="text-xs text-gray-500 line-clamp-2 leading-snug">
                            {previewText}
                          </p>
                        </div>
                      )}
                      {(email.topic || email.priority || (email.attachments_count ?? 0) > 0) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {email.topic && (
                            <TopicBadge topic={topicsMap[email.topic]} size="sm" />
                          )}
                          {email.priority && (
                            <PriorityBadge priority={email.priority} size="sm" />
                          )}
                          {(email.attachments_count ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                              <Paperclip className="h-3 w-3" />
                              {email.attachments_count}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── RESIZE HANDLE ──────────────────────────────────────────── */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionner la liste d'emails"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
            onDoubleClick={() => setListWidth(340)}
            className={`shrink-0 w-1 cursor-col-resize bg-gray-200 hover:bg-violet-300 transition-colors ${
              isResizing ? "bg-violet-400" : ""
            }`}
            title="Glissez pour ajuster, double-clic pour réinitialiser"
          />

          {/* ── RIGHT PANE ──────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            {!selectedEmail && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Mail className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Sélectionnez un email à gauche
                  </p>
                </div>
              </div>
            )}

            {selectedEmail && (
              <>
                {/* Email header: subject + badges + sender */}
                <div className="shrink-0 border-b border-gray-100 px-8 py-5">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedEmail.subject || "(sans objet)"}
                  </h2>
                  {(selectedEmail.topic || selectedEmail.priority) && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {selectedEmail.topic && (
                        <TopicBadge topic={topicsMap[selectedEmail.topic]} size="md" />
                      )}
                      {selectedEmail.priority && (
                        <PriorityBadge priority={selectedEmail.priority} size="md" />
                      )}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="text-gray-900 font-medium">
                          {selectedEmail.from_name || selectedEmail.from_email}
                        </span>
                        {selectedEmail.from_name && (
                          <span className="ml-1 text-gray-400">
                            &lt;{selectedEmail.from_email}&gt;
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(selectedEmail.received_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void toggleStarred(selectedEmail.id)}
                        className={`p-2 rounded-lg border transition-all ${
                          selectedEmail.is_starred
                            ? "bg-amber-50 border-amber-200 text-amber-500"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-amber-500"
                        }`}
                        title="Étoile"
                      >
                        <Star className={`h-4 w-4 ${selectedEmail.is_starred ? "fill-amber-400" : ""}`} />
                      </button>
                      <button
                        onClick={() => void archive(selectedEmail.id)}
                        className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900 transition-all"
                        title="Archiver"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void markAsRead(selectedEmail.id)}
                        className="p-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900 transition-all"
                        title="Marquer non lu"
                      >
                        <MailOpen className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action row + Summary (en haut, avant le corps) */}
                <div className="shrink-0 border-b border-gray-100 px-8 py-3 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleOpenReply}
                      className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium transition-all
                        bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 shadow-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      Répondre avec Synthèse
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/dashboard/devis?from_email=${encodeURIComponent(String(selectedEmail.id))}`)
                      }
                      className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 transition-all"
                      title="Créer un devis à partir du contenu de cet email"
                    >
                      <FileText className="h-4 w-4" />
                      Créer un devis
                    </button>
                  </div>

                  {selectedEmail.ai_summary && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-700">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">
                          Résumé
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed break-words">
                        {selectedEmail.ai_summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Email body — HTML rendu dans un iframe sandboxé, plain text en fallback */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {selectedEmail.body_html ? (
                    <EmailHtmlBody html={selectedEmail.body_html} />
                  ) : selectedEmail.body_plain ? (
                    <pre className="px-8 py-5 whitespace-pre-wrap break-words text-sm text-gray-700 font-sans leading-relaxed max-w-full">
                      {selectedEmail.body_plain}
                    </pre>
                  ) : (
                    <p className="px-8 py-5 text-sm text-gray-400">
                      Corps du message non disponible.
                    </p>
                  )}
                </div>

                {/* Attachments list */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <AttachmentsList
                    attachments={selectedEmail.attachments}
                    emailId={selectedEmail.id}
                  />
                )}

                {/* Reply drawer */}
                {replyOpen && (
                  <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                    {replyError && (
                      <p className="text-xs text-red-500">{replyError}</p>
                    )}
                    {draftLoading && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Génération du brouillon…
                      </div>
                    )}
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Votre réponse…"
                      rows={6}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none resize-none
                                 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyInstructions}
                        onChange={(e) => setReplyInstructions(e.target.value)}
                        placeholder="Instructions supplémentaires (optionnel)…"
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 placeholder:text-gray-400 outline-none
                                   focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <button
                        onClick={handleRegenerate}
                        disabled={draftLoading}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-all disabled:opacity-50 font-medium"
                      >
                        <RefreshCw className={`h-3 w-3 ${draftLoading ? "animate-spin" : ""}`} />
                        Régénérer
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleSendReply()}
                        disabled={replySending || !replyText.trim()}
                        className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all disabled:opacity-50 font-medium shadow-sm"
                      >
                        {replySending && <RefreshCw className="h-3 w-3 animate-spin" />}
                        Envoyer
                      </button>
                      <button
                        onClick={() => {
                          setReplyOpen(false);
                          clearDraft();
                          setReplyText("");
                        }}
                        className="text-xs px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
