import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Upload,
  Trash2,
  Pencil,
  Search,
  Calendar,
} from "lucide-react";
import type { Employee, EmployeeInput } from "@/api/employeesClient";
import { useEmployees } from "@/hooks/useEmployees";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSelectedChange: (ids: number[]) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WORKING_DAY_OPTIONS = [
  { en: "monday", fr: "Lun" },
  { en: "tuesday", fr: "Mar" },
  { en: "wednesday", fr: "Mer" },
  { en: "thursday", fr: "Jeu" },
  { en: "friday", fr: "Ven" },
  { en: "saturday", fr: "Sam" },
  { en: "sunday", fr: "Dim" },
];

const DEFAULT_FORM: EmployeeInput = {
  name: "",
  hours_per_week: 35,
  working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  skills: [],
  unavailable_dates: [],
  email: null,
  phone: null,
  position: null,
  hire_date: null,
  notes: null,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillsBadges({ skills }: { skills: string[] }) {
  const max = 3;
  const shown = skills.slice(0, max);
  const extra = skills.length - max;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <span
          key={s}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200"
        >
          {s}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-gray-400">+{extra} autres</span>
      )}
    </div>
  );
}

// ── Employee form ─────────────────────────────────────────────────────────────

function EmployeeForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: EmployeeInput;
  onSave: (data: EmployeeInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [skillsText, setSkillsText] = useState(initial.skills.join(", "));
  const [newDate, setNewDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter((d) => d !== day)
        : [...f.working_days, day],
    }));
  }

  function addDate() {
    if (!newDate) return;
    if (!form.unavailable_dates.includes(newDate)) {
      setForm((f) => ({
        ...f,
        unavailable_dates: [...f.unavailable_dates, newDate].sort(),
      }));
    }
    setNewDate("");
  }

  function removeDate(d: string) {
    setForm((f) => ({
      ...f,
      unavailable_dates: f.unavailable_dates.filter((x) => x !== d),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    if (form.hours_per_week <= 0) {
      setFormError("Les heures par semaine doivent être supérieures à 0.");
      return;
    }
    setFormError(null);
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await onSave({ ...form, skills });
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {formError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {formError}
        </div>
      )}

      {/* Name + Position */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Nom *</label>
          <input
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Marie Dupont"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Poste</label>
          <input
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
            value={form.position ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, position: e.target.value || null }))
            }
            placeholder="Expert-comptable"
          />
        </div>
      </div>

      {/* Hours per week */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Heures par semaine</label>
        <input
          type="number"
          min={1}
          max={60}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300 w-32"
          value={form.hours_per_week}
          onChange={(e) =>
            setForm((f) => ({ ...f, hours_per_week: Number(e.target.value) }))
          }
        />
      </div>

      {/* Working days */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Jours travaillés</label>
        <div className="flex gap-2 flex-wrap">
          {WORKING_DAY_OPTIONS.map(({ en, fr }) => {
            const active = form.working_days.includes(en);
            return (
              <button
                key={en}
                type="button"
                onClick={() => toggleDay(en)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  active
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "bg-transparent border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                {fr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          Compétences (séparées par des virgules)
        </label>
        <input
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="fiscalité, audit, comptabilité"
        />
      </div>

      {/* Unavailable dates */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Dates d'indisponibilité</label>
        <div className="flex gap-2">
          <input
            type="date"
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <button
            type="button"
            onClick={addDate}
            className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-gray-300 transition-colors"
          >
            Ajouter
          </button>
        </div>
        {form.unavailable_dates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {form.unavailable_dates.map((d) => (
              <span
                key={d}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground border border-gray-200"
              >
                <Calendar className="h-3 w-3" />
                {d}
                <button
                  type="button"
                  onClick={() => removeDate(d)}
                  className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            type="email"
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
            value={form.email ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value || null }))
            }
            placeholder="marie@cabinet.fr"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Téléphone</label>
          <input
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300"
            value={form.phone ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, phone: e.target.value || null }))
            }
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      {/* Hire date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Date d'embauche</label>
        <input
          type="date"
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300 w-48"
          value={form.hire_date ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, hire_date: e.target.value || null }))
          }
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Notes</label>
        <textarea
          rows={2}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gray-300 resize-none"
          value={form.notes ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, notes: e.target.value || null }))
          }
          placeholder="Informations complémentaires..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-transparent border border-gray-200 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-gray-300 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function EmployeesModal({
  open,
  onClose,
  selectedIds,
  onSelectedChange,
}: Props) {
  const { employees, loading, create, update, remove, removeBulk, importFromCsv } =
    useEmployees();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<{
    type: "success" | "warning";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setEditingEmployee(null);
      setSearch("");
      setImportResult(null);
    }
  }, [open]);

  if (!open) return null;

  // Filtered list
  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  // Selection helpers
  function toggleSelect(id: number) {
    onSelectedChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      onSelectedChange([]);
    } else {
      onSelectedChange(filtered.map((e) => e.id));
    }
  }

  // Form handlers
  function openCreate() {
    setEditingEmployee(null);
    setFormOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingEmployee(null);
  }

  async function handleSave(data: EmployeeInput) {
    setSaving(true);
    try {
      if (editingEmployee) {
        await update(editingEmployee.id, data);
      } else {
        await create(data);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await remove(id);
    onSelectedChange(selectedIds.filter((x) => x !== id));
    setDeleteConfirmId(null);
  }

  async function handleBulkDelete() {
    await removeBulk(selectedIds);
    onSelectedChange([]);
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await importFromCsv(file);
      if (result.errors.length > 0) {
        setImportResult({
          type: "warning",
          message: `${result.imported_count} importé(s), ${result.skipped_count} ignoré(s). ${result.errors[0]}`,
        });
      } else {
        setImportResult({
          type: "success",
          message: `${result.imported_count} employé(s) importé(s) avec succès.`,
        });
      }
    } catch (err) {
      setImportResult({
        type: "warning",
        message: `Erreur d'import : ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const initialForm: EmployeeInput = editingEmployee
    ? {
        name: editingEmployee.name,
        hours_per_week: editingEmployee.hours_per_week,
        working_days: editingEmployee.working_days,
        skills: editingEmployee.skills,
        unavailable_dates: editingEmployee.unavailable_dates,
        email: editingEmployee.email,
        phone: editingEmployee.phone,
        position: editingEmployee.position,
        hire_date: editingEmployee.hire_date,
        notes: editingEmployee.notes,
      }
    : DEFAULT_FORM;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container */}
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-medium text-foreground">Mes employés</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-foreground hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Import result banner ───────────────────────────────────────────── */}
        {importResult && (
          <div
            className={`px-6 py-3 text-sm border-b shrink-0 ${
              importResult.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}
          >
            {importResult.message}
            <button
              onClick={() => setImportResult(null)}
              className="ml-3 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5 inline" />
            </button>
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        {!formOpen && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-wrap shrink-0">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter un employé
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-transparent border border-gray-200 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-gray-300 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importer un CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvFile}
            />

            {/* Search */}
            <div className="flex-1 min-w-[160px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-gray-300 outline-none focus:border-gray-300"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Bulk delete */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer la sélection ({selectedIds.length})
              </button>
            )}
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Edit / Create form */}
          {formOpen ? (
            <EmployeeForm
              initial={initialForm}
              onSave={handleSave}
              onCancel={closeForm}
              saving={saving}
            />
          ) : (
            <>
              {loading && (
                <p className="text-sm text-gray-400 text-center py-12">
                  Chargement...
                </p>
              )}

              {!loading && filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-12">
                  {employees.length === 0
                    ? "Aucun employé. Créez-en un ou importez un CSV."
                    : "Aucun résultat pour cette recherche."}
                </p>
              )}

              {!loading && filtered.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                    <tr>
                      <th className="w-10 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="accent-gray-900"
                          checked={
                            filtered.length > 0 &&
                            filtered.every((e) => selectedIds.includes(e.id))
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        Heures / jours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        Compétences
                      </th>
                      <th className="w-24 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => {
                      const selected = selectedIds.includes(emp.id);
                      const confirmingDelete = deleteConfirmId === emp.id;
                      return (
                        <tr
                          key={emp.id}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            selected ? "bg-gray-50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="accent-gray-900"
                              checked={selected}
                              onChange={() => toggleSelect(emp.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{emp.name}</p>
                            {emp.position && (
                              <p className="text-xs text-muted-foreground">{emp.position}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-gray-400">
                              {emp.hours_per_week}h/sem ·{" "}
                              {emp.working_days
                                .map(
                                  (d) =>
                                    WORKING_DAY_OPTIONS.find((o) => o.en === d)?.fr ?? d
                                )
                                .join(" ")}
                            </p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {emp.skills.length > 0 ? (
                              <SkillsBadges skills={emp.skills} />
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {confirmingDelete ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(emp.id)}
                                    className="text-xs px-2 py-1 bg-red-50 border border-red-200 rounded text-red-600 hover:bg-red-100 transition-colors"
                                  >
                                    Confirmer
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-xs px-2 py-1 bg-gray-100 rounded text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openEdit(emp)}
                                    className="p-1.5 rounded text-gray-400 hover:text-foreground hover:bg-gray-100 transition-colors"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(emp.id)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        {!formOpen && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-400">
              {selectedIds.length > 0
                ? `${selectedIds.length} employé(s) sélectionné(s)`
                : `${employees.length} employé(s) au total`}
            </p>
            <button
              onClick={onClose}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Utiliser les {selectedIds.length} sélectionné(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
