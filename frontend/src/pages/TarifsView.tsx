/**
 * Grille tarifaire page (Sprint 3 / B1).
 *
 * Liste les postes tarifaires du prospect avec leur prix unitaire. Sert de
 * référence au générateur de devis (B2). L'utilisateur peut ajouter, modifier
 * ou supprimer des postes. 18 postes BTP sont pré-remplis lors de la création
 * du tenant (seed).
 *
 * Route : /dashboard/settings/tarifs
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Euro,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createTarif,
  deleteTarif,
  groupByCategory,
  listTarifs,
  updateTarif,
  type Tarif,
  type TarifWriteBody,
} from "@/api/tarifsClient";

const UNITS: { value: string; label: string }[] = [
  { value: "m²", label: "m² (mètre carré)" },
  { value: "m³", label: "m³ (mètre cube)" },
  { value: "ml", label: "ml (mètre linéaire)" },
  { value: "u", label: "u (unité)" },
  { value: "h", label: "h (heure)" },
  { value: "j", label: "j (journée)" },
  { value: "forfait", label: "forfait" },
];

const VAT_CHOICES: { value: number; label: string }[] = [
  { value: 0.2, label: "20 % (taux normal)" },
  { value: 0.1, label: "10 % (rénovation)" },
  { value: 0.055, label: "5,5 % (isolation, travaux énergétiques)" },
  { value: 0, label: "0 % (non applicable)" },
];

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; tarif: Tarif };

interface FormValues {
  key: string;
  label: string;
  unit: string;
  unit_price_ht: string;
  vat_rate: number;
  category: string;
}

function blankForm(): FormValues {
  return {
    key: "",
    label: "",
    unit: "m²",
    unit_price_ht: "",
    vat_rate: 0.2,
    category: "",
  };
}

function tarifToForm(t: Tarif): FormValues {
  return {
    key: t.key,
    label: t.label,
    unit: t.unit,
    unit_price_ht: String(t.unit_price_ht ?? ""),
    vat_rate: t.vat_rate ?? 0.2,
    category: t.category ?? "",
  };
}

function formatPrice(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TarifsView() {
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listTarifs();
      setTarifs(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tarifs;
    return tarifs.filter((t) => {
      return (
        t.label.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [tarifs, search]);

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  async function handleDelete(tarif: Tarif) {
    const ok = window.confirm(
      `Supprimer le tarif « ${tarif.label} » ? Cette action est définitive.`,
    );
    if (!ok) return;
    setDeletingId(tarif.id);
    try {
      await deleteTarif(tarif.id);
      await refresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? `Suppression impossible : ${err.message}`
          : "Suppression impossible.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Euro className="h-6 w-6 text-violet-600" />
            Grille tarifaire
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Vos postes et prix unitaires. Cette grille est utilisée par le
            générateur de devis pour produire des lignes cohérentes avec vos
            tarifs. Vous pouvez ajouter, modifier ou supprimer chaque poste.
          </p>
        </div>
        <button
          onClick={() => setEditor({ mode: "create" })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouveau tarif
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un tarif, une catégorie, un code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!loading && !loadError && tarifs.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            Aucun tarif enregistré. Commencez par ajouter votre premier poste.
          </p>
        </div>
      )}

      {!loading && !loadError && tarifs.length > 0 && grouped.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            Aucun tarif ne correspond à votre recherche.
          </p>
        </div>
      )}

      {/* Grouped table */}
      {!loading && !loadError && grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
                {category}
              </h2>
              <div className="overflow-hidden border border-gray-200 rounded-xl bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Libellé</th>
                      <th className="px-4 py-2.5 hidden md:table-cell">Code</th>
                      <th className="px-4 py-2.5 w-20 text-center">Unité</th>
                      <th className="px-4 py-2.5 w-28 text-right">Prix HT</th>
                      <th className="px-4 py-2.5 w-20 text-right">TVA</th>
                      <th className="px-4 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-violet-50/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{t.label}</div>
                          {t.is_seed && (
                            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                              Modèle pré-rempli
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-gray-500 font-mono">
                            {t.key}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {t.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                          {formatPrice(t.unit_price_ht)} €
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {(t.vat_rate * 100).toLocaleString("fr-FR", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          %
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditor({ mode: "edit", tarif: t })}
                              className="p-1.5 rounded-md text-gray-500 hover:text-violet-700 hover:bg-violet-50"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              disabled={deletingId === t.id}
                              className="p-1.5 rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                              title="Supprimer"
                            >
                              {deletingId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editor.mode !== "closed" && (
        <EditorModal
          initialKey={editor.mode === "edit" ? editor.tarif.key : undefined}
          initialForm={
            editor.mode === "edit" ? tarifToForm(editor.tarif) : blankForm()
          }
          editingId={editor.mode === "edit" ? editor.tarif.id : null}
          onClose={() => setEditor({ mode: "closed" })}
          onSaved={async () => {
            setEditor({ mode: "closed" });
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor modal
// ─────────────────────────────────────────────────────────────────────────────

interface EditorProps {
  initialKey?: string;
  initialForm: FormValues;
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditorModal({ initialKey, initialForm, editingId, onClose, onSaved }: EditorProps) {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNumber = Number(form.unit_price_ht.replace(",", "."));
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setError("Le prix unitaire HT doit être un nombre positif.");
      return;
    }

    const body: TarifWriteBody = {
      label: form.label.trim(),
      unit: form.unit,
      unit_price_ht: priceNumber,
      vat_rate: form.vat_rate,
      category: form.category.trim() || null,
    };

    // Include the key only when creating or when it was modified.
    if (!editingId || (initialKey && form.key !== initialKey)) {
      body.key = form.key.trim().toLowerCase();
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateTarif(editingId, body);
      } else {
        await createTarif(body);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const keyDisabled = Boolean(editingId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {editingId ? "Modifier le tarif" : "Nouveau tarif"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder="Peinture murale deux couches"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={keyDisabled}
              value={form.key}
              onChange={(e) => update("key", e.target.value)}
              placeholder="peinture_murale_m2"
              pattern="[a-z0-9_]+"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Identifiant court sans espace (lettres minuscules, chiffres, underscores).
              {keyDisabled ? " Non modifiable après création." : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unité <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prix HT (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="decimal"
                value={form.unit_price_ht}
                onChange={(e) => update("unit_price_ht", e.target.value)}
                placeholder="25.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Taux de TVA
            </label>
            <select
              value={form.vat_rate}
              onChange={(e) => update("vat_rate", Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            >
              {VAT_CHOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Peinture, Cloisons, Sols..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Sert uniquement au regroupement dans la liste. Optionnel.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
