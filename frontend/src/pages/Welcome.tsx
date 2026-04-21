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
import { markWelcomeSeen } from "@/hooks/useAuth";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";

export default function Welcome() {
  const { user } = useOutletContext<AuthContextShape>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const greeting = user.prospect_name?.trim()
    ? `Bonjour ${user.prospect_name.trim()},`
    : user.company_name?.trim()
      ? `Bonjour ${user.company_name.trim()},`
      : "Bonjour,";

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
    <div className="min-h-screen bg-stone-50 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-10 leading-tight">
          Bienvenue sur votre espace test Synthèse
        </h1>

        <p className="text-gray-800 mb-4">{greeting}</p>

        <p className="text-gray-800 mb-6 leading-relaxed">
          Voici votre accès personnel à Synthèse, pré-configuré pour votre
          activité BTP. Vous êtes connecté pour {user.days_left} jours sans
          limite d'utilisation.
        </p>

        <p className="text-gray-800 mb-6 leading-relaxed">
          Quelques points importants avant de commencer.
        </p>

        <div className="space-y-6 mb-10">
          <section className="bg-white rounded-lg p-5 border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              🔒 Vos données sont protégées
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Tout ce que vous testez reste dans votre espace personnel. Nous
              ne lisons rien, nous ne récupérons rien, nous ne partageons
              rien. À la fin de votre essai, toutes vos données sont
              supprimées définitivement.
            </p>
          </section>

          <section className="bg-white rounded-lg p-5 border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              🏗️ Conçu pour vous
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Votre espace est pré-rempli avec des données BTP pour que vous
              puissiez tester Synthèse avec du contenu réaliste. Vous pouvez
              aussi ajouter vos propres factures, devis, emails, clients.
              Tout ce que vous ajoutez reste dans votre espace.
            </p>
          </section>

          <section className="bg-white rounded-lg p-5 border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              ⚙️ Version test
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Certaines fonctionnalités (envoi d'emails, enchaînements
              sur-mesure, connexions enrichies) sont activées dans la version
              définitive, construite autour de votre activité. Pendant les
              14 jours, vous pouvez explorer ce que Synthèse fait, et nous en
              discutons ensuite ensemble.
            </p>
          </section>

          <section className="bg-white rounded-lg p-5 border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              💬 Une question ?
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-1">
              Contactez-moi directement.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Thibaud Langlade
              <br />
              <a
                href="mailto:contact@synthese.fr"
                className="text-gray-900 underline hover:no-underline"
              >
                contact@synthese.fr
              </a>
              <br />
              07 69 45 50 78
            </p>
          </section>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          type="button"
          onClick={handleEnter}
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-md hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Un instant…" : "Entrer dans mon espace"}
          {!submitting && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </div>
  );
}
