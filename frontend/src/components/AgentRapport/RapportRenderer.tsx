/**
 * RapportRenderer — renders the flexible report payload produced by the
 * `compose_report` skill. Each section type maps to a small visual block;
 * unknown types are silently skipped so the renderer never crashes on a
 * future schema extension.
 */
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { FinalReport, ReportSection } from "@/api/agentRapportClient";

export default function RapportRenderer({ report }: { report: FinalReport }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{report.client_name}</h2>
        <p className="text-sm text-gray-500 mt-0.5 italic">{report.intent_summary}</p>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {report.sections.map((section, i) => (
          <SectionView key={i} section={section} />
        ))}
      </div>
    </div>
  );
}

function SectionView({ section }: { section: ReportSection }) {
  switch (section.type) {
    case "callout":
      return <CalloutBlock section={section} />;
    case "kpi_grid":
      return <KpiGridBlock section={section} />;
    case "alerts":
      return <AlertsBlock section={section} />;
    case "table":
      return <TableBlock section={section} />;
    case "chart":
      return <ChartBlock section={section} />;
    case "narrative":
      return <NarrativeBlock section={section} />;
    default:
      return null;
  }
}

// ── Blocks ──────────────────────────────────────────────────────────────────

function CalloutBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "callout" }>;
}) {
  const tone =
    section.level === "warning"
      ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", Icon: AlertTriangle, iconColor: "text-amber-500" }
      : section.level === "success"
        ? { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", Icon: CheckCircle2, iconColor: "text-green-500" }
        : { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", Icon: Info, iconColor: "text-blue-500" };
  const { Icon } = tone;
  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 flex items-start gap-3`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${tone.iconColor}`} />
      <div className={tone.text}>
        <p className="font-semibold text-sm">{section.title}</p>
        <p className="text-sm mt-1 leading-relaxed">{section.text}</p>
      </div>
    </div>
  );
}

function KpiGridBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "kpi_grid" }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        {section.title}
      </p>
      <div
        className={`grid gap-3 ${
          section.items.length >= 4
            ? "grid-cols-2 md:grid-cols-4"
            : section.items.length === 3
              ? "grid-cols-3"
              : section.items.length === 2
                ? "grid-cols-2"
                : "grid-cols-1"
        }`}
      >
        {section.items.map((kpi, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {kpi.label}
            </p>
            <div className="flex items-end gap-1.5">
              <p className="text-xl font-bold text-gray-900 leading-none">{kpi.value}</p>
              {kpi.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500 mb-0.5" />}
              {kpi.trend === "down" && <TrendingDown className="h-4 w-4 text-red-400 mb-0.5" />}
              {kpi.trend === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500 mb-0.5" />}
            </div>
            {kpi.sub && <p className="text-[11px] text-gray-400 mt-1">{kpi.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "alerts" }>;
}) {
  return (
    <div className="space-y-2">
      {section.items.map((alert, i) => {
        const tone =
          alert.level === "warning"
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : alert.level === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-blue-50 border border-blue-100 text-blue-800";
        const Icon = alert.level === "warning" ? AlertTriangle : Info;
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${tone}`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            {alert.message}
          </div>
        );
      })}
    </div>
  );
}

function TableBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "table" }>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          {section.title}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
              {section.columns.map((col, i) => (
                <th key={i} className="px-5 py-3 text-left font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, r) => (
              <tr key={r} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                {row.map((cell, c) => (
                  <td key={c} className="px-5 py-3 text-gray-800 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "chart" }>;
}) {
  const max = Math.max(...section.data.map((d) => d.value), 1);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        {section.title}
      </p>
      <div className="flex items-end gap-2 h-32">
        {section.data.map((d, i) => {
          const heightPct = d.value > 0 ? Math.max((d.value / max) * 100, 4) : 3;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-full rounded-t-md transition-all ${
                  d.value > 0 ? "bg-violet-400" : "bg-gray-100"
                }`}
                style={{ height: `${heightPct}%` }}
                title={`${d.label} : ${d.value}`}
              />
              <span className="text-[10px] text-gray-400 truncate w-full text-center">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NarrativeBlock({
  section,
}: {
  section: Extract<ReportSection, { type: "narrative" }>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        {section.title}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{section.text}</p>
    </div>
  );
}
