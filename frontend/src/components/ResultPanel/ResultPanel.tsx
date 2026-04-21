import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Feature } from "@/types";

interface Props {
  result: Blob | string;
  feature: Feature;
  onReset: () => void;
}

export default function ResultPanel({ result, feature, onReset }: Props) {
  function handleDownload() {
    if (!(result instanceof Blob)) return;
    const url = URL.createObjectURL(result);
    const a = document.createElement("a");
    a.href = url;
    a.download = feature.output_filename ?? "output";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-3 border border-border bg-muted/40">
        <div className="h-2 w-2 rounded-full bg-gray-50oreground" />
        <span className="text-sm font-medium text-foreground">Pipeline complete</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {result instanceof Blob && (
          <Button onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            Download {feature.output_filename ?? "file"}
          </Button>
        )}

        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Run again
        </Button>
      </div>

      {/* Text output */}
      {typeof result === "string" && (
        <pre className="p-4 border border-border bg-muted/20 text-sm text-foreground whitespace-pre-wrap break-words overflow-y-auto max-h-[400px] font-mono text-[13px] leading-relaxed">
          {result}
        </pre>
      )}
    </div>
  );
}
