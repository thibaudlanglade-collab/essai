/**
 * First-visit welcome page for a prospect.
 *
 * Shown only when `access_tokens.welcome_shown = false`. Clicking
 * "Entrer dans mon espace" flips the flag on the backend and navigates
 * to the dashboard. Subsequent activations redirect straight to
 * `/dashboard` and this page is never shown again.
 *
 * Copy follows the Synthèse brand guide: vouvoiement, no "IA" / no
 * "aider" / no "automatisation", no long dashes, no over-promises.
 */
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ShieldCheck,
  Sparkles,
  Wrench,
  Mail,
  ArrowRight,
  Clock,
  Lock,
  Server,
  Trash2,
} from "lucide-react";
import { markWelcomeSeen } from "@/hooks/useAuth";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";

export default function Welcome() {
  const { user } = useOutletContext<AuthContextShape>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const daysLeft = user.days_left;

  async function handleEnter() {
    setSubmitting(true);
    setError(null);
    try {
      await markWelcomeSeen();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue, veuillez réessayer.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 mb-5">
            <Clock className="h-3 w-3" />
            {daysLeft > 1
              ? `${daysLeft} jours pour explorer`
              : daysLeft === 1
                ? "Dernier jour de votre essai"
                : "Essai terminé"}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-4 leading-tight tracking-tight">
            Bienvenue sur Synthèse
          </h1>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-2xl">
            Voici votre espace test personnel. Avant de commencer, trois
            choses rapides à savoir.
          </p>
        </div>

        {/* RGPD card — emerald */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 p-6 sm:p-7 mb-5 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">
                Vos données sont protégées
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                Tout ce que vous testez reste dans votre espace personnel.
                Nous ne lisons rien, nous ne récupérons rien, nous ne
                partageons rien. À la fin de votre essai, vos données sont
                supprimées définitivement.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-16">
            <span className="inline-flex items-center gap-2 bg-white/80 border border-emerald-200/60 text-[13px] text-gray-700 px-3 py-1.5 rounded-full">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              Espace isolé, chiffré
            </span>
            <span className="inline-flex items-center gap-2 bg-white/80 border border-emerald-200/60 text-[13px] text-gray-700 px-3 py-1.5 rounded-full">
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              Hébergement en France
            </span>
            <span className="inline-flex items-center gap-2 bg-white/80 border border-emerald-200/60 text-[13px] text-gray-700 px-3 py-1.5 rounded-full">
              <Trash2 className="h-3.5 w-3.5 text-emerald-600" />
              Suppression à l'issue de l'essai
            </span>
          </div>
        </div>

        {/* Testez avec vos données — violet */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-fuchsia-50/40 to-pink-50 p-6 sm:p-7 mb-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Wrench className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">
                Testez avec vos données
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                Importez vos factures, devis, clients, emails et voyez ce que
                Synthèse en fait. Chaque document que vous ajoutez reste dans
                votre espace, vous seul y avez accès.
              </p>
            </div>
          </div>
        </div>

        {/* Version test — indigo */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-violet-50/40 to-blue-50 p-6 sm:p-7 mb-10 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Sparkles className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">
                Vous voyez un extrait
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                Ces 14 jours vous donnent accès à un aperçu de ce que fait
                Synthèse. Les enchaînements sur-mesure, l'envoi d'emails et
                les connexions enrichies s'activent dans la version
                construite autour de votre activité — on en discute quand
                vous voulez.
              </p>
            </div>
          </div>
        </div>

        {/* CTA + contact */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
          <button
            type="button"
            onClick={handleEnter}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
          >
            {submitting ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Un instant…
              </>
            ) : (
              <>
                Entrer dans mon espace
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </>
            )}
          </button>
        </div>

        {/* Contact */}
        <div className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
          <Mail className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <p>
            Une question pendant votre essai&nbsp;? Écrivez-moi ou appelez-moi,
            je vous réponds en personne.
            <br />
            <span className="font-semibold text-gray-900">
              Thibaud Langlade
            </span>{" "}
            ·{" "}
            <a
              href="mailto:contact@synthese.fr"
              className="underline underline-offset-2 hover:text-gray-900"
            >
              contact@synthese.fr
            </a>{" "}
            · 07&nbsp;69&nbsp;45&nbsp;50&nbsp;78
          </p>
        </div>
      </div>
    </div>
  );
}
