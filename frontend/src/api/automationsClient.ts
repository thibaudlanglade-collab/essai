const API = "http://localhost:8000/api";

export type AutomationAction = {
  skill_id: string;
  args: Record<string, unknown>;
  output_key: string;
};

export type Automation = {
  id: number;
  name: string;
  description: string | null;
  template_id: string | null;
  is_active: boolean;
  trigger_type: "cron" | "folder_watch" | "email_new";
  trigger_config: Record<string, unknown>;
  actions: AutomationAction[];
  on_error: "continue" | "stop";
  created_at: string | null;
  updated_at: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
};

export type AutomationRun = {
  id: number;
  automation_id: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error" | "partial";
  trigger_context: Record<string, unknown>;
  steps_log: Array<{
    skill_id: string;
    status: string;
    duration_ms: number;
    error: string | null;
  }>;
  output_summary: string | null;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: AutomationAction[];
  on_error: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const listAutomations = (): Promise<Automation[]> =>
  request("/automations");

export const getAutomation = (id: number): Promise<Automation> =>
  request(`/automations/${id}`);

export const listTemplates = (): Promise<Template[]> =>
  request("/automations/templates");

export const createAutomation = (body: Partial<Automation>): Promise<Automation> =>
  request("/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const createFromTemplate = (
  template_id: string,
  custom_name?: string,
  overrides?: Record<string, unknown>,
): Promise<Automation> =>
  request("/automations/from-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_id, custom_name, overrides }),
  });

export const createFromNaturalLanguage = (
  prompt: string,
): Promise<Record<string, unknown>> =>
  request("/automations/from-natural-language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

export const updateAutomation = (
  id: number,
  body: Partial<Automation>,
): Promise<Automation> =>
  request(`/automations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteAutomation = (id: number): Promise<{ status: string }> =>
  request(`/automations/${id}`, { method: "DELETE" });

export const toggleAutomation = (id: number): Promise<Automation> =>
  request(`/automations/${id}/toggle`, { method: "POST" });

export const runNow = (id: number): Promise<AutomationRun> =>
  request(`/automations/${id}/run-now`, { method: "POST" });

export const listRuns = (id: number): Promise<AutomationRun[]> =>
  request(`/automations/${id}/runs`);
