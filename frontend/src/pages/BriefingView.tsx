import {
  Sunrise,
  Mail,
  Calendar,
  CheckCircle2,
  RotateCw,
  Archive,
  Clock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { DEMO_BRIEFING } from "@/data/emailsDemoData";
import { useNavigate } from "react-router-dom";

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2,
  RotateCw,
  Archive,
  Clock,
  Calendar,
  Mail,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-green-100", text: "text-green-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const valueColors: Record<string, string> = {
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${(color && valueColors[color]) || "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

function PriorityCard({
  priority,
  onClick,
}: {
  priority: (typeof DEMO_BRIEFING.priorities)[number];
  onClick: () => void;
}) {
  const borderColor =
    priority.level === "urgent" ? "border-l-red-500" : "border-l-amber-500";
  const badgeBg =
    priority.level === "urgent"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left bg-white rounded-xl p-4 border border-gray-200
        border-l-4 ${borderColor}
        hover:shadow-md transition-all group
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}
          >
            {priority.level === "urgent" ? "URGENT" : "IMPORTANT"}
          </span>
          <h4 className="font-semibold text-gray-900 text-sm">{priority.title}</h4>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{priority.description}</p>
      <div className="flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-700">
        {priority.actionLabel}
        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

export default function BriefingView() {
  const navigate = useNavigate();
  const b = DEMO_BRIEFING;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <Sunrise className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Briefing du matin
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {b.date} · généré à {b.time}
          </p>
        </div>
      </div>

      {/* GREETING */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{b.greeting}</h2>
        <p className="text-base text-gray-600">{b.summary}</p>
      </div>

      {/* STATS */}
      <div className="mb-10">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Votre boîte en un coup d'œil
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Nouveaux" value={b.stats.newEmails} />
          <StatCard label="Urgents" value={b.stats.urgent} color="red" />
          <StatCard label="Importants" value={b.stats.important} color="amber" />
          <StatCard label="Brouillons" value={b.stats.draftsReady} color="blue" />
        </div>
      </div>

      {/* PRIORITIES */}
      <div className="mb-10">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Ce qui doit être traité aujourd'hui
        </div>
        <div className="space-y-3">
          {b.priorities.map((p, i) => (
            <PriorityCard
              key={i}
              priority={p}
              onClick={() => navigate("/dashboard/emails")}
            />
          ))}
        </div>
      </div>

      {/* DEADLINES */}
      <div className="mb-10">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Échéances à venir
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {b.deadlines.map((d, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-semibold text-gray-900">{d.date}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-700">{d.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NOTES */}
      <div className="mb-10">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          À noter
        </div>
        <div className="space-y-3">
          {b.notes.map((note, i) => {
            const Icon = ICON_MAP[note.icon] || Mail;
            const colors = COLOR_MAP[note.color] || COLOR_MAP.gray;
            return (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <p
                  className="text-sm text-gray-700 leading-relaxed pt-0.5"
                  dangerouslySetInnerHTML={{
                    __html: note.text.replace(
                      /\*\*(.+?)\*\*/g,
                      '<strong class="font-semibold text-gray-900">$1</strong>',
                    ),
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-amber-100 px-6 py-6 text-center">
        <button
          onClick={() => navigate("/dashboard/emails")}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Mail className="h-4 w-4" />
          Voir ma boîte mail
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Ce briefing est généré chaque matin à 8h. Vous pouvez le désactiver
          ou en modifier l'horaire dans les réglages.
        </p>
      </div>
    </div>
  );
}
