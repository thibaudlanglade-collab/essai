import { useState, useEffect, useCallback } from "react"
import {
  Camera, ArrowLeft, Pen, Receipt, Table, Check,
  FileText, FileSpreadsheet, Download, Eye, X
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { PHOTO_EXAMPLES, type PhotoExample } from "@/data/photoToDocumentDemoData"

const ICON_MAP: Record<string, any> = { Pen, Receipt, Table }

/* ── Download helpers ──────────────────────────────────────────────────── */

function downloadPdf(example: PhotoExample) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246)
  doc.text("Synthèse", 14, y)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.8)
  doc.line(14, y + 3, pageWidth - 14, y + 3)
  y += 14

  // Title
  doc.setFontSize(14)
  doc.setTextColor(17, 24, 39)
  doc.text(example.title, 14, y)
  y += 7

  // Date
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, y)
  y += 10

  // Content
  if (example.resultPreview) {
    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)
    const lines = doc.splitTextToSize(example.resultPreview, pageWidth - 28)
    doc.text(lines, 14, y)
    y += lines.length * 5
  }

  // If there's table data, add it too
  const sheet = example.resultData?.sheets?.[0]
  if (sheet) {
    const header = example.resultData?.header
    if (header) {
      y += 6
      doc.setFontSize(12)
      doc.setTextColor(17, 24, 39)
      doc.text(header.title, 14, y)
      y += 6
      if (header.subtitle) {
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(header.subtitle, 14, y)
        y += 5
      }
      if (header.company) {
        doc.text(header.company, 14, y)
        y += 5
      }
    }

    const allRows = [
      ...sheet.rows.map((r: any[]) => r.map((c: any) => typeof c === "number" ? c.toFixed(2) : String(c))),
      ...(sheet.totals || []).map((r: any[]) => r.map((c: any) => typeof c === "number" ? c.toFixed(2) : String(c))),
    ]

    autoTable(doc, {
      startY: y + 2,
      head: [sheet.headers],
      body: allRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text("Généré par Synthèse — synthese.app", 14, pageHeight - 10)

  const filename = example.resultData?.filename
    ? example.resultData.filename.replace(/\.xlsx$/, ".pdf")
    : `${example.id}.pdf`
  doc.save(filename)
}

function downloadXlsx(example: PhotoExample) {
  const wb = XLSX.utils.book_new()
  const sheet = example.resultData?.sheets?.[0]

  if (sheet) {
    // Build worksheet from structured data
    const header = example.resultData?.header
    const rows: any[][] = []

    // Header info rows
    if (header) {
      if (header.title) rows.push([header.title])
      if (header.subtitle) rows.push([header.subtitle])
      if (header.address) rows.push([header.address])
      if (header.owner) rows.push([header.owner])
      if (header.company) rows.push([header.company])
      if (header.invoiceNumber || header.date) {
        const meta: string[] = []
        if (header.invoiceNumber) meta.push(`N° ${header.invoiceNumber}`)
        if (header.date) meta.push(header.date)
        if (header.table) meta.push(`Table ${header.table}`)
        if (header.server) meta.push(`Servi par ${header.server}`)
        rows.push([meta.join(" — ")])
      }
      rows.push([]) // blank separator
    }

    // Column headers + data
    rows.push(sheet.headers)
    for (const row of sheet.rows) {
      rows.push(row)
    }

    // Totals
    if (sheet.totals) {
      rows.push([]) // blank separator
      for (const row of sheet.totals) {
        rows.push(row)
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Auto-size columns
    const colWidths = sheet.headers.map((_: string, i: number) => {
      let max = sheet.headers[i].length
      for (const row of sheet.rows) {
        const val = String(row[i] ?? "")
        if (val.length > max) max = val.length
      }
      return { wch: Math.min(max + 4, 40) }
    })
    ws["!cols"] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  } else if (example.resultPreview) {
    // PDF-only example: put text content into a single-column sheet
    const lines = example.resultPreview.split("\n").map(line => [line])
    const ws = XLSX.utils.aoa_to_sheet(lines)
    ws["!cols"] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(wb, ws, "Document")
  }

  const filename = example.resultData?.filename || `${example.id}.xlsx`
  XLSX.writeFile(wb, filename)
}

/* ── Processing step definitions ───────────────────────────────────────── */

const PROCESSING_STEPS = [
  { id: 1, label: "Lecture de l'image", detail: "Analyse des pixels et détection du contenu…", duration: 800 },
  { id: 2, label: "Reconnaissance du texte", detail: "OCR en cours — identification des caractères…", duration: 1400 },
  { id: 3, label: "Structuration des données", detail: "Organisation en sections, lignes et colonnes…", duration: 1000 },
  { id: 4, label: "Génération du document", detail: "Mise en page et création du fichier…", duration: 800 },
]

const TOTAL_PROCESSING_TIME = PROCESSING_STEPS.reduce((sum, s) => sum + s.duration, 0)

/* ── Main component ────────────────────────────────────────────────────── */

interface PhotoToDocumentDemoProps {
  onBack: () => void
}

export default function PhotoToDocumentDemo({ onBack }: PhotoToDocumentDemoProps) {
  const [selectedExample, setSelectedExample] = useState<PhotoExample | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [previewExample, setPreviewExample] = useState<PhotoExample | null>(null)

  const handleSelectExample = async (example: PhotoExample) => {
    setSelectedExample(example)
    setShowResult(false)
    setIsProcessing(true)

    await new Promise(resolve => setTimeout(resolve, TOTAL_PROCESSING_TIME))

    setIsProcessing(false)
    setShowResult(true)
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
          <Camera className="h-6 w-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Photo → PDF ou Excel
        </h1>
        <p className="text-sm text-gray-600">
          Cliquez sur une photo pour voir Synthèse la transformer en document propre.
        </p>
      </div>

      {/* 3 example cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PHOTO_EXAMPLES.map((example) => {
          const Icon = ICON_MAP[example.iconName] || Camera
          const isSelected = selectedExample?.id === example.id
          return (
            <div
              key={example.id}
              className={`
                bg-white rounded-2xl border-2 p-5 cursor-pointer
                transition-all
                ${isSelected
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }
              `}
              onClick={() => handleSelectExample(example)}
            >
              {/* Photo thumbnail */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-4 relative">
                <img
                  src={example.imagePath}
                  alt={example.title}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewExample(example)
                  }}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs bg-black/70 text-white px-2 py-1 rounded-md backdrop-blur-sm hover:bg-black/85 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  Aperçu
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  {example.title}
                </h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {example.description}
              </p>

              <div className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                {example.resultType === "pdf" ? (
                  <>
                    <FileText className="h-3 w-3" />
                    Sortie : PDF
                  </>
                ) : example.resultType === "excel" ? (
                  <>
                    <FileSpreadsheet className="h-3 w-3" />
                    Sortie : Excel
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3" />
                    Sortie : PDF + Excel
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Processing */}
      {isProcessing && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8">
          <ProcessingSteps />
        </div>
      )}

      {/* Result */}
      {showResult && selectedExample && !isProcessing && (
        <ResultDisplay example={selectedExample} />
      )}

      {/* Photo preview modal */}
      {previewExample && (
        <PhotoPreviewModal
          example={previewExample}
          onClose={() => setPreviewExample(null)}
        />
      )}
    </div>
  )
}

/* ── Processing steps ──────────────────────────────────────────────────── */

function ProcessingSteps() {
  const [currentStep, setCurrentStep] = useState(1)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Advance steps at cumulative durations
    const timers: ReturnType<typeof setTimeout>[] = []
    let cumulative = 0
    for (let i = 0; i < PROCESSING_STEPS.length - 1; i++) {
      cumulative += PROCESSING_STEPS[i].duration
      const nextStep = i + 2
      timers.push(setTimeout(() => setCurrentStep(nextStep), cumulative))
    }

    // Smooth progress bar
    const totalMs = TOTAL_PROCESSING_TIME
    const interval = 50
    let elapsed = 0
    const progressTimer = setInterval(() => {
      elapsed += interval
      setProgress(Math.min((elapsed / totalMs) * 100, 100))
      if (elapsed >= totalMs) clearInterval(progressTimer)
    }, interval)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(progressTimer)
    }
  }, [])

  return (
    <>
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
        Conversion en cours
      </h3>
      <p className="text-sm text-gray-500 text-center mb-2">
        Synthèse traite votre photo
      </p>

      {/* Progress bar */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 text-right mt-1">{Math.round(progress)} %</div>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        {PROCESSING_STEPS.map((step) => {
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                ${isCompleted ? 'bg-blue-500' : isActive ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                {isCompleted && <Check className="h-3.5 w-3.5 text-white" />}
                {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                {!isCompleted && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
              </div>
              <div>
                <span className={`
                  text-sm block
                  ${isCompleted ? 'text-gray-900 font-medium' : isActive ? 'text-blue-700 font-medium' : 'text-gray-400'}
                `}>
                  {step.label}
                </span>
                {isActive && (
                  <span className="text-xs text-gray-400 block mt-0.5">{step.detail}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Result display ────────────────────────────────────────────────────── */

function ResultDisplay({ example }: { example: PhotoExample }) {
  const handleDownload = useCallback((format: "pdf" | "xlsx") => {
    if (format === "pdf") {
      downloadPdf(example)
    } else {
      downloadXlsx(example)
    }
  }, [example])

  const primaryFormat = example.resultType === "pdf" ? "pdf" as const : "xlsx" as const
  const secondaryFormat = example.resultType === "pdf" ? "xlsx" as const : "pdf" as const

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Conversion terminée
            </h3>
            <p className="text-sm text-gray-500">
              Votre {example.resultType === "pdf" ? "PDF" : "Excel"} est prêt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload(primaryFormat)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
          <button
            onClick={() => handleDownload(secondaryFormat)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            {example.resultType === "pdf" ? (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Aussi en Excel
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Aussi en PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        {example.resultType === "pdf" ? (
          <PDFResultPreview example={example} />
        ) : (
          <ExcelResultPreview example={example} />
        )}
      </div>
    </div>
  )
}

/* ── Result previews ───────────────────────────────────────────────────── */

function PDFResultPreview({ example }: { example: PhotoExample }) {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[500px]">
      <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">Synthèse</div>
          <div className="text-xs text-gray-500">Document généré le {new Date().toLocaleDateString("fr-FR")}</div>
        </div>
        <div className="text-xs text-gray-400">PDF · 1 page</div>
      </div>

      <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
        {example.resultPreview}
      </pre>
    </div>
  )
}

function ExcelResultPreview({ example }: { example: PhotoExample }) {
  const sheet = example.resultData?.sheets?.[0]
  const header = example.resultData?.header
  if (!sheet) return null

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Excel-style header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-2 bg-gray-50">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-gray-900">{example.resultData.filename}</span>
      </div>

      {/* Document header info */}
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
          <div className="text-base font-semibold text-gray-900 mb-1">{header.title}</div>
          {header.subtitle && <div className="text-sm text-gray-600">{header.subtitle}</div>}
          {header.address && <div className="text-xs text-gray-500 mt-1">{header.address}</div>}
          {header.owner && <div className="text-xs text-gray-500">{header.owner}</div>}
          {header.company && <div className="text-xs text-gray-500">{header.company}</div>}
          {(header.invoiceNumber || header.date) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
              {header.invoiceNumber && <span>N° facture : <strong>{header.invoiceNumber}</strong></span>}
              {header.date && <span>Date : <strong>{header.date}</strong></span>}
              {header.table && <span>Table : <strong>{header.table}</strong></span>}
              {header.server && <span>Servi par : <strong>{header.server}</strong></span>}
            </div>
          )}
        </div>
      )}

      {/* Sheet tab */}
      <div className="border-b border-gray-200 px-4 py-2 bg-white">
        <span className="inline-block px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">
          {sheet.name}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              {sheet.headers.map((h: string, i: number) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row: any[], i: number) => (
              <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-900 border-r border-gray-100 last:border-r-0">
                    {typeof cell === "number" ? cell.toFixed(2) : cell}
                  </td>
                ))}
              </tr>
            ))}
            {sheet.totals && sheet.totals.map((row: any[], i: number) => (
              <tr key={`total-${i}`} className={`border-b border-gray-200 font-semibold ${i === sheet.totals.length - 1 ? 'bg-blue-50 border-t-2 border-t-blue-300' : 'bg-gray-100'}`}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-900 border-r border-gray-200 last:border-r-0">
                    {typeof cell === "number" ? cell.toFixed(2) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Photo preview modal ───────────────────────────────────────────────── */

function PhotoPreviewModal({ example, onClose }: { example: PhotoExample, onClose: () => void }) {
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
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{example.title}</h3>
            <p className="text-sm text-gray-500">{example.description}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 bg-gray-100 overflow-auto">
          <img
            src={example.imagePath}
            alt={example.title}
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  )
}
