import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  RefreshCw,
  FileText,
  Users,
  Wrench,
  HardHat,
  Utensils,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FileDropzone from "../WorkflowLauncher/FileDropzone";
import ScheduleDisplay from "./ScheduleDisplay";
import EmployeesModal from "./EmployeesModal";
import { useTeamPlanner } from "@/hooks/useTeamPlanner";
import { useEmployees } from "@/hooks/useEmployees";
import type { StepStatus } from "@/hooks/useTeamPlanner";
import ContextBadge from "@/components/ContextBadge";

// ── Step icon helper ──────────────────────────────────────────────────────────

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running")
    return <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />;
  if (status === "done")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "error")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return <Circle className="h-4 w-4 text-gray-300 shrink-0" />;
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === "pending") return null;
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full shrink-0",
        status === "running" &&
          "bg-amber-50 border border-amber-200 text-amber-600",
        status === "done" &&
          "bg-emerald-50 border border-emerald-200 text-emerald-600",
        status === "error" &&
          "bg-red-50 border border-red-200 text-red-600"
      )}
    >
      {status === "running" && "En cours..."}
      {status === "done" && "Terminé"}
      {status === "error" && "Erreur"}
    </span>
  );
}

// ── Demo examples ─────────────────────────────────────────────────────────────

const PLANNER_EXAMPLES = [
  {
    id: "metallurgie",
    icon: Wrench,
    title: "Atelier métallurgie",
    description: "8 employés, 5 postes, semaine du 14 avril",
    tasksFile: "/demo-files/planif-metallurgie-production.xlsx",
    tasksFileName: "planif-metallurgie-production.xlsx",
    employeesFile: "/demo-files/planif-metallurgie-employes.xlsx",
    employeesFileName: "planif-metallurgie-employes.xlsx",
  },
  {
    id: "btp",
    icon: HardHat,
    title: "Équipe BTP",
    description: "12 compagnons, 3 chantiers en parallèle",
    tasksFile: "/demo-files/planif-btp-production.xlsx",
    tasksFileName: "planif-btp-production.xlsx",
    employeesFile: "/demo-files/planif-btp-employes.xlsx",
    employeesFileName: "planif-btp-employes.xlsx",
  },
  {
    id: "resto",
    icon: Utensils,
    title: "Service restaurant",
    description: "10 personnes, 2 services par jour, 1 semaine",
    tasksFile: "/demo-files/planif-resto-production.xlsx",
    tasksFileName: "planif-resto-production.xlsx",
    employeesFile: "/demo-files/planif-resto-employes.xlsx",
    employeesFileName: "planif-resto-employes.xlsx",
  },
];

async function fetchDemoFile(url: string, fileName: string): Promise<File> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new File([blob], fileName, { type: blob.type });
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
}

export default function TeamPlannerDemo({ onBack }: Props) {
  const [tasksFile, setTasksFile] = useState<File | null>(null);
  const [employeesFile, setEmployeesFile] = useState<File | null>(null);
  const [constraints, setConstraints] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [loadingExample, setLoadingExample] = useState<string | null>(null);

  // Employee source state
  const [employeeSource, setEmployeeSource] = useState<"db" | "file">("file");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { employees, loading: empLoading } = useEmployees();
  const { status, plan, stepStatuses, replanned, schedule, error, run, reset } =
    useTeamPlanner();

  // Default to DB mode once employees are loaded (if any exist)
  const defaultSetRef = useRef(false);
  useEffect(() => {
    if (!empLoading && !defaultSetRef.current) {
      defaultSetRef.current = true;
      if (employees.length > 0) {
        setEmployeeSource("db");
      }
    }
  }, [empLoading, employees.length]);

  async function loadPlannerExample(example: (typeof PLANNER_EXAMPLES)[number]) {
    setLoadingExample(example.id);
    try {
      const [tf, ef] = await Promise.all([
        fetchDemoFile(example.tasksFile, example.tasksFileName),
        fetchDemoFile(example.employeesFile, example.employeesFileName),
      ]);
      setTasksFile(tf);
      setEmployeesFile(ef);
      setEmployeeSource("file");
    } finally {
      setLoadingExample(null);
    }
  }

  const isRunning = status === "planning" || status === "running";
  const canRun =
    !isRunning &&
    tasksFile !== null &&
    (employeeSource === "db"
      ? selectedEmployeeIds.length > 0
      : employeesFile !== null);

  function handleRun() {
    if (!tasksFile) return;
    if (employeeSource === "db") {
      run(constraints, tasksFile, { type: "ids", ids: selectedEmployeeIds }, weekStart || null);
    } else {
      if (!employeesFile) return;
      run(constraints, tasksFile, { type: "file", file: employeesFile }, weekStart || null);
    }
  }

  return (
    <div className="p-8">
      <ContextBadge
        variant="feature"
        label="Fonctionnalité de base"
        description="Une fonctionnalité qu'on connaît, mais boostée par l'IA et adaptée à votre métier."
      />
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* ── Back button ────────────────────────────────────────────────── */}
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la présentation
          </button>
        )}

        {/* ── Hero section ────────────────────────────────────────────────── */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 mb-5">
            <Calendar className="h-7 w-7 text-violet-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Planificateur d'équipe
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Upload tes tâches et tes employés, Synthèse crée le planning de la semaine.
          </p>
        </div>

        {/* Demo example cards */}
        {status === "idle" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANNER_EXAMPLES.map((example) => {
                const Icon = example.icon;
                return (
                  <button
                    key={example.id}
                    onClick={() => void loadPlannerExample(example)}
                    disabled={loadingExample !== null || isRunning}
                    className="bg-white dark:bg-gray-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5
                               text-left hover:border-blue-400 hover:shadow-md
                               transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/30 transition-colors">
                      {loadingExample === example.id ? (
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{example.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{example.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                ou importez vos propres fichiers
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
          </>
        )}

        {/* ── TASKS FILE CARD ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <FileText className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Plan de production</p>
          </div>
          <div className="p-6">
            <FileDropzone file={tasksFile} onFile={setTasksFile} accept="*/*" disabled={isRunning} />
          </div>
        </div>

        {/* ── EMPLOYEE SOURCE CARD ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Source des employés</p>
          </div>
          <div className="p-6 flex flex-col gap-4">

            {/* Option 1: DB employees */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 shrink-0">
                <input
                  type="radio"
                  name="employeeSource"
                  value="db"
                  checked={employeeSource === "db"}
                  onChange={() => setEmployeeSource("db")}
                  disabled={isRunning}
                  className="accent-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">
                    Utiliser mes fiches employés enregistrées
                  </span>
                  <span className="text-xs text-gray-400">
                    {empLoading ? "Chargement..." : `${employees.length} disponible(s)`}
                  </span>
                </div>
                {employeeSource === "db" && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      disabled={isRunning}
                      className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50"
                    >
                      Gérer mes employés
                    </button>
                    {selectedEmployeeIds.length > 0 && (
                      <span className="text-xs text-emerald-600">
                        {selectedEmployeeIds.length} employé(s) sélectionné(s)
                      </span>
                    )}
                    {selectedEmployeeIds.length === 0 && !empLoading && (
                      <span className="text-xs text-gray-400">
                        Aucun employé sélectionné — ouvrez le gestionnaire
                      </span>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Option 2: File upload */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 shrink-0">
                <input
                  type="radio"
                  name="employeeSource"
                  value="file"
                  checked={employeeSource === "file"}
                  onChange={() => setEmployeeSource("file")}
                  disabled={isRunning}
                  className="accent-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Uploader un fichier (comportement classique)
                </span>
                {employeeSource === "file" && (
                  <FileDropzone
                    file={employeesFile}
                    onFile={setEmployeesFile}
                    accept="*/*"
                    disabled={isRunning}
                  />
                )}
              </div>
            </label>

          </div>
        </div>

        {/* ── CONSTRAINTS TEXTAREA ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-violet-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraintes (optionnel)
            </label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Ex : « Ne pas planifier le vendredi après-midi »"
              rows={3}
              disabled={isRunning}
              className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg
                         resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         placeholder:text-gray-400 disabled:opacity-50"
            />
          </div>
        </div>

        {/* ── WEEK START + ACTION ROW ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              Début de semaine
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              disabled={isRunning}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none
                         focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={!canRun}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg
                       hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Générer le planning
              </>
            )}
          </button>
        </div>

        {/* ── PROGRESS CARD ───────────────────────────────────────────────── */}
        {status !== "idle" && (
          <div className="bg-white dark:bg-gray-800/50 border border-violet-100 dark:border-gray-700 rounded-xl p-8 animate-fade-in-up shadow-sm">

            {replanned && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-600">
                  <RefreshCw className="h-3 w-3" />
                  Stratégie alternative
                </span>
              </div>
            )}

            {status === "planning" && !plan && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                <span className="text-sm text-gray-500">Analyse en cours...</span>
              </div>
            )}

            {plan && (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Plan
                </p>
                <p className="text-sm text-gray-500 italic mb-6">
                  {plan.reasoning}
                </p>
                <div className="flex flex-col gap-3">
                  {plan.steps.map((step, i) => {
                    const stepStatus: StepStatus = stepStatuses[i] ?? "pending";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 animate-fade-in-left"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <StepIcon status={stepStatus} />
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            stepStatus === "pending"
                              ? "text-gray-300"
                              : stepStatus === "error"
                              ? "text-red-500"
                              : "text-gray-900"
                          )}
                        >
                          {step.skill}
                        </span>
                        <StepBadge status={stepStatus} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SCHEDULE DISPLAY ────────────────────────────────────────────── */}
        {status === "success" && schedule !== null && (
          <div className="bg-white dark:bg-gray-800/50 border border-violet-100 dark:border-gray-700 rounded-xl p-8 animate-fade-in-up shadow-sm flex flex-col gap-6">
            <ScheduleDisplay schedule={schedule} />
            <div className="flex justify-start pt-2 border-t border-gray-100">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                Nouveau planning
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS WITH NO SCHEDULE (edge case) ────────────────────────── */}
        {status === "success" && schedule === null && (
          <div className="bg-white dark:bg-gray-800/50 border border-violet-100 dark:border-gray-700 rounded-xl p-8 animate-fade-in-up shadow-sm">
            <p className="text-gray-500 text-sm">Aucun planning généré.</p>
            <div className="mt-4">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR CARD ──────────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="bg-white border border-red-200 rounded-xl p-8 animate-fade-in-up shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-red-600 font-medium">Erreur</p>
            </div>
            {error && <p className="text-sm text-gray-500">{error}</p>}
            <div className="flex justify-start">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── EMPLOYEES MODAL ─────────────────────────────────────────────────── */}
      <EmployeesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedIds={selectedEmployeeIds}
        onSelectedChange={setSelectedEmployeeIds}
      />
    </div>
  );
}
