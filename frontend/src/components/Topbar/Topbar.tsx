import { Menu, Plus } from "lucide-react";

interface Props {
  pageTitle: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  onMenuClick?: () => void;
}

export function Topbar({ pageTitle, subtitle, primaryAction, onMenuClick }: Props) {
  return (
    <header className="h-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-b border-violet-100/60 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
      {/* Left: Menu button (mobile) + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
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
      </div>
    </header>
  );
}
