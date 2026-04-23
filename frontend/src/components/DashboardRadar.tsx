/**
 * DashboardRadar — live panel on the dashboard home surfacing what the
 * prospect should act on right now: pending quotes, urgent unread emails,
 * incoming invoices, client activity. Cliquable cards dive into the
 * relevant filtered view.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Radar as RadarIcon,
  Receipt,
  Users,
  Loader2,
} from "lucide-react";
import { fetchRadar, type RadarSignal } from "../api/dashboardClient";

const ICONS: Record<string, typeof Clock> = {
  Clock,
  AlertCircle,
  Receipt,
  Users,
};

const SEVERITY_STYLES: Record<
  string,
  { card: string; icon: string; dot: string; label: string }
> = {
  critical: {
    card: "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-red-100",
    icon: "text-red-600 bg-red-100",
    dot: "bg-red-500",
    label: "À traiter",
  },
  warning: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-amber-100",
    icon: "text-amber-600 bg-amber-100",
    dot: "bg-amber-500",
    label: "Attention",
  },
  info: {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:shadow-violet-100",
    icon: "text-violet-600 bg-violet-100",
    dot: "bg-violet-500",
    label: "Info",
  },
};

function SignalCard({ signal }: { signal: RadarSignal }) {
  const navigate = useNavigate();
  const Icon = ICONS[signal.icon] ?? Clock;
  const style = SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.info;

  return (
    <button
      onClick={() => navigate(signal.to)}
      className={`group relative text-left flex flex-col bg-white border-2 ${style.card} rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1">
        {signal.title}
      </h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-4 flex-1">
        {signal.detail}
      </p>

      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-all group-hover:gap-2">
        Ouvrir
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export default function DashboardRadar() {
  const [signals, setSignals] = useState<RadarSignal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRadar()
      .then((res) => {
        if (cancelled) return;
        setSignals(res.signals);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <RadarIcon className="h-4 w-4 text-violet-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Ce qui t'attend aujourd'hui
        </h2>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse de ton activité en cours…
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 py-4 border border-red-200 bg-red-50 rounded-xl px-4">
          Impossible de charger le radar : {error}
        </div>
      )}

      {!loading && signals && signals.length === 0 && (
        <div className="text-sm text-gray-500 py-8 border border-dashed border-gray-200 rounded-2xl px-6 text-center">
          Pas d'alertes pour l'instant — tu es à jour. Ajoute des données
          (devis, factures, emails) pour voir apparaître des signaux ici.
        </div>
      )}

      {!loading && signals && signals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {signals.map((s) => (
            <SignalCard key={s.key} signal={s} />
          ))}
        </div>
      )}
    </section>
  );
}
