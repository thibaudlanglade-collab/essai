import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfOptions {
  documentTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

/**
 * Generates a professional French PDF from structured analysis results.
 *
 * Layout:
 * - Header with "Synthèse" branding + blue accent line
 * - Title "Analyse de document"
 * - Document subtitle
 * - Generation date
 * - Metadata section
 * - Data table with blue headers
 * - Summary/totals section
 * - Discrete footer
 */
export function generateResultPdf({ documentTitle, data }: PdfOptions): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.text("Synthèse", 14, y);

  // Blue accent line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(14, y + 3, pageWidth - 14, y + 3);

  y += 14;

  // ── Title ───────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text("Analyse de document", 14, y);
  y += 8;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(documentTitle, 14, y);
  y += 6;

  // Date
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(9);
  doc.text(`Généré le ${dateStr}`, 14, y);
  y += 10;

  // ── Parse data ──────────────────────────────────────────────────────────
  const { metadata, rows, summary } = parseData(data);

  // ── Metadata section ────────────────────────────────────────────────────
  if (metadata.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("INFORMATIONS", 14, y);
    y += 5;

    doc.setFontSize(9);
    for (const [key, val] of metadata) {
      doc.setTextColor(107, 114, 128);
      doc.text(key, 14, y);
      doc.setTextColor(17, 24, 39);
      doc.text(String(val), 80, y);
      y += 5;
    }
    y += 4;
  }

  // ── Data table ──────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    const head = [columns.map((c) => formatKey(c))];
    const body = rows.map((row) =>
      columns.map((col) => String(row[col] ?? ""))
    );

    autoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [229, 231, 235],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 40;
    y += 8;
  }

  // ── Summary section ─────────────────────────────────────────────────────
  if (summary.length > 0) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(14, y - 2, pageWidth - 28, summary.length * 6 + 10, 2, 2, "F");

    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("SYNTHÈSE", 18, y + 4);
    y += 10;

    for (const [key, val] of summary) {
      doc.setTextColor(6, 95, 70);
      doc.text(key, 18, y);
      doc.setTextColor(6, 78, 59);
      doc.text(String(val), 120, y, { align: "left" });
      y += 6;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("Synthèse · synthese.fr", pageWidth / 2, pageH - 10, {
      align: "center",
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────
  const safeName = documentTitle
    .toLowerCase()
    .replace(/[^a-z0-9àâäéèêëïîôùûüç]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`synthese-${safeName}.pdf`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type KV = [string, unknown];

function parseData(data: unknown): {
  metadata: KV[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  summary: KV[];
} {
  const metadata: KV[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: Record<string, any>[] = [];
  const summary: KV[] = [];

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
      rows = data;
    }
    return { metadata, rows, summary };
  }

  if (typeof data !== "object" || data === null) {
    return { metadata, rows, summary };
  }

  const obj = data as Record<string, unknown>;
  const summaryKeys = new Set([
    "total", "total_ht", "total_ttc", "tva", "montant_total",
    "total_ht_global", "total_ttc_global", "acompte",
    "solde_final", "solde", "total_credits", "total_debits",
  ]);

  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
      rows = val;
    } else if (summaryKeys.has(key.toLowerCase().replace(/\s/g, "_"))) {
      summary.push([formatKey(key), val]);
    } else if (typeof val !== "object" || val === null) {
      metadata.push([formatKey(key), val]);
    }
  }

  return { metadata, rows, summary };
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
