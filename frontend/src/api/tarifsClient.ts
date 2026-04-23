/**
 * Grille tarifaire API client (Sprint 3).
 *
 * Thin wrapper around `/api/tarifs`. Every request sends
 * `credentials: "include"` so the prospect session cookie is attached.
 */

export interface Tarif {
  id: string;
  user_id: string;
  key: string;
  label: string;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  category: string | null;
  is_seed: boolean;
  created_at: string | null;
}

export interface TarifWriteBody {
  key?: string;
  label: string;
  unit: string;
  unit_price_ht: number;
  vat_rate?: number;
  category?: string | null;
}

export class TarifApiError extends Error {
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
    // non-JSON — surface status alone.
  }
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText || `HTTP ${res.status}`;
    throw new TarifApiError(res.status, detail);
  }
  return body;
}

export async function listTarifs(): Promise<Tarif[]> {
  const res = await fetch("/api/tarifs", { credentials: "include" });
  return (await _parse(res)) as Tarif[];
}

export async function createTarif(body: TarifWriteBody): Promise<Tarif> {
  const res = await fetch("/api/tarifs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as Tarif;
}

export async function updateTarif(
  id: string,
  body: TarifWriteBody,
): Promise<Tarif> {
  const res = await fetch(`/api/tarifs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await _parse(res)) as Tarif;
}

export async function deleteTarif(id: string): Promise<void> {
  const res = await fetch(`/api/tarifs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await _parse(res);
}

/** Group tarifs by `category` (null → "Autre"). Stable ordering: category
 * label asc, then tarif label asc. */
export function groupByCategory(tarifs: Tarif[]): Array<[string, Tarif[]]> {
  const buckets = new Map<string, Tarif[]>();
  for (const t of tarifs) {
    const cat = t.category || "Autre";
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(t);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([cat, items]) => [
      cat,
      items.slice().sort((a, b) => a.label.localeCompare(b.label, "fr")),
    ]);
}
