/**
 * Devis API client (Sprint 3 B2).
 *
 * Thin wrapper around `/api/quotes`. Toutes les requêtes envoient
 * `credentials: "include"` pour embarquer le cookie de session prospect.
 */

export type QuoteStatus = "draft" | "sent" | "accepted" | "refused";
export type QuoteSource = "manual" | "text" | "email" | "voice" | "photo";

export interface QuoteLine {
  label: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  total_ht: number;
  /** Present uniquement côté générateur : indique si la ligne vient de la grille tarifaire. */
  source?: "grid" | "custom";
  tarif_key?: string | null;
}

export interface Quote {
  id: string;
  user_id: string;
  client_id: string | null;
  quote_number: string | null;
  title: string | null;
  description: string | null;
  lines: QuoteLine[];
  amount_ht: number | null;
  vat_rate: number | null;
  amount_ttc: number | null;
  status: QuoteStatus;
  created_from: QuoteSource | null;
  source_text: string | null;
  is_seed: boolean;
  created_at: string | null;
}

export interface QuoteWriteBody {
  title?: string | null;
  description?: string | null;
  status?: QuoteStatus;
  vat_rate?: number;
  lines: QuoteLine[];
  client_id?: string | null;
  source_text?: string | null;
  created_from?: QuoteSource | null;
}

export interface QuoteGenerationRequest {
  source_text: string;
  suggested_vat_rate?: number;
  client_id?: string | null;
  created_from?: QuoteSource;
}

export interface QuoteGenerationResult {
  title: string;
  description: string;
  assumptions: string;
  vat_rate: number;
  lines: QuoteLine[];
  amount_ht: number;
  amount_ttc: number;
  client_id: string | null;
  source_text: string;
  created_from: QuoteSource;
}

export class QuoteApiError extends Error {
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
    // non-JSON
  }
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText || `HTTP ${res.status}`;
    throw new QuoteApiError(res.status, detail);
  }
  return body;
}

export async function listQuotes(status?: QuoteStatus): Promise<Quote[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/quotes${qs}`, { credentials: "include" });
  return (await _parse(res)) as Quote[];
}

export async function getQuote(id: string): Promise<Quote> {
  const res = await fetch(`/api/quotes/${id}`, { credentials: "include" });
  return (await _parse(res)) as Quote;
}

export async function generateQuote(
  req: QuoteGenerationRequest,
): Promise<QuoteGenerationResult> {
  const res = await fetch("/api/quotes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  return (await _parse(res)) as QuoteGenerationResult;
}

export interface QuoteLinesAppendRequest {
  source_text: string;
  existing_lines: QuoteLine[];
  client_id?: string | null;
}

/** Append-mode generator : renvoie uniquement les lignes supplémentaires à
 *  ajouter au devis, sans rien changer d'autre. */
export async function generateQuoteLines(
  req: QuoteLinesAppendRequest,
): Promise<QuoteLine[]> {
  const res = await fetch("/api/quotes/generate-lines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    credentials: "include",
  });
  const data = (await _parse(res)) as { lines: QuoteLine[] };
  return data.lines || [];
}

export async function createQuote(body: QuoteWriteBody): Promise<Quote> {
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as Quote;
}

export async function updateQuote(
  id: string,
  body: QuoteWriteBody,
): Promise<Quote> {
  const res = await fetch(`/api/quotes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as Quote;
}

export async function deleteQuote(id: string): Promise<void> {
  const res = await fetch(`/api/quotes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await _parse(res);
}

export function quotePdfUrl(id: string): string {
  return `/api/quotes/${id}/pdf`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email source helpers (B3)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailListItem {
  id: number | string;
  from_name: string | null;
  from_email: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
  related_client_id: string | null;
  is_seed?: boolean;
  priority?: string | null;
}

export interface EmailDetail extends EmailListItem {
  body_plain: string | null;
  body_html: string | null;
}

/** List recent emails (wrapper around /api/emails with a small limit). */
export async function listRecentEmails(limit = 40): Promise<EmailListItem[]> {
  const res = await fetch(`/api/emails?limit=${limit}`, { credentials: "include" });
  const data = (await _parse(res)) as { emails: EmailListItem[] };
  return data.emails || [];
}

export async function getEmailDetail(id: number | string): Promise<EmailDetail> {
  const res = await fetch(`/api/emails/${id}`, { credentials: "include" });
  return (await _parse(res)) as EmailDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo de chantier → description + postes suggérés (B5)
// ─────────────────────────────────────────────────────────────────────────────

export interface TarifGridEntry {
  id: string;
  key: string;
  label: string;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  category: string | null;
}

export interface SuggestedPoste {
  tarif_key: string | null;
  label: string;
  reason: string;
}

export interface PhotoDescribeResult {
  description: string;
  suggested_postes: SuggestedPoste[];
  confidence: number;
  tarif_grid: TarifGridEntry[];
}

export async function describePhoto(file: File): Promise<PhotoDescribeResult> {
  const form = new FormData();
  form.append("photo", file, file.name);
  const res = await fetch("/api/quotes/describe-photo", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  return (await _parse(res)) as PhotoDescribeResult;
}


// ─────────────────────────────────────────────────────────────────────────────
// Voice transcription (B4)
// ─────────────────────────────────────────────────────────────────────────────

export async function transcribeAudio(blob: Blob, filename = "recording.webm"): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, filename);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const data = (await _parse(res)) as { text: string };
  return data.text || "";
}


/** Build the devis source_text from an email's content. Fallbacks: body_plain
 *  → snippet → (subject as last resort). HTML is stripped crudely when only
 *  body_html is available. Caps at ~4000 chars. */
export function buildSourceTextFromEmail(email: EmailDetail): string {
  const header =
    `Email reçu` +
    (email.from_name ? ` de ${email.from_name}` : "") +
    (email.from_email ? ` <${email.from_email}>` : "") +
    (email.received_at ? ` le ${new Date(email.received_at).toLocaleDateString("fr-FR")}` : "") +
    `\nSujet : ${email.subject || "(sans sujet)"}\n\n`;

  let body = (email.body_plain || "").trim();
  if (!body && email.snippet) body = email.snippet.trim();
  if (!body && email.body_html) {
    body = email.body_html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<\/?[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!body) body = "(contenu de l'email vide)";

  const text = header + body;
  return text.length > 4000 ? text.slice(0, 4000).trimEnd() + "…" : text;
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
};

export const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  refused: "bg-red-50 text-red-700 border-red-200",
};

export function computeLineTotal(line: Pick<QuoteLine, "quantity" | "unit_price_ht">): number {
  const q = Number(line.quantity) || 0;
  const p = Number(line.unit_price_ht) || 0;
  return Math.round(q * p * 100) / 100;
}

export function computeQuoteTotals(
  lines: QuoteLine[],
  vatRate: number,
): { amount_ht: number; amount_ttc: number } {
  const amount_ht = Math.round(
    lines.reduce((sum, l) => sum + computeLineTotal(l), 0) * 100,
  ) / 100;
  const amount_ttc = Math.round(amount_ht * (1 + (vatRate || 0)) * 100) / 100;
  return { amount_ht, amount_ttc };
}
