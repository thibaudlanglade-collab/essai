import {
  Building2, MapPin, Mail, Phone, Sparkles,
  RefreshCw,
  Eye, Handshake,
} from "lucide-react"
import { useNavigate } from "../lib/navigate"

export default function QuiSommesNousView() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
          <Building2 className="h-7 w-7 text-violet-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5 tracking-tight">
          À l'origine de Synthèse
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Une idée née d'un constat simple : les pros passent trop
          d'heures à dompter des logiciels pensés pour quelqu'un d'autre.
          Alors on a pris la feuille blanche. Depuis, chaque
          Synthèse se construit comme un costume sur-mesure — avec vous,
          pour votre métier, à votre rythme. Pas un outil de plus. Le vôtre.
        </p>
      </div>


      {/* NOS VALEURS */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">
          Ce qu'on croit
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
              <Handshake className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Le sur-mesure, toujours
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Chaque entreprise a sa façon de travailler. Un outil
              générique ne peut pas convenir à tout le monde. On construit
              autour de vous, pas l'inverse.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
              <Eye className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              La transparence
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pas de jargon, pas de promesses exagérées, pas de coûts
              cachés. On vous dit ce qu'on fait, comment on le fait, et
              combien ça coûte. Point.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
              <RefreshCw className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              L'amélioration continue
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Rien n'est parfait du premier coup. On fait des audits
              réguliers, on ajuste, on améliore. Votre outil évolue
              chaque semaine.
            </p>
          </div>
        </div>
      </div>


      {/* COMMENT ON TRAVAILLE */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Comment ça se passe, concrètement
        </h2>
        <p className="text-base text-gray-600 mb-8">
          De votre premier appel à un outil qui tourne au quotidien,
          voici les étapes.
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-bold text-violet-600">1</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">On échange — 30 minutes</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Premier rendez-vous gratuit. On écoute : quels outils vous
                utilisez, comment vous travaillez, ce qui vous prend du
                temps, ce qui vous frustre. On ne vend rien, on comprend.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-bold text-violet-600">2</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">On décortique ensemble — 1 semaine</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                On identifie les axes d'amélioration concrets : quels
                flux automatiser, quelles données croiser, quels outils
                connecter. On vous propose une configuration précise.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-bold text-violet-600">3</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">On développe la V1 — 1 à 2 semaines</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Vous recevez votre Synthèse configuré autour de votre
                activité. Vous testez au quotidien, avec vos vrais
                documents, vos vrais emails, vos vrais clients.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-bold text-violet-600">4</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Vous faites un retour, on améliore</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                « Le tri des emails est parfait, mais j'aimerais aussi
                que les commandes se mettent à jour dans mon Excel. »
                → On l'ajoute. C'est ça, l'avantage du sur-mesure.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-bold text-violet-600">5</span>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Et ainsi de suite</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chaque semaine, on affine. Chaque mois, votre outil est
                meilleur. Au bout de 3 mois, vous avez un Synthèse qui
                correspond exactement à votre façon de travailler. Et
                qui continue d'évoluer avec vous.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* NOS RÉFÉRENCES */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Ils nous font confiance
        </h2>
        <p className="text-base text-gray-600 mb-8">
          Trois entreprises, trois métiers différents, un même résultat.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* CAS 1 — Durand BTP */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <span className="text-lg">🔨</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Durand BTP</h3>
                <p className="text-xs text-gray-500">14 employés</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
              Jean-Michel passait 8h par semaine sur ses devis et 5h à
              replanifier ses équipes chaque lundi. Les rapports de chantier
              traînaient 2 semaines.
            </p>

            <div className="space-y-2 mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Devis</span>
                <span className="text-xs font-semibold text-violet-600">5 min au lieu de 90</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Planning</span>
                <span className="text-xs font-semibold text-violet-600">Automatique chaque lundi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Temps récupéré</span>
                <span className="text-xs font-bold text-green-600">13h / semaine</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mt-auto">
              <p className="text-xs text-gray-700 italic leading-relaxed">
                « On a récupéré presque 2 jours par semaine. Je rentre chez
                moi à 18h maintenant. »
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                — Jean-Michel D., gérant
              </p>
            </div>
          </div>

          {/* CAS 2 — Précision Métal */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <span className="text-lg">🏭</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Précision Métal</h3>
                <p className="text-xs text-gray-500">25 employés</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
              60 emails par jour à trier manuellement, des factures
              fournisseurs à ressaisir dans Excel, un suivi qualité
              sur papier.
            </p>

            <div className="space-y-2 mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Emails</span>
                <span className="text-xs font-semibold text-violet-600">Triés automatiquement</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Factures</span>
                <span className="text-xs font-semibold text-violet-600">Extraites en 3 secondes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Temps récupéré</span>
                <span className="text-xs font-bold text-green-600">10h / semaine</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mt-auto">
              <p className="text-xs text-gray-700 italic leading-relaxed">
                « Avant, je cherchais l'info dans 4 outils différents.
                Maintenant je pose la question et j'ai la réponse. »
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                — Marc R., directeur de production
              </p>
            </div>
          </div>

          {/* CAS 3 — Le Comptoir d'Émile */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-violet-200 transition-all flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <span className="text-lg">🍽️</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Le Comptoir d'Émile</h3>
                <p className="text-xs text-gray-500">8 employés · Nîmes</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
              Commandes fournisseurs par SMS et WhatsApp, un planning qui
              changeait 3 fois par semaine, des factures en retard qui
              s'empilaient.
            </p>

            <div className="space-y-2 mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Commandes</span>
                <span className="text-xs font-semibold text-violet-600">WhatsApp → bons auto</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Planning</span>
                <span className="text-xs font-semibold text-violet-600">Généré en 1 minute</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Temps récupéré</span>
                <span className="text-xs font-bold text-green-600">6h / semaine</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mt-auto">
              <p className="text-xs text-gray-700 italic leading-relaxed">
                « Je gère un restaurant, pas de la paperasse. Synthèse a
                compris ça. »
              </p>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                — Émile T., restaurateur
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* CONTACT */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Nous contacter
          </h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-violet-400" />
              France
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-violet-400" />
              <a href="mailto:contact@synthèse.fr" className="hover:text-violet-600 transition-colors">contact@synthèse.fr</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-violet-400" />
              <a href="tel:+33769455078" className="hover:text-violet-600 transition-colors">07 69 45 50 78</a>
            </div>
          </div>
        </div>
      </div>


      {/* CTA */}
      <div className="text-center py-8">
        <button
          onClick={() => navigate("/contact")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          Parlons de votre activité
        </button>
      </div>
    </div>
  )
}
