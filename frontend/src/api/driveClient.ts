/**
 * Google Drive client (Sprint 3).
 *
 * Thin wrappers over `/api/drive/*`. Every call sends the session cookie
 * so the backend can scope to the caller's tenant.
 */

export interface DriveStatus {
  connected: boolean;
  account_email: string | null;
  connected_at: string | null;
  scopes?: string[];
}

export interface WatchedFolder {
  id: string;
  user_id: string;
  provider: string;
  folder_id: string;
  folder_name: string | null;
  last_checked_at: string | null;
  files_processed: number;
  is_active: boolean;
  created_at: string | null;
}

async function _json<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText;
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return body as T;
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const res = await fetch("/api/drive/status", { credentials: "include" });
  return _json<DriveStatus>(res);
}

export async function startDriveConnect(): Promise<{ auth_url: string }> {
  const res = await fetch("/api/drive/connect", { credentials: "include" });
  return _json<{ auth_url: string }>(res);
}

export async function disconnectDrive(): Promise<{ success: boolean }> {
  const res = await fetch("/api/drive/disconnect", {
    method: "POST",
    credentials: "include",
  });
  return _json<{ success: boolean }>(res);
}

export async function getWatchedFolder(): Promise<WatchedFolder | null> {
  const res = await fetch("/api/drive/watched-folder", {
    credentials: "include",
  });
  return _json<WatchedFolder | null>(res);
}

export async function setupWatchedFolder(input: {
  folder_id: string;
  folder_name?: string;
}): Promise<WatchedFolder> {
  const res = await fetch("/api/drive/watched-folder/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return _json<WatchedFolder>(res);
}

export async function disconnectWatchedFolder(): Promise<{ success: boolean }> {
  const res = await fetch("/api/drive/watched-folder/disconnect", {
    method: "POST",
    credentials: "include",
  });
  return _json<{ success: boolean }>(res);
}
