const BASE = "/api";

export async function executePlanner(
  userRequest: string,
  file: File | null
): Promise<ReadableStream<Uint8Array>> {
  const form = new FormData();
  form.append("user_request", userRequest);
  if (file) form.append("file", file);

  const res = await fetch(`${BASE}/execute_planner`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planner execution failed (${res.status}): ${text}`);
  }

  if (!res.body) throw new Error("No response body from server.");
  return res.body as ReadableStream<Uint8Array>;
}
