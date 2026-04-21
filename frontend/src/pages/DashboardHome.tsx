/**
 * Sprint 1 dashboard placeholder.
 *
 * Real features (Smart Extract, Assistant Synthèse, Rapport client,
 * Email → Devis, boîte Gmail) come in Sprints 2-6. This page exists so
 * the `/dashboard` route resolves to something reassuring and on-brand
 * after the prospect clicks their cold-email link.
 */
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { logout } from "@/hooks/useAuth";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";

export default function DashboardHome() {
  const { user } = useOutletContext<AuthContextShape>();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const greeting = user.prospect_name?.trim()
    ? `Bonjour ${user.prospect_name.trim()}`
    : user.company_name?.trim()
      ? `Bonjour ${user.company_name.trim()}`
      : "Bonjour";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Even if logout fails, we still want to leave the authenticated view.
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2 leading-tight">
              {greeting}
            </h1>
            <p className="text-sm text-gray-500">
              Il vous reste {user.days_left} {user.days_left > 1 ? "jours" : "jour"} d'accès.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2 disabled:opacity-60"
          >
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>

        <section className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Votre espace est en cours de configuration
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Les fonctionnalités de votre espace test arrivent par vagues dans
            les prochains jours, pour vous proposer une vraie solution
            concrète à tester sur vos propres documents.
          </p>
          <ul className="text-sm text-gray-700 leading-relaxed space-y-2 pl-5 list-disc marker:text-gray-400">
            <li>Extraction automatique de vos factures, contrats et notes de chantier.</li>
            <li>Génération de devis à partir d'un email ou d'une description.</li>
            <li>Rapport client complet en quelques secondes.</li>
            <li>Assistant en langage naturel sur vos données.</li>
            <li>Lecture de votre boîte Gmail avec classement et résumé du matin.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Vos données restent dans votre espace
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Tout ce que vous ajoutez pendant vos 14 jours est isolé, chiffré,
            et supprimé définitivement à l'issue de votre essai. Aucun partage
            avec un autre prospect, aucune réutilisation de nos côtés.
          </p>
        </section>

        <section className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Une question pendant votre essai ?
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-1">
            Écrivez-moi ou appelez-moi directement, je vous réponds en
            personne.
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
    </div>
  );
}
