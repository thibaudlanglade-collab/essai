import { useState } from "react"
import { Sparkles, X } from "lucide-react"

interface ContextBadgeProps {
  variant: "feature" | "tool" | "agent"
  label: string
  description: string
}

const VARIANTS = {
  feature: {
    border: "border-violet-300",
    bg: "from-violet-100 via-fuchsia-100 to-pink-100",
    iconBg: "from-violet-500 to-fuchsia-500",
    text: "text-violet-700",
    shadow: "shadow-violet-500/15",
  },
  tool: {
    border: "border-blue-300",
    bg: "from-blue-100 via-sky-100 to-cyan-100",
    iconBg: "from-blue-500 to-sky-500",
    text: "text-blue-700",
    shadow: "shadow-blue-500/15",
  },
  agent: {
    border: "border-emerald-300",
    bg: "from-emerald-100 via-teal-100 to-cyan-100",
    iconBg: "from-emerald-500 to-teal-500",
    text: "text-emerald-700",
    shadow: "shadow-emerald-500/15",
  },
} as const

export default function ContextBadge({ variant, label, description }: ContextBadgeProps) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  const v = VARIANTS[variant]
  return (
    <div
      className={`fixed top-20 right-3 sm:top-24 sm:right-4 lg:top-28 lg:right-6 z-30 flex w-[calc(100vw-1.5rem)] sm:w-[320px] lg:w-[360px] items-start gap-3 sm:gap-4 rounded-2xl border-2 ${v.border} bg-gradient-to-br ${v.bg} px-4 py-4 sm:px-5 sm:py-5 pr-9 shadow-lg ${v.shadow} backdrop-blur-sm`}
    >
      <span
        className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${v.iconBg} shadow-md`}
      >
        <Sparkles className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`block text-[11px] sm:text-xs font-bold uppercase tracking-widest ${v.text} mb-1`}
        >
          {label}
        </span>
        <p className="text-[13px] sm:text-sm text-gray-700 leading-snug">
          {description}
        </p>
      </div>
      <button
        onClick={() => setOpen(false)}
        aria-label="Fermer"
        className="absolute top-2.5 right-2.5 p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
