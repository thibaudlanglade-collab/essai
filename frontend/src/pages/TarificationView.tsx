import {
  Sparkles, Sprout, TrendingUp, Building2,
  CheckCircle2, X, ChevronDown,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "../lib/navigate"
import DemoCallout from "@/components/DemoCallout"

export default function TarificationView() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10 px-4 sm:px-6">

      {/* HERO */}
      <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-50 mb-4 sm:mb-5">
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-5 tracking-tight leading-tight">
          Un budget adapté à votre réalité
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Chaque entreprise est différente : pas la même taille, pas les
          mêmes outils, pas les mêmes besoins. Votre tarif l'est aussi.
        </p>
      </div>


      {/* 3 PROFILS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 mb-12 sm:mb-16">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4">
            <Sprout className="h-5 w-5 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vous démarrez</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Quelques fonctionnalités essentielles pour commencer à gagner
            du temps. Un budget accessible pour tester sans risque.
          </p>
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">2 à 3 fonctionnalités configurées</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Accompagnement au démarrage</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Support par email</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Mises à jour incluses</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-violet-200 rounded-2xl p-6 hover:shadow-md transition-all relative">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500 text-white uppercase tracking-wider">
              Le plus courant
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vous grandissez</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Plus d'automatisations, plus d'intégrations, un outil qui
            s'adapte à votre croissance.
          </p>
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Fonctionnalités illimitées</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Automatisations + intégrations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Accompagnement continu</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Support prioritaire</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Audits mensuels d'amélioration</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-blue-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <Building2 className="h-5 w-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vous êtes établi</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Configuration complète avec agents IA, intégrations avancées,
            support dédié.
          </p>
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Tout le niveau Croissance</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Agents IA personnalisés</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">CRM ou outils custom</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Interlocuteur dédié</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-600">Formation de votre équipe</span>
            </div>
          </div>
        </div>
      </div>


      {/* CE QUE VOUS NE PAYEZ PAS */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-5 sm:mb-6">
          Ce que vous ne payez pas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-start gap-3 bg-green-50/50 border border-green-100 rounded-xl p-4">
            <X className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pas de frais de licence</p>
              <p className="text-xs text-gray-600">Vous ne payez pas un logiciel sur étagère. Vous payez un outil construit pour vous.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50/50 border border-green-100 rounded-xl p-4">
            <X className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pas de formation de 3 jours</p>
              <p className="text-xs text-gray-600">L'interface est simple. Si vous savez envoyer un email, vous savez utiliser Synthèse.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50/50 border border-green-100 rounded-xl p-4">
            <X className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pas de coûts cachés</p>
              <p className="text-xs text-gray-600">Le forfait mensuel inclut tout : plateforme, mises à jour, support, accompagnement.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50/50 border border-green-100 rounded-xl p-4">
            <X className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pas d'engagement longue durée</p>
              <p className="text-xs text-gray-600">On travaille ensemble parce que ça marche, pas parce qu'un contrat vous y oblige.</p>
            </div>
          </div>
        </div>
      </div>


      {/* CALCULATEUR D'ÉCONOMIES */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 text-center">
          Combien Synthèse vous ferait économiser ?
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 text-center max-w-2xl mx-auto">
          Déplacez les curseurs pour estimer le temps que vous perdez
          chaque mois sur des tâches automatisables.
        </p>

        <SavingsCalculator />
      </div>


      {/* L'ARGUMENT CLÉ */}
      <div className="mb-12 sm:mb-16">
        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-violet-50 rounded-2xl sm:rounded-3xl border border-violet-100 px-5 sm:px-8 md:px-10 py-6 sm:py-8 text-center">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
            On construit ensemble la configuration qui vous correspond,
            et vous payez uniquement pour ce que vous utilisez vraiment.
          </p>
          <p className="text-base sm:text-lg text-gray-900 font-semibold">
            Dans tous les cas, Synthèse revient moins cher que la somme
            des abonnements qu'il remplace.
          </p>
        </div>
      </div>


      {/* FAQ TARIFICATION */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-5 sm:mb-6">
          Questions sur les tarifs
        </h2>
        <div className="space-y-3">
          <TarifFaqItem
            question="Comment est calculé mon tarif ?"
            answer="On part de vos besoins : combien de fonctionnalités, combien d'utilisateurs, quel volume de données. Après notre premier échange, on vous propose un forfait mensuel clair et détaillé. Pas de surprise."
          />
          <TarifFaqItem
            question="Est-ce que je peux commencer petit et ajouter des fonctions plus tard ?"
            answer="Oui, c'est même ce qu'on recommande. On démarre avec l'essentiel, vous testez, et on ajoute progressivement. Votre forfait évolue avec vos besoins."
          />
          <TarifFaqItem
            question="Pourquoi c'est moins cher que mes abonnements actuels ?"
            answer="Parce que vous payez probablement un outil pour les emails, un pour la facturation, un pour la planification, un pour le stockage. Synthèse regroupe tout en un seul outil. Moins d'abonnements, moins de doublons, moins de dépenses."
          />
          <TarifFaqItem
            question="Y a-t-il des frais de mise en place ?"
            answer="La configuration initiale est incluse dans votre premier mois. Pas de frais de setup cachés. On démarre ensemble et on ajuste au fur et à mesure."
          />
          <TarifFaqItem
            question="Et si ça ne me convient pas ?"
            answer="Pas d'engagement longue durée. Si après le premier mois vous n'êtes pas convaincu, on se quitte bons amis. Mais en général, une fois qu'on a goûté au sur-mesure, on ne revient pas en arrière."
          />
        </div>
      </div>


      {/* CALLOUT — démo 14 jours gratuits */}
      <div className="mb-8">
        <DemoCallout />
      </div>

      {/* CTA — devis personnalisé */}
      <div className="text-center py-6 sm:py-8 bg-gradient-to-br from-violet-50 via-blue-50 to-violet-50 rounded-2xl sm:rounded-3xl border border-violet-100 px-5 sm:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
          Vous préférez parler de votre tarification ?
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6 max-w-xl mx-auto">
          15 minutes au téléphone suffisent pour comprendre vos besoins
          et vous proposer un tarif adapté.
        </p>
        <button
          onClick={() => navigate("/contact")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-600 text-sm font-semibold rounded-xl border border-violet-300 hover:bg-violet-50 hover:border-violet-400 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          Demander un devis personnalisé
        </button>
      </div>
    </div>
  )
}

function TarifFaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-900">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-0">
          <p className="text-sm text-gray-700 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

function SavingsCalculator() {
  const [devisPerWeek, setDevisPerWeek] = useState(5)
  const [minutesPerDevis, setMinutesPerDevis] = useState(90)
  const [emailsPerDay, setEmailsPerDay] = useState(40)
  const [planningMinutes, setPlanningMinutes] = useState(120)
  const navigate = useNavigate()

  const HOURLY_RATE = 15

  const devisTimeSaved = (devisPerWeek * minutesPerDevis * 0.9) / 60
  const emailTimeSaved = (emailsPerDay * 5 * 2 * 0.8) / 60
  const planningTimeSaved = (planningMinutes * 0.85 * 4) / 60
  const totalHoursMonth = Math.round(
    (devisTimeSaved + emailTimeSaved + planningTimeSaved) * 4.33
  )
  const totalEurosMonth = totalHoursMonth * HOURLY_RATE

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
      <div className="space-y-6">

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Combien de devis par semaine ?
            </label>
            <span className="text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              {devisPerWeek}
            </span>
          </div>
          <input
            type="range" min="1" max="20" value={devisPerWeek}
            onChange={(e) => setDevisPerWeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>1</span><span>20</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Temps par devis (minutes) ?
            </label>
            <span className="text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              {minutesPerDevis} min
            </span>
          </div>
          <input
            type="range" min="15" max="180" step="15" value={minutesPerDevis}
            onChange={(e) => setMinutesPerDevis(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>15 min</span><span>3h</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Emails traités par jour ?
            </label>
            <span className="text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              {emailsPerDay}
            </span>
          </div>
          <input
            type="range" min="5" max="100" step="5" value={emailsPerDay}
            onChange={(e) => setEmailsPerDay(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>5</span><span>100</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Temps pour le planning hebdomadaire (minutes) ?
            </label>
            <span className="text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md">
              {planningMinutes} min
            </span>
          </div>
          <input
            type="range" min="15" max="300" step="15" value={planningMinutes}
            onChange={(e) => setPlanningMinutes(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>15 min</span><span>5h</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-violet-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Vous passez environ
          </p>
          <p className="text-5xl font-bold text-violet-600 mb-1">
            {totalHoursMonth}h
          </p>
          <p className="text-sm text-gray-600 mb-4">
            par mois sur des tâches que Synthèse peut automatiser.
          </p>

          <div className="bg-white/80 rounded-xl p-4 mb-4 inline-block">
            <p className="text-sm text-gray-600">
              À {HOURLY_RATE}€/h, c'est environ
            </p>
            <p className="text-3xl font-bold text-green-600">
              {totalEurosMonth.toLocaleString("fr-FR")} €
            </p>
            <p className="text-sm text-gray-600">
              par mois de temps récupéré
            </p>
          </div>

          <div className="mt-4">
            <button
              onClick={() => navigate("/demo")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Tester gratuitement 14 jours
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
