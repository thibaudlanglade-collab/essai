import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { useNavigate } from "@/lib/navigate"
import DemoCallout from "@/components/DemoCallout"
import { AGENT_CATEGORIES, getAgentCategory } from "./agentCategoriesData"

export default function AgentCategoryDetailView({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate()
  const category = getAgentCategory(categoryId)

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-600">Cette catégorie n’existe pas.</p>
        <button
          onClick={() => navigate("/agents-ia")}
          className="mt-4 inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux agents
        </button>
      </div>
    )
  }

  const Icon = category.icon
  const otherCategories = AGENT_CATEGORIES.filter((c) => c.id !== category.id)

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10 px-4 sm:px-6">

      {/* Back link */}
      <button
        onClick={() => navigate("/agents-ia")}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tous les agents
      </button>

      {/* HERO */}
      <div className="mb-10 sm:mb-12">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-600 uppercase tracking-widest mb-2">
              {category.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight leading-tight">
              {category.title}
            </h1>
          </div>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          {category.lead}
        </p>
      </div>

      {/* WHAT IT DOES */}
      <section className="mb-10 sm:mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Ce que fait l’agent
          </h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {category.whatItDoes.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* EXAMPLES */}
      <section className="mb-10 sm:mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Exemples concrets
          </h2>
        </div>
        <div className="space-y-4">
          {category.examples.map((ex, i) => (
            <div
              key={i}
              className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5"
            >
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">
                {ex.title}
              </div>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
                {ex.scenario}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFIT */}
      <section className="mb-10 sm:mb-12">
        <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-200 rounded-2xl p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-violet-200 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest mb-1">
                L’impact business
              </div>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
                {category.benefit}
              </p>
            </div>
          </div>
          <p className="mt-5 text-base sm:text-lg font-semibold text-gray-900 italic border-l-2 border-violet-400 pl-4">
            « {category.punchline} »
          </p>
        </div>
      </section>

      {/* OTHER CATEGORIES */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Les autres types d’agents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {otherCategories.map((c) => {
            const CIcon = c.icon
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/agent-${c.id}`)}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md hover:border-violet-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                  <CIcon className="h-5 w-5 text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                    {c.badge}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {c.title}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition-colors shrink-0" />
              </button>
            )
          })}
        </div>
      </section>

      {/* DEMO CALLOUT */}
      <div className="mb-8">
        <DemoCallout />
      </div>
    </div>
  )
}
