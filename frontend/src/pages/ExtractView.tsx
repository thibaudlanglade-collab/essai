/**
 * Smart Extract page (brief §5.1).
 *
 * Unique drop zone that accepts photo, PDF, or pasted text. Backend runs
 * the extraction, returns classification + fields + suggested folder and
 * filename. The prospect reviews/edits the extracted fields in a side
 * panel, validates, and the row is persisted (and optionally spawned
 * into the `invoices` table).
 *
 * Route: /dashboard/extract (mounted by App.tsx under ProtectedLayout).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";
import {
  listExtractionHistory,
  saveExtraction,
  uploadExtraction,
  type DocumentType,
  type ExtractedData,
  type ExtractionResult,
  type InvoiceLine,
} from "@/api/extractClient";

type Mode = "file" | "text";

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Facture",
  contract: "Contrat",
  note: "Note de chantier",
  other: "Autre document",
};

const ACCEPTED_FILE_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic";

export default function ExtractView() {
  useOutletContext<AuthContextShape>(); // ensures the layout contract is honoured

  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [data, setData] = useState<ExtractedData>({});
  const [folder, setFolder] = useState("");
  const [filename, setFilename] = useState("");
  const [commitToInvoices, setCommitToInvoices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [organizeSteps, setOrganizeSteps] = useState<string[]>([]);
  const [organizeRevealed, setOrganizeRevealed] = useState(0);

  const [history, setHistory] = useState<ExtractionResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // ─── History ────────────────────────────────────────────────────────────
  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const list = await listExtractionHistory(30);
      setHistory(list);
    } catch (err) {
      // Non-fatal — history is informational.
      console.warn("history load failed", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // ─── Submit extraction ──────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    setSaveSuccess(null);
    setUploading(true);
    try {
      let result: ExtractionResult;
      if (mode === "file") {
        if (!file) {
          setError("Merci de sélectionner un fichier.");
          setUploading(false);
          return;
        }
        result = await uploadExtraction({ file });
      } else {
        if (!text.trim()) {
          setError("Merci de coller le texte à analyser.");
          setUploading(false);
          return;
        }
        result = await uploadExtraction({ text });
      }
      setExtraction(result);
      setData(result.extracted_data ?? {});
      setFolder(result.suggested_folder ?? result.target_folder ?? "");
      setFilename(result.suggested_filename ?? "");
      setCommitToInvoices(result.document_type === "invoice");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Extraction impossible. Merci de réessayer.",
      );
    } finally {
      setUploading(false);
    }
  }

  // ─── Save validated data ────────────────────────────────────────────────
  async function handleSave() {
    if (!extraction) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(null);
    setOrganizeSteps([]);
    setOrganizeRevealed(0);
    try {
      const res = await saveExtraction({
        extraction_id: extraction.id,
        validated_data: data,
        target_folder: folder,
        final_filename: filename,
        commit_to_invoices: commitToInvoices,
      });
      const steps = res.organize?.steps ?? [];
      setOrganizeSteps(steps);

      // Reveal steps one by one for the "en live" feel the brief §6.1 asks for.
      // The steps themselves are already computed server-side; the timing
      // here is pure UX polish.
      if (steps.length > 0) {
        for (let i = 1; i <= steps.length; i += 1) {
          // Let React paint between reveals.
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 450));
          setOrganizeRevealed(i);
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      setSaveSuccess(
        res.invoice_id
          ? "Document enregistré et ajouté à vos factures."
          : "Document enregistré.",
      );
      await refreshHistory();
      // Reset the form so the prospect can enchaîner.
      setTimeout(() => {
        setExtraction(null);
        setData({});
        setFile(null);
        setText("");
        setFolder("");
        setFilename("");
        setSaveSuccess(null);
        setOrganizeSteps([]);
        setOrganizeRevealed(0);
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Enregistrement impossible. Merci de réessayer.",
      );
    } finally {
      setSaving(false);
    }
  }

  const docType: DocumentType =
    (extraction?.document_type as DocumentType) || "other";

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <HeaderBar />

        {!extraction && (
          <InputPanel
            mode={mode}
            setMode={setMode}
            file={file}
            setFile={setFile}
            text={text}
            setText={setText}
            uploading={uploading}
            onSubmit={handleSubmit}
          />
        )}

        {error && !extraction && <ErrorBanner message={error} />}

        {extraction && (
          <ReviewPanel
            extraction={extraction}
            docType={docType}
            data={data}
            setData={setData}
            folder={folder}
            setFolder={setFolder}
            filename={filename}
            setFilename={setFilename}
            commitToInvoices={commitToInvoices}
            setCommitToInvoices={setCommitToInvoices}
            onBack={() => {
              setExtraction(null);
              setError(null);
            }}
            onSave={handleSave}
            saving={saving}
            error={error}
            saveSuccess={saveSuccess}
            organizeSteps={organizeSteps}
            organizeRevealed={organizeRevealed}
          />
        )}

        <HistoryPanel
          history={history}
          loading={historyLoading}
          onRefresh={refreshHistory}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function HeaderBar() {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <Link
          to="/dashboard"
          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          ← Retour à mon espace
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900 mt-2 mb-2">
          Smart Extract
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Déposez une photo, un PDF ou collez le texte d'un document.
          Synthèse lit, classe et vous propose un rangement. Vous relisez,
          corrigez si besoin, et validez.
        </p>
      </div>
    </div>
  );
}

function InputPanel(props: {
  mode: Mode;
  setMode: (m: Mode) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  text: string;
  setText: (t: string) => void;
  uploading: boolean;
  onSubmit: () => void;
}) {
  const { mode, setMode, file, setFile, text, setText, uploading, onSubmit } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="flex gap-1 mb-5 p-1 rounded-md bg-stone-100 w-fit">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Fichier
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Texte
        </button>
      </div>

      {mode === "file" ? (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
            dragging
              ? "border-gray-700 bg-stone-50"
              : "border-gray-300 hover:border-gray-500 hover:bg-stone-50"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
            disabled={uploading}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {file.name.split(".").pop()?.slice(0, 4) ?? "?"}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} Ko
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-800 mb-1">
                Glissez votre document ici
              </p>
              <p className="text-xs text-gray-500">
                ou cliquez pour parcourir. PDF, JPG, PNG, WEBP, HEIC.
              </p>
            </>
          )}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Collez le contenu du document (facture, note, contrat…)."
          rows={10}
          disabled={uploading}
          className="w-full rounded-lg border border-gray-300 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-700 resize-y"
        />
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={uploading || (mode === "file" ? !file : !text.trim())}
          className="px-5 py-2 rounded bg-gray-900 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          {uploading ? "Analyse en cours…" : "Analyser le document"}
        </button>
        {uploading && (
          <span className="text-xs text-gray-500">
            Lecture, classement, proposition de rangement. Quelques secondes.
          </span>
        )}
      </div>
    </section>
  );
}

function ReviewPanel(props: {
  extraction: ExtractionResult;
  docType: DocumentType;
  data: ExtractedData;
  setData: (d: ExtractedData) => void;
  folder: string;
  setFolder: (v: string) => void;
  filename: string;
  setFilename: (v: string) => void;
  commitToInvoices: boolean;
  setCommitToInvoices: (v: boolean) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  saveSuccess: string | null;
  organizeSteps: string[];
  organizeRevealed: number;
}) {
  const {
    extraction,
    docType,
    data,
    setData,
    folder,
    setFolder,
    filename,
    setFilename,
    commitToInvoices,
    setCommitToInvoices,
    onBack,
    onSave,
    saving,
    error,
    saveSuccess,
    organizeSteps,
    organizeRevealed,
  } = props;

  function patch(partial: Partial<ExtractedData>) {
    setData({ ...data, ...partial });
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-100 text-xs font-medium text-gray-700 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {DOC_TYPE_LABELS[docType] ?? "Document"}
            {typeof extraction.confidence === "number" && (
              <span className="text-gray-500">
                · confiance {Math.round(extraction.confidence * 100)}%
              </span>
            )}
          </div>
          {extraction.summary && (
            <p className="text-sm text-gray-700 leading-relaxed max-w-2xl">
              {extraction.summary}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 whitespace-nowrap"
        >
          Analyser un autre document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Informations extraites
          </h3>
          <DataFields docType={docType} data={data} patch={patch} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Rangement</h3>
          <FieldLabel label="Dossier suggéré">
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-700"
            />
          </FieldLabel>
          <FieldLabel label="Nom de fichier">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-700"
            />
          </FieldLabel>

          {docType === "invoice" && (
            <label className="flex items-start gap-2 mt-4 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={commitToInvoices}
                onChange={(e) => setCommitToInvoices(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Ajouter cette facture à mon historique fournisseur (sera visible
                dans le rapport client et l'assistant).
              </span>
            </label>
          )}

          {extraction.raw_text && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-900">
                Voir le texte brut extrait
              </summary>
              <pre className="mt-2 text-[11px] text-gray-600 bg-stone-50 border border-gray-200 rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                {extraction.raw_text}
              </pre>
            </details>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {organizeSteps.length > 0 && (
        <OrganizeStepsLive
          steps={organizeSteps}
          revealed={organizeRevealed}
        />
      )}
      {saveSuccess && (
        <div className="mt-5 px-4 py-2.5 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
          {saveSuccess}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 rounded bg-gray-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer et classer"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2 disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </section>
  );
}

function DataFields({
  docType,
  data,
  patch,
}: {
  docType: DocumentType;
  data: ExtractedData;
  patch: (p: Partial<ExtractedData>) => void;
}) {
  if (docType === "invoice") {
    return (
      <div className="space-y-2">
        <Row>
          <Field
            label="Fournisseur"
            value={(data.supplier_name as string) ?? ""}
            onChange={(v) => patch({ supplier_name: v || null })}
          />
          <Field
            label="SIRET"
            value={(data.supplier_siret as string) ?? ""}
            onChange={(v) => patch({ supplier_siret: v || null })}
            mono
          />
        </Row>
        <Row>
          <Field
            label="Numéro"
            value={(data.invoice_number as string) ?? ""}
            onChange={(v) => patch({ invoice_number: v || null })}
            mono
          />
          <Field
            label="Date"
            value={(data.invoice_date as string) ?? ""}
            onChange={(v) => patch({ invoice_date: v || null })}
            placeholder="AAAA-MM-JJ"
            mono
          />
        </Row>
        <Row>
          <Field
            label="Montant HT"
            value={fmt(data.amount_ht)}
            onChange={(v) => patch({ amount_ht: parseNum(v) })}
            mono
          />
          <Field
            label="Taux TVA"
            value={fmt(data.vat_rate)}
            onChange={(v) => patch({ vat_rate: parseNum(v) })}
            mono
          />
        </Row>
        <Row>
          <Field
            label="TVA"
            value={fmt(data.amount_vat)}
            onChange={(v) => patch({ amount_vat: parseNum(v) })}
            mono
          />
          <Field
            label="Montant TTC"
            value={fmt(data.amount_ttc)}
            onChange={(v) => patch({ amount_ttc: parseNum(v) })}
            mono
          />
        </Row>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
          <input
            type="checkbox"
            checked={!!data.auto_liquidation}
            onChange={(e) => patch({ auto_liquidation: e.target.checked })}
            className="h-4 w-4"
          />
          Auto-liquidation TVA
        </label>
        <LinesTable
          lines={(data.lines as InvoiceLine[]) ?? []}
          onChange={(lines) => patch({ lines })}
        />
      </div>
    );
  }

  if (docType === "contract") {
    return (
      <div className="space-y-2">
        <Field
          label="Parties"
          value={((data.parties as string[]) ?? []).join(", ")}
          onChange={(v) =>
            patch({ parties: v.split(",").map((p) => p.trim()).filter(Boolean) })
          }
        />
        <Field
          label="Objet"
          value={(data.object as string) ?? ""}
          onChange={(v) => patch({ object: v || null })}
          multiline
        />
        <Row>
          <Field
            label="Début"
            value={(data.start_date as string) ?? ""}
            onChange={(v) => patch({ start_date: v || null })}
            mono
          />
          <Field
            label="Fin"
            value={(data.end_date as string) ?? ""}
            onChange={(v) => patch({ end_date: v || null })}
            mono
          />
        </Row>
        <Row>
          <Field
            label="Durée"
            value={(data.duration as string) ?? ""}
            onChange={(v) => patch({ duration: v || null })}
          />
          <Field
            label="Montant"
            value={fmt(data.amount)}
            onChange={(v) => patch({ amount: parseNum(v) })}
            mono
          />
        </Row>
        <ListField
          label="Obligations clés"
          value={(data.key_obligations as string[]) ?? []}
          onChange={(arr) => patch({ key_obligations: arr })}
        />
        <ListField
          label="Pénalités"
          value={(data.penalties as string[]) ?? []}
          onChange={(arr) => patch({ penalties: arr })}
        />
      </div>
    );
  }

  if (docType === "note") {
    return (
      <div className="space-y-2">
        <Row>
          <Field
            label="Date"
            value={(data.date as string) ?? ""}
            onChange={(v) => patch({ date: v || null })}
            mono
          />
          <Field
            label="Chantier / client"
            value={(data.project as string) ?? ""}
            onChange={(v) => patch({ project: v || null })}
          />
        </Row>
        <ListField
          label="Points clés"
          value={(data.key_points as string[]) ?? []}
          onChange={(arr) => patch({ key_points: arr })}
        />
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-600">
      Ce document n'a pas pu être classé dans les trois catégories courantes
      (facture, contrat, note de chantier). Le texte brut est conservé et vous
      pouvez le ranger manuellement.
      {data.reason ? (
        <>
          <br />
          <span className="text-xs text-gray-500 italic">
            Motif : {String(data.reason)}
          </span>
        </>
      ) : null}
    </p>
  );
}

function LinesTable({
  lines,
  onChange,
}: {
  lines: InvoiceLine[];
  onChange: (lines: InvoiceLine[]) => void;
}) {
  function update(i: number, patch: Partial<InvoiceLine>) {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...lines,
      { label: "", quantity: 1, unit: "u", unit_price_ht: 0, total_ht: 0 },
    ]);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-700">
          Lignes ({lines.length})
        </span>
        <button
          type="button"
          onClick={add}
          className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2"
        >
          + ajouter
        </button>
      </div>
      <div className="border border-gray-200 rounded">
        {lines.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400">
            Aucune ligne détectée.
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-1.5 items-center px-2 py-1.5 border-b border-gray-100 last:border-b-0 text-xs"
          >
            <input
              className="col-span-5 border border-transparent hover:border-gray-200 focus:border-gray-500 rounded px-1.5 py-1 focus:outline-none"
              value={line.label ?? ""}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Libellé"
            />
            <input
              className="col-span-2 border border-transparent hover:border-gray-200 focus:border-gray-500 rounded px-1.5 py-1 focus:outline-none font-mono"
              value={fmt(line.quantity)}
              onChange={(e) => update(i, { quantity: parseNum(e.target.value) })}
              placeholder="Qté"
            />
            <input
              className="col-span-1 border border-transparent hover:border-gray-200 focus:border-gray-500 rounded px-1.5 py-1 focus:outline-none"
              value={line.unit ?? ""}
              onChange={(e) => update(i, { unit: e.target.value })}
              placeholder="u"
            />
            <input
              className="col-span-2 border border-transparent hover:border-gray-200 focus:border-gray-500 rounded px-1.5 py-1 focus:outline-none font-mono"
              value={fmt(line.unit_price_ht)}
              onChange={(e) =>
                update(i, { unit_price_ht: parseNum(e.target.value) })
              }
              placeholder="PU HT"
            />
            <input
              className="col-span-2 border border-transparent hover:border-gray-200 focus:border-gray-500 rounded px-1.5 py-1 focus:outline-none font-mono"
              value={fmt(line.total_ht)}
              onChange={(e) => update(i, { total_ht: parseNum(e.target.value) })}
              placeholder="Total HT"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-600 text-xs -ml-3"
              aria-label="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-2.5">
      <span className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  const className = `w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:border-gray-700 ${
    mono ? "font-mono" : ""
  }`;
  return (
    <FieldLabel label={label}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={className + " resize-y"}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </FieldLabel>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <FieldLabel label={label}>
      <textarea
        value={value.join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        rows={Math.max(2, value.length + 1)}
        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:border-gray-700 resize-y"
        placeholder="Un item par ligne"
      />
    </FieldLabel>
  );
}

function HistoryPanel({
  history,
  loading,
  onRefresh,
}: {
  history: ExtractionResult[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const rows = useMemo(() => history.slice(0, 10), [history]);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Historique récent
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          Actualiser
        </button>
      </div>
      {loading && <p className="text-sm text-gray-500">Chargement…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-500">
          Aucun document traité pour l'instant. Déposez-en un ci-dessus pour
          lancer votre première extraction.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => {
            const docType = (row.document_type as DocumentType) || "other";
            return (
              <li key={row.id} className="py-2.5 flex items-start gap-3">
                <span className="mt-1 text-[10px] uppercase font-bold text-gray-500 min-w-[72px]">
                  {DOC_TYPE_LABELS[docType] ?? "Autre"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {row.stored_filename ||
                      row.original_filename ||
                      "(document sans nom)"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {row.target_folder ?? "?"}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(row.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-5 px-4 py-2.5 rounded border border-red-200 bg-red-50 text-sm text-red-900">
      {message}
    </div>
  );
}

function OrganizeStepsLive({
  steps,
  revealed,
}: {
  steps: string[];
  revealed: number;
}) {
  return (
    <div className="mt-5 px-4 py-3 rounded border border-gray-200 bg-stone-50">
      <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
        Classement automatique
      </p>
      <ul className="space-y-1.5">
        {steps.map((step, i) => {
          const isRevealed = i < revealed;
          const failed = step.toLowerCase().includes("impossible");
          return (
            <li
              key={i}
              className={`flex items-start gap-2 text-sm transition-opacity duration-300 ${
                isRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  !isRevealed
                    ? "bg-gray-200 text-gray-400"
                    : failed
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-500 text-white"
                }`}
                aria-hidden
              >
                {!isRevealed ? "…" : failed ? "!" : "✓"}
              </span>
              <span
                className={`leading-5 ${
                  failed ? "text-amber-900" : "text-gray-800"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}
