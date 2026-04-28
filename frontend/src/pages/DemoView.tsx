import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Mail,
  Rocket,
  Sparkles,
} from "lucide-react";
import { getTrial, setTrialResumeUrl, daysRemaining } from "../lib/trial";
import { startAnonymousTrial } from "../lib/trialApi";

export default function DemoView() {
  const [code, setCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const existingTrial = getTrial();

  async function handleStartTrial() {
    // Returning visitor who already has a minted token — jump straight back
    // into the same trial. Cheap: no backend call, no new seed.
    if (existingTrial?.resumeUrl) {
      window.location.href = existingTrial.resumeUrl;
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      const { access_url } = await startAnonymousTrial();
      // Preserves existing id + startedAt if any — returning visitors without
      // a resumeUrl don't get their 14-day counter reset.
      setTrialResumeUrl(access_url);
      // Survives the full-page redirect — App.tsx reads it on mount and shows
      // the "welcome to your trial" toast once, then clears it.
      try {
        localStorage.setItem("synthese-trial-just-activated", "1");
      } catch {
        // localStorage unavailable — the toast just won't fire, flow still works
      }
      window.location.href = access_url;
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Impossible de créer votre démo."
      );
      setStarting(false);
    }
  }

  function handleCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    window.location.href = `/app/${encodeURIComponent(trimmed)}`;
  }

  const codeEmpty = code.trim().length === 0;
  const remaining = existingTrial ? daysRemaining(existingTrial) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
      {/* BLOC 1 — Titre et sous-titre */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-gray-900 tracking-tight mb-4 sm:mb-5 leading-tight">
          Obtenez votre aperçu
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Synthèse propose des espaces personnalisés adaptés à votre manière
          de travailler. Choisissez celui qui vous ressemble, explorez-le
          avec vos propres données pendant 14 jours.
        </p>
      </div>

      {/* BLOC 2 — Single CTA card: start or resume 14-day trial */}
      <div className="max-w-3xl mx-auto mb-16 sm:mb-20">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 p-8 sm:p-10 md:p-12 text-center shadow-lg shadow-violet-500/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(#7c3aed 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
            aria-hidden
          />

          <div className="relative z-10 flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/80 text-violet-700 border border-violet-200 mb-5">
              <Sparkles className="h-3 w-3" />
              14 jours offerts · sans engagement
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4 leading-tight tracking-tight max-w-2xl">
              Essayez nos fonctionnalités gratuitement avec vos données pendant 14 jours
            </h2>

            <p className="text-sm sm:text-base text-gray-700 mb-7 max-w-xl mx-auto leading-relaxed">
              Un seul clic suffit. Pas de carte bancaire, pas de formulaire, pas d'attente — votre démo est créée instantanément.
            </p>

            <button
              onClick={handleStartTrial}
              disabled={starting}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
            >
              {starting ? (
                <span className="inline-block h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              {starting
                ? "Création de votre démo…"
                : existingTrial?.resumeUrl
                  ? `Reprendre ma démo${remaining !== null ? ` · ${remaining} jour${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}` : ""}`
                  : "Commencer ma démo gratuite"}
            </button>

            {startError && (
              <p className="mt-3 text-xs text-red-600">
                {startError} Réessayez dans un instant.
              </p>
            )}

            <p className="mt-4 text-[11px] sm:text-xs text-gray-500">
              Accès immédiat · Aucune inscription · Aucune carte bancaire
            </p>
          </div>
        </div>
      </div>

      {/* BLOC 3 — Unified action section (code d'accès + espace personnalisé) */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Code d'accès */}
        <div className="px-6 sm:px-8 py-8 sm:py-10 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 tracking-tight">
            Vous avez déjà un code d'accès&nbsp;?
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 sm:mb-7 max-w-lg mx-auto">
            Si Synthèse vous a envoyé un code personnalisé, entrez-le ici pour
            accéder directement à votre espace.
          </p>

          <form
            onSubmit={handleCodeSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Entrez votre code"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
            <button
              type="submit"
              disabled={codeEmpty}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              Accéder à mon espace
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Divider interne */}
        <div className="h-px bg-gray-100 mx-6 sm:mx-8" aria-hidden />

        {/* Espace personnalisé */}
        <div className="px-6 sm:px-8 py-8 sm:py-10 text-center bg-gradient-to-br from-violet-50/40 via-white to-blue-50/40">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 tracking-tight leading-tight">
            Vous souhaitez un espace personnalisé pour votre activité&nbsp;?
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-lg mx-auto">
            Si vous voulez une version construite spécifiquement pour votre
            métier ou votre manière de travailler, nous pouvons la préparer
            pour vous.
          </p>

          <a
            href="mailto:thibaud@synthese.app?subject=Demande%20d'un%20espace%20personnalis%C3%A9"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-violet-600 text-sm font-semibold rounded-xl border border-violet-300 hover:bg-violet-50 hover:border-violet-400 transition-all"
          >
            <Mail className="h-4 w-4" />
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}
