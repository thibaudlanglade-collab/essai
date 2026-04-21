import { useState, useEffect } from "react"
import {
  Mic, ArrowLeft, Briefcase, Users, Factory, Check,
  FileText, Download, MessageSquare, Mail, Eye, X,
  CheckCircle2, Target, AlertCircle, BarChart3, FileAudio
} from "lucide-react"
import { MEETING_EXAMPLES, MeetingExample } from "@/data/meetingTranscriberDemoData"

const ICON_MAP: Record<string, any> = { Briefcase, Users, Factory }

interface MeetingTranscriberDemoProps {
  onBack: () => void
}

export default function MeetingTranscriberDemo({ onBack }: MeetingTranscriberDemoProps) {
  const [selectedExample, setSelectedExample] = useState<MeetingExample | null>(null)
  const [instruction, setInstruction] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [previewExample, setPreviewExample] = useState<MeetingExample | null>(null)
  const [previewContent, setPreviewContent] = useState<string>("")

  const handleSelectExample = (example: MeetingExample) => {
    setSelectedExample(example)
    setShowResult(false)
    setIsProcessing(false)
  }

  const handleUseSuggestion = () => {
    if (selectedExample) {
      setInstruction(selectedExample.suggestedInstruction)
    }
  }

  const handleLaunch = async () => {
    if (!selectedExample || !instruction.trim()) return

    setIsProcessing(true)
    setShowResult(false)

    await new Promise(resolve => setTimeout(resolve, 3000))

    setIsProcessing(false)
    setShowResult(true)
  }

  const handlePreview = async (example: MeetingExample) => {
    setPreviewExample(example)
    if (example.fileType === "text") {
      try {
        const response = await fetch(example.filePath)
        if (!response.ok) {
          setPreviewContent("Fichier non disponible dans cette démo.")
          return
        }
        const text = await response.text()
        if (text.trimStart().startsWith("<!")) {
          setPreviewContent("Fichier non disponible dans cette démo.")
          return
        }
        setPreviewContent(text)
      } catch (e) {
        setPreviewContent("Impossible de charger l'aperçu.")
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la présentation
      </button>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 mb-4">
          <Mic className="h-6 w-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Transcripteur de réunions
        </h1>
        <p className="text-sm text-gray-600">
          Choisissez une réunion d'exemple, précisez ce que vous voulez obtenir,
          et regardez Synthèse générer le compte-rendu.
        </p>
      </div>

      {/* 3 example cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {MEETING_EXAMPLES.map((example) => {
          const Icon = ICON_MAP[example.iconName] || Mic
          const isSelected = selectedExample?.id === example.id
          return (
            <div
              key={example.id}
              className={`
                bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all
                ${isSelected
                  ? 'border-blue-500 shadow-md bg-blue-50/30'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }
              `}
              onClick={() => handleSelectExample(example)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`
                  w-11 h-11 rounded-xl flex items-center justify-center
                  ${isSelected ? 'bg-blue-100' : 'bg-blue-50'}
                `}>
                  <Icon className="h-5 w-5 text-blue-500" />
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {example.title}
              </h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                {example.subtitle}
              </p>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                {example.description}
              </p>

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                  {example.fileType === "audio" ? (
                    <>
                      <FileAudio className="h-3 w-3" />
                      Audio MP3
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3" />
                      Transcription texte
                    </>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(example)
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Aperçu
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected indicator */}
      {selectedExample && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            {(() => {
              const Icon = ICON_MAP[selectedExample.iconName] || Mic
              return <Icon className="h-5 w-5 text-blue-500" />
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {selectedExample.title}
            </p>
            <p className="text-xs text-gray-600">
              {selectedExample.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Instruction textarea */}
      {selectedExample && !showResult && !isProcessing && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Que voulez-vous récupérer de cette réunion ?
          </label>

          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ex : extraire toutes les décisions prises avec leurs responsables, lister les actions à mener avec les échéances, et préparer un résumé exécutif pour les absents."
            rows={5}
            className="w-full px-4 py-3 text-sm text-gray-900 bg-white
                       border border-gray-200 rounded-xl resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                       placeholder:text-gray-400 placeholder:leading-relaxed"
          />

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Suggestion :</span>
            <button
              onClick={handleUseSuggestion}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Utiliser l'instruction recommandée
            </button>
          </div>
        </div>
      )}

      {/* Launch button */}
      {selectedExample && !showResult && !isProcessing && (
        <div className="flex justify-end mb-8">
          <button
            onClick={handleLaunch}
            disabled={!instruction.trim()}
            className="flex items-center gap-2 px-6 py-3
                       bg-blue-500 text-white text-sm font-semibold rounded-xl
                       hover:bg-blue-600 active:bg-blue-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-sm transition-all"
          >
            <Mic className="h-4 w-4" />
            Lancer l'analyse
          </button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8">
          <ProcessingSteps fileType={selectedExample?.fileType || "text"} />
        </div>
      )}

      {/* Result */}
      {showResult && selectedExample && !isProcessing && (
        <ResultDisplay example={selectedExample} />
      )}

      {/* Preview modal */}
      {previewExample && (
        <PreviewModal
          example={previewExample}
          content={previewContent}
          onClose={() => {
            setPreviewExample(null)
            setPreviewContent("")
          }}
        />
      )}
    </div>
  )
}

function ProcessingSteps({ fileType }: { fileType: "text" | "audio" }) {
  const [currentStep, setCurrentStep] = useState(1)

  const steps = fileType === "audio"
    ? [
        { id: 1, label: "Lecture du fichier audio" },
        { id: 2, label: "Transcription de la parole en texte" },
        { id: 3, label: "Identification des participants" },
        { id: 4, label: "Extraction des décisions et actions" },
        { id: 5, label: "Génération du compte-rendu" }
      ]
    : [
        { id: 1, label: "Lecture de la transcription" },
        { id: 2, label: "Identification des participants" },
        { id: 3, label: "Extraction des décisions et actions" },
        { id: 4, label: "Génération du compte-rendu" }
      ]

  useEffect(() => {
    const totalSteps = steps.length
    const stepDuration = 2500 / totalSteps
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < totalSteps; i++) {
      timers.push(setTimeout(() => setCurrentStep(i + 1), stepDuration * i))
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <>
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
        Analyse en cours
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        Synthèse traite votre réunion
      </p>

      <div className="max-w-sm mx-auto space-y-3">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center shrink-0
                ${isCompleted ? 'bg-blue-500' : isActive ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                {isCompleted && <Check className="h-3.5 w-3.5 text-white" />}
                {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                {!isCompleted && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
              </div>
              <span className={`
                text-sm
                ${isCompleted ? 'text-gray-900 font-medium' : isActive ? 'text-blue-700 font-medium' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function ResultDisplay({ example }: { example: MeetingExample }) {
  const r = example.result

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              {r.title}
            </h3>
            <p className="text-sm text-gray-500">
              {r.date} · {r.duration} · {r.participantsCount} participants
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors">
            <Download className="h-4 w-4" />
            PDF
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => alert("Compte-rendu publié dans #direction (démo)")}
          >
            <MessageSquare className="h-4 w-4" />
            Poster Teams
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => alert("Email envoyé aux participants (démo)")}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">

        {/* Participants */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Participants
          </div>
          <div className="flex flex-wrap gap-2">
            {r.participants.map((p, i) => (
              <span key={i} className="inline-block text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Executive summary */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Résumé exécutif
          </div>
          <ul className="space-y-2">
            {r.executiveSummary.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="text-blue-500 mt-1.5 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Decisions */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Décisions prises ({r.decisions.length})
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Décision</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-48">Validée par</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-40">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {r.decisions.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-gray-900">{d.decision}</td>
                    <td className="px-4 py-3 text-gray-600">{d.by}</td>
                    <td className="px-4 py-3 text-gray-600">{d.deadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            Actions à mener ({r.actions.length})
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-48">Responsable</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-40">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {r.actions.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-gray-900">{a.action}</td>
                    <td className="px-4 py-3 text-gray-600">{a.owner}</td>
                    <td className="px-4 py-3 text-gray-600">{a.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending items */}
        {r.pendingItems && r.pendingItems.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Points en suspens
            </div>
            <ul className="space-y-2">
              {r.pendingItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <span className="text-amber-500 mt-1.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key numbers */}
        {r.keyNumbers && r.keyNumbers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              Chiffres clés
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {r.keyNumbers.map((kn, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">{kn.label}</div>
                  <div className="text-sm font-semibold text-gray-900">{kn.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewModal({ example, content, onClose }: { example: MeetingExample, content: string, onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{example.title}</h3>
            <p className="text-sm text-gray-500">{example.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-auto bg-gray-50">
          {example.fileType === "audio" ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-2">Fichier audio</p>
              <p className="text-xs text-gray-500 mb-4">{example.duration} · MP3</p>
              <audio controls className="w-full max-w-md mx-auto">
                <source src={example.filePath} type="audio/mpeg" />
              </audio>
              <p className="text-xs text-gray-400 mt-4">
                Synthèse transcrira automatiquement le contenu vocal
              </p>
            </div>
          ) : (
            <pre className="bg-white p-6 rounded-xl text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono overflow-auto">
              {content || "Chargement..."}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
