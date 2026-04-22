// Thin client for the anonymous-trial endpoint. The backend lives at the same
// origin as the landing site (single Railway deployment serves both), so the
// default is an empty base → relative URL → same-origin request. Override
// with `VITE_TRIAL_API_BASE` only if the app ever moves to a separate domain.

const API_BASE =
  (import.meta.env.VITE_TRIAL_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "";

export interface StartAnonymousTrialResponse {
  token: string;
  /** Fully-qualified URL the browser must navigate to (`<app>/app/<token>`). */
  access_url: string;
}

export async function startAnonymousTrial(): Promise<StartAnonymousTrialResponse> {
  const res = await fetch(`${API_BASE}/api/auth/start-anonymous-trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Trial creation failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
