import { useState } from "react"
import PhotoToDocumentPresentation from "./PhotoToDocumentPresentation"
import PhotoToDocumentDemo from "./PhotoToDocumentDemo"

interface PhotoToDocumentViewProps {
  onExit?: () => void
}

export default function PhotoToDocumentView(_props: PhotoToDocumentViewProps) {
  const [view, setView] = useState<"presentation" | "demo">("presentation")

  if (view === "demo") {
    return <PhotoToDocumentDemo onBack={() => setView("presentation")} />
  }

  return <PhotoToDocumentPresentation onVisualize={() => setView("demo")} />
}
