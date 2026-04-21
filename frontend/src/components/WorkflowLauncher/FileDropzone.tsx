import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  accept?: string;
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}

export default function FileDropzone({ accept, file, onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [disabled, onFile]
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed border-violet-200 dark:border-gray-600 rounded-xl p-10 text-center",
        "hover:border-violet-400 hover:bg-violet-50/30 dark:hover:border-violet-500/50 dark:hover:bg-violet-900/10 transition-all cursor-pointer",
        "group",
        dragging && "border-violet-400 bg-violet-50/30 dark:border-violet-500/50 dark:bg-violet-900/10",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        disabled={disabled}
      />

      {file ? (
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-800/30 dark:to-blue-800/30 border border-violet-200 dark:border-violet-700">
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase">
              {file.name.split(".").pop()}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      ) : (
        <>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100/50 dark:bg-violet-900/20 mb-4 group-hover:bg-violet-100 dark:group-hover:bg-violet-800/30 transition-colors">
            <Upload className="h-6 w-6 text-violet-400 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Glissez votre fichier ici
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ou <span className="text-violet-500 underline">parcourir</span> · PDF, Excel, images
          </p>
        </>
      )}
    </div>
  );
}
