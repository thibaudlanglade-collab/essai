import { useState } from "react"
import PlanificateurPresentation from "./PlanificateurPresentation"
import TeamPlannerDemo from "./TeamPlannerDemo"

interface Props {
  onExit?: () => void
}

export default function TeamPlannerView(_props: Props) {
  const [view, setView] = useState<"presentation" | "demo">("presentation")

  if (view === "demo") {
    return <TeamPlannerDemo onBack={() => setView("presentation")} />
  }

  return <PlanificateurPresentation onVisualize={() => setView("demo")} />
}
