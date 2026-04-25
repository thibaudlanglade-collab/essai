/**
 * Agent Rapport client — 3-step wizard.
 *
 *   Step 1 "input"      Pick a source (paste / upload PDFs / paste CSV) +
 *                       optional client name hint. POST /api/agent-rapport/ingest
 *                       returns a ClientContext + summary.
 *   Step 2 "intent"     Show the summary, ask the prospect what they want
 *                       to highlight (free-text + 4 quick-pick angles).
 *   Step 3 "result"     Stream POST /api/agent-rapport/compose, render the
 *                       flexible report sections.
 *
 * Empty trial first-class: there is no DB lookup. Everything ingested in
 * step 1 lives only in memory for the duration of this page session
 * (ephemeral, by design — see chat decisions).
 *
 * Route: /dashboard/agent-rapport.
 */
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Target,
  Telescope,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import {
  extractPdfText,
  ingestData,
  streamCompose,
  type ClientContext,
  type ComposeStep,
  type FinalReport,
  type IngestPayload,
} from "@/api/agentRapportClient";
import RapportRenderer from "@/components/AgentRapport/RapportRenderer";
import ContextBadge from "@/components/ContextBadge";

type Phase = "input" | "ingesting" | "intent" | "composing" | "result" | "error";
type SourceTab = "text" | "csv" | "pdf";

interface PdfFile {
  name: string;
  text: string;
}

const QUICK_INTENTS: { id: string; label: string; Icon: React.ElementType; prompt: string }[] = [
  {
    id: "vue-360",
    label: "Vue 360°",
    Icon: Telescope,
    prompt: "Synthèse complète : profil du client, indicateurs clés, derniers échanges, signaux à connaître.",
  },
  {
    id: "risques",
    label: "Risques financiers",
    Icon: AlertTriangle,
    prompt: "Mets en avant les risques financiers : factures en retard, encours, signaux faibles. Sois direct.",
  },
  {
    id: "opportunites",
    label: "Opportunités commerciales",
    Icon: TrendingUp,
    prompt: "Repère les opportunités commerciales : projets mentionnés, signaux d'achat, comptes à relancer.",
  },
  {
    id: "brief-rdv",
    label: "Brief avant rendez-vous",
    Icon: Target,
    prompt: "Prépare-moi un brief court avant un rendez-vous : 3 chiffres clés, 2 points à creuser, 1 sujet à éviter.",
  },
];

const COMPOSE_STEPS: { id: ComposeStep; label: string; Icon: React.ElementType }[] = [
  { id: "interpret_intent", label: "Compréhension de votre intention…", Icon: Lightbulb },
  { id: "compose_report", label: "Génération du rapport…", Icon: Sparkles },
];

export default function AgentRapportPage() {
  const [phase, setPhase] = useState<Phase>("input");

  // Step 1 state
  const [tab, setTab] = useState<SourceTab>("text");
  const [textInput, setTextInput] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [clientHint, setClientHint] = useState("");

  // Cross-step state
  const [context, setContext] = useState<ClientContext | null>(null);
  const [intentText, setIntentText] = useState("");

  // Step 3 state
  const [activeStep, setActiveStep] = useState<ComposeStep | null>(null);
  const [doneSteps, setDoneSteps] = useState<Set<ComposeStep>>(new Set());
  const [report, setReport] = useState<FinalReport | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("input");
    setTextInput("");
    setCsvInput("");
    setPdfs([]);
    setClientHint("");
    setContext(null);
    setIntentText("");
    setActiveStep(null);
    setDoneSteps(new Set());
    setReport(null);
    setErrorMsg(null);
  }

  async function runIngest() {
    setErrorMsg(null);

    let payload: IngestPayload | null = null;
    if (tab === "text") {
      const t = textInput.trim();
      if (!t) {
        setErrorMsg("Collez du texte décrivant votre client avant de continuer.");
        return;
      }
      payload = { source_type: "text", text: t, client_hint: clientHint.trim() || undefined };
    } else if (tab === "csv") {
      const c = csvInput.trim();
      if (!c) {
        setErrorMsg("Collez le contenu de votre CSV avant de continuer.");
        return;
      }
      payload = { source_type: "csv", csv: c, client_hint: clientHint.trim() || undefined };
    } else {
      if (pdfs.length === 0) {
        setErrorMsg("Ajoutez au moins un PDF avant de continuer.");
        return;
      }
      payload = {
        source_type: "pdf",
        pdf_chunks: pdfs.map((p) => p.text),
        client_hint: clientHint.trim() || undefined,
      };
    }

    setPhase("ingesting");
    try {
      const ctx = await ingestData(payload);
      setContext(ctx);
      setPhase("intent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de l'ingestion.");
      setPhase("error");
    }
  }

  function runCompose() {
    if (!context || !intentText.trim()) return;

    setPhase("composing");
    setActiveStep(null);
    setDoneSteps(new Set());
    setReport(null);
    setErrorMsg(null);

    abortRef.current?.abort();
    abortRef.current = streamCompose(
      { ...context, intent_text: intentText.trim() },
      {
        onStepStart: (s) => setActiveStep(s),
        onStepDone: (s) => {
          setDoneSteps((prev) => new Set(prev).add(s));
          setActiveStep(null);
        },
        onStepError: (_s, error) => {
          setErrorMsg(error);
          setPhase("error");
        },
        onResult: (r) => setReport(r),
        onDone: () => {
          setPhase((prev) => (prev === "error" ? prev : "result"));
        },
      },
    );
  }

  // Helpers ──────────────────────────────────────────────────────────────────

  async function handlePdfFiles(files: FileList | null) {
    if (!files) return;
    const pdfList = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfList.length === 0) return;
    try {
      const chunks = await extractPdfText(pdfList);
      const next: PdfFile[] = chunks
        .filter((c) => c.text && c.text.length > 0)
        .map((c) => ({ name: c.name, text: c.text }));
      const failed = chunks.filter((c) => !c.text);
      if (failed.length > 0) {
        setErrorMsg(
          `${failed.length} PDF(s) n'ont rien donné (image scannée ou erreur). ${
            failed[0].error ?? ""
          }`,
        );
      }
      if (next.length > 0) setPdfs((prev) => [...prev, ...next]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de l'extraction PDF.");
    }
  }

  function removePdf(idx: number) {
    setPdfs((prev) => prev.filter((_, i) => i !== idx));
  }

  // Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <ContextBadge
        variant="agent"
        label="Exemple d'agent IA"
        description="Voici un agent que nous avons construit. Le vôtre sera différent — conçu pour vos cas d'usage à vous."
      />

      <Header phase={phase} onReset={reset} />

      <Stepper phase={phase} />

      {(phase === "input" || phase === "ingesting") && (
        <InputStep
          tab={tab}
          onTabChange={setTab}
          text={textInput}
          onTextChange={setTextInput}
          csv={csvInput}
          onCsvChange={setCsvInput}
          pdfs={pdfs}
          onPdfFiles={handlePdfFiles}
          onPdfRemove={removePdf}
          clientHint={clientHint}
          onClientHintChange={setClientHint}
          onSubmit={runIngest}
          submitting={phase === "ingesting"}
          errorMsg={errorMsg}
        />
      )}

      {phase === "intent" && context && (
        <IntentStep
          context={context}
          intent={intentText}
          onIntentChange={setIntentText}
          onSubmit={runCompose}
          onBack={() => setPhase("input")}
        />
      )}

      {phase === "composing" && (
        <ComposingStep activeStep={activeStep} doneSteps={doneSteps} />
      )}

      {phase === "result" && report && (
        <div className="mt-6">
          <RapportRenderer report={report} />
          <div className="mt-8 flex justify-center">
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
            >
              Repartir d'un nouveau jeu de données
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <ErrorCard message={errorMsg ?? "Une erreur est survenue."} onReset={reset} />
      )}
    </div>
  );
}

// ── Header + Stepper ───────────────────────────────────────────────────────

function Header({ phase, onReset }: { phase: Phase; onReset: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="inline-flex items-center gap-2 text-[10px] font-bold px-2.5 py-1 rounded-md bg-violet-100 text-violet-700 uppercase tracking-widest mb-3">
          <Sparkles className="h-3 w-3" />
          Agent IA · vos données, votre rapport
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Agent Rapport client</h1>
        <p className="text-sm text-gray-600 max-w-xl">
          Apportez vos données (texte, PDF ou CSV), dites-moi ce que vous voulez
          mettre en avant, et l'agent compose le rapport sur-mesure.
        </p>
      </div>
      {phase !== "input" && phase !== "ingesting" && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Recommencer
        </button>
      )}
    </div>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const stepIndex = phase === "input" || phase === "ingesting" ? 0 : phase === "intent" ? 1 : 2;
  const labels = ["Vos données", "Votre intention", "Rapport"];
  return (
    <div className="flex items-center gap-2 mb-8 text-xs font-medium">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center h-6 w-6 rounded-full ${
              i < stepIndex
                ? "bg-violet-500 text-white"
                : i === stepIndex
                  ? "bg-violet-100 text-violet-700 border border-violet-300"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={
              i === stepIndex
                ? "text-violet-700"
                : i < stepIndex
                  ? "text-gray-700"
                  : "text-gray-400"
            }
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <ArrowRight className="h-3 w-3 text-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1 — input ─────────────────────────────────────────────────────────

function InputStep({
  tab,
  onTabChange,
  text,
  onTextChange,
  csv,
  onCsvChange,
  pdfs,
  onPdfFiles,
  onPdfRemove,
  clientHint,
  onClientHintChange,
  onSubmit,
  submitting,
  errorMsg,
}: {
  tab: SourceTab;
  onTabChange: (t: SourceTab) => void;
  text: string;
  onTextChange: (v: string) => void;
  csv: string;
  onCsvChange: (v: string) => void;
  pdfs: PdfFile[];
  onPdfFiles: (files: FileList | null) => void;
  onPdfRemove: (i: number) => void;
  clientHint: string;
  onClientHintChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMsg: string | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      {/* Tabs */}
      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mb-6">
        <TabButton
          active={tab === "text"}
          onClick={() => onTabChange("text")}
          Icon={ClipboardPaste}
          label="Coller du texte"
        />
        <TabButton
          active={tab === "pdf"}
          onClick={() => onTabChange("pdf")}
          Icon={FileText}
          label="Uploader des PDFs"
        />
        <TabButton
          active={tab === "csv"}
          onClick={() => onTabChange("csv")}
          Icon={Upload}
          label="Coller un CSV"
        />
      </div>

      {/* Body */}
      {tab === "text" && (
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Décrivez votre client : commandes, factures, derniers échanges, contexte… Plus c'est précis, meilleur sera le rapport."
          rows={10}
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-y"
        />
      )}

      {tab === "csv" && (
        <textarea
          value={csv}
          onChange={(e) => onCsvChange(e.target.value)}
          placeholder={`Collez votre export CRM ou Excel ici. Exemple :\nclient,montant,statut,date\nRenault Trucks,147850,en cours,2024-04-08\nRenault Trucks,92400,livré,2024-04-01`}
          rows={10}
          className="w-full px-4 py-3 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-y"
        />
      )}

      {tab === "pdf" && (
        <PdfDropzone files={pdfs} onFiles={onPdfFiles} onRemove={onPdfRemove} />
      )}

      {/* Client hint */}
      <div className="mt-5">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Nom du client (optionnel)
        </label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={clientHint}
            onChange={(e) => onClientHintChange(e.target.value)}
            placeholder="Ex : Renault Trucks SAS"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Si laissé vide, l'agent essaiera de le déduire des données fournies.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Lecture des données…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Analyser mes données
          </>
        )}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function PdfDropzone({
  files,
  onFiles,
  onRemove,
}: {
  files: PdfFile[];
  onFiles: (files: FileList | null) => void;
  onRemove: (i: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    setBusy(true);
    try {
      await onFiles(files);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-500 hover:border-violet-300 hover:text-gray-700 transition-colors flex flex-col items-center gap-2"
      >
        {busy ? (
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        ) : (
          <Upload className="h-6 w-6 text-gray-400" />
        )}
        Cliquez ou glissez vos PDFs ici (devis, factures, fiches client…)
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs"
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate text-gray-700">{f.name}</span>
                <span className="text-gray-400 shrink-0">
                  ({Math.round(f.text.length / 1000)}k chars)
                </span>
              </span>
              <button
                onClick={() => onRemove(i)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Retirer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Step 2 — intent ────────────────────────────────────────────────────────

function IntentStep({
  context,
  intent,
  onIntentChange,
  onSubmit,
  onBack,
}: {
  context: ClientContext;
  intent: string;
  onIntentChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const canSubmit = intent.trim().length > 0;
  return (
    <div className="space-y-5">
      {/* Recap */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
        <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-widest mb-2">
          Voici ce que j'ai compris
        </p>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{context.client_name}</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{context.summary}</p>
        {(context.entities.documents.length > 0 ||
          context.entities.exchanges.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-violet-700">
            {context.entities.documents.length > 0 && (
              <span>{context.entities.documents.length} document(s)</span>
            )}
            {context.entities.exchanges.length > 0 && (
              <span>{context.entities.exchanges.length} échange(s)</span>
            )}
            {context.entities.metrics.length > 0 && (
              <span>{context.entities.metrics.length} chiffre(s) clé(s)</span>
            )}
          </div>
        )}
      </div>

      {/* Quick-pick angles */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Choisissez un angle (ou écrivez le vôtre)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_INTENTS.map((q) => {
            const active = intent === q.prompt;
            const Icon = q.Icon;
            return (
              <button
                key={q.id}
                onClick={() => onIntentChange(q.prompt)}
                className={`px-3 py-3 text-left rounded-xl border text-xs font-medium transition-all ${
                  active
                    ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50/40"
                }`}
              >
                <Icon className="h-4 w-4 mb-1.5" />
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Free text */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Ou décrivez votre besoin
        </label>
        <textarea
          value={intent}
          onChange={(e) => onIntentChange(e.target.value)}
          placeholder="Ex : Je vais voir ce client demain. Donne-moi les chiffres clés et 2 sujets de discussion."
          rows={3}
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-y"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Modifier mes données
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          Générer mon rapport
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — composing animation ───────────────────────────────────────────

function ComposingStep({
  activeStep,
  doneSteps,
}: {
  activeStep: ComposeStep | null;
  doneSteps: Set<ComposeStep>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-xl">
      <p className="text-sm font-semibold text-gray-700 mb-6">
        L'agent assemble votre rapport…
      </p>
      <div className="space-y-4">
        {COMPOSE_STEPS.map((step) => {
          const status = doneSteps.has(step.id)
            ? "done"
            : activeStep === step.id
              ? "active"
              : "pending";
          const Icon = step.Icon;
          return (
            <div key={step.id} className="flex items-center gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  status === "done"
                    ? "bg-green-50"
                    : status === "active"
                      ? "bg-violet-50"
                      : "bg-gray-50"
                }`}
              >
                {status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-gray-300" />
                )}
              </div>
              <span
                className={`text-sm transition-colors ${
                  status === "done"
                    ? "text-gray-700 line-through decoration-gray-300"
                    : status === "active"
                      ? "text-violet-700 font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Error ──────────────────────────────────────────────────────────────────

function ErrorCard({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-xl">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Une erreur est survenue</p>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Recommencer
      </button>
    </div>
  );
}

