import { useState } from "react";
import { File, FileText, Image, Paperclip, RefreshCw, Sparkles } from "lucide-react";
import {
  type EmailAttachment,
  extractAttachment,
  getAttachmentDownloadUrl,
} from "../../api/emailsClient";
import ExtractResultModal from "./ExtractResultModal";

type ExtractResult = {
  success: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf")
    return <FileText className="h-5 w-5 text-red-400 shrink-0" />;
  if (mimeType.startsWith("image/"))
    return <Image className="h-5 w-5 text-blue-400 shrink-0" />;
  if (mimeType.includes("word") || mimeType.includes("wordprocessingml"))
    return <FileText className="h-5 w-5 text-blue-500 shrink-0" />;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheetml"))
    return <FileText className="h-5 w-5 text-emerald-500 shrink-0" />;
  return <File className="h-5 w-5 text-gray-400 shrink-0" />;
}

type CardProps = {
  attachment: EmailAttachment;
  emailId: number;
  onExtractSuccess?: (result: ExtractResult) => void;
};

function AttachmentCard({ attachment, emailId, onExtractSuccess }: CardProps) {
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const downloadUrl = getAttachmentDownloadUrl(emailId, attachment.id);
  const isPdf = attachment.mime_type === "application/pdf";

  const handleOpen = () => {
    window.open(downloadUrl, "_blank");
  };

  const handleDownload = async () => {
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = attachment.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const result = await extractAttachment(emailId, attachment.id);
      setExtractResult(result);
      setShowModal(true);
      onExtractSuccess?.(result);
    } catch (err) {
      setExtractResult({ success: false, data: null, error: String(err) });
      setShowModal(true);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 flex items-center gap-3 hover:border-gray-300 transition-colors">
        <AttachmentIcon mimeType={attachment.mime_type} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate" title={attachment.filename}>
            {attachment.filename}
          </p>
          <p className="text-xs text-gray-400">{formatBytes(attachment.size_bytes)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpen}
            className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-muted-foreground hover:text-foreground hover:border-gray-300 transition-all"
          >
            Ouvrir
          </button>
          <button
            onClick={() => void handleDownload()}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-muted-foreground hover:border-gray-300 transition-all"
          >
            Télécharger
          </button>
          {isPdf && (
            <button
              onClick={() => void handleExtract()}
              disabled={extracting}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                bg-emerald-50 border border-emerald-200 text-emerald-600
                hover:bg-emerald-100 hover:border-emerald-300
                disabled:opacity-50"
            >
              {extracting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Extraire
            </button>
          )}
        </div>
      </div>
      {showModal && extractResult && (
        <ExtractResultModal
          open={showModal}
          onClose={() => setShowModal(false)}
          result={extractResult}
        />
      )}
    </>
  );
}

type Props = {
  attachments: EmailAttachment[];
  emailId: number;
  onExtractSuccess?: (result: ExtractResult) => void;
};

export default function AttachmentsList({ attachments, emailId, onExtractSuccess }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="border-t border-gray-100 px-6 py-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        Pièces jointes ({attachments.length})
      </h3>
      {attachments.map((att) => (
        <AttachmentCard
          key={att.id}
          attachment={att}
          emailId={emailId}
          onExtractSuccess={onExtractSuccess}
        />
      ))}
    </div>
  );
}
