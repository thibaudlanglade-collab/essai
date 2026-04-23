/**
 * Photo → PDF/Excel page.
 *
 * Outil quotidien : photo → OCR backend (GPT-4o vision) → affichage
 * éditable (texte libre + détection auto d'un tableau) → export PDF/Excel
 * généré côté client à partir du contenu validé/modifié par l'utilisateur.
 *
 * Route: /dashboard/photo-to-document
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Upload,
  FileText,
  FileSpreadsheet,
  Loader2,
  X,
  Check,
  Download,
  Table as TableIcon,
  Plus,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  uploadExtraction,
  ApiError,
  type ExtractionResult,
} from "@/api/extractClient";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_BYTES = 20 * 1024 * 1024;

type Phase = "idle" | "processing" | "done" | "error";

interface FieldRow {
  label: string;
  value: string;
}

function humanizeLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenData(data: Record<string, unknown> | null | undefined): FieldRow[] {
  if (!data) return [];
  const rows: FieldRow[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      rows.push({
        label: key,
        value: value
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
          .join(" · "),
      });
    } else if (typeof value === "object") {
      rows.push({ label: key, value: JSON.stringify(value) });
    } else {
      rows.push({ label: key, value: String(value) });
    }
  }
  return rows;
}

/**
 * Split raw OCR output into (free-text lines, table-grid-block).
 * Heuristic: a contiguous run of ≥2 lines that each contain ≥2 tokens
 * separated by tabs or runs of 2+ spaces is treated as a table.
 * Picks the longest such run.
 */
function splitTextAndTable(raw: string): { text: string; table: string[][] | null } {
  if (!raw) return { text: "", table: null };
  const lines = raw.split(/\r?\n/);

  const splitLine = (line: string): string[] => {
    if (line.includes("\t")) {
      return line.split("\t").map((s) => s.trim()).filter((s) => s.length > 0);
    }
    const parts = line.split(/ {2,}/).map((s) => s.trim()).filter((s) => s.length > 0);
    return parts;
  };

  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let runStart = -1;
  let runCols = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const isTableLine = parts.length >= 2;
    if (isTableLine) {
      if (runStart === -1) {
        runStart = i;
        runCols = parts.length;
      }
    } else {
      if (runStart !== -1) {
        const len = i - runStart;
        if (len >= 2 && len > bestLen) {
          bestStart = runStart;
          bestEnd = i;
          bestLen = len;
        }
        runStart = -1;
        runCols = 0;
      }
    }
  }
  if (runStart !== -1) {
    const len = lines.length - runStart;
    if (len >= 2 && len > bestLen) {
      bestStart = runStart;
      bestEnd = lines.length;
      bestLen = len;
    }
  }

  if (bestStart === -1) return { text: raw, table: null };

  const tableLines = lines.slice(bestStart, bestEnd);
  const grid = tableLines.map(splitLine);
  const maxCols = Math.max(...grid.map((r) => r.length));
  const padded = grid.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push("");
    return copy;
  });

  const textLines = [...lines.slice(0, bestStart), ...lines.slice(bestEnd)];
  const text = textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  void runCols;
  return { text, table: padded };
}

export default function PhotoToDocumentPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Editable state (populated from `result` when extraction completes)
  const [editedFields, setEditedFields] = useState<FieldRow[]>([]);
  const [editedText, setEditedText] = useState<string>("");
  const [editedTable, setEditedTable] = useState<string[][] | null>(null);
  const [docTitle, setDocTitle] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!result) return;
    const rawText = result.raw_text ?? "";
    const { text, table } = splitTextAndTable(rawText);
    setEditedText(text);
    setEditedTable(table);
    setEditedFields(flattenData(result.extracted_data as Record<string, unknown> | null));
    const suggested =
      result.suggested_filename?.replace(/\.[^.]+$/, "") ||
      file?.name?.replace(/\.[^.]+$/, "") ||
      "Document Synthèse";
    setDocTitle(suggested);
  }, [result, file]);

  const handleFiles = useCallback(async (f: File) => {
    if (f.size > MAX_BYTES) {
      setError("Fichier trop volumineux (max 20 Mo).");
      setPhase("error");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
    setPhase("processing");
    try {
      const res = await uploadExtraction({ file: f });
      setResult(res);
      setPhase("done");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Erreur lors de l'extraction.";
      setError(msg);
      setPhase("error");
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFiles(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFiles(f);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setEditedFields([]);
    setEditedText("");
    setEditedTable(null);
    setDocTitle("");
  };

  // ── Table editing helpers ────────────────────────────────────────────────
  const updateCell = (r: number, c: number, value: string) => {
    setEditedTable((prev) => {
      if (!prev) return prev;
      const copy = prev.map((row) => [...row]);
      copy[r][c] = value;
      return copy;
    });
  };

  const addRow = () => {
    setEditedTable((prev) => {
      if (!prev || prev.length === 0) return [[""]];
      const cols = prev[0].length;
      return [...prev, new Array(cols).fill("")];
    });
  };

  const removeRow = (index: number) => {
    setEditedTable((prev) => {
      if (!prev) return prev;
      const copy = prev.filter((_, i) => i !== index);
      return copy.length === 0 ? null : copy;
    });
  };

  const addColumn = () => {
    setEditedTable((prev) => {
      if (!prev) return [[""]];
      return prev.map((r) => [...r, ""]);
    });
  };

  const removeColumn = (index: number) => {
    setEditedTable((prev) => {
      if (!prev) return prev;
      const copy = prev.map((r) => r.filter((_, i) => i !== index));
      if (copy.length === 0 || copy[0].length === 0) return null;
      return copy;
    });
  };

  const updateField = (i: number, key: "label" | "value", v: string) => {
    setEditedFields((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: v };
      return copy;
    });
  };

  const removeField = (i: number) => {
    setEditedFields((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addField = () => {
    setEditedFields((prev) => [...prev, { label: "", value: "" }]);
  };

  const promoteTextToTable = () => {
    // Manual fallback when auto-detection missed the table.
    setEditedTable((prev) => {
      if (prev && prev.length > 0) return prev;
      return [
        ["", ""],
        ["", ""],
      ];
    });
  };

  const demoteTableToText = () => {
    setEditedTable((prev) => {
      if (!prev) return prev;
      const asText = prev.map((row) => row.join("\t")).join("\n");
      setEditedText((t) => (t ? `${t}\n\n${asText}` : asText));
      return null;
    });
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const cleanFileName = useMemo(() => {
    return (docTitle || "Document Synthèse").replace(/[^\w\-]+/g, "_").slice(0, 80);
  }, [docTitle]);

  function downloadPdf() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    let y = 20;

    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237);
    doc.text("Synthèse", marginX, y);
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.6);
    doc.line(marginX, y + 2.5, pageWidth - marginX, y + 2.5);
    y += 12;

    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(docTitle || "Document", marginX, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, marginX, y);
    y += 10;

    const validFields = editedFields.filter((f) => f.label.trim() || f.value.trim());
    if (validFields.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Champ", "Valeur"]],
        body: validFields.map((r) => [humanizeLabel(r.label), r.value]),
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255 },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    if (editedTable && editedTable.length > 0) {
      const [head, ...body] = editedTable;
      autoTable(doc, {
        startY: y,
        head: [head],
        body,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255 },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    if (editedText.trim()) {
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text("Contenu extrait", marginX, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(editedText, pageWidth - marginX * 2);
      doc.text(lines, marginX, y);
    }

    doc.save(`${cleanFileName}.pdf`);
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new();

    const validFields = editedFields.filter((f) => f.label.trim() || f.value.trim());
    if (validFields.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Champ", "Valeur"],
        ...validFields.map((r) => [humanizeLabel(r.label), r.value]),
      ]);
      ws["!cols"] = [{ wch: 24 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws, "Champs");
    }

    if (editedTable && editedTable.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet(editedTable);
      const cols = editedTable[0].length;
      ws["!cols"] = new Array(cols).fill({ wch: 18 });
      XLSX.utils.book_append_sheet(wb, ws, "Tableau");
    }

    if (editedText.trim()) {
      const ws = XLSX.utils.aoa_to_sheet(
        editedText.split("\n").map((line) => [line])
      );
      ws["!cols"] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, ws, "Texte");
    }

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
      XLSX.utils.book_append_sheet(wb, ws, "Résultat");
    }

    XLSX.writeFile(wb, `${cleanFileName}.xlsx`);
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-violet-50">
          <Camera className="h-5 w-5 text-violet-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Photo → PDF ou Excel
        </h1>
      </div>
      <p className="text-sm text-gray-600 mb-8 max-w-2xl">
        Déposez une photo (note manuscrite, ticket, tableau, formulaire). Synthèse
        lit le contenu, vous corrigez si besoin, puis téléchargez en PDF ou Excel.
      </p>

      {phase === "idle" && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
            dragOver
              ? "border-violet-400 bg-violet-50"
              : "border-gray-300 bg-white hover:border-violet-300 hover:bg-violet-50/30"
          }`}
        >
          <Upload className="h-10 w-10 mx-auto text-violet-400 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            Déposez une photo ici, ou cliquez pour parcourir
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG, WEBP, HEIC · 20 Mo max
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      )}

      {phase === "processing" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <div className="flex items-center gap-4 mb-6">
            <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-gray-900">Analyse de la photo…</p>
              <p className="text-xs text-gray-500">{file?.name}</p>
            </div>
          </div>
          {preview && (
            <img src={preview} alt="Aperçu" className="max-h-64 mx-auto rounded-lg border border-gray-100" />
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Impossible d'analyser la photo</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-red-700 underline hover:text-red-900"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Relisez, corrigez, puis téléchargez
                </p>
                <p className="text-xs text-emerald-700">
                  Tout est éditable ci-dessous. Vos modifications sont utilisées dans l'export.
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="text-xs text-emerald-700 underline hover:text-emerald-900"
            >
              Nouvelle photo
            </button>
          </div>

          {/* Titre du document */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Titre du document
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:outline-none focus:border-violet-400 pb-1"
              placeholder="Nom du fichier exporté"
            />
          </div>

          {/* Champs détectés (éditable) */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Champs détectés
              </p>
              <button
                onClick={addField}
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            {editedFields.length === 0 ? (
              <p className="px-5 py-4 text-xs text-gray-400">
                Aucun champ détecté. Cliquez sur « Ajouter » pour en créer un.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {editedFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2">
                    <input
                      value={humanizeLabel(f.label)}
                      onChange={(e) => updateField(i, "label", e.target.value)}
                      className="w-40 shrink-0 text-xs text-gray-600 bg-transparent border-b border-transparent focus:border-violet-300 focus:outline-none py-1"
                    />
                    <input
                      value={f.value}
                      onChange={(e) => updateField(i, "value", e.target.value)}
                      className="flex-1 text-sm text-gray-900 bg-transparent border-b border-transparent focus:border-violet-300 focus:outline-none py-1"
                    />
                    <button
                      onClick={() => removeField(i)}
                      className="text-gray-300 hover:text-red-500 p-1"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tableau détecté (éditable) */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-teal-600" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tableau
                </p>
              </div>
              <div className="flex items-center gap-3">
                {editedTable ? (
                  <>
                    <button
                      onClick={addRow}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      + Ligne
                    </button>
                    <button
                      onClick={addColumn}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      + Colonne
                    </button>
                    <button
                      onClick={demoteTableToText}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Convertir en texte
                    </button>
                  </>
                ) : (
                  <button
                    onClick={promoteTextToTable}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700"
                  >
                    Créer un tableau
                  </button>
                )}
              </div>
            </div>
            {editedTable && editedTable.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {editedTable.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? "bg-teal-50/60 font-semibold" : "hover:bg-gray-50/50"}
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-2 py-1 border-b border-gray-100">
                            <input
                              value={cell}
                              onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-gray-900 focus:outline-none focus:bg-violet-50/40 rounded"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 border-b border-gray-100 w-8">
                          {rIdx !== 0 ? (
                            <button
                              onClick={() => removeRow(rIdx)}
                              className="text-gray-300 hover:text-red-500 p-1"
                              aria-label="Supprimer la ligne"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => removeColumn(row.length - 1)}
                              className="text-[10px] text-gray-400 hover:text-red-500"
                              title="Supprimer la dernière colonne"
                            >
                              −col
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-4 text-xs text-gray-400">
                Pas de tableau détecté dans la photo.
              </p>
            )}
          </div>

          {/* Texte libre (éditable) */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Texte extrait
              </p>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              spellCheck={false}
              className="w-full px-5 py-4 text-sm text-gray-800 font-sans leading-relaxed min-h-40 focus:outline-none resize-y"
              placeholder="(aucun texte hors tableau)"
            />
          </div>

          {/* Boutons export */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={downloadPdf}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 hover:border-violet-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
                <FileText className="h-6 w-6 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Télécharger en PDF</p>
                <p className="text-xs text-gray-500">Document A4 propre, prêt à imprimer</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-violet-500" />
            </button>

            <button
              onClick={downloadExcel}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 hover:border-violet-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Télécharger en Excel</p>
                <p className="text-xs text-gray-500">Tableur exploitable, trié par champ</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-violet-500" />
            </button>
          </div>

          {preview && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Photo source
                </p>
              </div>
              <img src={preview} alt="Photo originale" className="max-h-80 mx-auto my-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
