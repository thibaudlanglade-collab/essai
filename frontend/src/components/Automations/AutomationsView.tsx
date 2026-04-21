import { useState } from "react"
import AutomatisationsPresentation from "./AutomatisationsPresentation"
import AutomatisationsList from "./AutomatisationsList"

export default function AutomationsView({ onExit: _onExit }: { onExit: () => void }) {
  const [view, setView] = useState<"presentation" | "list">("presentation")

  if (view === "list") {
    return <AutomatisationsList onBack={() => setView("presentation")} />
  }

  return <AutomatisationsPresentation onSeeAutomations={() => setView("list")} />
}
