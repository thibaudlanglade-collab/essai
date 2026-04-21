import { useState, useEffect, useRef } from "react"
import {
  Search, Package, FileText, MessageSquare, BarChart3,
  CheckCircle2, Loader2, ArrowLeft, Download, Share2,
  AlertTriangle, Info, TrendingDown, TrendingUp,
} from "lucide-react"
import {
  PROCESSING_STEPS,
  RENAULT_TRUCKS_REPORT,
  type ProcessingStep,
} from "@/data/agentRapportDemoData"

const STEP_ICONS: Record<string, React.ElementType> = {
  Search, Package, FileText, MessageSquare, BarChart3,
}

type Phase = "input" | "processing" | "result"

interface Props {
  onBack: () => void
}

export default function AgentRapportDemo({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("input")
  const [inputValue, setInputValue] = useState("")
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const runRef = useRef(false)

  const canSubmit = inputValue.toLowerCase().includes("renault")

  function handleGenerate() {
    if (!canSubmit) return
    setPhase("processing")
    setCompletedSteps(new Set())
    setActiveStep(null)
    runRef.current = true
  }

  useEffect(() => {
    if (phase !== "processing") return

    let cancelled = false

    async function runSteps() {
      for (const step of PROCESSING_STEPS) {
        if (cancelled) return
        setActiveStep(step.id)
        await delay(step.durationMs)
        if (cancelled) return
        setCompletedSteps((prev) => new Set([...prev, step.id]))
      }
      setActiveStep(null)
      await delay(400)
      if (!cancelled) setPhase("result")
    }

    runSteps()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 uppercase tracking-widest mb-3">
            <BarChart3 className="h-3 w-3" />
            Démo interactive
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Agent Rapport client
          </h1>
          <p className="text-sm text-gray-600 max-w-xl">
            Tapez le nom d'un client et l'agent génère un rapport complet en quelques secondes.
            Essayez avec <span className="font-medium text-violet-700">Renault Trucks</span>.
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      {/* ── PHASE: INPUT ───────────────────────────────────────────── */}
      {phase === "input" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client à analyser
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex : Renault Trucks"
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
            onKeyDown={(e) => e.key === "Enter" && canSubmit && handleGenerate()}
          />
          {inputValue.length > 0 && !canSubmit && (
            <p className="text-xs text-gray-400 mt-2">
              Essayez avec "Renault Trucks" pour cette démo.
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Générer le rapport
          </button>
        </div>
      )}

      {/* ── PHASE: PROCESSING ──────────────────────────────────────── */}
      {phase === "processing" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl">
          <p className="text-sm font-semibold text-gray-700 mb-6">
            L'agent travaille sur Renault Trucks…
          </p>
          <div className="space-y-4">
            {PROCESSING_STEPS.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                status={
                  completedSteps.has(step.id)
                    ? "done"
                    : activeStep === step.id
                    ? "active"
                    : "pending"
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── PHASE: RESULT ──────────────────────────────────────────── */}
      {phase === "result" && <ResultDashboard onReset={() => { setPhase("input"); setInputValue("") }} />}
    </div>
  )
}

/* ── Step row ─────────────────────────────────────────────────────────────── */

function StepRow({ step, status }: { step: ProcessingStep; status: "pending" | "active" | "done" }) {
  const Icon = STEP_ICONS[step.iconName] || Search
  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        status === "done" ? "bg-green-50" : status === "active" ? "bg-violet-50" : "bg-gray-50"
      }`}>
        {status === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : status === "active" ? (
          <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-gray-300" />
        )}
      </div>
      <span className={`text-sm transition-colors ${
        status === "done" ? "text-gray-700 line-through decoration-gray-300" : status === "active" ? "text-violet-700 font-medium" : "text-gray-400"
      }`}>
        {step.label}
      </span>
    </div>
  )
}

/* ── Result dashboard ─────────────────────────────────────────────────────── */

function ResultDashboard({ onReset }: { onReset: () => void }) {
  const r = RENAULT_TRUCKS_REPORT
  const maxChart = Math.max(...r.chartData.map((d) => d.amount), 1)

  return (
    <div className="space-y-5">

      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{r.clientName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {r.sector} · {r.city} · Compte depuis {r.relationSince} · Responsable : {r.accountManager}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Export PDF (démo)")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter PDF
          </button>
          <button
            onClick={() => alert("Partager (démo)")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Partager
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-500 rounded-lg hover:bg-violet-600 transition-colors"
          >
            Nouveau rapport
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {r.alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
              alert.level === "warning"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : alert.level === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-blue-50 border border-blue-100 text-blue-800"
            }`}
          >
            {alert.level === "warning" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            {alert.message}
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="CA YTD"
          value={formatEur(r.kpis.caYTD)}
          sub={`vs ${formatEur(r.kpis.caLastYear)} N-1`}
          trend="down"
        />
        <KpiCard
          label="Commandes en cours"
          value={String(r.kpis.commandesEnCours)}
          sub="ce mois"
        />
        <KpiCard
          label="Factures impayées"
          value={String(r.kpis.facturesImpayees)}
          sub="dont 1 en retard"
          trend={r.kpis.facturesImpayees > 0 ? "warn" : undefined}
        />
        <KpiCard
          label="Satisfaction"
          value={`${r.kpis.satisfactionScore} / 10`}
          sub="score moyen"
          trend="up"
        />
      </div>

      {/* Chart + Exchanges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            CA mensuel 2024
          </p>
          <div className="flex items-end gap-2 h-28">
            {r.chartData.map((d) => {
              const heightPct = d.amount > 0 ? Math.max((d.amount / maxChart) * 100, 4) : 3
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all ${d.amount > 0 ? "bg-violet-400" : "bg-gray-100"}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-gray-400">{d.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Exchanges */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Derniers échanges
          </p>
          <div className="space-y-3">
            {r.exchanges.map((ex, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5">
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    ex.channel === "Email"
                      ? "bg-blue-100 text-blue-700"
                      : ex.channel === "Teams"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {ex.channel}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">{ex.date} · {ex.contact}</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{ex.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Commandes du mois
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Référence</th>
              <th className="px-5 py-3 text-left font-medium">Libellé</th>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-right font-medium">Montant</th>
              <th className="px-5 py-3 text-right font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {r.orders.map((o) => (
              <tr key={o.ref} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{o.ref}</td>
                <td className="px-5 py-3 text-gray-800">{o.label}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{o.date}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{formatEur(o.amount)}</td>
                <td className="px-5 py-3 text-right">
                  <OrderBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoices */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Factures
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Référence</th>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Échéance</th>
              <th className="px-5 py-3 text-right font-medium">Montant</th>
              <th className="px-5 py-3 text-right font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {r.invoices.map((inv) => (
              <tr key={inv.ref} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{inv.ref}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{inv.date}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{inv.dueDate}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{formatEur(inv.amount)}</td>
                <td className="px-5 py-3 text-right">
                  <InvoiceBadge status={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

/* ── Small helpers ────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string
  value: string
  sub: string
  trend?: "up" | "down" | "warn"
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-1.5">
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500 mb-0.5" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mb-0.5" />}
        {trend === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500 mb-0.5" />}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function OrderBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "livré": "bg-green-50 text-green-700",
    "en production": "bg-blue-50 text-blue-700",
    "en attente": "bg-amber-50 text-amber-700",
  }
  return (
    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "payée": "bg-green-50 text-green-700",
    "en attente": "bg-gray-100 text-gray-600",
    "en retard": "bg-red-50 text-red-700",
  }
  return (
    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
