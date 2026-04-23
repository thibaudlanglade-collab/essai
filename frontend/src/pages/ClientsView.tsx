/**
 * Rapport Client page (brief §5.3 / Sprint 4).
 *
 * Single surface where the prospect picks one of their clients and asks a
 * free-form question. The backend aggregates every document linked to
 * that client (devis, emails, factures extraites, extractions Smart
 * Extract, + fichiers des dossiers Drive que le prospect a configurés)
 * and returns a grounded answer with cited sources.
 *
 * Route: /dashboard/clients (mounted by App.tsx under DashboardShell).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";
import DriveFolderPicker, {
  type DriveFolderPickerValue,
} from "@/components/DriveFolderPicker/DriveFolderPicker";
import {
  addReportFolder,
  askClient,
  createClient,
  deleteClient,
  listClients,
  listReportFolders,
  removeReportFolder,
  updateClient,
  type ClientReportAnswer,
  type ClientReportFolder,
  type ClientReportSource,
  type ClientSummary,
  type ClientWriteBody,
  type SourceKind,
} from "@/api/clientReportClient";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  particulier: "Particulier",
  sci: "SCI",
  copro: "Copropriété",
  mairie: "Collectivité",
  promoteur: "Promoteur",
};

const SUGGESTED_QUESTIONS = [
  "Résumez-moi tout ce que vous savez sur ce client à partir de mes documents.",
];

const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  quote: "Devis",
  email: "Email",
  invoice: "Facture",
  extraction: "Document",
  drive_file: "Drive",
};

const SOURCE_KIND_ICONS: Record<SourceKind, typeof FileText> = {
  quote: FileText,
  email: Mail,
  invoice: Receipt,
  extraction: FileText,
  drive_file: Folder,
};

interface HistoryItem extends ClientReportAnswer {
  asked_at: number;
}


export default function ClientsView() {
  useOutletContext<AuthContextShape>();

  // ── Clients list ──────────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Drive folders panel ───────────────────────────────────────────────────
  const [driveConnected, setDriveConnected] = useState(false);
  const [folders, setFolders] = useState<ClientReportFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [pickerValue, setPickerValue] = useState<DriveFolderPickerValue>({
    folder_id: "",
    folder_name: "",
  });
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderToast, setFolderToast] = useState<string | null>(null);

  // ── Question / answer ─────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ── Client CRUD modal ─────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");

  // ── Initial load ──────────────────────────────────────────────────────────
  const refreshClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const list = await listClients();
      setClients(list);
      setClientsError(null);
    } catch (err) {
      setClientsError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const refreshFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const state = await listReportFolders();
      setDriveConnected(state.drive_connected);
      setFolders(state.folders);
    } catch (err) {
      console.warn("folders load failed", err);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshClients();
    refreshFolders();
  }, [refreshClients, refreshFolders]);

  // Reset state when switching client.
  useEffect(() => {
    setHistory([]);
    setAskError(null);
    setQuestion("");
  }, [selectedId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.type, c.email].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const myClients = useMemo(
    () => filteredClients.filter((c) => !c.is_seed),
    [filteredClients],
  );
  const seedClients = useMemo(
    // Keep only one seed client visible in the sidebar: the full BTP seed
    // stays in the DB so the LLM can pull context from other seeded
    // devis/emails/invoices, but the list stays uncluttered once the
    // prospect has onboarded their own clients.
    () => filteredClients.filter((c) => c.is_seed).slice(0, 1),
    [filteredClients],
  );

  // ── Question submit ───────────────────────────────────────────────────────
  async function handleAsk(prefill?: string) {
    if (!selectedClient) return;
    const q = (prefill ?? question).trim();
    if (!q) {
      setAskError("Merci d'écrire votre question.");
      return;
    }
    setAskError(null);
    setAsking(true);
    try {
      const result = await askClient(selectedClient.id, q);
      setHistory((prev) => [
        { ...result, asked_at: Date.now() },
        ...prev,
      ]);
      setQuestion("");
    } catch (err) {
      setAskError(
        err instanceof Error
          ? err.message
          : "L'analyse n'a pas abouti.",
      );
    } finally {
      setAsking(false);
    }
  }

  // ── Folder add / remove ───────────────────────────────────────────────────
  async function handleAddFolder() {
    if (!pickerValue.folder_id.trim()) {
      setFolderError("Choisissez un dossier Drive dans la liste.");
      return;
    }
    setFolderError(null);
    setFolderSaving(true);
    try {
      const addedName = pickerValue.folder_name.trim() || "Dossier Drive";
      await addReportFolder({
        folder_id: pickerValue.folder_id.trim(),
        folder_name: pickerValue.folder_name.trim() || undefined,
      });
      setPickerValue({ folder_id: "", folder_name: "" });
      await refreshFolders();
      setFolderToast(`« ${addedName} » ajouté. Il sera fouillé à chaque question.`);
      window.setTimeout(() => setFolderToast(null), 3500);
    } catch (err) {
      setFolderError(
        err instanceof Error ? err.message : "Ajout impossible.",
      );
    } finally {
      setFolderSaving(false);
    }
  }

  async function handleRemoveFolder(id: string) {
    try {
      await removeReportFolder(id);
      await refreshFolders();
    } catch (err) {
      setFolderError(
        err instanceof Error ? err.message : "Suppression impossible.",
      );
    }
  }

  // ── Client CRUD handlers ──────────────────────────────────────────────────
  function openCreate() {
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEdit() {
    if (!selectedClient) return;
    setEditorMode("edit");
    setEditorOpen(true);
  }

  async function handleEditorSubmit(body: ClientWriteBody) {
    if (editorMode === "create") {
      const created = await createClient(body);
      await refreshClients();
      setSelectedId(created.id);
    } else if (selectedClient) {
      await updateClient(selectedClient.id, body);
      await refreshClients();
    }
    setEditorOpen(false);
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    const confirmed = window.confirm(
      `Supprimer le client « ${selectedClient.name} » ? Ses devis et emails resteront dans votre espace mais ne seront plus rattachés à ce client.`,
    );
    if (!confirmed) return;
    await deleteClient(selectedClient.id);
    setSelectedId(null);
    await refreshClients();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr]">
      {/* ─── Left: clients list ─────────────────────────────────────────── */}
      <aside className="border-r border-gray-200 bg-white/60 flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              <BarChart3 className="h-3.5 w-3.5" />
              Vos clients
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded px-2 py-1 transition-colors"
              title="Ajouter un client"
            >
              <Plus className="h-3 w-3" />
              Nouveau
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {clientsLoading && (
            <div className="px-3 py-4 text-xs text-gray-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Chargement…
            </div>
          )}
          {clientsError && (
            <div className="px-3 py-2 text-xs text-rose-600">{clientsError}</div>
          )}
          {!clientsLoading && !clientsError && filteredClients.length === 0 && (
            <div className="px-3 py-6 text-xs text-gray-400 text-center">
              {search ? "Aucun client ne correspond." : "Aucun client enregistré."}
            </div>
          )}

          {myClients.length > 0 && (
            <>
              {seedClients.length > 0 && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  Mes clients
                </div>
              )}
              {myClients.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                />
              ))}
            </>
          )}

          {seedClients.length > 0 && (
            <>
              <div className="px-3 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                Exemples de démonstration
              </div>
              {seedClients.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                  dim
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ─── Right: question / answer ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {!selectedClient ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8">
            {/* Client header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold text-gray-900 leading-tight truncate">
                    {selectedClient.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedClient.type
                      ? CLIENT_TYPE_LABELS[selectedClient.type] || selectedClient.type
                      : "Type non renseigné"}
                    {selectedClient.address ? ` · ${selectedClient.address}` : ""}
                  </p>
                  {(selectedClient.email || selectedClient.phone) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedClient.email && <>{selectedClient.email}</>}
                      {selectedClient.email && selectedClient.phone && " · "}
                      {selectedClient.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Modifier ce client"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClient}
                    className="h-8 w-8 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                    title="Supprimer ce client"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Drive folders panel */}
            <DriveFoldersPanel
              driveConnected={driveConnected}
              folders={folders}
              loading={foldersLoading}
              pickerValue={pickerValue}
              onPickerChange={setPickerValue}
              onAdd={handleAddFolder}
              onRemove={handleRemoveFolder}
              saving={folderSaving}
              error={folderError}
              toast={folderToast}
            />

            {/* Question zone */}
            <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Posez votre question sur ce client
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Posez votre question en langage naturel sur ce client."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAsk();
                  }
                }}
                disabled={asking}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuestion(s);
                      handleAsk(s);
                    }}
                    disabled={asking}
                    className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAsk()}
                  disabled={asking || !question.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {asking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyser
                    </>
                  )}
                </button>
                <span className="text-xs text-gray-400">
                  Les réponses sont construites uniquement à partir de vos documents.
                </span>
              </div>

              {askError && (
                <div className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                  {askError}
                </div>
              )}
            </section>

            {/* Answers history */}
            {history.length === 0 && !asking && (
              <div className="text-center py-10 text-sm text-gray-400">
                Sélectionnez une question ci-dessus ou écrivez la vôtre pour
                obtenir une synthèse sur ce client.
              </div>
            )}

            {history.map((item, idx) => (
              <AnswerCard key={item.asked_at + "-" + idx} item={item} />
            ))}
          </div>
        )}
      </main>

      {editorOpen && (
        <ClientEditorModal
          mode={editorMode}
          client={editorMode === "edit" ? selectedClient : null}
          onClose={() => setEditorOpen(false)}
          onSubmit={handleEditorSubmit}
        />
      )}
    </div>
  );
}


function ClientRow({
  client,
  active,
  onClick,
  dim,
}: {
  client: ClientSummary;
  active: boolean;
  onClick: () => void;
  dim?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors " +
        (active
          ? "bg-violet-100 text-violet-800"
          : dim
            ? "text-gray-500 hover:bg-gray-100"
            : "text-gray-700 hover:bg-gray-100")
      }
    >
      <div className="font-medium truncate flex items-center gap-2">
        <span className="truncate">{client.name}</span>
        {dim && (
          <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
            Démo
          </span>
        )}
      </div>
      <div className="text-[11px] text-gray-500 truncate">
        {client.type ? (CLIENT_TYPE_LABELS[client.type] || client.type) : "—"}
        {client.address ? ` · ${client.address.split(",")[0]}` : ""}
      </div>
    </button>
  );
}


function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="h-14 w-14 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
        <MessageCircle className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Choisissez un client à gauche
      </h2>
      <p className="text-sm text-gray-500 max-w-md leading-relaxed">
        Posez ensuite une question en langage naturel. Synthèse parcourt vos
        devis, emails, factures et dossiers Drive pour vous fournir une
        réponse avec les sources précises.
      </p>
    </div>
  );
}


function DriveFoldersPanel(props: {
  driveConnected: boolean;
  folders: ClientReportFolder[];
  loading: boolean;
  pickerValue: DriveFolderPickerValue;
  onPickerChange: (next: DriveFolderPickerValue) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  saving: boolean;
  error: string | null;
  toast: string | null;
}) {
  const enabledCount = props.folders.filter((f) => f.is_enabled).length;

  return (
    <section className="bg-white rounded-lg border border-gray-200 mb-6">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <FolderOpen className="h-4 w-4 text-gray-500" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            Dossiers Drive à parcourir
          </div>
          <div className="text-xs text-gray-500">
            {props.loading
              ? "Chargement…"
              : !props.driveConnected
                ? "Aucun Drive connecté"
                : enabledCount === 0
                  ? "Aucun dossier configuré. Seuls vos documents déjà dans Synthèse sont fouillés."
                  : `${enabledCount} dossier${enabledCount > 1 ? "s" : ""} actif${enabledCount > 1 ? "s" : ""} (fouillé${enabledCount > 1 ? "s" : ""} à chaque question)`}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {!props.driveConnected ? (
          <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
            Connectez d'abord votre Google Drive depuis la page
            Automatisations, puis revenez ici pour choisir les dossiers à
            parcourir quand vous posez une question sur un client.
          </div>
        ) : (
          <>
            {props.folders.length > 0 && (
              <ul className="mb-4 space-y-2">
                {props.folders.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 bg-violet-50/60 border border-violet-100 rounded-md px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 shrink-0 text-violet-600" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">
                          {f.folder_name || "Dossier Drive"}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate font-mono">
                          {f.folder_id}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => props.onRemove(f.id)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 transition-colors"
                      title="Retirer ce dossier"
                    >
                      <X className="h-3.5 w-3.5" />
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
              <DriveFolderPicker
                value={props.pickerValue}
                onChange={props.onPickerChange}
                label={
                  props.folders.length === 0
                    ? "Ajouter un premier dossier"
                    : "Ajouter un autre dossier"
                }
              />
              <button
                type="button"
                onClick={props.onAdd}
                disabled={props.saving || !props.pickerValue.folder_id.trim()}
                className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300 h-[38px] inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {props.saving ? "Ajout…" : "Ajouter"}
              </button>
            </div>

            {props.toast && (
              <div className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                {props.toast}
              </div>
            )}

            {props.error && (
              <div className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                {props.error}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}


function AnswerCard({ item }: { item: HistoryItem }) {
  const confidencePct = Math.round((item.confidence || 0) * 100);

  return (
    <article className="bg-white rounded-lg border border-gray-200 p-5 mb-5 shadow-sm">
      <div className="mb-3">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
          Question
        </div>
        <div className="text-sm text-gray-900">{item.question}</div>
      </div>

      <div className="mb-4">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
          Résumé général
        </div>
        <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
          {item.answer}
        </div>
      </div>

      {item.sources.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
            Détail par document ({item.sources.length})
          </div>
          <ul className="space-y-2.5">
            {item.sources.map((s) => (
              <li key={s.source_id}>
                <SourceEntry source={s} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
        <span>{item.stats.total_docs} document(s) analysé(s)</span>
        <span>·</span>
        <span>{item.stats.quotes} devis</span>
        <span>·</span>
        <span>{item.stats.emails} emails</span>
        <span>·</span>
        <span>{item.stats.invoices} factures</span>
        {item.stats.folders_searched > 0 && (
          <>
            <span>·</span>
            <span>
              {item.stats.drive_files > 0
                ? `${item.stats.drive_files} fichier(s) Drive lu(s)`
                : `${item.stats.folders_searched} dossier(s) Drive scanné(s), aucun fichier exploitable`}
            </span>
          </>
        )}
        <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          Confiance {confidencePct}%
        </span>
      </div>
    </article>
  );
}


function ClientEditorModal({
  mode,
  client,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  client: ClientSummary | null;
  onClose: () => void;
  onSubmit: (body: ClientWriteBody) => Promise<void>;
}) {
  const [name, setName] = useState(client?.name || "");
  const [type, setType] = useState(client?.type || "");
  const [address, setAddress] = useState(client?.address || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: type || undefined,
        address: address.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? "Nouveau client" : "Modifier le client"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nom ou raison sociale *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              >
                <option value="">—</option>
                <option value="particulier">Particulier</option>
                <option value="sci">SCI</option>
                <option value="copro">Copropriété</option>
                <option value="mairie">Collectivité</option>
                <option value="promoteur">Promoteur</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Téléphone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Adresse
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              placeholder="Patrimoine, paiement à X jours, préférences…"
            />
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-4 py-1.5 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-300"
          >
            {submitting
              ? "Enregistrement…"
              : mode === "create"
                ? "Créer le client"
                : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}


function SourceEntry({ source }: { source: ClientReportSource }) {
  const Icon = SOURCE_KIND_ICONS[source.kind];
  const kindLabel = SOURCE_KIND_LABELS[source.kind] || source.kind;

  const header = (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      <span className="shrink-0 font-semibold text-gray-900">{kindLabel}</span>
      <span className="truncate text-gray-700">
        {source.label || source.source_id}
      </span>
      {source.date && (
        <span className="shrink-0 text-gray-400">· {source.date}</span>
      )}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto shrink-0 text-[11px] text-violet-600 hover:underline"
        >
          Ouvrir ↗
        </a>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
      {header}
      {source.summary && (
        <div className="mt-1.5 pl-5 text-sm text-gray-700 leading-relaxed">
          {source.summary}
        </div>
      )}
    </div>
  );
}
