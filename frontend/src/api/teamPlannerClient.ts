const BASE = "/api";

export type EmployeesSource =
  | { type: "file"; file: File }
  | { type: "ids"; ids: number[] };

export async function executeTeamPlanner(
  userRequest: string,
  tasksFile: File,
  employeesSource: EmployeesSource,
  weekStart: string | null
): Promise<ReadableStream<Uint8Array>> {
  const form = new FormData();
  form.append("user_request", userRequest);
  form.append("tasks_file", tasksFile);

  if (employeesSource.type === "file") {
    form.append("employees_file", employeesSource.file);
  } else {
    form.append("employee_ids", employeesSource.ids.join(","));
  }

  if (weekStart) form.append("week_start", weekStart);

  const res = await fetch(`${BASE}/execute_team_planner`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Team planner execution failed (${res.status}): ${text}`);
  }

  if (!res.body) throw new Error("No response body from server.");
  return res.body as ReadableStream<Uint8Array>;
}
