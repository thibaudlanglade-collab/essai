import { CheckCircle, XCircle, Loader, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepState } from "@/types";

interface Props {
  step: StepState;
}

const ICONS = {
  pending: <Circle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />,
  running: <Loader className="h-3.5 w-3.5 text-foreground animate-spin" strokeWidth={1.5} />,
  done:    <CheckCircle className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />,
  error:   <XCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />,
};

export default function StepBadge({ step }: Props) {
  const debugEntries = step.debug
    ? Object.entries(step.debug).filter(([k]) => !k.includes("token") && k !== "model")
    : [];

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-border animate-step-enter",
        "transition-colors duration-100",
        step.status === "running" && "bg-accent/30",
        step.status === "error" && "bg-destructive/5"
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{ICONS[step.status]}</div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] font-medium text-foreground font-mono">
          {step.id}
        </span>

        {step.status === "running" && (
          <span className="text-xs text-muted-foreground">running…</span>
        )}

        {step.status === "done" && debugEntries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {debugEntries.map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
          </span>
        )}

        {step.status === "error" && step.error && (
          <span className="text-xs text-destructive">{step.error}</span>
        )}
      </div>
    </div>
  );
}
