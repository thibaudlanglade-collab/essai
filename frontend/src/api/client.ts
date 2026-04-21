import type { Feature } from "../types";

const BASE = "/api";

export async function fetchFeatures(): Promise<Feature[]> {
  const res = await fetch(`${BASE}/features`);
  if (!res.ok) throw new Error(`Failed to load features: ${res.statusText}`);
  const json = await res.json();
  return json.features as Feature[];
}

/**
 * Execute a feature with a file upload.
 * Returns a ReadableStream of SSE text lines (caller handles parsing).
 */
export async function executeFeature(featureId: string, file: File): Promise<ReadableStream<Uint8Array>> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/execute/${featureId}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execution failed (${res.status}): ${text}`);
  }

  if (!res.body) throw new Error("No response body from server.");
  return res.body;
}
