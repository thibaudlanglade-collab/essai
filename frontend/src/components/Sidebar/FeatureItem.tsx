import { cn } from "@/lib/utils";
import type { Feature } from "@/types";

interface Props {
  feature: Feature;
  isActive: boolean;
  onClick: () => void;
}

export function FeatureItem({ feature, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 w-full text-left",
        isActive
          ? "bg-gradient-to-r from-violet-500/10 to-blue-500/10 text-violet-700 dark:from-violet-500/20 dark:to-blue-500/20 dark:text-violet-300"
          : "text-gray-600 hover:bg-white/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
      )}
    >
      <span className="flex-1 truncate">{feature.name}</span>
    </button>
  );
}
