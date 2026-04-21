import { useEffect } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import type { MorningBriefing } from "../../api/emailsClient";

type Props = {
  briefing: MorningBriefing | null;
  loading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onGenerate: () => void;
  onMarkRead: () => void;
};

function parseMarkdown(md: string): string {
  return md
    // h3
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-foreground mt-4 mb-1">$1</h3>')
    // h2
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-5 mb-2">$1</h2>')
    // h1
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-5 mb-2">$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // bullet list items
    .replace(/^- (.+)$/gm, '<li class="text-sm text-muted-foreground ml-4 list-disc">$1</li>')
    // numbered list
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-muted-foreground ml-4 list-decimal">$1</li>')
    // wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, '<ul class="space-y-0.5 my-1">$&</ul>')
    // paragraphs: lines that aren't already HTML tags
    .replace(/^(?!<[a-z]).+$/gm, '<p class="text-sm text-muted-foreground leading-relaxed">$&</p>')
    // blank lines
    .replace(/^\s*$/gm, "");
}

export default function BriefingModal({
  briefing,
  loading,
  onClose,
  onRegenerate,
  onGenerate,
  onMarkRead,
}: Props) {
  // Mark as read when modal opens and briefing exists
  useEffect(() => {
    if (briefing && !briefing.is_read) {
      onMarkRead();
    }
  }, [briefing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formattedDate = briefing
    ? new Date(briefing.briefing_date + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          <h2 className="text-sm font-semibold text-foreground flex-1 truncate">
            {briefing ? `Briefing du ${formattedDate}` : "Briefing du jour"}
          </h2>
          {briefing && (
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Régénérer
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-5 w-5 text-gray-300 animate-spin" />
            </div>
          )}

          {!loading && !briefing && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Sparkles className="h-10 w-10 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Aucun briefing pour aujourd'hui
                </p>
                <p className="text-xs text-gray-400">
                  Générez votre premier briefing pour obtenir un résumé de vos
                  emails récents.
                </p>
              </div>
              <button
                onClick={onGenerate}
                className="bg-gray-900 text-white hover:bg-gray-800 px-5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Générer maintenant
              </button>
            </div>
          )}

          {!loading && briefing && (
            <div
              className="prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(briefing.content_markdown),
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          {briefing && (
            <span className="text-xs text-gray-400">
              {briefing.emails_analyzed_count} emails analysés ·{" "}
              {briefing.urgent_count} urgent
              {briefing.urgent_count !== 1 ? "s" : ""}
            </span>
          )}
          {!briefing && <span />}
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
