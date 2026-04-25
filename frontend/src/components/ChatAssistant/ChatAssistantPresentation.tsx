import { MessageSquare, Eye, Database, FileText, Lightbulb, Shield, History } from "lucide-react"
import { CHAT_FEATURES } from "@/data/chatAssistantDemoData"
import ContextBadge from "@/components/ContextBadge"

const ICON_MAP: Record<string, any> = {
  MessageSquare, Database, FileText, Lightbulb, Shield, History
}

interface ChatAssistantPresentationProps {
  onVisualize: () => void
}

export default function ChatAssistantPresentation({ onVisualize }: ChatAssistantPresentationProps) {
  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      <ContextBadge
        variant="feature"
        label="Fonctionnalité de base"
        description="Une fonctionnalité qu'on connaît, mais boostée par l'IA et adaptée à votre métier."
      />

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-5">
          <MessageSquare className="h-7 w-7 text-blue-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Discuter avec Synthèse
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
          Posez vos questions en langage naturel sur vos données d'entreprise.
          Synthèse interroge vos sources connectées — Sheets, bases de données,
          documents, comptabilité — et vous répond avec des réponses sourcées,
          des insights et des alertes.
        </p>
        <p className="text-sm text-gray-500">
          Comme un collègue qui connaît tous vos dossiers.
        </p>
      </div>

      {/* SECTION FEATURES */}
      <div className="mb-12 rounded-3xl bg-white dark:bg-gray-800/50 p-8 -mx-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Disponible aujourd'hui
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Ce que Synthèse fait avec vos données
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Plus besoin de chercher dans 10 fichiers différents. Posez votre
          question et obtenez une réponse claire, sourcée et actionnable
          en quelques secondes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CHAT_FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName] || MessageSquare
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center rounded-3xl bg-white dark:bg-gray-800/50 p-10 -mx-2">
        <button
          onClick={onVisualize}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-500 text-white text-base font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow-md transition-all"
        >
          <Eye className="h-5 w-5" />
          Visualiser la démo
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Compte de démonstration — explorez librement
        </p>
      </div>
    </div>
  )
}
