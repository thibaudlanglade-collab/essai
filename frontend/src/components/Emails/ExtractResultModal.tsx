import { X, Download } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    data?: Record<string, unknown> | null;
    error?: string | null;
  };
};

export default function ExtractResultModal({ open, onClose, result }: Props) {
  if (!open) return null;

  const handleDownloadJson = () => {
    const json = JSON.stringify(result.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extraction.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-gray-200 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-medium text-foreground">Résultat de l'extraction</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {result.success && result.data ? (
            <div className="space-y-3">
              {typeof (result.data as { text?: string }).text === "string" && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Texte extrait</span>
                    {typeof (result.data as { page_count?: number }).page_count === "number" && (
                      <span className="text-xs text-gray-400">
                        ({(result.data as { page_count: number }).page_count} page
                        {(result.data as { page_count: number }).page_count !== 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  {(result.data as { needs_vision?: boolean }).needs_vision && (
                    <p className="text-xs text-amber-600 mb-2">
                      Ce PDF contient principalement des images — le texte extrait peut être limité.
                    </p>
                  )}
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto leading-relaxed">
                    {(result.data as { text: string }).text || "(Aucun texte détecté)"}
                  </pre>
                </div>
              )}
              {typeof (result.data as { text?: string }).text !== "string" && (
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-y-auto leading-relaxed">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{result.error ?? "Erreur inconnue."}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          {result.success && result.data && (
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger en JSON
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
