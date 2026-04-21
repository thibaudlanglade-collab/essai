import { useEffect } from "react";
import {
  X,
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

export default function DemoMorningBriefingModal({
  isOpen,
  onClose,
  onOpenEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmail: (emailId: string) => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const b = DEMO_BRIEFING;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Sunrise className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Briefing du matin
              </h2>
              <p className="text-sm text-gray-500">
                {b.date} · {b.time}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* BODY */}
        <div className="px-8 py-6 space-y-8">
          {/* GREETING */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{b.greeting}</h3>
            <p className="text-base text-gray-600">{b.summary}</p>
          </div>

          {/* STATS */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Votre boîte en un coup d'œil
            </div>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Nouveaux" value={b.stats.newEmails} />
              <StatCard label="Urgents" value={b.stats.urgent} color="red" />
              <StatCard label="Importants" value={b.stats.important} color="amber" />
              <StatCard label="Brouillons" value={b.stats.draftsReady} color="blue" />
            </div>
          </div>

          {/* PRIORITIES */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Ce qui doit être traité aujourd'hui
            </div>
            <div className="space-y-3">
              {b.priorities.map((p, i) => (
                <PriorityCard
                  key={i}
                  priority={p}
                  onClick={() => onOpenEmail(p.emailId)}
                />
              ))}
            </div>
          </div>

          {/* DEADLINES */}
          <div>
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
          <div>
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
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Voir ma boîte mail
          </button>
          <p className="text-xs text-gray-500 text-center mt-4">
            Ce briefing est généré chaque matin à 8h. Vous pouvez le désactiver ou en modifier
            l'horaire dans les réglages.
          </p>
        </div>
      </div>
    </div>
  );
}
