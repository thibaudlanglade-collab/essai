import { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  Mail,
  FileText,
  Clipboard,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlannerRun } from "@/hooks/usePlannerRun";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { LoadingSteps, mapBackendToVisualStep } from "./LoadingSteps";
import { StructuredResultRenderer } from "./StructuredResultRenderer";
import { generateResultPdf } from "./generatePdf";

// ── Demo examples (NEW complex documents) ─────────────────────────────────────

const EXAMPLES = [
  {
    id: "email-client",
    icon: Mail,
    title: "Email client — demande de devis",
    description:
      "Email en texte libre avec infos dispersées (nom, adresse, budget, délais, projet)",
    file: "/demo-files/email-client-devis.pdf",
    fileName: "email-client-devis.pdf",
    suggestedInstruction:
      "Produire une fiche prospect structurée avec : nom complet, coordonnées (adresse, téléphone, email), projet (type de travaux, surface), budget estimé, délais souhaités, niveau d'urgence, mention de recommandation (si présente), et questions/points à traiter. Extraire aussi tout projet secondaire évoqué pour plus tard.",
  },
  {
    id: "contrat",
    icon: FileText,
    title: "Contrat de prestation",
    description:
      "Contrat juridique dense : prix, dates et pénalités noyés dans le texte",
    file: "/demo-files/contrat-prestation.pdf",
    fileName: "contrat-prestation.pdf",
    suggestedInstruction:
      "Produire un récap exécutif du contrat avec : identité des deux parties, objet précis de la prestation, date de début et date de livraison finale, prix total (HT et TTC), échéancier de paiement détaillé, pénalités de retard applicables (montant et conditions), taux journalier pour prestations complémentaires, durée de préavis et conditions de résiliation si mentionnées.",
  },
  {
    id: "notes-chantier",
    icon: Clipboard,
    title: "Notes de chantier",
    description:
      "Notes chaotiques prises au jour le jour : texte décousu + tableau mal aligné",
    file: "/demo-files/notes-chantier.pdf",
    fileName: "notes-chantier.pdf",
    suggestedInstruction:
      "Structurer ces notes en 3 sections : (1) Plan d'actions de la semaine prochaine sous forme de liste de tâches avec priorité et échéance si mentionnée, (2) Récap des matériaux consommés avec quantités et prix (reconstituer le tableau propre), (3) Éléments à facturer ou à ajuster côté comptabilité (suppléments, remises, devis complémentaires). Identifier aussi tous les contacts mentionnés (clients, fournisseurs, collaborateurs).",
  },
];

type Example = (typeof EXAMPLES)[number];

async function fetchDemoFile(url: string, fileName: string): Promise<File> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new File([blob], fileName, { type: blob.type });
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlannerLauncher() {
  const [instruction, setInstruction] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);
  const [previewExample, setPreviewExample] = useState<Example | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { status, plan, stepStatuses, result, error, run, reset } =
    usePlannerRun();

  const isLoading = status === "planning" || status === "running";

  // Both a document AND an instruction are required
  const canLaunch =
    !!selectedExample && !!instruction.trim() && !isLoading;

  // Map backend progress to visual step number
  const doneCount = useMemo(
    () =>
      Object.values(stepStatuses).filter((s) => s === "done").length,
    [stepStatuses]
  );
  const totalSteps = plan?.steps.length ?? 0;
  const currentVisualStep = mapBackendToVisualStep(
    status,
    totalSteps,
    doneCount
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleSelectExample(example: Example) {
    if (isLoading) return;

    // Toggle off
    if (selectedExample?.id === example.id) {
      setSelectedExample(null);
      setFile(null);
      setInstruction("");
      return;
    }

    setSelectedExample(example);
    setInstruction(example.suggestedInstruction);
    // Pre-fetch the file in background
    fetchDemoFile(example.file, example.fileName).then(setFile);
  }

  async function handleLaunch() {
    if (!canLaunch || !selectedExample) return;

    // Ensure file is loaded
    let f = file;
    if (!f) {
      f = await fetchDemoFile(selectedExample.file, selectedExample.fileName);
      setFile(f);
    }

    run(instruction, f);
  }

  function handleReset() {
    reset();
    setSelectedExample(null);
    setFile(null);
    setInstruction("");
  }

  function handleDownloadExcel() {
    if (result?.type !== "binary") return;
    const blob = new Blob([result.bytes], { type: result.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synthese-${selectedExample?.id ?? "extract"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleGeneratePdf() {
    if (result?.type !== "json") return;
    setIsGeneratingPdf(true);
    try {
      generateResultPdf({
        documentTitle: selectedExample?.title ?? "Document",
        data: result.value,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* ── HERO SECTION ───────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-5">
            <Sparkles className="h-7 w-7 text-blue-500" />
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            Smart Extract
          </h1>

          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Synthèse lit vos documents — emails clients, contrats, notes de
            chantier, factures, devis, relevés bancaires — et en extrait
            exactement ce dont vous avez besoin. Que ce soit du texte libre, un
            document juridique dense ou des notes prises à la volée, décrivez ce
            que vous voulez obtenir, Synthèse s'en occupe.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Plus de saisie manuelle, plus de copier-coller. Les données arrivent
            structurées, prêtes à exploiter.
          </p>
        </div>

        {/* ── EXAMPLE CARDS ──────────────────────────────────────────── */}
        {status === "idle" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 rounded-3xl bg-white dark:bg-gray-800/50 p-6 -mx-2">
              {EXAMPLES.map((example) => {
                const Icon = example.icon;
                const isSelected = selectedExample?.id === example.id;

                return (
                  <div
                    key={example.id}
                    onClick={() => handleSelectExample(example)}
                    className={cn(
                      "bg-white dark:bg-gray-800/50 rounded-xl border-2 p-5 cursor-pointer transition-all group",
                      isSelected
                        ? "border-blue-500 shadow-md bg-blue-50/30 dark:bg-blue-900/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : "bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/30"
                        )}
                      >
                        <Icon className="h-5 w-5 text-blue-500" />
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                      {example.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                      {example.description}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewExample(example);
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Aperçu du document
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── SELECTED DOCUMENT INDICATOR ───────────────────────── */}
            {selectedExample && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <selectedExample.icon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedExample.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedExample.description}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewExample(selectedExample)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir
                </button>
              </div>
            )}

            {/* ── INSTRUCTION TEXTAREA ──────────────────────────────── */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Que voulez-vous faire avec ce document ?
              </label>

              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ex : extraire les informations importantes et les organiser en fiche structurée. Ou : produire un résumé exécutif avec les points clés. Ou : identifier toutes les actions à mener et les lister par priorité."
                rows={6}
                disabled={!selectedExample}
                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800/50
                           border border-gray-200 dark:border-gray-600 rounded-xl
                           resize-none
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:leading-relaxed
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />

            </div>

            {/* ── LAUNCH BUTTON ─────────────────────────────────────── */}
            <div className="flex justify-end">
              <button
                onClick={() => void handleLaunch()}
                disabled={!canLaunch}
                className="flex items-center gap-2 px-6 py-3
                           bg-blue-500 text-white text-sm font-semibold rounded-xl
                           hover:bg-blue-600 active:bg-blue-700
                           disabled:opacity-40 disabled:cursor-not-allowed
                           shadow-sm transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Lancer l'analyse
              </button>
            </div>
          </>
        )}

        {/* ── LOADING PROGRESS ───────────────────────────────────────── */}
        {isLoading && (
          <LoadingSteps currentStep={currentVisualStep} />
        )}

        {/* ── RESULT DISPLAY ─────────────────────────────────────────── */}
        {status === "success" && result && (
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Analyse terminée
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Voici les informations extraites de votre document
                  </p>
                </div>
              </div>

              {result.type === "json" && (
                <button
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-4 py-2.5
                             bg-blue-500 text-white text-sm font-semibold rounded-lg
                             hover:bg-blue-600 active:bg-blue-700
                             disabled:opacity-50 disabled:cursor-not-allowed
                             shadow-sm transition-all"
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4" />
                      Générer le PDF
                    </>
                  )}
                </button>
              )}

              {result.type === "binary" && (
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2.5
                             bg-blue-500 text-white text-sm font-semibold rounded-lg
                             hover:bg-blue-600 active:bg-blue-700
                             shadow-sm transition-all"
                >
                  <FileDown className="h-4 w-4" />
                  Télécharger l'Excel
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              {result.type === "json" && (
                <StructuredResultRenderer data={result.value} />
              )}

              {result.type === "binary" && (
                <div className="flex flex-col items-center gap-2 text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(result.size / 1024).toFixed(1)} Ko · Fichier Excel généré
                  </p>
                </div>
              )}

              {result.type === "null" && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Aucune donnée extraite.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Nouvelle analyse
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR CARD ─────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="bg-white dark:bg-gray-800/50 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-red-600 dark:text-red-400 font-medium">
                Une erreur est survenue lors de l'analyse
              </p>
            </div>
            {error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {error}
              </p>
            )}
            <div className="flex justify-start">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DOCUMENT PREVIEW MODAL ─────────────────────────────────── */}
      <DocumentPreviewModal
        example={previewExample}
        isOpen={!!previewExample}
        onClose={() => setPreviewExample(null)}
      />
    </div>
  );
}
