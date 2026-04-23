import { useEffect, useRef, useState } from "react"
import {
  Send,
  MessageSquare,
  Bot,
  User,
  Mail,
  Search,
  BarChart3,
  AlertCircle,
  Users,
  Truck,
  FileText,
  Receipt,
  FolderOpen,
  Loader2,
  Check,
  Copy,
} from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import { streamChat, type StreamEvent } from "../../api/assistantClient"

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-gray-800 mb-2 last:mb-0">{children}</p>
  ),
  h1: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-gray-900 mt-2 mb-1 first:mt-0">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 text-sm text-gray-800 mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 text-sm text-gray-800 mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-[12px] font-mono">
      {children}
    </code>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-violet-600 underline">
      {children}
    </a>
  ),
}

interface ChatAssistantViewProps {
  onExit?: () => void
}

const SUGGESTED_QUESTIONS = [
  "Donne-moi la répartition de mes devis par statut",
  "Mme Garcia — donne-moi tout ce que tu sais sur elle",
  "J'ai une réunion avec la Mairie de Rochefort-du-Gard demain, fais-moi une synthèse",
  "Quels sont mes 5 plus gros clients en CA accepté ?",
  "Combien je dois à mes fournisseurs ?",
]

type SourceIcon =
  | "search"
  | "mail"
  | "count"
  | "clients"
  | "suppliers"
  | "quotes"
  | "invoices"
  | "drive"

const SOURCE_ICONS: Record<SourceIcon, typeof Search> = {
  search: Search,
  mail: Mail,
  count: BarChart3,
  clients: Users,
  suppliers: Truck,
  quotes: FileText,
  invoices: Receipt,
  drive: FolderOpen,
}

const SOURCE_STYLES: Record<SourceIcon, string> = {
  search: "bg-amber-50 text-amber-700",
  mail: "bg-amber-50 text-amber-700",
  count: "bg-amber-50 text-amber-700",
  clients: "bg-blue-50 text-blue-700",
  suppliers: "bg-orange-50 text-orange-700",
  quotes: "bg-indigo-50 text-indigo-700",
  invoices: "bg-emerald-50 text-emerald-700",
  drive: "bg-sky-50 text-sky-700",
}

interface ToolStep {
  tool: string
  input: Record<string, unknown>
  status: "running" | "ok" | "error"
  summary?: Record<string, unknown>
  errorText?: string
}

interface ChatMessage {
  role: "user" | "assistant" | "error"
  content: string
  steps?: ToolStep[]
}

function iconFor(tool: string): SourceIcon {
  switch (tool) {
    case "search_emails":
      return "search"
    case "read_email":
      return "mail"
    case "count_emails":
      return "count"
    case "search_clients":
      return "clients"
    case "search_suppliers":
      return "suppliers"
    case "search_quotes":
      return "quotes"
    case "search_invoices":
      return "invoices"
    case "search_drive_documents":
      return "drive"
    default:
      return "search"
  }
}

function labelFor(tool: string, input: Record<string, unknown>): string {
  const q = (input.query as string) || ""
  if (tool === "search_emails") {
    const from = (input.from_email as string) || ""
    return q
      ? `Recherche emails : « ${q} »`
      : from
      ? `Emails de ${from}`
      : "Recherche dans les emails"
  }
  if (tool === "read_email") return `Lecture email #${input.email_id ?? ""}`
  if (tool === "count_emails") return "Statistiques emails"
  if (tool === "search_clients") {
    const type = (input.type as string) || ""
    return q
      ? `Clients : « ${q} »`
      : type
      ? `Clients ${type}`
      : "Recherche clients"
  }
  if (tool === "search_suppliers") {
    const city = (input.city as string) || ""
    return q
      ? `Fournisseurs : « ${q} »`
      : city
      ? `Fournisseurs à ${city}`
      : "Recherche fournisseurs"
  }
  if (tool === "search_quotes") {
    const client = (input.client_name as string) || ""
    const status = (input.status as string) || ""
    const parts = [client && `« ${client} »`, status && `statut ${status}`]
      .filter(Boolean)
      .join(" – ")
    return parts ? `Devis ${parts}` : "Recherche devis"
  }
  if (tool === "search_invoices") {
    const supplier = (input.supplier_name as string) || ""
    return supplier ? `Factures ${supplier}` : "Factures fournisseurs"
  }
  if (tool === "search_drive_documents") {
    const mime = (input.mime_type_contains as string) || ""
    return q
      ? `Drive : « ${q} »`
      : mime
      ? `Drive (${mime})`
      : "Recherche Drive"
  }
  return tool
}

function summaryPreview(summary: Record<string, unknown> | undefined): string {
  if (!summary) return ""
  if (summary.ok === false) {
    return typeof summary.error === "string" ? `erreur : ${summary.error}` : "erreur"
  }
  const count = summary.count as number | undefined
  const total =
    (summary.total_ht as number | undefined) ?? (summary.total_ttc as number | undefined)
  if (count !== undefined && total !== undefined && total > 0) {
    return `${count} résultat${count > 1 ? "s" : ""} — ${total.toLocaleString(
      "fr-FR",
    )} €`
  }
  if (count !== undefined) {
    return `${count} résultat${count > 1 ? "s" : ""}`
  }
  return "OK"
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }
  return (
    <button
      onClick={onClick}
      type="button"
      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : "Copier"}
    </button>
  )
}

export default function ChatAssistantView(_props: ChatAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [liveSteps, setLiveSteps] = useState<ToolStep[]>([])
  const [conversationId, setConversationId] = useState<number | undefined>(undefined)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, liveSteps, isStreaming])

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)
    setLiveSteps([])

    let pendingSteps: ToolStep[] = []
    let answer = ""

    const handleEvent = (ev: StreamEvent) => {
      if (ev.type === "conversation") {
        setConversationId(ev.conversation_id)
      } else if (ev.type === "tool_call") {
        pendingSteps = [
          ...pendingSteps,
          { tool: ev.tool, input: ev.input, status: "running" },
        ]
        setLiveSteps([...pendingSteps])
      } else if (ev.type === "tool_result") {
        // Update the last matching running step for this tool
        for (let i = pendingSteps.length - 1; i >= 0; i--) {
          if (pendingSteps[i].tool === ev.tool && pendingSteps[i].status === "running") {
            pendingSteps[i] = {
              ...pendingSteps[i],
              status: ev.summary.ok ? "ok" : "error",
              summary: ev.summary,
              errorText: ev.summary.error as string | undefined,
            }
            break
          }
        }
        setLiveSteps([...pendingSteps])
      } else if (ev.type === "answer") {
        answer = ev.text
      } else if (ev.type === "error") {
        answer = `Je n'ai pas pu te répondre : ${ev.detail}`
      }
    }

    try {
      await streamChat(text, conversationId, handleEvent)
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: answer || "(réponse vide)",
        steps: pendingSteps,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: `Je n'ai pas pu te répondre (${message}). Réessaie dans un instant.`,
          steps: pendingSteps,
        },
      ])
    } finally {
      setIsStreaming(false)
      setLiveSteps([])
    }
  }

  const renderSteps = (steps: ToolStep[] | undefined, compact = false) => {
    if (!steps || steps.length === 0) return null
    return (
      <div
        className={`flex flex-wrap gap-1.5 ${compact ? "mt-3 pt-3 border-t border-gray-100" : ""}`}
      >
        {compact && (
          <p className="basis-full text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
            Sources
          </p>
        )}
        {steps.map((step, j) => {
          const Icon = SOURCE_ICONS[iconFor(step.tool)]
          const style = SOURCE_STYLES[iconFor(step.tool)]
          return (
            <span
              key={j}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md ${style}`}
            >
              {step.status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : step.status === "error" ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span>{labelFor(step.tool, step.input)}</span>
              {step.status === "ok" && (
                <span className="text-gray-500 font-normal">
                  · {summaryPreview(step.summary)}
                </span>
              )}
              {step.status === "error" && (
                <span className="text-red-600 font-normal">· échec</span>
              )}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-5">
              <MessageSquare className="h-7 w-7 text-violet-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Discuter avec Synthèse
            </h2>
            <p className="text-base text-gray-600 mb-2">
              Pose une question sur tes clients, fournisseurs, devis, factures
              ou emails. Synthèse croise tes données et te répond avec les
              sources.
            </p>
            <p className="text-sm text-violet-600 italic mb-8">
              Comme un collègue qui connaît tous tes dossiers.
            </p>

            <div className="space-y-2 max-w-xl mx-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Essaie une question
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
                {msg.role !== "user" && (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                      msg.role === "error" ? "bg-red-100" : "bg-violet-100"
                    }`}
                  >
                    {msg.role === "error" ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Bot className="h-4 w-4 text-violet-600" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] min-w-0 ${
                    msg.role === "user"
                      ? "bg-violet-500 text-white rounded-2xl rounded-br-md px-4 py-3"
                      : msg.role === "error"
                      ? "bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 sm:py-4"
                      : "bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 sm:py-4"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-line leading-relaxed break-words text-white">
                      {msg.content}
                    </p>
                  ) : (
                    <div
                      className={`max-w-none break-words ${
                        msg.role === "error" ? "text-red-800" : "text-gray-800"
                      }`}
                    >
                      <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {renderSteps(msg.steps, true)}
                  {msg.role === "assistant" && (
                    <div className="mt-3 flex justify-end">
                      <CopyButton text={msg.content} />
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

            {/* Live typing bubble while streaming */}
            {isStreaming && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-violet-600 animate-pulse" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 sm:px-5 py-3 sm:py-4 min-w-[120px]">
                  {liveSteps.length === 0 ? (
                    <div className="flex gap-1 items-center h-5">
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
                  ) : (
                    renderSteps(liveSteps)
                  )}
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
              if (e.key === "Enter" && input.trim() && !isStreaming) {
                sendMessage(input.trim())
              }
            }}
            placeholder="Pose une question sur tes données..."
            disabled={isStreaming}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button
            onClick={() =>
              input.trim() && !isStreaming && sendMessage(input.trim())
            }
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
