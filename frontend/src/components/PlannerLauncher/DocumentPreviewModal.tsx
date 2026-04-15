import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface PreviewExample {
  title: string;
  description: string;
  file: string;
}

interface DocumentPreviewModalProps {
  example: PreviewExample | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  example,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !example) return null;

  // Portal to body so modal renders above sidebar, banner, everything
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {example.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {example.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-b-2xl">
          <iframe
            src={example.file}
            className="w-full h-full border-0"
            title={example.title}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
