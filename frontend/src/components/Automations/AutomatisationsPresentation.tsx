import {
  Zap, ArrowRight, Eye, Search, Sparkles,
  FolderTree, Bell, MessageCircle, ListChecks, Pause
} from "lucide-react"
import { AUTOMATION_FEATURES } from "@/data/automatisationsDemoData"

const ICON_MAP: Record<string, any> = {
  Eye, FolderTree, Bell, MessageCircle, ListChecks, Pause
}

interface AutomatisationsPresentationProps {
  onSeeAutomations: () => void
}

export default function AutomatisationsPresentation({ onSeeAutomations }: AutomatisationsPresentationProps) {
  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
          <Zap className="h-7 w-7 text-violet-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Vos automatisations
        </h1>
        <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-3">
          Configurez une fois. Synthèse s'occupe du reste, à votre place,
          pour toujours.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Une automatisation, c'est une mécanique simple : Synthèse surveille
          un endroit (votre boîte mail, un dossier, un canal Teams), et dès
          qu'il y détecte quelque chose qui mérite votre attention, il agit.
          Sans vous déranger, sans rien oublier, jour et nuit.
        </p>
      </div>

      {/* SECTION HOW IT WORKS — 3 STEPS */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Toujours la même mécanique simple
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Trois étapes. Toujours les mêmes. Vous décidez de ce que Synthèse
            surveille, de ce qu'il détecte, et de ce qu'il fait.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Step 1 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
              <Eye className="h-7 w-7 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Il surveille
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Boîte mail, dossier, canal Teams, ce que vous décidez.
            </p>
          </div>

          {/* Arrow 1 */}
          <ArrowRight className="hidden md:block absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 z-10 pointer-events-none" />

          {/* Step 2 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mb-4">
              <Search className="h-7 w-7 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Il détecte
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Une facture, un document, un message, ce qui vous intéresse.
            </p>
          </div>

          {/* Arrow 2 */}
          <ArrowRight className="hidden md:block absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 z-10 pointer-events-none" />

          {/* Step 3 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 mb-4">
              <Sparkles className="h-7 w-7 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Il agit
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Range, classe, extrait, notifie — selon ce que vous demandez.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION FEATURES */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Disponible aujourd'hui
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Ce que vos automatisations peuvent faire
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Tout part d'un déclencheur (un événement) et aboutit à une action
          (ce que Synthèse fait). Voici ce qu'elles savent surveiller et
          accomplir aujourd'hui.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AUTOMATION_FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName] || Zap
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-violet-200 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-violet-500" />
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
      <div className="text-center pt-4">
        <button
          onClick={onSeeAutomations}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-500 text-white text-base font-semibold rounded-xl hover:bg-violet-600 active:bg-violet-700 shadow-sm hover:shadow-md transition-all"
        >
          <Zap className="h-5 w-5" />
          Voir mes automatisations
        </button>
        <p className="text-xs text-gray-500 mt-4">
          3 automatisations actives — explorez librement
        </p>
      </div>
    </div>
  )
}
