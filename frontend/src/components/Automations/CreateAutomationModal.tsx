import { useState } from "react";
import {
  Clock,
  FolderOpen,
  Mail,
  RefreshCw,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { Template } from "../../api/automationsClient";

type Props = {
  templates: Template[];
  onActivateTemplate: (
    templateId: string,
    customName?: string,
    overrides?: Record<string, unknown>,
  ) => Promise<unknown>;
  onCreateFromNL: (prompt: string) => Promise<Record<string, unknown>>;
  onConfirmNL: (config: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
};

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  cron: <Clock className="h-5 w-5" />,
  folder_watch: <FolderOpen className="h-5 w-5" />,
  email_new: <Mail className="h-5 w-5" />,
};

const TRIGGER_LABELS: Record<string, string> = {
  cron: "Planifié",
  folder_watch: "Dossier surveillé",
  email_new: "Email entrant",
};

const TEMPLATE_COLORS: Record<string, string> = {
  doc_inbox: "text-emerald-500",
  morning_briefing: "text-amber-500",
  urgent_emails: "text-red-500",
};

export default function CreateAutomationModal({
  templates,
  onActivateTemplate,
  onCreateFromNL,
  onConfirmNL,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"templates" | "nl">("templates");

  // Template tab state
  const [activating, setActivating] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState("C:\\Synthese\\Inbox");

  // NL tab state
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlPreview, setNlPreview] = useState<Record<string, unknown> | null>(null);
  const [nlConfirming, setNlConfirming] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  const handleActivateTemplate = async (tmpl: Template) => {
    setActivating(tmpl.id);
    try {
      const overrides =
        tmpl.id === "doc_inbox"
          ? { trigger_config: { folder_path: folderPath, extensions: [".pdf"] } }
          : undefined;
      await onActivateTemplate(tmpl.id, undefined, overrides);
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setActivating(null);
    }
  };

  const handleGenerate = async () => {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setNlError(null);
    setNlPreview(null);
    try {
      const preview = await onCreateFromNL(nlPrompt);
      setNlPreview(preview);
    } catch (err) {
      setNlError(String(err));
    } finally {
      setNlLoading(false);
    }
  };

  const handleConfirmNL = async () => {
    if (!nlPreview) return;
    setNlConfirming(true);
    try {
      await onConfirmNL(nlPreview);
      onClose();
    } catch (err) {
      setNlError(String(err));
    } finally {
      setNlConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <Zap className="h-4 w-4 text-violet-500 shrink-0" />
          <h2 className="text-sm font-semibold text-foreground flex-1">
            Nouvelle automatisation
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-6">
          {(["templates", "nl"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-2.5 border-b-2 transition-colors ${
                tab === t
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-gray-400 hover:text-muted-foreground"
              }`}
            >
              {t === "templates" ? "Templates" : "Description libre"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {/* ── Templates tab ─────────────────────────────────────────────── */}
          {tab === "templates" && (
            <div className="flex flex-col gap-4">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`mt-0.5 ${TEMPLATE_COLORS[tmpl.id] ?? "text-violet-500"}`}
                    >
                      {TRIGGER_ICONS[tmpl.trigger_type] ?? <Zap className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground">
                          {tmpl.name}
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-400">
                          {TRIGGER_LABELS[tmpl.trigger_type] ?? tmpl.trigger_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    </div>
                  </div>

                  {/* Actions preview */}
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {tmpl.actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-muted-foreground font-mono">
                          {a.skill_id}
                        </span>
                        {i < tmpl.actions.length - 1 && (
                          <span className="text-gray-400 text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Folder path override for doc_inbox */}
                  {tmpl.id === "doc_inbox" && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-400 block mb-1">
                        Dossier à surveiller
                      </label>
                      <input
                        type="text"
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-gray-300 outline-none focus:border-gray-300 font-mono"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => void handleActivateTemplate(tmpl)}
                    disabled={activating === tmpl.id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition-all disabled:opacity-50 font-medium"
                  >
                    {activating === tmpl.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    Activer ce template
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Description libre tab ─────────────────────────────────────── */}
          {tab === "nl" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Décris ton automatisation en français
                </label>
                <textarea
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  placeholder="Ex: Surveille mon dossier Factures, extrait chaque PDF et envoie-moi une notification avec le montant détecté"
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-gray-300 outline-none resize-none focus:border-gray-300"
                />
              </div>

              <button
                onClick={() => void handleGenerate()}
                disabled={nlLoading || !nlPrompt.trim()}
                className="self-start flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition-all disabled:opacity-50 font-medium"
              >
                {nlLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {nlLoading ? "Génération en cours…" : "Générer"}
              </button>

              {nlError && (
                <p className="text-xs text-red-500">{nlError}</p>
              )}

              {nlPreview && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-2 font-medium">
                    Prévisualisation générée
                  </p>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {String(nlPreview.name ?? "")}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {String(nlPreview.description ?? "")}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-400">
                      {String(nlPreview.trigger_type ?? "")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(nlPreview.actions as unknown[])?.length ?? 0} action(s)
                    </span>
                  </div>
                  <pre className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded p-2 overflow-x-auto mb-3">
                    {JSON.stringify(nlPreview, null, 2)}
                  </pre>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleConfirmNL()}
                      disabled={nlConfirming}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-50 font-medium"
                    >
                      {nlConfirming && (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      )}
                      Confirmer et activer
                    </button>
                    <button
                      onClick={() => setNlPreview(null)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground transition-all"
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
