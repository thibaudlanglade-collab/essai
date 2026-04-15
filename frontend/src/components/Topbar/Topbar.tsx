import { Plus, User } from "lucide-react";

interface Props {
  pageTitle: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function Topbar({ pageTitle, subtitle, primaryAction }: Props) {
  return (
    <header className="h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-b border-violet-100/60 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
      {/* Left: Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </button>
        )}
        <button className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-800/30 dark:to-blue-800/30 flex items-center justify-center hover:from-violet-200 hover:to-blue-200 dark:hover:from-violet-700/30 dark:hover:to-blue-700/30 transition-all">
          <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </button>
      </div>
    </header>
  );
}
