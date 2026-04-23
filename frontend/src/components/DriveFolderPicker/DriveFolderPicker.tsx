/**
 * DriveFolderPicker (Sprint 4 bonus).
 *
 * Combobox that lists the prospect's Google Drive folders (flat) via
 * `GET /api/drive/folders`. Debounced server-side search by `name contains`.
 * Click on an item fills the `folder_id` + `folder_name` inputs of the
 * parent form.
 *
 * Intended to replace the raw "collez l'ID du dossier" text input on:
 *   - /dashboard/clients (Rapport client → Dossiers Drive à parcourir)
 *   - /dashboard/automations (Surveillance d'un dossier Google Drive)
 *
 * A future Sprint 6 Google Picker (hierarchical, native) will supersede
 * this component; keeping the API shape `{value, onChange}` compatible
 * will make that swap painless.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import {
  listDriveFolders,
  type DriveFolder,
} from "@/api/clientReportClient";

export interface DriveFolderPickerValue {
  folder_id: string;
  folder_name: string;
}

interface Props {
  value: DriveFolderPickerValue;
  onChange: (next: DriveFolderPickerValue) => void;
  disabled?: boolean;
  /** Shown above the combobox. Default: "Dossier Drive". */
  label?: string;
  /** Shown under the combobox as hint. */
  hint?: string;
}

export default function DriveFolderPicker({
  value,
  onChange,
  disabled,
  label = "Dossier Drive",
  hint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const fetchFolders = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listDriveFolders(q);
      setFolders(list);
      setFetchedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste indisponible.");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open + on search change (debounced).
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchFolders(search);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, search, fetchFolders]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(f: DriveFolder) {
    onChange({ folder_id: f.id, folder_name: f.name });
    setOpen(false);
  }

  const displayValue = value.folder_name || value.folder_id || "";

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 text-sm text-left border border-gray-200 rounded-md bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 disabled:bg-gray-50 disabled:text-gray-400 flex items-center justify-between gap-2"
      >
        <span className={displayValue ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
          {displayValue || "Choisir un dossier Drive"}
        </span>
        <ChevronDown className={"h-4 w-4 shrink-0 text-gray-400 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="relative">
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tapez pour rechercher un dossier…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="px-3 py-4 text-xs text-gray-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Chargement des dossiers…
                </div>
              )}
              {error && (
                <div className="px-3 py-3 text-xs text-rose-600">{error}</div>
              )}
              {!loading && !error && fetchedOnce && folders.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">
                  {search
                    ? "Aucun dossier ne correspond."
                    : "Aucun dossier dans ce Drive."}
                </div>
              )}
              {!loading &&
                folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => pick(f)}
                    className={
                      "w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-b-0 " +
                      (f.id === value.folder_id
                        ? "bg-violet-50 text-violet-800"
                        : "text-gray-700")
                    }
                  >
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-[11px] text-gray-400 truncate font-mono">
                      {f.id}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {hint && (
        <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
