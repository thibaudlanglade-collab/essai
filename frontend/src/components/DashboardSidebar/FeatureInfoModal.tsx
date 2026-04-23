import { X, Check, Lightbulb, Clock } from "lucide-react";
import type { FeatureInfo } from "@/data/featureInfos";

type Props = {
  open: boolean;
  onClose: () => void;
  info: FeatureInfo | null;
};

export default function FeatureInfoModal({ open, onClose, info }: Props) {
  if (!open || !info) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              {info.title}
            </h2>
            {info.status === "soon" && (
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                <Clock className="h-3 w-3" />
                {info.soonLabel ?? "Bientôt disponible"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-gray-700 leading-relaxed">
          <p>{info.summary}</p>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Comment ça marche
            </h3>
            <ol className="space-y-2.5">
              {info.howItWorks.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Exemples d'utilisation
            </h3>
            <ul className="space-y-2">
              {info.examples.map((example, i) => (
                <li key={i} className="flex gap-2.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
