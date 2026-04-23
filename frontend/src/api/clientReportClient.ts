/**
 * Rapport Client API client (Sprint 4).
 *
 * Wraps the `/api/clients/*` and `/api/client-report/*` endpoints with
 * typed helpers. Every request sends `credentials: "include"` so the
 * session cookie is attached.
 */

export type ClientType =
  | "particulier"
  | "sci"
  | "copro"
  | "mairie"
  | "promoteur"
  | string;

export interface ClientSummary {
  id: string;
  user_id: string;
  name: string;
  type: ClientType | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_seed: boolean;
  created_at: string | null;
}

export type SourceKind =
  | "quote"
  | "email"
  | "invoice"
  | "extraction"
  | "drive_file";

export interface ClientReportSource {
  source_id: string;
  kind: SourceKind;
  id: string | number | null;
  label: string | null;
  url: string | null;
  date: string | null;
  summary?: string;
}

export interface ClientReportStats {
  quotes: number;
  emails: number;
  invoices: number;
  extractions: number;
  drive_files: number;
  total_docs: number;
  folders_searched: number;
}

export interface ClientReportAnswer {
  client: ClientSummary;
  question: string;
  answer: string;
  sources: ClientReportSource[];
  confidence: number;
  stats: ClientReportStats;
}

export interface ClientReportFolder {
  id: string;
  user_id: string;
  provider: string;
  folder_id: string;
  folder_name: string | null;
  is_enabled: boolean;
  created_at: string | null;
}

export interface ClientReportFoldersState {
  drive_connected: boolean;
  folders: ClientReportFolder[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function _parse(res: Response): Promise<unknown> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response — surface status alone.
  }
  if (!res.ok) {
    const detail =
      (body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText) || `HTTP ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return body;
}

export async function listClients(): Promise<ClientSummary[]> {
  const res = await fetch("/api/clients", { credentials: "include" });
  return (await _parse(res)) as ClientSummary[];
}

export interface ClientWriteBody {
  name: string;
  type?: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export async function createClient(body: ClientWriteBody): Promise<ClientSummary> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as ClientSummary;
}

export async function updateClient(
  id: string,
  body: ClientWriteBody,
): Promise<ClientSummary> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as ClientSummary;
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await _parse(res);
}

export async function askClient(
  clientId: string,
  question: string,
): Promise<ClientReportAnswer> {
  const res = await fetch(`/api/clients/${clientId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    credentials: "include",
  });
  return (await _parse(res)) as ClientReportAnswer;
}

export async function listReportFolders(): Promise<ClientReportFoldersState> {
  const res = await fetch("/api/client-report/folders", {
    credentials: "include",
  });
  return (await _parse(res)) as ClientReportFoldersState;
}

export async function addReportFolder(input: {
  folder_id: string;
  folder_name?: string;
}): Promise<ClientReportFolder> {
  const res = await fetch("/api/client-report/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await _parse(res)) as ClientReportFolder;
}

export async function removeReportFolder(id: string): Promise<void> {
  const res = await fetch(`/api/client-report/folders/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await _parse(res);
}

export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
  parents?: string[];
}

/**
 * List the Drive folders of the connected Google account.
 * Optional `search` filters server-side via `name contains`.
 */
export async function listDriveFolders(search = ""): Promise<DriveFolder[]> {
  const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`/api/drive/folders${qs}`, {
    credentials: "include",
  });
  return (await _parse(res)) as DriveFolder[];
}

export { ApiError };
