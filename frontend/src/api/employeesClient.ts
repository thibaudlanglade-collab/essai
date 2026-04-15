const BASE = "/api/employees";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Employee = {
  id: number;
  name: string;
  hours_per_week: number;
  working_days: string[];
  skills: string[];
  unavailable_dates: string[];
  email: string | null;
  phone: string | null;
  position: string | null;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeInput = Omit<Employee, "id" | "created_at" | "updated_at">;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function listEmployees(): Promise<Employee[]> {
  const res = await fetch(BASE);
  return _handleResponse<Employee[]>(res);
}

export async function getEmployee(id: number): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`);
  return _handleResponse<Employee>(res);
}

export async function createEmployee(data: EmployeeInput): Promise<Employee> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return _handleResponse<Employee>(res);
}

export async function updateEmployee(
  id: number,
  data: Partial<EmployeeInput>
): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return _handleResponse<Employee>(res);
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  await _handleResponse<unknown>(res);
}

export async function bulkDeleteEmployees(
  ids: number[]
): Promise<{ deleted_count: number }> {
  const res = await fetch(`${BASE}/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return _handleResponse<{ deleted_count: number }>(res);
}

export async function importCsv(
  file: File
): Promise<{ imported_count: number; skipped_count: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/import-csv`, { method: "POST", body: form });
  return _handleResponse<{
    imported_count: number;
    skipped_count: number;
    errors: string[];
  }>(res);
}
