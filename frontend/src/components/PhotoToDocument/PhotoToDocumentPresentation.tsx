import { Camera, Eye, PenTool, Table, Receipt, Globe, Palette, Smartphone } from "lucide-react"
import { PHOTO_FEATURES } from "@/data/photoToDocumentDemoData"

const ICON_MAP: Record<string, any> = {
  PenTool, Table, Receipt, Globe, Palette, Smartphone
}

interface PhotoToDocumentPresentationProps {
  onVisualize: () => void
}

export default function PhotoToDocumentPresentation({ onVisualize }: PhotoToDocumentPresentationProps) {
  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-5">
          <Camera className="h-7 w-7 text-blue-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Photo → PDF ou Excel
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
          Prenez en photo n'importe quel document papier — note manuscrite,
          ticket de caisse, tableau imprimé, formulaire rempli — Synthèse le
          lit et vous le rend en PDF propre ou en Excel utilisable. Plus jamais
          de ressaisie manuelle.
        </p>
        <p className="text-sm text-gray-500">
          Format PDF, Excel ou les deux. Vous décidez.
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
          Ce que Synthèse fait avec vos photos
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Une photo prise à la volée devient en quelques secondes un document
          propre, structuré, prêt à exploiter. Plus besoin de tout retaper à
          la main.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PHOTO_FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName] || Camera
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

      {/* CTA SIMPLE */}
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
