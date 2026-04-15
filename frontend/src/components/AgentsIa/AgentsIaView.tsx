import { useState } from "react"
import {
  Bot, Zap, Target, FileText, BarChart3, Headphones,
  X, Sparkles, AlertTriangle, Lightbulb
} from "lucide-react"
import { AVAILABLE_AGENTS, COMPARISON_DATA, type Agent } from "@/data/agentsIaDemoData"

const ICON_MAP: Record<string, any> = {
  Target, FileText, BarChart3, Headphones, Bot, Zap
}

export default function AgentsIaView() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      {/* HERO */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
          <Bot className="h-7 w-7 text-violet-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Vos agents IA
        </h1>
        <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-3">
          Plus que des automatisations : des assistants qui r&#233;fl&#233;chissent,
          d&#233;cident, agissent &#8212; et vous demandent votre validation avant
          d&#8217;envoyer.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Un agent IA, ce n&#8217;est pas un robot qui suit une r&#232;gle b&#234;te. C&#8217;est
          un coll&#232;gue digital &#224; qui vous confiez une mission enti&#232;re : il
          comprend le contexte, va chercher les bonnes informations, prend
          des d&#233;cisions intelligentes, et vous propose un r&#233;sultat pr&#234;t &#224;
          valider.
        </p>
      </div>

      {/* COMPARISON SECTION */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
          Quelle diff&#233;rence avec une automatisation ?
        </h2>
        <p className="text-sm text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          Les deux font gagner du temps, mais ne r&#233;solvent pas les m&#234;mes
          probl&#232;mes. Voici la diff&#233;rence en clair.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <p className="text-sm text-gray-900 italic font-mono">&#171; {COMPARISON_DATA.automation.formula} &#187;</p>
            </div>
            <div className="text-xs text-gray-600 mb-2">{COMPARISON_DATA.automation.use}</div>
            <div className="text-xs text-gray-500 italic">Exemple : &#171; {COMPARISON_DATA.automation.example} &#187;</div>
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
              <p className="text-sm text-gray-900 italic font-mono">&#171; {COMPARISON_DATA.agent.formula} &#187;</p>
            </div>
            <div className="text-xs text-gray-600 mb-2">{COMPARISON_DATA.agent.use}</div>
            <div className="text-xs text-gray-500 italic">Exemple : &#171; {COMPARISON_DATA.agent.example} &#187;</div>
          </div>
        </div>
      </div>

      {/* AVAILABLE AGENTS */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Disponible aujourd&#8217;hui
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Vos 4 agents pr&#234;ts &#224; l&#8217;emploi
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Ces agents sont configurables avec vous selon votre activit&#233;.
          Cliquez sur l&#8217;un d&#8217;eux pour comprendre ce qu&#8217;il fait, dans quel
          cas il vous fait gagner du temps.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AVAILABLE_AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* MODAL */}
      {selectedAgent && (
        <AgentModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const Icon = ICON_MAP[agent.iconName] || Bot

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-6 text-left
                 hover:shadow-md hover:border-violet-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
          <Icon className="h-6 w-6 text-violet-500" />
        </div>
        <span className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-600 uppercase tracking-wider">
          {agent.category}
        </span>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-2">
        {agent.title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        {agent.shortDescription}
      </p>

      {agent.metricClaim && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md">
          <Sparkles className="h-3 w-3" />
          {agent.metricClaim}
        </div>
      )}
    </button>
  )
}

function AgentModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  if (!agent.modal) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="text-3xl shrink-0">{agent.emoji}</div>
            <div className="min-w-0">
              <div className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 uppercase tracking-wider mb-2">
                {agent.category}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {agent.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center shrink-0"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Problem */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Le probl&#232;me
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {agent.modal.problem}
            </p>
          </div>

          {/* Solution */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                La solution Synth&#232;se
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {agent.modal.solution}
            </p>
          </div>

          {/* Example */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Exemple concret
              </h3>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed italic">
                {agent.modal.example}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={() => alert("Demande envoy\u00e9e \u2014 un membre de l'\u00e9quipe vous contactera (d\u00e9mo)")}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            &#199;a m&#8217;int&#233;resse, contactez-moi
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
