/**
 * Agent Rapport client — wizard API.
 *
 * Two stages mirror the backend endpoints:
 *
 *   ingestData(...)     — POST /api/agent-rapport/ingest    (sync JSON)
 *   streamCompose(...)  — POST /api/agent-rapport/compose   (SSE)
 *
 * The page consumes the typed `ReportSection` union to render a flexible
 * report whose shape is decided by the LLM at compose time.
 */

// ── ClientContext (output of stage 1) ────────────────────────────────────────

export interface ClientEntities {
  client: {
    name: string;
    type?: string | null;
    sector?: string | null;
    city?: string | null;
    contact?: string | null;
  };
  metrics: { label: string; value: string; unit?: string | null }[];
  documents: {
    kind: string;
    ref?: string | null;
    label?: string | null;
    amount?: number | null;
    date?: string | null;
    status?: string | null;
  }[];
  exchanges: {
    date?: string | null;
    channel?: string | null;
    contact?: string | null;
    summary: string;
  }[];
}

export interface ClientContext {
  client_name: string;
  raw_text: string;
  summary: string;
  entities: ClientEntities;
}

// ── Report sections (output of stage 2) ──────────────────────────────────────

export type ReportSection =
  | {
      type: "callout";
      level: "warning" | "info" | "success";
      title: string;
      text: string;
    }
  | {
      type: "kpi_grid";
      title: string;
      items: {
        label: string;
        value: string;
        sub: string | null;
        trend: "up" | "down" | "warn" | null;
      }[];
    }
  | {
      type: "alerts";
      items: { level: "warning" | "info" | "success"; message: string }[];
    }
  | {
      type: "table";
      title: string;
      columns: string[];
      rows: string[][];
    }
  | {
      type: "chart";
      title: string;
      kind: "bar";
      data: { label: string; value: number }[];
    }
  | {
      type: "narrative";
      title: string;
      text: string;
    };

export interface FinalReport {
  client_name: string;
  intent_summary: string;
  sections: ReportSection[];
}

// ── Stage 1 — sync ingest ───────────────────────────────────────────────────

export type IngestPayload =
  | { source_type: "text"; text: string; client_hint?: string }
  | { source_type: "csv"; csv: string; client_hint?: string }
  | { source_type: "pdf"; pdf_chunks: string[]; client_hint?: string };

/**
 * Extract text from one or more PDF files via the backend (uses pypdf,
 * which is already a backend dep). Avoids pulling pdfjs-dist into the
 * SPA bundle just for browser-side parsing.
 */
export async function extractPdfText(
  files: File[],
): Promise<{ name: string; text: string; error?: string }[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  const resp = await fetch("/api/agent-rapport/extract-pdf", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(detail || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  return json.chunks ?? [];
}

export async function ingestData(payload: IngestPayload): Promise<ClientContext> {
  const resp = await fetch("/api/agent-rapport/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      /* keep raw text */
    }
    throw new Error(detail || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  return {
    client_name: json.client_name,
    raw_text: json.raw_text,
    summary: json.summary,
    entities: json.entities,
  };
}

// ── Stage 2 — streaming compose ─────────────────────────────────────────────

export type ComposeStep = "interpret_intent" | "compose_report";

export interface ComposeCallbacks {
  onStepStart: (step: ComposeStep, index: number) => void;
  onStepDone: (step: ComposeStep) => void;
  onStepError: (step: ComposeStep | "init", error: string) => void;
  onResult: (report: FinalReport) => void;
  onDone: () => void;
}

export interface ComposePayload extends ClientContext {
  intent_text: string;
}

export function streamCompose(
  payload: ComposePayload,
  callbacks: ComposeCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const resp = await fetch("/api/agent-rapport/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        callbacks.onStepError("init", text || `HTTP ${resp.status}`);
        callbacks.onDone();
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          if (line === "[DONE]") {
            callbacks.onDone();
            return;
          }
          try {
            const event = JSON.parse(line);
            handleEvent(event, callbacks);
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        callbacks.onDone();
        return;
      }
      callbacks.onStepError(
        "init",
        err instanceof Error ? err.message : "Erreur réseau",
      );
      callbacks.onDone();
    }
  })();

  return controller;
}

function handleEvent(event: any, cb: ComposeCallbacks) {
  switch (event.event) {
    case "step_start":
      cb.onStepStart(event.step as ComposeStep, event.index ?? 0);
      break;
    case "step_done":
      cb.onStepDone(event.step as ComposeStep);
      break;
    case "step_error":
      cb.onStepError(event.step as ComposeStep, event.error ?? "Erreur inconnue");
      break;
    case "pipeline_done":
      if (event.output) cb.onResult(event.output as FinalReport);
      break;
  }
}
