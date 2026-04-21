import { AlertTriangle, XCircle } from "lucide-react";
import type { TeamSchedule, Assignment } from "@/hooks/useTeamPlanner";

// ── Employee color palette ────────────────────────────────────────────────────

const PALETTE = [
  { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700"    },
  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700"  },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700"   },
  { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700"    },
];

const HOUR_LABELS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

// ── Date helpers ──────────────────────────────────────────────────────────────

const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FR_MONTHS = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];

function parseDateLocal(dateStr: string): Date {
  // Avoid timezone shift: parse as local date
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDDMM(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return `${String(d.getDate()).padStart(2, "0")} ${FR_MONTHS[d.getMonth()]}`;
}

function addDays(dateStr: string, n: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashEmployeeId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function todayDateStr(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  colorIndex,
}: {
  assignment: Assignment;
  colorIndex: number;
}) {
  const color = PALETTE[colorIndex % PALETTE.length];
  return (
    <div
      className={`
        rounded-md border p-3 mb-1.5 cursor-default
        hover:brightness-95 transition-all
        ${color.bg} ${color.border}
      `}
    >
      <p className={`text-sm font-medium truncate ${color.text}`}>
        {assignment.task_name}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {assignment.employee_name}
      </p>
      <p className="text-xs text-gray-400">
        {assignment.start_time}–{assignment.end_time}
      </p>
      {assignment.client && (
        <p className="text-xs text-gray-400 italic truncate mt-0.5">
          {assignment.client}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  schedule: TeamSchedule;
}

export default function ScheduleDisplay({ schedule }: Props) {
  const today = todayDateStr();

  // Build date → assignments map
  const byDate: Record<string, Assignment[]> = {};
  for (const a of schedule.assignments) {
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  }

  // Sort assignments within each day by start_time
  for (const d in byDate) {
    byDate[d].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  // Generate the 7 days of the week
  const days: string[] = Array.from({ length: 7 }, (_, i) =>
    addDays(schedule.week_start, i)
  );

  // Summary stats
  const totalTasks = schedule.assignments.length;
  const employeeCount = new Set(schedule.assignments.map((a) => a.employee_id)).size;

  // Split warnings: auto-correction notice vs regular
  const correctionWarnings = schedule.warnings.filter((w) =>
    w.includes("corrigé automatiquement")
  );
  const regularWarnings = schedule.warnings.filter(
    (w) => !w.includes("corrigé automatiquement")
  );

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
          Planning généré
        </p>
        <h2 className="text-xl font-medium text-foreground">
          Semaine du {formatDDMM(schedule.week_start)} au {formatDDMM(schedule.week_end)}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {totalTasks} tâche{totalTasks !== 1 ? "s" : ""} planifiée{totalTasks !== 1 ? "s" : ""}{" "}
          · {employeeCount} employé{employeeCount !== 1 ? "s" : ""} mobilisé{employeeCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── 7-column grid with time axis ───────────────────────────────────── */}
      <div className="overflow-x-auto -mx-1">
        <div className="min-w-[740px] flex px-1">

          {/* Time axis — decorative hour marks */}
          <div className="w-12 shrink-0 flex flex-col pt-9 pr-2">
            {HOUR_LABELS.map((h) => (
              <div key={h} className="flex-1 flex items-start min-h-6">
                <span className="text-[10px] text-gray-300">{h}</span>
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="flex-1 grid grid-cols-7 gap-0">
            {days.map((dateStr, dayIndex) => {
              const assignments = byDate[dateStr] ?? [];
              const isToday = dateStr === today;
              return (
                <div
                  key={dateStr}
                  className={`flex flex-col px-1 ${dayIndex > 0 ? "border-l border-gray-100" : ""}`}
                >
                  {/* Day header */}
                  <div className="text-center mb-2">
                    <p className={`text-xs font-medium ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                      {FR_DAYS[dayIndex]}
                    </p>
                    <p className={`text-xs ${isToday ? "text-foreground" : "text-gray-400"}`}>
                      {formatDDMM(dateStr)}
                    </p>
                    {isToday && (
                      <div className="flex justify-center mt-0.5">
                        <div className="w-1 h-1 rounded-full bg-gray-900" />
                      </div>
                    )}
                  </div>

                  {/* Column */}
                  <div className="flex-1 min-h-[120px] rounded-lg bg-gray-50 border border-gray-100 p-1.5">
                    {assignments.length === 0 ? (
                      <p className="text-[11px] text-gray-300 text-center mt-4">—</p>
                    ) : (
                      assignments.map((a) => (
                        <AssignmentCard
                          key={`${a.task_id}-${a.employee_id}-${a.start_time}`}
                          assignment={a}
                          colorIndex={hashEmployeeId(a.employee_id) % PALETTE.length}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Auto-correction notice (emerald) ───────────────────────────────── */}
      {correctionWarnings.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-600">
              Correction automatique appliquée
            </p>
          </div>
          <ul className="flex flex-col gap-1 pl-6">
            {correctionWarnings.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Regular warnings (amber) ───────────────────────────────────────── */}
      {regularWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-600">
              Avertissements ({regularWarnings.length})
            </p>
          </div>
          <ul className="flex flex-col gap-1 pl-6">
            {regularWarnings.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Unassigned tasks (red) ─────────────────────────────────────────── */}
      {schedule.unassigned_tasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-600">
              Tâches non assignées ({schedule.unassigned_tasks.length})
            </p>
          </div>
          <div className="flex flex-col gap-1.5 pl-6">
            {schedule.unassigned_tasks.map((task, i) => {
              const t = task as Record<string, unknown>;
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-0.5">•</span>
                  <div>
                    <span className="text-sm text-foreground">
                      {String(t.task_name ?? t.name ?? "Tâche inconnue")}
                    </span>
                    {Boolean(t.reason) && (
                      <span className="text-xs text-muted-foreground ml-2">
                        — {String(t.reason)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
