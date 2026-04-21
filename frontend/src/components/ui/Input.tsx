import type { ComponentProps, ElementType } from "react";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  icon?: ElementType;
  error?: string;
}

export function Input({ label, icon: Icon, error, className, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        <input
          className={`
            w-full px-3 py-2.5 text-sm text-gray-900 bg-white
            border rounded-lg transition-all
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            ${Icon ? "pl-10" : ""}
            ${error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200"}
            ${className ?? ""}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
