import { useEffect, useState } from "react";
import { Rocket, X } from "lucide-react";
import { useNavigate } from "../lib/navigate";

const DISMISS_KEY = "synthese-demo-preview-popup-dismissed";

export default function DemoPreviewPopup() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // sessionStorage unavailable — still show
    }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  function handleClick() {
    navigate("/demo");
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Essayer avec vos propres données"
      className="fixed top-[52px] sm:top-[60px] left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-[55] animate-toast-in"
    >
      <div className="relative rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-blue-50 shadow-xl shadow-violet-500/10 px-4 py-3.5 pr-9">
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute top-2 right-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-md shadow-violet-500/20">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              Essayez avec vos propres données
            </p>
            <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
              Et des fonctionnalités adaptées à votre métier, gratuitement.
            </p>
            <button
              onClick={handleClick}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Obtenez un aperçu
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
