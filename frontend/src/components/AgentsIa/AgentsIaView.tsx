import {
  ArrowRight,
  Bot,
  Layers,
  Lightbulb,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react"
import { COMPARISON_DATA } from "@/data/agentsIaDemoData"
import DemoCallout from "@/components/DemoCallout"
import { useNavigate } from "@/lib/navigate"
import { AGENT_CATEGORIES, type AgentCategoryDetail } from "./agentCategoriesData"

export default function AgentsIaView() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-10 px-4 sm:px-6">

      {/* HERO */}
      <div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-50 mb-4 sm:mb-5">
          <Bot className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight leading-tight">
          Vos agents IA
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed mb-3">
          Plus que des automatisations : des assistants qui réfléchissent,
          décident, agissent — et vous demandent votre validation avant
          d’envoyer.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Un agent IA, ce n’est pas un robot qui suit une règle bête. C’est
          un collègue digital à qui vous confiez une mission entière : il
          comprend le contexte, va chercher les bonnes informations, prend
          des décisions intelligentes, et vous propose un résultat prêt à
          valider.
        </p>
      </div>

      {/* COMPARISON SECTION */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 text-center">
          Quelle différence avec une automatisation ?
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6 sm:mb-8 max-w-2xl mx-auto">
          Les deux font gagner du temps, mais ne résolvent pas les mêmes
          problèmes. Voici la différence en clair.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Automation */}
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest">Type 1</div>
                <h3 className="text-base font-semibold text-gray-900">Automatisation</h3>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4 font-medium">{COMPARISON_DATA.automation.description}</p>
            <div className="bg-amber-50/50 rounded-xl p-4 mb-3">
              <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1">Formule</div>
              <p className="text-sm text-gray-900 italic font-mono">« {COMPARISON_DATA.automation.formula} »</p>
            </div>
            <div className="text-xs text-gray-600 mb-2">{COMPARISON_DATA.automation.use}</div>
            <div className="text-xs text-gray-500 italic">Exemple : « {COMPARISON_DATA.automation.example} »</div>
          </div>

          {/* Agent */}
          <div className="bg-white border-2 border-violet-300 rounded-2xl p-6 relative">
            <div className="absolute -top-2 -right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-violet-500 text-white">
              <Sparkles className="h-3 w-3" />
              NOUVEAU
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                <Bot className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest">Type 2</div>
                <h3 className="text-base font-semibold text-gray-900">Agent IA</h3>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4 font-medium">{COMPARISON_DATA.agent.description}</p>
            <div className="bg-violet-50/50 rounded-xl p-4 mb-3">
              <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest mb-1">Formule</div>
              <p className="text-sm text-gray-900 italic font-mono">« {COMPARISON_DATA.agent.formula} »</p>
            </div>
            <div className="text-xs text-gray-600 mb-2">{COMPARISON_DATA.agent.use}</div>
            <div className="text-xs text-gray-500 italic">Exemple : « {COMPARISON_DATA.agent.example} »</div>
          </div>
        </div>
      </div>

      {/* 5 TYPES D'AGENTS — pédagogique */}
      <div className="mb-12 sm:mb-16">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-3 tracking-tight leading-tight">
            Les 5 types d’agents qui font vraiment gagner du temps (et de l’argent)
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Pas des gadgets. Pas des démos impressionnantes. Juste les
            systèmes que les entreprises utilisent vraiment.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            On voit passer des centaines de cas. Et au final, les mêmes 5
            besoins reviennent toujours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {AGENT_CATEGORIES.map((cat, index) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              index={index}
              spanFull={index === AGENT_CATEGORIES.length - 1}
              onClick={() => navigate(`/agent-${cat.id}`)}
            />
          ))}
        </div>
      </div>

      {/* CES AGENTS SONT DES EXEMPLES */}
      <div className="mb-10 sm:mb-12">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-white/70 border border-amber-200 flex items-center justify-center shrink-0">
              <Wand2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1">
                À retenir
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Ces agents sont des exemples
              </h2>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
            Ces agents ne sont pas des produits figés. Chaque entreprise est
            différente.
          </p>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
            On adapte chaque agent :
          </p>
          <ul className="space-y-1.5 mb-5 text-sm sm:text-base text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>à votre métier</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>à vos outils</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>à votre manière de travailler</span>
            </li>
          </ul>
          <p className="text-base sm:text-lg font-semibold text-gray-900 italic">
            Synthèse n’est jamais le même outil deux fois.
          </p>
        </div>
      </div>

      {/* VOTRE APPLICATION IA PERSONNELLE */}
      <div className="mb-10 sm:mb-12">
        <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-200 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-white border border-violet-200 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest mb-1">
                Personnalisation
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Votre application IA personnelle
              </h2>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-5">
            Tous ces agents peuvent être ajoutés dans votre app Synthèse.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-white/70 border border-violet-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">1.</div>
              <p className="text-sm text-gray-800">Vous gardez vos outils</p>
            </div>
            <div className="bg-white/70 border border-violet-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">2.</div>
              <p className="text-sm text-gray-800">On ajoute les agents</p>
            </div>
            <div className="bg-white/70 border border-violet-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">3.</div>
              <p className="text-sm text-gray-800">Vous continuez comme avant</p>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              Vous ne changez rien.
            </p>
            <p className="text-base sm:text-lg font-semibold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Tout devient plus rapide.
            </p>
          </div>
        </div>
      </div>

      {/* CALLOUT — try the demo */}
      <div className="mb-8">
        <DemoCallout />
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  index,
  spanFull,
  onClick,
}: {
  category: AgentCategoryDetail
  index: number
  spanFull: boolean
  onClick: () => void
}) {
  const Icon = category.icon
  const accent = category.highlight
    ? "border-violet-300 bg-gradient-to-br from-violet-50 to-blue-50 hover:border-violet-400"
    : "border-gray-200 bg-white hover:border-violet-200"

  return (
    <button
      id={category.id}
      onClick={onClick}
      className={`scroll-mt-24 group relative rounded-2xl border ${accent} p-5 sm:p-6 text-left hover:shadow-md transition-all ${spanFull ? "lg:col-span-2" : ""}`}
    >
      {category.highlight && (
        <div className="absolute -top-2 -right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-violet-500 text-white">
          <Sparkles className="h-3 w-3" />
          IMPORTANT
        </div>
      )}
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
          <Icon className="h-5 w-5 text-violet-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-gray-400 tabular-nums">
              0{index + 1}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 uppercase tracking-wider">
              {category.badge}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
            {category.title}
          </h3>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      <div className="bg-blue-50/40 border border-blue-100/80 rounded-xl px-4 py-3 mb-3">
        <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-widest mb-1">
          Exemple
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {category.shortExample}
        </p>
      </div>

      {category.insight && (
        <div className="flex items-start gap-2 text-xs text-gray-600 mb-3 px-1">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed italic">{category.insight}</span>
        </div>
      )}

      <p className="text-sm font-semibold text-gray-900 leading-snug border-l-2 border-violet-400 pl-3 mt-4">
        « {category.punchline} »
      </p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 group-hover:text-violet-700 transition-colors">
        En savoir plus
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  )
}
