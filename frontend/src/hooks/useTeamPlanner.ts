import { useCallback, useState } from "react";
import { executeTeamPlanner } from "../api/teamPlannerClient";
import type { EmployeesSource } from "../api/teamPlannerClient";
import type { PlannerPlan, StepStatus } from "./usePlannerRun";

// ── Public types ──────────────────────────────────────────────────────────────

export type Assignment = {
  task_id: string;
  task_name: string;
  employee_id: string;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  client: string | null;
};

export type TeamSchedule = {
  week_start: string;
  week_end: string;
  assignments: Assignment[];
  unassigned_tasks: unknown[];
  warnings: string[];
};

export type TeamPlannerStatus = "idle" | "planning" | "running" | "success" | "error";

// Re-export for convenience
export type { PlannerPlan, StepStatus, EmployeesSource };

// ── Initial state ──────────────────────────────────────────────────────────────

const INITIAL = {
  status: "idle" as TeamPlannerStatus,
  plan: null as PlannerPlan | null,
  stepStatuses: {} as Record<number, StepStatus>,
  replanned: false,
  schedule: null as TeamSchedule | null,
  error: null as string | null,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function initialStepStatuses(steps: PlannerPlan["steps"]): Record<number, StepStatus> {
  const out: Record<number, StepStatus> = {};
  steps.forEach((_, i) => {
    out[i] = "pending";
  });
  return out;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTeamPlanner() {
  const [status, setStatus] = useState<TeamPlannerStatus>(INITIAL.status);
  const [plan, setPlan] = useState<PlannerPlan | null>(INITIAL.plan);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>(
    INITIAL.stepStatuses
  );
  const [replanned, setReplanned] = useState(INITIAL.replanned);
  const [schedule, setSchedule] = useState<TeamSchedule | null>(INITIAL.schedule);
  const [error, setError] = useState<string | null>(INITIAL.error);

  const run = useCallback(
    async (
      userRequest: string,
      tasksFile: File,
      employeesSource: EmployeesSource,
      weekStart: string | null
    ) => {
      setStatus("planning");
      setPlan(null);
      setStepStatuses({});
      setReplanned(false);
      setSchedule(null);
      setError(null);

      try {
        const stream = await executeTeamPlanner(
          userRequest,
          tasksFile,
          employeesSource,
          weekStart
        );
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let hadError = false;

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);

            if (payload === "[DONE]") {
              if (!hadError) setStatus("success");
              return;
            }

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }

            const eventType = event.event as string;

            if (eventType === "plan_created") {
              const p = event.plan as PlannerPlan;
              setPlan(p);
              setStatus("running");
              setStepStatuses(initialStepStatuses(p.steps));
            } else if (eventType === "step_start") {
              const idx = event.index as number;
              setStepStatuses((prev) => ({ ...prev, [idx]: "running" }));
            } else if (eventType === "step_done") {
              const idx = event.index as number;
              setStepStatuses((prev) => ({ ...prev, [idx]: "done" }));
            } else if (eventType === "step_error") {
              const idx = event.index as number;
              const errMsg = event.error as string;
              setStepStatuses((prev) => ({ ...prev, [idx]: "error" }));
              setError(errMsg);
              setStatus("error");
              hadError = true;
            } else if (eventType === "replanning") {
              setReplanned(true);
              const newPlan = event.plan as PlannerPlan | undefined;
              if (newPlan) {
                setPlan(newPlan);
                setStepStatuses(initialStepStatuses(newPlan.steps));
              } else {
                setStepStatuses({});
              }
            } else if (eventType === "final_result") {
              const resultType = event.result_type as string;
              if (resultType === "json" && event.result !== null) {
                setSchedule(event.result as TeamSchedule);
              }
            } else if (eventType === "fatal_error") {
              const errMsg = event.error as string;
              setError(errMsg);
              setStatus("error");
              hadError = true;
              break outer;
            }
          }
        }

        if (!hadError) setStatus("success");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setPlan(null);
    setStepStatuses({});
    setReplanned(false);
    setSchedule(null);
    setError(null);
  }, []);

  return {
    status,
    plan,
    stepStatuses,
    replanned,
    schedule,
    error,
    run,
    reset,
  };
}
