import type { StepState } from "@/types";
import StepBadge from "./StepBadge";

interface Props {
  steps: StepState[];
}

export default function ProgressPanel({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col">
      <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground border border-border border-b-0 bg-muted/40">
        Pipeline
      </p>
      <div className="border border-border">
        {steps.map((step) => (
          <StepBadge key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
