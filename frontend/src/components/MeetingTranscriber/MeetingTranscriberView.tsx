import { useState } from "react"
import MeetingTranscriberPresentation from "./MeetingTranscriberPresentation"
import MeetingTranscriberDemo from "./MeetingTranscriberDemo"

interface MeetingTranscriberViewProps {
  onExit?: () => void
}

export default function MeetingTranscriberView(_props: MeetingTranscriberViewProps) {
  const [view, setView] = useState<"presentation" | "demo">("presentation")

  if (view === "demo") {
    return <MeetingTranscriberDemo onBack={() => setView("presentation")} />
  }

  return <MeetingTranscriberPresentation onVisualize={() => setView("demo")} />
}
