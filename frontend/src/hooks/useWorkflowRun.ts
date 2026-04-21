import { useCallback, useRef, useState } from "react";
import { executeFeature } from "../api/client";
import type { RunState, StepState } from "../types";

const INITIAL_STATE: RunState = { phase: "idle", steps: [] };

export function useWorkflowRun() {
  const [run, setRun] = useState<RunState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (featureId: string, file: File) => {
    setRun({ phase: "running", steps: [] });

    try {
      const stream = await executeFeature(featureId, file);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";  // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          handleEvent(event);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRun((prev) => ({ ...prev, phase: "error", errorMessage: msg }));
    }
  }, []);

  function handleEvent(event: Record<string, unknown>) {
    const type = event.event as string;

    if (type === "step_start") {
      const stepId = event.step as string;
      setRun((prev) => ({
        ...prev,
        steps: upsertStep(prev.steps, { id: stepId, status: "running" }),
      }));
    } else if (type === "step_done") {
      const stepId = event.step as string;
      setRun((prev) => ({
        ...prev,
        steps: upsertStep(prev.steps, {
          id: stepId,
          status: "done",
          debug: event.debug as Record<string, unknown>,
        }),
      }));
    } else if (type === "step_error") {
      const stepId = event.step as string;
      setRun((prev) => ({
        ...prev,
        phase: "error",
        steps: upsertStep(prev.steps, {
          id: stepId,
          status: "error",
          error: event.error as string,
        }),
        errorMessage: event.error as string,
      }));
    } else if (type === "pipeline_done") {
      const output = event.output;
      let result: Blob | string;
      if (typeof output === "string") {
        // base64-encoded file — decode to Blob
        const binary = atob(output);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        result = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        result = String(output);
      }
      setRun((prev) => ({ ...prev, phase: "done", result }));
    }
  }

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRun(INITIAL_STATE);
  }, []);

  return { run, start, reset };
}

function upsertStep(steps: StepState[], update: StepState): StepState[] {
  const idx = steps.findIndex((s) => s.id === update.id);
  if (idx === -1) return [...steps, update];
  return steps.map((s, i) => (i === idx ? { ...s, ...update } : s));
}
