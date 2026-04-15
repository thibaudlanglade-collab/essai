import { useState, useEffect, useRef } from "react"
import {
  MessageSquare, Send, Sparkles, User, ArrowLeft,
  Sheet, Database, FolderOpen, Receipt, FileText, Mail,
  TrendingUp, Users as UsersIcon, AlertTriangle, Lightbulb, AlertCircle
} from "lucide-react"
import {
  SUGGESTED_QUESTIONS, SUGGESTED_ANSWERS,
  CONNECTED_SOURCES, ChatMessage, ChatSource, SuggestedQuestion
} from "@/data/chatAssistantDemoData"

const QUESTION_ICON_MAP: Record<string, any> = {
  Receipt, TrendingUp, FileText, Users: UsersIcon, AlertTriangle
}

const SOURCE_ICON_MAP: Record<string, any> = {
  document: FileText,
  spreadsheet: Sheet,
  database: Database,
  email: Mail
}

const SOURCE_BG: Record<string, string> = {
  document: "bg-blue-50 text-blue-700 border-blue-200",
  spreadsheet: "bg-green-50 text-green-700 border-green-200",
  database: "bg-purple-50 text-purple-700 border-purple-200",
  email: "bg-amber-50 text-amber-700 border-amber-200"
}

const CONNECTED_SOURCE_ICON_MAP: Record<string, any> = {
  Sheet, Database, FolderOpen, Receipt
}

interface ChatAssistantDemoProps {
  onBack?: () => void
}

export default function ChatAssistantDemo({ onBack }: ChatAssistantDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isTyping])

  const handleSelectQuestion = async (q: SuggestedQuestion) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q.question
    }
    setMessages([userMessage])
    setIsTyping(true)

    await new Promise(resolve => setTimeout(resolve, 1800))

    const answer = SUGGESTED_ANSWERS[q.id]
    if (answer) {
      setMessages([userMessage, { ...answer, id: `ans-${Date.now()}` }])
    }
    setIsTyping(false)
  }

  const handleSendCustom = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    await new Promise(resolve => setTimeout(resolve, 1500))

    const genericAnswer: ChatMessage = {
      id: `ans-${Date.now()}`,
      role: "assistant",
      content: `Dans la version réelle de Synthèse, je consulterais vos sources connectées (Sheets, base de données, documents, comptabilité) pour répondre précisément à votre question.\n\nPour cette démo, essayez l'une des questions suggérées au démarrage : elles s'appuient sur des données pré-chargées et montrent comment Synthèse répond avec sources citées.`,
      sources: []
    }
    setMessages(prev => [...prev, genericAnswer])
    setIsTyping(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendCustom()
    }
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">

      {/* Top bar with connected sources */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-2 flex-wrap">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mr-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        )}
        <span className="text-xs text-gray-500 mr-1 ml-auto">Sources connectées :</span>
        {CONNECTED_SOURCES.map((s) => {
          const Icon = CONNECTED_SOURCE_ICON_MAP[s.icon] || Database
          return (
            <div
              key={s.id}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200"
            >
              <Icon className="h-3 w-3" />
              {s.label}
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />
            </div>
          )
        })}
      </div>

      {/* MAIN — Chat */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages && !isTyping ? (
            <EmptyState onSelectQuestion={handleSelectQuestion} />
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Posez votre question à Synthèse..."
                className="w-full pl-4 pr-12 py-3.5 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400"
              />
              <button
                onClick={handleSendCustom}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              Synthèse interroge vos sources connectées et cite ses réponses. Vos données restent privées.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== SUB-COMPONENTS =====

function EmptyState({
  onSelectQuestion
}: {
  onSelectQuestion: (q: SuggestedQuestion) => void
}) {
  return (
    <div className="h-full flex items-center justify-center px-6 py-10">
      <div className="max-w-2xl w-full">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-5">
            <Sparkles className="h-7 w-7 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Comment puis-je vous aider ?
          </h2>
          <p className="text-sm text-gray-500">
            Posez votre question, ou choisissez un exemple pour commencer.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">
            Questions suggérées
          </div>
          {SUGGESTED_QUESTIONS.map((q) => {
            const Icon = QUESTION_ICON_MAP[q.icon] || MessageSquare
            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(q)}
                className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-start gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Icon className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {q.question}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {q.category}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%]">
          <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-4">
          <FormattedContent content={message.content} />

          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                Sources
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((s, i) => (
                  <SourceChip key={i} source={s} />
                ))}
              </div>
            </div>
          )}

          {message.insight && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-relaxed">
                {message.insight}
              </p>
            </div>
          )}

          {message.warning && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                {message.warning}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SourceChip({ source }: { source: ChatSource }) {
  const Icon = SOURCE_ICON_MAP[source.type] || FileText
  const colorClass = SOURCE_BG[source.type] || "bg-gray-50 text-gray-700 border-gray-200"

  return (
    <button
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${colorClass} hover:opacity-80 transition-opacity`}
      title={source.detail}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-medium">{source.label}</span>
    </button>
  )
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n")

  return (
    <div className="text-sm text-gray-900 leading-relaxed space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        if (line.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-2 border-blue-300 pl-3 italic text-gray-700 my-2">
              {line.slice(2)}
            </blockquote>
          )
        }

        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <div key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
              }
              return <span key={j}>{part}</span>
            })}
          </div>
        )
      })}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
          <span className="ml-2 text-xs text-gray-500">Synthèse interroge vos sources...</span>
        </div>
      </div>
    </div>
  )
}
