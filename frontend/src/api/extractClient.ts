/**
 * Smart Extract API client (Sprint 2).
 *
 * Wraps the three `/api/extract/*` endpoints with typed helpers. Every
 * request sends `credentials: "include"` so the session cookie is
 * attached — the backend requires it (Depends(get_current_user)).
 */

export type DocumentType = "invoice" | "contract" | "note" | "other";

export interface InvoiceLine {
  label?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price_ht?: number | null;
  total_ht?: number | null;
}

/**
 * Shape of `extracted_data` returned by the backend. Fields are
 * optional because the model only fills what it can see; the UI
 * treats `null` / missing as "à renseigner".
 */
export interface ExtractedData {
  // Invoice-specific
  supplier_name?: string | null;
  supplier_siret?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount_ht?: number | null;
  vat_rate?: number | null;
  amount_vat?: number | null;
  amount_ttc?: number | null;
  auto_liquidation?: boolean | null;
  lines?: InvoiceLine[] | null;
  currency?: string | null;

  // Contract-specific
  parties?: string[] | null;
  object?: string | null;
  amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  duration?: string | null;
  key_obligations?: string[] | null;
  penalties?: string[] | null;

  // Note-specific
  date?: string | null;
  project?: string | null;
  key_points?: string[] | null;
  actions?: Array<{ label?: string; owner?: string; due_date?: string | null }> | null;

  // "other" fallback
  reason?: string | null;

  // Free-form passthrough for anything the model added.
  [key: string]: unknown;
}

export interface ExtractionResult {
  id: string;
  user_id: string;
  source_type: "photo" | "pdf" | "text" | string | null;
  original_filename: string | null;
  stored_filename: string | null;
  raw_text: string | null;
  extracted_data: ExtractedData | null;
  document_type: DocumentType | string | null;
  target_folder: string | null;
  created_at: string | null;

  // Added by /upload (not /history):
  summary?: string;
  suggested_folder?: string;
  suggested_filename?: string;
  confidence?: number;
}

export interface SaveExtractionBody {
  extraction_id: string;
  validated_data: ExtractedData;
  target_folder: string;
  final_filename: string;
  commit_to_invoices?: boolean;
}

export interface SaveExtractionResult {
  saved: boolean;
  extraction: ExtractionResult;
  invoice_id: string | null;
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
    // non-JSON response (e.g. 413 plain text) — surface status alone.
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

/**
 * Upload a document (file OR pasted text) for Smart Extract.
 * Exactly one of `file` / `text` must be provided.
 */
export async function uploadExtraction(input: {
  file?: File;
  text?: string;
}): Promise<ExtractionResult> {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  if (input.text !== undefined) form.append("text", input.text);

  const res = await fetch("/api/extract/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  return (await _parse(res)) as ExtractionResult;
}

export async function saveExtraction(
  body: SaveExtractionBody,
): Promise<SaveExtractionResult> {
  const res = await fetch("/api/extract/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as SaveExtractionResult;
}

export async function listExtractionHistory(limit = 30): Promise<ExtractionResult[]> {
  const res = await fetch(`/api/extract/history?limit=${limit}`, {
    credentials: "include",
  });
  return (await _parse(res)) as ExtractionResult[];
}

export { ApiError };
