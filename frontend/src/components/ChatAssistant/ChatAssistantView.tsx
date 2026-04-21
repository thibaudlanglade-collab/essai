import { useEffect, useRef, useState } from "react"
import {
  Send,
  MessageSquare,
  Bot,
  User,
  FileSpreadsheet,
  Database,
  FileText,
  Mail,
} from "lucide-react"

interface ChatAssistantViewProps {
  onExit?: () => void
}

const SUGGESTED_QUESTIONS = [
  "Quelles sont les factures en retard de Vallourec ce trimestre ?",
  "Qui sont nos 5 plus gros clients cette année ?",
  "Résume-moi le contrat Safran et ses pénalités",
  "Prépare-moi un point sur Renault Trucks",
  "Quels fournisseurs ont le plus de non-conformités ?",
]

type SourceType = "database" | "spreadsheet" | "document" | "email"

interface Source {
  label: string
  type: SourceType
}

interface PresetAnswer {
  answer: string
  sources: Source[]
}

const PRESET_ANSWERS: Record<string, PresetAnswer> = {
  "Quelles sont les factures en retard de Vallourec ce trimestre ?": {
    answer:
      "Vallourec a 2 factures en retard ce trimestre :\n\n• FAC-2025-0287 — 34 200 € HT — échéance dépassée de 18 jours\n• FAC-2025-0315 — 12 800 € HT — échéance dépassée de 6 jours\n\nMontant total en retard : 47 000 € HT.\n\nLe délai moyen de paiement de Vallourec est de 42 jours (vs 30 jours contractuels). Une relance a été envoyée le 10/04 par Pierre. Aucune réponse reçue à ce jour.",
    sources: [
      { label: "Base comptabilité", type: "database" },
      { label: "Emails Pierre → Vallourec", type: "email" },
      { label: "Contrat Vallourec 2024", type: "document" },
    ],
  },
  "Qui sont nos 5 plus gros clients cette année ?": {
    answer:
      "Top 5 clients par CA cumulé en 2025 :\n\n1. Renault Trucks — 487 320 € HT (+12% vs 2024)\n2. Safran — 342 100 € HT (-3% vs 2024)\n3. Airbus — 298 750 € HT (+8% vs 2024)\n4. Stellantis — 187 600 € HT (nouveau client)\n5. Michelin — 156 400 € HT (+5% vs 2024)\n\nCA total top 5 : 1 472 170 € HT, soit 68% de votre CA global.",
    sources: [
      { label: "CRM commercial", type: "database" },
      { label: "Tableau suivi CA 2025.xlsx", type: "spreadsheet" },
    ],
  },
  "Résume-moi le contrat Safran et ses pénalités": {
    answer:
      "Contrat Safran — signé le 15/01/2024, valable 2 ans.\n\nPérimètre : fourniture de pièces titane pour le programme LEAP.\n\nConditions clés :\n• Délai de livraison : 4 semaines max après commande\n• Pénalités de retard : 0,5% du montant par jour de retard, plafonnées à 10%\n• Clause qualité : taux de non-conformité < 2% sur 12 mois glissants\n\nSituation actuelle :\n• Taux de non-conformité : 1,3% (conforme)\n• Aucune pénalité appliquée à ce jour\n• Prochaine revue contrat : juillet 2025",
    sources: [
      { label: "Contrat Safran 2024.pdf", type: "document" },
      { label: "Suivi qualité Safran.xlsx", type: "spreadsheet" },
      { label: "CRM commercial", type: "database" },
    ],
  },
  "Prépare-moi un point sur Renault Trucks": {
    answer:
      "Point Renault Trucks — généré le " +
      new Date().toLocaleDateString("fr-FR") +
      "\n\nCA 2025 : 487 320 € HT (+12% vs N-1)\nCommandes en cours : 4 (2 livrées, 1 en production, 1 en attente)\nFactures impayées : 0 — client à jour\nDélai moyen de paiement : 28 jours (stable)\n\nDerniers échanges :\n• 14/04 — Pierre a confirmé la livraison des tubes cuivre\n• 11/04 — Renault demande accélération sur les plaques titane\n• 08/04 — Devis envoyé pour commande spéciale\n\nPoints d'attention :\n• Demande d'accélération sur CMD-2025-0901 (plaques titane) — vérifier planning production\n• Potentiel nouveau marché évoqué par Pierre il y a 3 jours",
    sources: [
      { label: "CRM commercial", type: "database" },
      { label: "Emails Pierre", type: "email" },
      { label: "Suivi commandes.xlsx", type: "spreadsheet" },
      { label: "Facturation 2025", type: "database" },
    ],
  },
  "Quels fournisseurs ont le plus de non-conformités ?": {
    answer:
      "Fournisseurs classés par taux de non-conformité (12 mois glissants) :\n\n1. Vallourec — 22% de non-conformités (sur 45 livraisons)\n   → Problèmes récurrents : dimensions hors tolérance, délais non respectés\n   → Recommandation : envisager remplacement par Tubacex\n\n2. Fonderies du Sud — 8% (sur 24 livraisons)\n   → Problème ponctuel de traitement de surface en février\n\n3. Acier Plus — 3% (sur 67 livraisons)\n   → Conforme, incidents isolés\n\nTous les autres fournisseurs sont sous le seuil de 2%.",
    sources: [
      { label: "Suivi qualité fournisseurs.xlsx", type: "spreadsheet" },
      { label: "Base fournisseurs", type: "database" },
      { label: "Rapports non-conformité", type: "document" },
    ],
  },
}

const SOURCE_STYLES: Record<
  SourceType,
  { bg: string; text: string; Icon: typeof Database }
> = {
  database: { bg: "bg-purple-50", text: "text-purple-700", Icon: Database },
  spreadsheet: { bg: "bg-green-50", text: "text-green-700", Icon: FileSpreadsheet },
  document: { bg: "bg-blue-50", text: "text-blue-700", Icon: FileText },
  email: { bg: "bg-amber-50", text: "text-amber-700", Icon: Mail },
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  sources?: Source[]
}

export default function ChatAssistantView(_props: ChatAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isTyping])

  const sendMessage = (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    const preset = PRESET_ANSWERS[text]

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: preset
          ? preset.answer
          : "Je n'ai pas trouvé cette information dans les données de démonstration. Dans votre version personnalisée, je pourrais interroger vos vrais documents, emails et bases de données pour vous répondre.",
        sources: preset ? preset.sources : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1500 + Math.random() * 1000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
              <MessageSquare className="h-7 w-7 text-violet-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Discuter avec Synthèse
            </h2>
            <p className="text-base text-gray-600 mb-2">
              Posez une question sur vos données. Synthèse interroge vos sources
              et vous répond avec les références.
            </p>
            <p className="text-sm text-violet-600 italic mb-8">
              Comme un collègue qui connaît tous vos dossiers.
            </p>

            <div className="space-y-2 max-w-lg mx-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Essayez une question
              </p>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-violet-500 text-white rounded-2xl rounded-br-md px-4 py-3"
                      : "bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4"
                  }`}
                >
                  <p
                    className={`text-sm whitespace-pre-line leading-relaxed ${
                      msg.role === "user" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, j) => {
                          const style = SOURCE_STYLES[src.type]
                          const SrcIcon = style.Icon
                          return (
                            <span
                              key={j}
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md ${style.bg} ${style.text}`}
                            >
                              <SrcIcon className="h-3 w-3" />
                              {src.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-violet-600 animate-pulse" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-5 py-4">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) sendMessage(input.trim())
            }}
            placeholder="Posez une question sur vos données..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={!input.trim()}
            className="px-4 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
