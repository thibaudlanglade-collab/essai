import { useMemo, useState } from "react";
import {
  Users,
  Calendar,
  LayoutGrid,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { DEMO_TEAM, type DemoTeamMember } from "@/data/teamDemoData";

const WORKING_DAYS = [
  { en: "monday", fr: "Lundi", short: "Lun" },
  { en: "tuesday", fr: "Mardi", short: "Mar" },
  { en: "wednesday", fr: "Mercredi", short: "Mer" },
  { en: "thursday", fr: "Jeudi", short: "Jeu" },
  { en: "friday", fr: "Vendredi", short: "Ven" },
  { en: "saturday", fr: "Samedi", short: "Sam" },
  { en: "sunday", fr: "Dimanche", short: "Dim" },
];

const PALETTE = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-500" },
];

function colorFor(id: number) {
  return PALETTE[Math.abs(id) % PALETTE.length];
}

type TeamMember = DemoTeamMember;

export default function MonEquipeView() {
  const { employees, loading } = useEmployees();
  const [view, setView] = useState<"cards" | "schedule">("cards");

  const team: TeamMember[] = useMemo(() => {
    if (employees.length > 0) {
      return employees.map((e) => ({
        id: e.id,
        name: e.name,
        position: e.position ?? "—",
        hours_per_week: e.hours_per_week,
        working_days: e.working_days,
        skills: e.skills,
        unavailable_dates: e.unavailable_dates,
        email: e.email,
        phone: e.phone,
        hire_date: e.hire_date,
      }));
    }
    return DEMO_TEAM;
  }, [employees]);

  const isDemoMode = employees.length === 0 && !loading;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Users className="h-7 w-7 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Mon équipe
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {team.length} {team.length > 1 ? "personnes" : "personne"} · vue
              centralisée des compétences et disponibilités
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("cards")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "cards"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Fiches
          </button>
          <button
            onClick={() => setView("schedule")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "schedule"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Emploi du temps
          </button>
        </div>
      </div>

      {/* Demo banner */}
      {isDemoMode && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 px-4 py-3">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Équipe d'exemple
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Vous explorez une équipe de démonstration. Dans votre version,
              vous y retrouverez vos vrais employés avec leurs compétences et
              jours de présence.
            </p>
          </div>
        </div>
      )}

      {/* Empty / loading state */}
      {loading && (
        <p className="text-sm text-gray-400 text-center py-12">Chargement...</p>
      )}

      {/* CARDS VIEW */}
      {!loading && view === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}

          <button className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/40 transition-all min-h-[200px]">
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Ajouter un employé</span>
          </button>
        </div>
      )}

      {/* SCHEDULE VIEW */}
      {!loading && view === "schedule" && <ScheduleView team={team} />}
    </div>
  );
}

// ── Member Card ─────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: TeamMember }) {
  const color = colorFor(member.id);
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const workingShort = member.working_days
    .map((d) => WORKING_DAYS.find((w) => w.en === d)?.short ?? d)
    .join(" ");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-violet-200 transition-all flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-12 h-12 rounded-xl ${color.bg} ${color.border} border flex items-center justify-center shrink-0`}
        >
          <span className={`text-sm font-bold ${color.text}`}>{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Briefcase className="h-3 w-3" />
            {member.position}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs">
        <p className="text-gray-500 mb-1">Présence</p>
        <p className="font-medium text-gray-900">
          {member.hours_per_week}h/sem · {workingShort}
        </p>
      </div>

      {member.skills.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">Compétences</p>
          <div className="flex flex-wrap gap-1">
            {member.skills.slice(0, 4).map((s) => (
              <span
                key={s}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
              >
                {s}
              </span>
            ))}
            {member.skills.length > 4 && (
              <span className="text-[11px] text-gray-400 px-1">
                +{member.skills.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-gray-100 space-y-1">
        {member.email && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{member.email}</span>
          </p>
        )}
        {member.phone && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            {member.phone}
          </p>
        )}
        {member.unavailable_dates.length > 0 && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            {member.unavailable_dates.length} jour(s) d'indispo prévu(s)
          </p>
        )}
      </div>
    </div>
  );
}

// ── Schedule (weekly grid) ───────────────────────────────────────────────────

function ScheduleView({ team }: { team: TeamMember[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">Semaine type</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Vue d'ensemble des jours travaillés par chaque membre
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                Membre
              </th>
              {WORKING_DAYS.map((d) => (
                <th
                  key={d.en}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {d.short}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Heures
              </th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => {
              const color = colorFor(member.id);
              return (
                <tr
                  key={member.id}
                  className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors"
                >
                  <td className="px-4 py-3 sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {member.position}
                        </p>
                      </div>
                    </div>
                  </td>
                  {WORKING_DAYS.map((d) => {
                    const works = member.working_days.includes(d.en);
                    return (
                      <td key={d.en} className="px-3 py-3 text-center">
                        {works ? (
                          <div
                            className={`mx-auto inline-block w-7 h-7 rounded-md ${color.bg} ${color.border} border`}
                            title={`Présent ${d.fr}`}
                          />
                        ) : (
                          <div className="mx-auto inline-block w-7 h-7 rounded-md bg-gray-50 border border-gray-100" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right text-xs text-gray-700 font-medium whitespace-nowrap">
                    {member.hours_per_week}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="font-medium">Légende :</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
          Jour travaillé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />
          Jour off
        </span>
      </div>
    </div>
  );
}
