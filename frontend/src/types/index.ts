export interface Feature {
  id: string;
  name: string;
  description: string;
  input_type: "file" | "text";
  input_accept?: string;
  output_type: "file_download" | "text";
  output_filename?: string;
}

export type StepStatus = "pending" | "running" | "done" | "error";

export interface StepState {
  id: string;
  status: StepStatus;
  debug?: Record<string, unknown>;
  error?: string;
}

export type RunPhase = "idle" | "running" | "done" | "error";

export interface RunState {
  phase: RunPhase;
  steps: StepState[];
  result?: Blob | string;
  errorMessage?: string;
}
