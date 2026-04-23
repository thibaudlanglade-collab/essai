import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { getConsent, setConsent } from "../lib/analytics";

const OPEN_EVENT = "synthese-open-cookie-consent";

export function openCookieConsent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
    const handler = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent("granted");
    setVisible(false);
  }

  function refuse() {
    setConsent("denied");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Préférences cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md z-[70] animate-toast-in"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100">
            <Cookie className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Cookies de mesure d'audience
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Nous utilisons Google Analytics pour comprendre comment notre site est utilisé
              et l'améliorer. Aucune donnée n'est partagée à des fins publicitaires.
              Vous pouvez modifier votre choix à tout moment depuis le pied de page.
            </p>
            <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
              <button
                onClick={refuse}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={accept}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all"
              >
                Accepter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
