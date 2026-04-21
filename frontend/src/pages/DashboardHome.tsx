/**
 * Dashboard landing inside the protected shell.
 *
 * Mounted at `/dashboard`. The shell (DashboardShell) provides the
 * sidebar, topbar (days-left, prospect name, logout) — this component
 * focuses on the greeting + the per-sprint feature announcements.
 */
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";


export default function DashboardHome() {
  const { user } = useOutletContext<AuthContextShape>();
  const navigate = useNavigate();

  const greeting = user.prospect_name?.trim()
    ? `Bonjour ${user.prospect_name.trim()}`
    : user.company_name?.trim()
      ? `Bonjour ${user.company_name.trim()}`
      : "Bonjour";

  return (
    <div className="py-12 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2 leading-tight">
            {greeting}
          </h2>
          <p className="text-sm text-gray-500">
            Votre espace test est prêt. Utilisez le menu à gauche pour
            circuler. Les fonctionnalités se débloquent au fil de votre essai.
          </p>
        </div>

        <section className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Commencer avec Smart Extract
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-900">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Prêt
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Déposez une photo, un PDF ou un texte. Synthèse identifie le type
            de document (facture, contrat, note de chantier), extrait les
            informations utiles, et vous propose un rangement que vous pouvez
            ajuster avant de valider.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard/extract")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Ouvrir Smart Extract
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/automations")}
              className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
            >
              Voir les automatisations →
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Le reste de votre espace arrive
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Les fonctionnalités ci-dessous dans le menu latéral (marquées
            « Bientôt ») se déverrouillent au fil des prochains jours.
          </p>
          <ul className="text-sm text-gray-700 leading-relaxed space-y-2 pl-5 list-disc marker:text-gray-400">
            <li>Assistant Synthèse : posez vos questions en langage naturel sur vos données.</li>
            <li>Rapport client : dashboard complet par client en quelques secondes.</li>
            <li>Email → Devis : devis structuré à partir d'un email ou d'une description.</li>
            <li>Boîte Gmail : classement et résumé du matin, en lecture seule.</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Vos données restent dans votre espace
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Tout ce que vous ajoutez pendant vos {user.days_left} jours
            restants est isolé, chiffré, et supprimé définitivement à
            l'issue de votre essai. Aucun partage avec un autre prospect,
            aucune réutilisation de nos côtés.
          </p>
        </section>

        <section className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Une question pendant votre essai ?
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-1">
            Écrivez-moi ou appelez-moi directement, je vous réponds en personne.
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
