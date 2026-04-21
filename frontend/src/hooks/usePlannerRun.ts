import { useCallback, useState } from "react";
import { executePlanner } from "../api/plannerClient";

// ── Public types ─────────────────────────────────────────────────────────────

export type PlanStep = {
  skill: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  output_key: string;
};

export type PlannerPlan = {
  reasoning: string;
  steps: PlanStep[];
};

export type PlannerResult =
  | { type: "binary"; bytes: Uint8Array<ArrayBuffer>; contentType: string; size: number }
  | { type: "json"; value: unknown }
  | { type: "null" };

export type PlannerStatus = "idle" | "planning" | "running" | "success" | "error";
export type StepStatus = "pending" | "running" | "done" | "error";

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL = {
  status: "idle" as PlannerStatus,
  plan: null as PlannerPlan | null,
  stepStatuses: {} as Record<number, StepStatus>,
  stepDebugs: {} as Record<number, unknown>,
  replanned: false,
  result: null as PlannerResult | null,
  error: null as string | null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function initialStepStatuses(steps: PlanStep[]): Record<number, StepStatus> {
  const out: Record<number, StepStatus> = {};
  steps.forEach((_, i) => {
    out[i] = "pending";
  });
  return out;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlannerRun() {
  const [status, setStatus] = useState<PlannerStatus>(INITIAL.status);
  const [plan, setPlan] = useState<PlannerPlan | null>(INITIAL.plan);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>(
    INITIAL.stepStatuses
  );
  const [stepDebugs, setStepDebugs] = useState<Record<number, unknown>>(
    INITIAL.stepDebugs
  );
  const [replanned, setReplanned] = useState(INITIAL.replanned);
  const [result, setResult] = useState<PlannerResult | null>(INITIAL.result);
  const [error, setError] = useState<string | null>(INITIAL.error);

  const run = useCallback(async (userRequest: string, file: File | null) => {
    // Reset before starting
    setStatus("planning");
    setPlan(null);
    setStepStatuses({});
    setStepDebugs({});
    setReplanned(false);
    setResult(null);
    setError(null);

    try {
      const stream = await executePlanner(userRequest, file);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hadError = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

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
            if (event.debug !== undefined) {
              setStepDebugs((prev) => ({ ...prev, [idx]: event.debug }));
            }
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
          } else if (eventType === "pipeline_done") {
            // Wait for final_result event
          } else if (eventType === "final_result") {
            const resultType = event.result_type as string;
            if (resultType === "binary") {
              const bytes = b64ToBytes(event.result_b64 as string);
              setResult({
                type: "binary",
                bytes,
                contentType: event.content_type as string,
                size: event.size as number,
              });
            } else if (resultType === "json") {
              setResult({ type: "json", value: event.result });
            } else {
              setResult({ type: "null" });
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
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setPlan(null);
    setStepStatuses({});
    setStepDebugs({});
    setReplanned(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    plan,
    stepStatuses,
    stepDebugs,
    replanned,
    result,
    error,
    run,
    reset,
  };
}
