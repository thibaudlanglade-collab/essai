/**
 * Devis page (Sprint 3 B2).
 *
 * Trois vues dans une seule surface :
 *  - `list`   : liste filtrable des devis + bouton "Nouveau devis"
 *  - `create` : créateur de devis (pour B2 : texte libre ; B3/B4/B5 ajouteront
 *               email / vocal / photo)
 *  - `edit`   : édition d'un devis existant (mêmes champs, avec totaux
 *               recalculés côté client en temps réel et côté backend à la save)
 *
 * Les 4 sources (texte / email / vocal / photo) partagent le même éditeur une
 * fois les lignes pré-remplies : la source change seulement comment on arrive
 * sur l'éditeur. En B2 seule la source texte est active.
 *
 * Route : /dashboard/devis
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Mic,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  buildSourceTextFromEmail,
  computeLineTotal,
  computeQuoteTotals,
  createQuote,
  deleteQuote,
  describePhoto,
  generateQuote,
  generateQuoteLines,
  getEmailDetail,
  getQuote,
  listQuotes,
  listRecentEmails,
  quotePdfUrl,
  transcribeAudio,
  updateQuote,
  type EmailListItem,
  type PhotoDescribeResult,
  type Quote,
  type QuoteLine,
  type QuoteStatus,
  type QuoteWriteBody,
  type SuggestedPoste,
  type TarifGridEntry,
} from "@/api/quotesClient";
import { listTarifs } from "@/api/tarifsClient";
import { listClients, type ClientSummary } from "@/api/clientReportClient";

type ViewMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; id: string };

type SourceKind = "text" | "email" | "voice" | "photo";

const SOURCES: { kind: SourceKind; label: string; icon: typeof FileText; active: boolean; note?: string }[] = [
  { kind: "text", label: "Texte libre", icon: Type, active: true },
  { kind: "email", label: "Depuis un email", icon: Mail, active: true },
  { kind: "voice", label: "Dictée vocale", icon: Mic, active: true },
  { kind: "photo", label: "Photo + mesures", icon: Camera, active: true },
];

const VAT_CHOICES: { value: number; label: string }[] = [
  { value: 0.2, label: "20 % (taux normal)" },
  { value: 0.1, label: "10 % (rénovation)" },
  { value: 0.055, label: "5,5 % (travaux énergétiques)" },
  { value: 0, label: "0 %" },
];

const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "refused"];

function formatMoney(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DevisView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromEmailId = searchParams.get("from_email");
  const initialMode: ViewMode = fromEmailId ? { kind: "create" } : { kind: "list" };
  const [view, setView] = useState<ViewMode>(initialMode);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [preloadedEmailId, setPreloadedEmailId] = useState<string | null>(fromEmailId);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  // Consume the query param so reloads stay on /dashboard/devis without
  // re-triggering the email preload.
  useEffect(() => {
    if (fromEmailId) {
      const next = new URLSearchParams(searchParams);
      next.delete("from_email");
      setSearchParams(next, { replace: true });
    }
  }, [fromEmailId, searchParams, setSearchParams]);

  if (view.kind === "create") {
    return (
      <DevisEditor
        clients={clients}
        mode={{ kind: "create" }}
        preloadEmailId={preloadedEmailId}
        onClose={() => {
          setPreloadedEmailId(null);
          setView({ kind: "list" });
        }}
      />
    );
  }

  if (view.kind === "edit") {
    return (
      <DevisEditor
        clients={clients}
        mode={{ kind: "edit", id: view.id }}
        onClose={() => setView({ kind: "list" })}
      />
    );
  }

  return (
    <DevisList
      clients={clients}
      onCreate={() => setView({ kind: "create" })}
      onOpen={(id) => setView({ kind: "edit", id })}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────

interface DevisListProps {
  clients: ClientSummary[];
  onCreate: () => void;
  onOpen: (id: string) => void;
}

function DevisList({ clients, onCreate, onOpen }: DevisListProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listQuotes();
      setQuotes(list);
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

  const clientById = useMemo(() => {
    const m = new Map<string, ClientSummary>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (!q) return true;
      const clientName = (quote.client_id && clientById.get(quote.client_id)?.name) || "";
      return (
        (quote.title || "").toLowerCase().includes(q) ||
        (quote.quote_number || "").toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q)
      );
    });
  }, [quotes, search, statusFilter, clientById]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-violet-600" />
            Devis
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Vos devis émis. Créez un nouveau devis depuis une description libre,
            et les prix sont calés sur votre grille tarifaire. Vous pouvez
            modifier chaque ligne avant l'envoi au client, puis exporter le PDF.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nouveau devis
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un devis, un numéro, un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <StatusChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            Tous ({quotes.length})
          </StatusChip>
          {STATUSES.map((s) => {
            const count = quotes.filter((q) => q.status === s).length;
            return (
              <StatusChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]} ({count})
              </StatusChip>
            );
          })}
        </div>
      </div>

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

      {!loading && !loadError && quotes.length === 0 && (
        <EmptyCard
          title="Aucun devis pour le moment"
          subtitle="Créez votre premier devis à partir d'une description libre."
          action={
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Créer un devis
            </button>
          }
        />
      )}

      {!loading && !loadError && quotes.length > 0 && filtered.length === 0 && (
        <EmptyCard
          title="Aucun devis ne correspond à vos filtres"
          subtitle="Modifiez le statut ou votre recherche."
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Numéro</th>
                <th className="px-4 py-2.5">Objet</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Client</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Date</th>
                <th className="px-4 py-2.5 w-28 text-right">Total HT</th>
                <th className="px-4 py-2.5 w-28">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((q) => {
                const client = q.client_id ? clientById.get(q.client_id) : null;
                return (
                  <tr
                    key={q.id}
                    onClick={() => onOpen(q.id)}
                    className="hover:bg-violet-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {q.quote_number || "(sans numéro)"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {q.title || <span className="text-gray-400">(sans titre)</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-700">
                      {client ? client.name : q.client_id ? "(client supprimé)" : "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatMoney(q.amount_ht)} €
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[q.status]}`}
                      >
                        {STATUS_LABELS[q.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyCard({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITOR (create + edit share the same surface once lines are populated)
// ─────────────────────────────────────────────────────────────────────────────

interface DevisEditorProps {
  clients: ClientSummary[];
  mode: { kind: "create" } | { kind: "edit"; id: string };
  onClose: () => void;
  /** B3 : si présent, charge cet email comme description pré-remplie au démarrage. */
  preloadEmailId?: string | null;
}

function blankLine(): QuoteLine {
  return { label: "", quantity: 1, unit: "u", unit_price_ht: 0, total_ht: 0 };
}

function DevisEditor({ clients, mode, onClose, preloadEmailId }: DevisEditorProps) {
  // ── Source selection (only used during "create" + before generation) ──
  const isCreate = mode.kind === "create";

  const [sourceText, setSourceText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<string>("");

  // ── Form fields ──────────────────────────────────────────────────────────
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [vatRate, setVatRate] = useState<number>(0.1);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [createdFrom, setCreatedFrom] = useState<"text" | "manual" | "email" | "voice" | "photo">("manual");

  const [loading, setLoading] = useState(mode.kind === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Email picker (B3) ────────────────────────────────────────────────────
  const [emailPickerOpen, setEmailPickerOpen] = useState(false);
  const [emailPickerLoading, setEmailPickerLoading] = useState(false);
  const [emailPickerError, setEmailPickerError] = useState<string | null>(null);

  // ── Voice recorder (B4) ──────────────────────────────────────────────────
  const [voiceOpen, setVoiceOpen] = useState(false);

  // ── Photo + calculateur (B5) ─────────────────────────────────────────────
  const [photoOpen, setPhotoOpen] = useState(false);

  // ── Append-from-text (add lines via prose) ───────────────────────────────
  const [appendOpen, setAppendOpen] = useState(false);
  const [appendText, setAppendText] = useState("");
  const [appending, setAppending] = useState(false);
  const [appendError, setAppendError] = useState<string | null>(null);

  // ── PDF preview modal ─────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Preload from email (B3: "Créer un devis depuis ce mail") ────────────
  useEffect(() => {
    if (!preloadEmailId || mode.kind !== "create") return;
    let cancelled = false;
    getEmailDetail(preloadEmailId)
      .then((detail) => {
        if (cancelled) return;
        setSourceText(buildSourceTextFromEmail(detail));
        if (detail.related_client_id) {
          setClientId(detail.related_client_id);
        }
        setCreatedFrom("email");
      })
      .catch(() => {
        /* non-fatal : l'utilisateur peut toujours écrire à la main */
      });
    return () => {
      cancelled = true;
    };
  }, [preloadEmailId, mode.kind]);

  // ── Load existing quote on edit ──────────────────────────────────────────
  useEffect(() => {
    if (mode.kind !== "edit") return;
    let cancelled = false;
    setLoading(true);
    getQuote(mode.id)
      .then((q) => {
        if (cancelled) return;
        setQuoteId(q.id);
        setQuoteNumber(q.quote_number);
        setCreatedAt(q.created_at);
        setTitle(q.title || "");
        setDescription(q.description || "");
        setClientId(q.client_id);
        setStatus(q.status);
        setVatRate(q.vat_rate ?? 0.1);
        setLines(q.lines.length > 0 ? q.lines : [blankLine()]);
        setCreatedFrom((q.created_from as typeof createdFrom) || "manual");
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Chargement impossible.");
      })
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const totals = useMemo(() => computeQuoteTotals(lines, vatRate), [lines, vatRate]);

  const hasLines = lines.length > 0 && lines.some((l) => l.label.trim());

  // ── Source "Texte libre" → générer ───────────────────────────────────────
  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!sourceText.trim()) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const result = await generateQuote({
        source_text: sourceText.trim(),
        suggested_vat_rate: vatRate,
        client_id: clientId,
        created_from: "text",
      });
      setTitle(result.title);
      setDescription(result.description);
      setLines(result.lines);
      setVatRate(result.vat_rate);
      setAssumptions(result.assumptions);
      setCreatedFrom("text");
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Lines editing ────────────────────────────────────────────────────────
  function updateLine(index: number, patch: Partial<QuoteLine>) {
    setLines((prev) => {
      const copy = [...prev];
      const merged = { ...copy[index], ...patch };
      merged.total_ht = computeLineTotal(merged);
      copy[index] = merged;
      return copy;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(nextStatus?: QuoteStatus) {
    setSaving(true);
    setSaveError(null);
    const effectiveStatus = nextStatus || status;
    const body: QuoteWriteBody = {
      title: title.trim() || null,
      description: description.trim() || null,
      status: effectiveStatus,
      vat_rate: vatRate,
      lines: lines.filter((l) => l.label.trim()),
      client_id: clientId,
      source_text: sourceText.trim() || null,
      created_from: createdFrom,
    };
    try {
      if (quoteId) {
        await updateQuote(quoteId, body);
        setStatus(effectiveStatus);
      } else {
        const saved = await createQuote(body);
        setQuoteId(saved.id);
        setQuoteNumber(saved.quote_number);
        setCreatedAt(saved.created_at);
        setStatus(saved.status);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  // ── Email picker handler ─────────────────────────────────────────────────
  async function handleEmailSelected(email: EmailListItem) {
    setEmailPickerLoading(true);
    setEmailPickerError(null);
    try {
      const detail = await getEmailDetail(email.id);
      const prefilled = buildSourceTextFromEmail(detail);
      setSourceText(prefilled);
      if (detail.related_client_id) {
        setClientId(detail.related_client_id);
      }
      setCreatedFrom("email");
      setEmailPickerOpen(false);
    } catch (err) {
      setEmailPickerError(
        err instanceof Error ? err.message : "Chargement de l'email impossible.",
      );
    } finally {
      setEmailPickerLoading(false);
    }
  }

  // ── Append handler ───────────────────────────────────────────────────────
  async function handleAppendLines() {
    const text = appendText.trim();
    if (!text) return;
    setAppending(true);
    setAppendError(null);
    try {
      const newLines = await generateQuoteLines({
        source_text: text,
        existing_lines: lines.filter((l) => l.label.trim()),
        client_id: clientId,
      });
      if (newLines.length === 0) {
        setAppendError("Aucune nouvelle ligne pertinente n'a été produite.");
        return;
      }
      setLines((prev) => [...prev, ...newLines]);
      setAppendText("");
      setAppendOpen(false);
    } catch (err) {
      setAppendError(
        err instanceof Error ? err.message : "Génération impossible.",
      );
    } finally {
      setAppending(false);
    }
  }

  async function handleDelete() {
    if (!quoteId) return;
    const ok = window.confirm(
      "Supprimer ce devis ? Cette action est définitive.",
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteQuote(quoteId);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? `Suppression impossible : ${err.message}` : "Suppression impossible.");
      setDeleting(false);
    }
  }

  if (mode.kind === "edit" && loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du devis...
        </div>
      </div>
    );
  }

  if (mode.kind === "edit" && loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à la liste
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      </div>
    );
  }

  // ── Create mode, before generation: show source selector ────────────────
  const showSourceSelector = isCreate && !hasLines;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour à la liste
      </button>

      {showSourceSelector && (
        <SourceSelector
          sourceText={sourceText}
          onSourceTextChange={setSourceText}
          vatRate={vatRate}
          onVatRateChange={setVatRate}
          clientId={clientId}
          onClientChange={setClientId}
          clients={clients}
          generating={generating}
          error={generationError}
          onSubmit={handleGenerate}
          onPickEmail={() => setEmailPickerOpen(true)}
          onStartVoice={() => setVoiceOpen(true)}
          onStartPhoto={() => setPhotoOpen(true)}
        />
      )}

      {emailPickerOpen && (
        <EmailPickerModal
          loading={emailPickerLoading}
          error={emailPickerError}
          onClose={() => setEmailPickerOpen(false)}
          onSelect={handleEmailSelected}
        />
      )}

      {voiceOpen && (
        <VoiceRecorderModal
          onClose={() => setVoiceOpen(false)}
          onTranscribed={(text) => {
            const sep = sourceText.trim() ? "\n\n" : "";
            setSourceText((prev) => prev + sep + text);
            setCreatedFrom("voice");
            setVoiceOpen(false);
          }}
        />
      )}

      {photoOpen && (
        <PhotoCalculatorModal
          onClose={() => setPhotoOpen(false)}
          onUse={({ lines: newLines, description, vatSuggestion }) => {
            setLines((prev) => {
              const kept = prev.filter((l) => l.label.trim());
              return [...kept, ...newLines];
            });
            if (description && !description.trim().startsWith("(")) {
              setDescription((prev) => (prev.trim() ? prev : description));
            }
            if (vatSuggestion != null) {
              setVatRate(vatSuggestion);
            }
            setCreatedFrom("photo");
            setPhotoOpen(false);
          }}
        />
      )}

      {!showSourceSelector && (
        <EditorForm
          quoteNumber={quoteNumber}
          status={status}
          createdAt={createdAt}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          clientId={clientId}
          onClientChange={setClientId}
          clients={clients}
          vatRate={vatRate}
          onVatRateChange={setVatRate}
          lines={lines}
          onUpdateLine={updateLine}
          onAddLine={addLine}
          onRemoveLine={removeLine}
          totals={totals}
          assumptions={assumptions}
          saving={saving}
          saveError={saveError}
          deleting={deleting}
          canDelete={Boolean(quoteId)}
          canExportPdf={Boolean(quoteId)}
          pdfUrl={quoteId ? quotePdfUrl(quoteId) : null}
          onSave={() => handleSave()}
          onMarkSent={() => handleSave("sent")}
          onDelete={handleDelete}
          appendOpen={appendOpen}
          appendText={appendText}
          onAppendTextChange={setAppendText}
          appending={appending}
          appendError={appendError}
          onToggleAppend={() => {
            setAppendOpen((v) => !v);
            setAppendError(null);
          }}
          onAppend={handleAppendLines}
          onOpenPreview={() => setPreviewOpen(true)}
        />
      )}

      {previewOpen && quoteId && (
        <PdfPreviewModal
          pdfUrl={quotePdfUrl(quoteId)}
          quoteNumber={quoteNumber}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source selector (creation entry point)
// ─────────────────────────────────────────────────────────────────────────────

interface SourceSelectorProps {
  sourceText: string;
  onSourceTextChange: (v: string) => void;
  vatRate: number;
  onVatRateChange: (v: number) => void;
  clientId: string | null;
  onClientChange: (id: string | null) => void;
  clients: ClientSummary[];
  generating: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onPickEmail: () => void;
  onStartVoice: () => void;
  onStartPhoto: () => void;
}

function SourceSelector({
  sourceText,
  onSourceTextChange,
  vatRate,
  onVatRateChange,
  clientId,
  onClientChange,
  clients,
  generating,
  error,
  onSubmit,
  onPickEmail,
  onStartVoice,
  onStartPhoto,
}: SourceSelectorProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Nouveau devis</h1>
      <p className="text-sm text-gray-600 mb-6">
        Choisissez comment saisir votre besoin. Vos prix unitaires proviennent
        de votre grille tarifaire.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const handleClick = s.active
            ? s.kind === "email"
              ? onPickEmail
              : s.kind === "voice"
                ? onStartVoice
                : s.kind === "photo"
                  ? onStartPhoto
                  : undefined
            : undefined;
          const clickable = Boolean(handleClick);
          return (
            <button
              key={s.kind}
              type="button"
              onClick={handleClick}
              disabled={!s.active}
              className={`rounded-xl border p-4 flex flex-col items-center text-center transition-colors ${
                s.active
                  ? "border-violet-200 bg-violet-50/40"
                  : "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
              } ${clickable ? "hover:bg-violet-100 hover:border-violet-300 cursor-pointer" : ""}`}
            >
              <Icon
                className={`h-6 w-6 mb-2 ${
                  s.active ? "text-violet-600" : "text-gray-400"
                }`}
              />
              <div className={`text-sm font-medium ${
                s.active ? "text-violet-900" : "text-gray-500"
              }`}>
                {s.label}
              </div>
              {!s.active && (
                <div className="mt-0.5 text-[11px] text-gray-500">{s.note}</div>
              )}
              {s.active && s.kind === "email" && (
                <div className="mt-0.5 text-[11px] text-violet-600">Cliquez pour choisir</div>
              )}
              {s.active && s.kind === "voice" && (
                <div className="mt-0.5 text-[11px] text-violet-600">Cliquez pour enregistrer</div>
              )}
              {s.active && s.kind === "photo" && (
                <div className="mt-0.5 text-[11px] text-violet-600">Cliquez pour importer</div>
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Type className="h-4 w-4 text-violet-600" />
          Depuis une description libre
        </h2>

        <label className="block text-xs font-medium text-gray-700 mb-1">
          Décrivez le besoin <span className="text-red-500">*</span>
        </label>
        <textarea
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          rows={6}
          required
          placeholder="Exemple : Refaire la salle de bain de M. Martin, 8 m², dépose ancienne, pose carrelage sol et faïence murale, douche italienne, repose WC. Chantier mi-mai sur 5 jours."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
        />
        <p className="mt-1 text-[11px] text-gray-500">
          Soyez précis sur les surfaces et la nature des travaux. Vous pourrez
          tout modifier après.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Client (optionnel)
            </label>
            <select
              value={clientId || ""}
              onChange={(e) => onClientChange(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">— Pas de client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Taux de TVA suggéré
            </label>
            <select
              value={vatRate}
              onChange={(e) => onVatRateChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {VAT_CHOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={generating || !sourceText.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer le devis
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor form (shared by post-generation and edit-existing flows)
// ─────────────────────────────────────────────────────────────────────────────

interface EditorFormProps {
  quoteNumber: string | null;
  status: QuoteStatus;
  createdAt: string | null;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  clientId: string | null;
  onClientChange: (id: string | null) => void;
  clients: ClientSummary[];
  vatRate: number;
  onVatRateChange: (v: number) => void;
  lines: QuoteLine[];
  onUpdateLine: (i: number, patch: Partial<QuoteLine>) => void;
  onAddLine: () => void;
  onRemoveLine: (i: number) => void;
  totals: { amount_ht: number; amount_ttc: number };
  assumptions: string;
  saving: boolean;
  saveError: string | null;
  deleting: boolean;
  canDelete: boolean;
  canExportPdf: boolean;
  pdfUrl: string | null;
  onSave: () => void;
  onMarkSent: () => void;
  onDelete: () => void;

  // Append-from-text
  appendOpen: boolean;
  appendText: string;
  onAppendTextChange: (v: string) => void;
  appending: boolean;
  appendError: string | null;
  onToggleAppend: () => void;
  onAppend: () => void;

  // Preview PDF
  onOpenPreview: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email picker modal (B3)
// ─────────────────────────────────────────────────────────────────────────────

interface EmailPickerProps {
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (email: EmailListItem) => void | Promise<void>;
}

function EmailPickerModal({ loading, error, onClose, onSelect }: EmailPickerProps) {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    listRecentEmails(50)
      .then((list) => {
        if (cancelled) return;
        setEmails(list);
        setListError(null);
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : "Chargement impossible.");
      })
      .finally(() => setListLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((e) => {
      return (
        (e.subject || "").toLowerCase().includes(q) ||
        (e.from_name || "").toLowerCase().includes(q) ||
        (e.from_email || "").toLowerCase().includes(q) ||
        (e.snippet || "").toLowerCase().includes(q)
      );
    });
  }, [emails, search]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-violet-600" />
              Choisir un email
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Sélectionnez un email. Son contenu sera utilisé comme description
              du besoin pour générer le devis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un expéditeur, un sujet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(listLoading || loading) && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          )}

          {(listError || error) && !listLoading && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {listError || error}
            </div>
          )}

          {!listLoading && !listError && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              Aucun email disponible. Connectez votre Gmail ou modifiez votre recherche.
            </div>
          )}

          {!listLoading && !listError && filtered.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {filtered.map((email) => (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(email)}
                    disabled={loading}
                    className="w-full text-left px-5 py-3 hover:bg-violet-50/40 disabled:opacity-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {email.subject || "(sans sujet)"}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-600 truncate">
                          {email.from_name || email.from_email || "Expéditeur inconnu"}
                        </div>
                        {email.snippet && (
                          <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {email.snippet}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                        {formatDate(email.received_at)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo + calculateur modal (B5)
// ─────────────────────────────────────────────────────────────────────────────

interface PhotoCalculatorProps {
  onClose: () => void;
  onUse: (payload: {
    lines: QuoteLine[];
    description: string;
    vatSuggestion: number | null;
  }) => void;
}

interface CalcRow {
  key: string; // local stable key
  tarif_key: string | null;
  label: string;
  unit: string;
  unit_price_ht: number;
  quantity: number;
}

function PhotoCalculatorModal({ onClose, onUse }: PhotoCalculatorProps) {
  const [grid, setGrid] = useState<TarifGridEntry[]>([]);
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState<string | null>(null);

  const [, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoDescribeResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CalcRow[]>([]);

  useEffect(() => {
    listTarifs()
      .then((g) => {
        setGrid(g);
        setGridError(null);
      })
      .catch((err) => setGridError(err instanceof Error ? err.message : "Chargement de la grille impossible."))
      .finally(() => setGridLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const suggestedKeys = useMemo(() => {
    if (!photoResult) return new Set<string>();
    return new Set(
      photoResult.suggested_postes
        .map((p) => p.tarif_key)
        .filter((k): k is string => Boolean(k)),
    );
  }, [photoResult]);

  const filteredGrid = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grid;
    return grid.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q),
    );
  }, [grid, search]);

  async function handlePhotoFile(file: File) {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError(null);
    setPhotoLoading(true);
    try {
      const result = await describePhoto(file);
      setPhotoResult(result);
      // Auto-ajoute les postes suggérés au calculateur s'ils sont mappés à la grille
      for (const s of result.suggested_postes) {
        if (s.tarif_key) {
          const match = result.tarif_grid.find((t) => t.key === s.tarif_key);
          if (match) addGridEntry(match, { silent: true });
        }
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function addGridEntry(entry: TarifGridEntry, opts: { silent?: boolean } = {}) {
    setRows((prev) => {
      // Don't double-add if already present with the same tarif_key.
      if (prev.some((r) => r.tarif_key === entry.key)) return prev;
      return [
        ...prev,
        {
          key: `grid-${entry.key}-${Date.now()}`,
          tarif_key: entry.key,
          label: entry.label,
          unit: entry.unit,
          unit_price_ht: entry.unit_price_ht,
          quantity: opts.silent ? 0 : 1,
        },
      ];
    });
  }

  function addSuggestedCustom(poste: SuggestedPoste) {
    setRows((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tarif_key: null,
        label: poste.label,
        unit: "u",
        unit_price_ht: 0,
        quantity: 1,
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<CalcRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const totalHt = useMemo(
    () =>
      Math.round(
        rows.reduce((sum, r) => sum + r.quantity * r.unit_price_ht, 0) * 100,
      ) / 100,
    [rows],
  );

  function handleUse() {
    const lines: QuoteLine[] = rows
      .filter((r) => r.label.trim() && r.quantity > 0)
      .map((r) => ({
        label: r.label,
        quantity: r.quantity,
        unit: r.unit,
        unit_price_ht: r.unit_price_ht,
        total_ht: Math.round(r.quantity * r.unit_price_ht * 100) / 100,
        source: r.tarif_key ? "grid" : "custom",
        tarif_key: r.tarif_key,
      }));
    if (lines.length === 0) return;

    // Suggérer TVA 10% par défaut (rénovation) si plusieurs postes visibles.
    const vatSuggestion = 0.10;
    onUse({
      lines,
      description: photoResult?.description || "",
      vatSuggestion,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-violet-600" />
              Photo de chantier + calculateur
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Importez une photo pour identifier les postes, puis saisissez vos
              mesures. Vous pouvez aussi utiliser directement le calculateur sans photo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Photo block ────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-gray-100">
            {!photoPreview ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  Importer une photo du chantier (optionnel)
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  JPEG ou PNG. Les postes visibles seront proposés automatiquement.
                </p>
                <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 cursor-pointer">
                  Choisir une image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handlePhotoFile(f);
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <img
                  src={photoPreview}
                  alt="Photo chantier"
                  className="w-40 h-40 rounded-lg object-cover border border-gray-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {photoLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </div>
                  )}
                  {photoError && (
                    <div className="text-sm text-red-700">{photoError}</div>
                  )}
                  {photoResult && !photoLoading && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-violet-700 uppercase tracking-wider">
                        Ce que la photo montre
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {photoResult.description}
                      </p>
                      {photoResult.suggested_postes.length > 0 && (
                        <div>
                          <p className="mt-3 text-xs font-medium text-violet-700 uppercase tracking-wider">
                            Postes proposés
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {photoResult.suggested_postes.map((s, i) => {
                              const alreadyAdded =
                                s.tarif_key &&
                                rows.some((r) => r.tarif_key === s.tarif_key);
                              const inGrid = Boolean(s.tarif_key);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    if (alreadyAdded) return;
                                    if (s.tarif_key) {
                                      const match = grid.find((t) => t.key === s.tarif_key);
                                      if (match) addGridEntry(match);
                                    } else {
                                      addSuggestedCustom(s);
                                    }
                                  }}
                                  disabled={Boolean(alreadyAdded)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                    alreadyAdded
                                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                                      : inGrid
                                        ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                                        : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                  }`}
                                  title={s.reason}
                                >
                                  {alreadyAdded ? "✓ " : "+ "}
                                  {s.label}
                                  {!inGrid && (
                                    <span className="text-[10px] ml-1 opacity-70">(hors grille)</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                      setPhotoResult(null);
                      setPhotoError(null);
                    }}
                    className="mt-3 text-xs text-gray-500 underline hover:text-gray-900"
                  >
                    Retirer la photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Calculateur ─────────────────────────────────────────────── */}
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grille tarifaire — picker */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Ajouter un poste</h3>
                <div className="mt-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher dans votre grille..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[45vh]">
                {gridLoading && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                    Chargement...
                  </div>
                )}
                {gridError && !gridLoading && (
                  <div className="m-3 text-sm text-red-700">{gridError}</div>
                )}
                {!gridLoading && !gridError && filteredGrid.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    Aucun poste correspondant.
                  </div>
                )}
                {!gridLoading && !gridError && filteredGrid.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {filteredGrid.map((t) => {
                      const already = rows.some((r) => r.tarif_key === t.key);
                      const suggested = suggestedKeys.has(t.key);
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => addGridEntry(t)}
                            disabled={already}
                            className={`w-full text-left px-4 py-2 hover:bg-violet-50/40 disabled:opacity-50 flex items-center justify-between gap-3 ${
                              suggested ? "bg-amber-50/30" : ""
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {t.label}
                                {suggested && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                                    suggéré
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono">
                                {t.category || "Autre"} · {t.unit}
                              </div>
                            </div>
                            <div className="text-sm tabular-nums font-medium text-gray-700 shrink-0">
                              {t.unit_price_ht.toFixed(2)} €
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <button
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      tarif_key: null,
                      label: "",
                      unit: "u",
                      unit_price_ht: 0,
                      quantity: 1,
                    },
                  ])
                }
                className="px-4 py-2 border-t border-gray-100 text-left text-xs text-violet-700 hover:bg-violet-50 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Poste hors grille
              </button>
            </div>

            {/* Panier / calculateur */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Postes du devis</h3>
                <span className="text-xs text-gray-500">
                  {rows.length} ligne{rows.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[45vh]">
                {rows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500 px-6">
                    Aucun poste ajouté. Cliquez sur un poste à gauche ou importez une
                    photo pour des suggestions.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <li key={r.key} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={r.label}
                              onChange={(e) => updateRow(r.key, { label: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md"
                              placeholder="Libellé du poste"
                            />
                            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                              <label className="text-[10px] uppercase text-gray-500 font-medium col-span-3">
                                Qté · Unité · P.U. HT
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.1"
                                value={r.quantity}
                                onChange={(e) =>
                                  updateRow(r.key, { quantity: Number(e.target.value) || 0 })
                                }
                                className="px-2 py-1 text-sm border border-gray-200 rounded-md tabular-nums text-right"
                              />
                              <input
                                type="text"
                                value={r.unit}
                                onChange={(e) => updateRow(r.key, { unit: e.target.value })}
                                className="px-2 py-1 text-sm border border-gray-200 rounded-md text-center"
                              />
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={r.unit_price_ht}
                                onChange={(e) =>
                                  updateRow(r.key, { unit_price_ht: Number(e.target.value) || 0 })
                                }
                                className="px-2 py-1 text-sm border border-gray-200 rounded-md tabular-nums text-right"
                              />
                            </div>
                            <div className="mt-1 text-right text-sm font-medium text-gray-900 tabular-nums">
                              = {(r.quantity * r.unit_price_ht).toFixed(2)} € HT
                            </div>
                          </div>
                          <button
                            onClick={() => removeRow(r.key)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Retirer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="px-4 py-3 border-t border-violet-100 bg-violet-50/40 flex items-center justify-between">
                <span className="text-sm font-semibold text-violet-900">Total HT</span>
                <span className="text-lg font-bold text-violet-900 tabular-nums">
                  {totalHt.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleUse}
            disabled={rows.filter((r) => r.label.trim() && r.quantity > 0).length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
          >
            Utiliser ces lignes
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Voice recorder modal (B4)
// ─────────────────────────────────────────────────────────────────────────────

type VoicePhase = "idle" | "recording" | "captured" | "transcribing" | "done" | "error";

interface VoiceRecorderProps {
  onClose: () => void;
  onTranscribed: (text: string) => void;
}

function VoiceRecorderModal({ onClose, onTranscribed }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  // Refs for the MediaRecorder lifecycle
  const recorderRef = useState<{ instance: MediaRecorder | null; chunks: Blob[]; stream: MediaStream | null }>(
    { instance: null, chunks: [], stream: null },
  )[0];
  const timerRef = useState<{ id: ReturnType<typeof setInterval> | null }>({ id: null })[0];

  useEffect(() => {
    return () => {
      // Cleanup on unmount : stop any active recording + mic stream.
      if (recorderRef.instance && recorderRef.instance.state !== "inactive") {
        try {
          recorderRef.instance.stop();
        } catch {
          /* ignore */
        }
      }
      if (recorderRef.stream) {
        recorderRef.stream.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.id) clearInterval(timerRef.id);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas la capture audio.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.stream = stream;

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.instance = recorder;
      recorderRef.chunks = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recorderRef.chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recorderRef.chunks, { type });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setPhase("captured");
        if (recorderRef.stream) {
          recorderRef.stream.getTracks().forEach((t) => t.stop());
        }
      };

      setElapsed(0);
      if (timerRef.id) clearInterval(timerRef.id);
      timerRef.id = setInterval(() => setElapsed((v) => v + 1), 1000);

      recorder.start();
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'accéder au micro.");
      setPhase("error");
    }
  }

  function handleStop() {
    if (recorderRef.instance && recorderRef.instance.state !== "inactive") {
      recorderRef.instance.stop();
    }
    if (timerRef.id) {
      clearInterval(timerRef.id);
      timerRef.id = null;
    }
  }

  function handleReset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript("");
    setPhase("idle");
    setElapsed(0);
    setError(null);
  }

  async function handleTranscribe() {
    if (!audioBlob) return;
    setPhase("transcribing");
    setError(null);
    try {
      const extFromMime =
        audioBlob.type.includes("webm") ? "webm"
        : audioBlob.type.includes("ogg") ? "ogg"
        : audioBlob.type.includes("mp4") ? "m4a"
        : "webm";
      const text = await transcribeAudio(audioBlob, `dictee.${extFromMime}`);
      if (!text) {
        setError("La transcription est vide. Réessayez en parlant plus fort.");
        setPhase("captured");
        return;
      }
      setTranscript(text);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription impossible.");
      setPhase("captured");
    }
  }

  function handleUse() {
    if (transcript) onTranscribed(transcript);
  }

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mic className="h-5 w-5 text-violet-600" />
            Dictée vocale
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col items-center text-center">
          {phase === "idle" && (
            <>
              <button
                onClick={handleStart}
                className="h-24 w-24 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-lg"
              >
                <Mic className="h-10 w-10" />
              </button>
              <p className="mt-4 text-sm text-gray-700">
                Cliquez pour démarrer l'enregistrement.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Décrivez le besoin comme si vous parliez au client. La transcription
                sert ensuite de description au générateur.
              </p>
            </>
          )}

          {phase === "recording" && (
            <>
              <button
                onClick={handleStop}
                className="h-24 w-24 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-lg animate-pulse"
              >
                <span className="h-6 w-6 bg-white rounded-sm" />
              </button>
              <div className="mt-4 text-2xl font-mono text-gray-900 tabular-nums">
                {formatElapsed(elapsed)}
              </div>
              <p className="mt-1 text-sm text-gray-600">Enregistrement en cours. Cliquez pour arrêter.</p>
            </>
          )}

          {phase === "captured" && audioUrl && (
            <>
              <audio controls src={audioUrl} className="w-full mb-4" />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Recommencer
                </button>
                <button
                  onClick={handleTranscribe}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Transcrire
                </button>
              </div>
            </>
          )}

          {phase === "transcribing" && (
            <>
              <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
              <p className="mt-4 text-sm text-gray-700">Transcription en cours...</p>
              <p className="mt-1 text-xs text-gray-500">Quelques secondes suffisent pour un message court.</p>
            </>
          )}

          {phase === "done" && (
            <>
              <div className="w-full text-left rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {transcript}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Recommencer
                </button>
                <button
                  onClick={handleUse}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                >
                  Utiliser ce texte
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 w-full rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF preview modal
// ─────────────────────────────────────────────────────────────────────────────

interface PdfPreviewProps {
  pdfUrl: string;
  quoteNumber: string | null;
  onClose: () => void;
}

function PdfPreviewModal({ pdfUrl, quoteNumber, onClose }: PdfPreviewProps) {
  // Bust the browser cache so edits show up immediately after save.
  const cacheBuster = useMemo(() => `?t=${Date.now()}`, []);
  const fullUrl = `${pdfUrl}${cacheBuster}`;

  function handleDownload() {
    const a = document.createElement("a");
    a.href = fullUrl;
    a.download = `${quoteNumber || "devis"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Aperçu du devis</h2>
            {quoteNumber && (
              <p className="text-xs text-gray-500 font-mono">{quoteNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100">
          <iframe
            src={fullUrl}
            title="Aperçu du devis"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

function EditorForm(props: EditorFormProps) {
  const {
    quoteNumber, status, createdAt, title, onTitleChange, description, onDescriptionChange,
    clientId, onClientChange, clients, vatRate, onVatRateChange,
    lines, onUpdateLine, onAddLine, onRemoveLine, totals, assumptions,
    saving, saveError, deleting, canDelete, canExportPdf,
    onSave, onMarkSent, onDelete,
    appendOpen, appendText, onAppendTextChange, appending, appendError,
    onToggleAppend, onAppend, onOpenPreview,
  } = props;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {quoteNumber || "Nouveau devis"}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
            {createdAt && <span>Créé {formatDate(createdAt)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canExportPdf && (
            <button
              onClick={onOpenPreview}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              Aperçu PDF
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </button>
          )}
        </div>
      </div>

      {assumptions && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="font-medium mb-1">Hypothèses retenues par le générateur</div>
          <div>{assumptions}</div>
        </div>
      )}

      {/* Meta block */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Objet du devis</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Rénovation salle de bain 8 m²"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Récapitulatif du périmètre, délais, conditions particulières."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientId || ""}
              onChange={(e) => onClientChange(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              <option value="">— Aucun —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Taux de TVA</label>
            <select
              value={vatRate}
              onChange={(e) => onVatRateChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              {VAT_CHOICES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">Lignes de devis</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleAppend}
              className={`inline-flex items-center gap-1.5 text-sm ${
                appendOpen ? "text-violet-900 font-medium" : "text-violet-700 hover:text-violet-900"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Ajouter depuis un texte
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={onAddLine}
              className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:text-violet-900"
            >
              <Plus className="h-4 w-4" />
              Ligne vide
            </button>
          </div>
        </div>

        {appendOpen && (
          <div className="border-b border-gray-100 bg-violet-50/40 px-5 py-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Décrivez les prestations à ajouter
            </label>
            <textarea
              value={appendText}
              onChange={(e) => onAppendTextChange(e.target.value)}
              rows={3}
              placeholder="Exemple : Ajoutez la pose de placo sur 30 m² de cloison existante et la peinture du plafond 22 m²."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none bg-white"
            />
            <p className="mt-1 text-[11px] text-gray-600">
              Vos lignes actuelles sont conservées. Le générateur n'ajoute que
              les prestations décrites ci-dessus et se cale sur votre grille
              tarifaire.
            </p>
            {appendError && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {appendError}
              </div>
            )}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={onToggleAppend}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={onAppend}
                disabled={appending || !appendText.trim()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
              >
                {appending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Ajouter les lignes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2">Désignation</th>
              <th className="px-3 py-2 w-20 text-right">Qté</th>
              <th className="px-3 py-2 w-20">Unité</th>
              <th className="px-3 py-2 w-28 text-right">P.U. HT</th>
              <th className="px-3 py-2 w-28 text-right">Total HT</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Aucune ligne pour le moment. Ajoutez-en une pour commencer.
                </td>
              </tr>
            )}
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={line.label}
                    onChange={(e) => onUpdateLine(i, { label: e.target.value })}
                    placeholder="Poste"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  {line.source === "custom" && (
                    <div className="mt-1 text-[10px] text-amber-700">
                      Tarif non trouvé dans votre grille (estimation du marché)
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={line.quantity}
                    onChange={(e) => onUpdateLine(i, { quantity: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => onUpdateLine(i, { unit: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unit_price_ht}
                    onChange={(e) => onUpdateLine(i, { unit_price_ht: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                  {formatMoney(line.total_ht)} €
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => onRemoveLine(i)}
                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-violet-50/40">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                Total HT
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                {formatMoney(totals.amount_ht)} €
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-1 text-right text-xs text-gray-600">
                TVA ({(vatRate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %)
              </td>
              <td className="px-3 py-1 text-right tabular-nums text-gray-700">
                {formatMoney(totals.amount_ttc - totals.amount_ht)} €
              </td>
              <td />
            </tr>
            <tr className="border-t border-violet-200">
              <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-violet-900">
                Total TTC
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-base font-bold text-violet-900">
                {formatMoney(totals.amount_ttc)} €
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Save bar */}
      {saveError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-3">
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
        {status === "draft" && (
          <button
            onClick={onMarkSent}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enregistrer et marquer comme envoyé
          </button>
        )}
      </div>
    </div>
  );
}
