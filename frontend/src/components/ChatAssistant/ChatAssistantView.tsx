import { useState } from "react"
import ChatAssistantPresentation from "./ChatAssistantPresentation"
import ChatAssistantDemo from "./ChatAssistantDemo"

interface ChatAssistantViewProps {
  onExit?: () => void
}

export default function ChatAssistantView(_props: ChatAssistantViewProps) {
  const [view, setView] = useState<"presentation" | "demo">("presentation")

  if (view === "demo") {
    return <ChatAssistantDemo onBack={() => setView("presentation")} />
  }

  return <ChatAssistantPresentation onVisualize={() => setView("demo")} />
}
