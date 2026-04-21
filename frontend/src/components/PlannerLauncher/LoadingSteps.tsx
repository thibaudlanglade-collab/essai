import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Lecture du document" },
  { id: 2, label: "Analyse du contenu" },
  { id: 3, label: "Structuration des données" },
  { id: 4, label: "Finalisation" },
];

/**
 * Maps real backend progress to a visual step number (1–5).
 * 5 means all steps completed.
 */
export function mapBackendToVisualStep(
  backendStatus: string,
  totalSteps: number,
  doneCount: number
): number {
  if (backendStatus === "idle") return 0;
  if (backendStatus === "planning") return 1;

  if (backendStatus === "success") return 5;

  if (totalSteps === 0) return 2;

  const progress = doneCount / totalSteps;
  if (progress < 0.4) return 2;
  if (progress < 0.7) return 3;
  return 4;
}

interface LoadingStepsProps {
  currentStep: number;
}

export function LoadingSteps({ currentStep }: LoadingStepsProps) {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
      <div className="flex items-center justify-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">
        Analyse en cours
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
        Synthèse traite votre document
      </p>

      <div className="max-w-xs mx-auto space-y-3">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  isCompleted && "bg-blue-500",
                  isActive && "bg-blue-100 dark:bg-blue-900/30",
                  isPending && "bg-gray-100 dark:bg-gray-700"
                )}
              >
                {isCompleted && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
                {isPending && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500" />
                )}
              </div>

              <span
                className={cn(
                  "text-sm transition-colors",
                  isCompleted && "text-gray-900 dark:text-gray-100 font-medium",
                  isActive && "text-blue-700 dark:text-blue-400 font-medium",
                  isPending && "text-gray-400 dark:text-gray-500"
                )}
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
