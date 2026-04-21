import {
  Calendar, Eye, X, Check,
  Users, GraduationCap, Plane, MoveHorizontal,
  Save, Siren
} from "lucide-react"

const PLANIFICATEUR_FEATURES = [
  {
    iconName: "Users",
    title: "Ententes et tensions entre collaborateurs",
    description: "« Marc et Pierre ne s'entendent pas. » « Sophie ne supporte pas Karim. » Vous décrivez les associations à éviter, et Synthèse compose les équipes en respectant ces règles. Plus de tensions sur les chantiers, plus d'ambiance pourrie au service."
  },
  {
    iconName: "GraduationCap",
    title: "Compétences et certifications",
    description: "Tous vos collaborateurs n'ont pas les mêmes compétences. Habilitations électriques, conduite d'engins, qualifications soudage : Synthèse connaît qui peut faire quoi, et n'affecte jamais quelqu'un à une tâche pour laquelle il n'est pas certifié."
  },
  {
    iconName: "Plane",
    title: "Indisponibilités et congés",
    description: "Congés posés, RTT, absences prévues, formations programmées : Synthèse intègre tout ça. Quand vous lancez le planning de la semaine, ces dates sont déjà bloquées et compensées par d'autres affectations."
  },
  {
    iconName: "MoveHorizontal",
    title: "Cartes drag and drop modifiables",
    description: "Le planning généré n'est pas figé. Chaque collaborateur, chaque mission, c'est une carte que vous déplacez en un clic. Vous voulez échanger Lucas et Paulo ? Glissez l'un sur l'autre, c'est fait. Synthèse vérifie en temps réel que les contraintes sont toujours respectées."
  },
  {
    iconName: "Save",
    title: "Plannings réutilisables et historisés",
    description: "Une semaine type qui marche bien ? Vous la sauvegardez comme modèle. La semaine prochaine, Synthèse repart de cette base et l'adapte aux nouvelles contraintes. Plus besoin de tout refaire de zéro chaque lundi matin."
  },
  {
    iconName: "Siren",
    title: "Urgences et imprévus gérés",
    description: "Un chantier urgent tombe mardi matin ? Un collaborateur appelle malade ? Vous décrivez la situation, Synthèse recompose le planning autour, en minimisant l'impact sur le reste de la semaine. Le chaos devient gérable."
  }
]

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, GraduationCap, Plane, MoveHorizontal, Save, Siren
}

interface PlanificateurPresentationProps {
  onVisualize: () => void
}

export default function PlanificateurPresentation({ onVisualize }: PlanificateurPresentationProps) {
  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
          <Calendar className="h-7 w-7 text-violet-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Le planning intelligent qui pense à votre place
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
          Vous décrivez vos contraintes — ententes entre collaborateurs,
          compétences spécifiques, indisponibilités, urgences en cours —
          et Synthèse compose le planning de votre semaine. Vous gardez
          la main pour ajuster d'un drag and drop quand vous voulez.
        </p>
        <p className="text-sm text-violet-600 italic font-medium">
          Configuré selon VOS règles. Pas selon les règles d'un logiciel rigide.
        </p>
      </div>

      {/* COMPARISON SECTION */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
          Vos contraintes sont prises au sérieux
        </h2>
        <p className="text-sm text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          La plupart des outils de planning vous demandent juste qui
          travaille quand. Synthèse va plus loin : il intègre toutes les
          subtilités humaines et opérationnelles que vous gérez d'habitude
          dans votre tête.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* WITHOUT */}
          <div className="bg-white border-2 border-red-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-red-700 uppercase tracking-widest">Sans Synthèse</div>
                <h3 className="text-base font-semibold text-gray-900">Outil de planning classique</h3>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Vous mettez des cases sur un calendrier, à la main</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Vous oubliez que Marc et Pierre ne s'entendent pas</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Vous refaites le planning chaque semaine de zéro</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Modifier = casser tout l'équilibre</span>
              </li>
            </ul>
          </div>

          {/* WITH */}
          <div className="bg-white border-2 border-violet-300 rounded-2xl p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                <Check className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest">Avec Synthèse</div>
                <h3 className="text-base font-semibold text-gray-900">Planificateur Synthèse</h3>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-violet-500 mt-0.5">•</span>
                <span>Vous décrivez vos règles en français, Synthèse les applique automatiquement</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-violet-500 mt-0.5">•</span>
                <span>Synthèse sait que Marc et Pierre ne doivent pas être sur le même chantier</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-violet-500 mt-0.5">•</span>
                <span>Synthèse refait le planning en gardant ce qui marche</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-violet-500 mt-0.5">•</span>
                <span>Modifier = drag and drop d'une carte</span>
              </li>
            </ul>
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
          Ce que Synthèse sait faire pour votre planning
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Tout ce qui rendait la planification pénible — les cas tordus,
          les exceptions, les modifications de dernière minute — Synthèse
          le gère avec vous.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLANIFICATEUR_FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName] || Calendar
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
          onClick={onVisualize}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-500 text-white text-base font-semibold rounded-xl hover:bg-violet-600 active:bg-violet-700 shadow-sm hover:shadow-md transition-all"
        >
          <Eye className="h-5 w-5" />
          Visualiser la démo
        </button>
        <p className="text-xs text-gray-500 mt-4">
          3 plannings d'exemple vous attendent : atelier métallurgie, équipe BTP, service restaurant
        </p>
      </div>
    </div>
  )
}
