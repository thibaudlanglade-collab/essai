import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mail,
  Search,
  Star,
  Archive,
  Trash2,
  Paperclip,
  Clock,
  FileText,
  CheckCircle2,
  RotateCw,
  Inbox,
  Send,
  Edit3,
  ArrowLeft,
  Sunrise,
  Sparkles,
  Check,
  type LucideIcon,
} from "lucide-react";
import { DEMO_EMAILS, DEMO_TOPICS, DEMO_USER } from "@/data/emailsDemoData";
import type { DemoEmail } from "@/data/emailsDemoData";
import DemoMorningBriefingModal from "./DemoMorningBriefingModal";

// ── Icon / color maps ────────────────────────────────────────────────────────

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  Clock,
  FileText,
  CheckCircle2,
  RotateCw,
  Archive,
  Calendar: Clock,
};

const BADGE_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-500",
  important: "bg-amber-500",
  normal: "bg-blue-400",
  low: "bg-gray-300",
};

// ── Main component ───────────────────────────────────────────────────────────

export default function DemoMailbox({ onBack }: { onBack: () => void }) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [showBriefing, setShowBriefing] = useState(false);
  const [showDraft, setShowDraft] = useState(false);

  // Auto-open briefing 500ms after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowBriefing(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const selectedEmail = DEMO_EMAILS.find((e) => e.id === selectedEmailId) ?? null;

  const filteredEmails =
    selectedTopic === "all"
      ? DEMO_EMAILS
      : DEMO_EMAILS.filter((e) => e.topic === selectedTopic);

  const handleOpenEmailFromBriefing = (emailId: string) => {
    setSelectedEmailId(emailId);
    setShowBriefing(false);
    const email = DEMO_EMAILS.find((e) => e.id === emailId);
    setShowDraft(!!email?.draft);
  };

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* MORNING BRIEFING MODAL */}
      <DemoMorningBriefingModal
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        onOpenEmail={handleOpenEmailFromBriefing}
      />

      {/* TOPICS SIDEBAR */}
      <div className="w-60 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0">
        {/* User header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {DEMO_USER.email}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Gmail connecté</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Topics list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <button
            onClick={() => setSelectedTopic("all")}
            className={`
              w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-colors
              ${selectedTopic === "all" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}
            `}
          >
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span>Boîte de réception</span>
            </div>
            <span className="text-xs">{DEMO_EMAILS.length}</span>
          </button>

          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Catégories
          </div>

          {DEMO_TOPICS.filter((t) => t.count > 0).map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`
                w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-colors
                ${selectedTopic === topic.id ? "bg-gray-200/70 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-100"}
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color }}
                />
                <span className="truncate">{topic.label}</span>
              </div>
              <span className="text-xs text-gray-400">{topic.count}</span>
            </button>
          ))}
        </div>

        {/* Back button */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la présentation
          </button>
        </div>
      </div>

      {/* EMAIL LIST */}
      <div className="w-96 border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Boîte de réception</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredEmails.filter((e) => !e.isRead).length} non-lus
            </p>
          </div>
          <button
            onClick={() => setShowBriefing(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Sunrise className="h-3.5 w-3.5" />
            Briefing
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmails.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              isSelected={selectedEmailId === email.id}
              onClick={() => {
                setSelectedEmailId(email.id);
                setShowDraft(false);
              }}
            />
          ))}
        </div>
      </div>

      {/* EMAIL DETAIL PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            showDraft={showDraft}
            onToggleDraft={() => setShowDraft(!showDraft)}
          />
        ) : (
          <EmptyEmailState />
        )}
      </div>
    </div>
  );
}

// ── Email row in the list ────────────────────────────────────────────────────

function EmailRow({
  email,
  isSelected,
  onClick,
}: {
  email: DemoEmail;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-5 py-4 border-b border-gray-100 transition-colors
        ${isSelected ? "bg-blue-50/60" : "hover:bg-gray-50"}
        ${!email.isRead ? "bg-white" : "bg-gray-50/30"}
      `}
    >
      <div className="flex items-start gap-2 mb-1.5">
        {/* Priority indicator */}
        <div
          className={`w-1 h-8 rounded-full shrink-0 ${PRIORITY_COLOR[email.priority] ?? "bg-gray-300"} ${email.isRead ? "opacity-30" : ""}`}
        />

        <div className="flex-1 min-w-0">
          {/* Sender + date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}
            >
              {email.from.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {email.hasAttachment && <Paperclip className="h-3 w-3 text-gray-400" />}
              {email.isStarred && (
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              )}
              <span className="text-xs text-gray-500">{email.dateDisplay}</span>
            </div>
          </div>

          {/* Subject */}
          <div
            className={`text-sm truncate mb-1 ${!email.isRead ? "text-gray-900 font-medium" : "text-gray-700"}`}
          >
            {email.subject}
          </div>

          {/* Summary */}
          <div className="text-xs text-gray-500 line-clamp-2 italic">
            {email.summary}
          </div>

          {/* Badges */}
          {email.synthBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {email.synthBadges.map((badge, i) => {
                const Icon = BADGE_ICON_MAP[badge.icon] || Mail;
                const colors = BADGE_COLOR_MAP[badge.color] || BADGE_COLOR_MAP.gray;
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors}`}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {badge.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Fallback drafts for emails that don't have one ───────────────────────────

const FALLBACK_DRAFTS: Record<string, string> = {
  "email-2": `Bonjour,

Bien noté, merci pour ce rappel. Le virement de 1 850 € sera effectué cette semaine depuis notre compte professionnel.

Cordialement,
Jean-Michel Durand
Durand BTP`,
  "email-3": `Bonjour,

Bien reçu, merci. La facture a été transmise à notre comptable pour traitement.

Cordialement,
Jean-Michel Durand`,
  "email-4": `Bonjour,

Merci pour la notification. Le paiement de M. Martin est bien identifié de notre côté.

Cordialement,
Jean-Michel Durand`,
  "email-6": `Bonjour Pierre,

Merci pour votre retour. Prenez le temps de réfléchir, c'est tout à fait normal.

Pour l'électroménager, oui c'est tout à fait possible de le retirer du devis — je peux vous faire une version ajustée sans ces postes. Ça ferait baisser le total d'environ 2 800 €.

N'hésitez pas si vous avez d'autres questions.

Cordialement,
Jean-Michel Durand`,
  "email-7": `Bonjour,

Merci pour l'information. Je passerai en dépôt la semaine prochaine pour voir les offres Milwaukee.

Cordialement,
Jean-Michel Durand`,
  "email-8": `Bonjour,

Merci pour ce rappel. Je vous confirme les informations demandées :
- Activités exercées : maçonnerie générale, rénovation, plomberie
- Chiffre d'affaires 2024 : en cours de calcul, je vous l'envoie avant le 15 mai
- Sinistres : aucun sinistre déclaré sur la période

Cordialement,
Jean-Michel Durand
Durand BTP`,
};

// ── Email detail panel ───────────────────────────────────────────────────────

function EmailDetail({
  email,
  showDraft,
  onToggleDraft,
}: {
  email: DemoEmail;
  showDraft: boolean;
  onToggleDraft: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generationRef = useRef<number | null>(null);

  // The full draft text for this email (from data or fallback)
  const fullDraft = email.draft || FALLBACK_DRAFTS[email.id] || `Bonjour,

Merci pour votre message, bien reçu. Je reviens vers vous rapidement.

Cordialement,
Jean-Michel Durand
Durand BTP`;

  // Reset state when switching emails
  useEffect(() => {
    setReplyText("");
    setIsGenerating(false);
    setIsEditing(false);
    setSendState("idle");
    if (generationRef.current) {
      clearTimeout(generationRef.current);
      generationRef.current = null;
    }
  }, [email.id]);

  // When draft panel opens with pre-existing draft, populate it
  useEffect(() => {
    if (showDraft && email.draft && !replyText && !isGenerating && sendState === "idle") {
      setReplyText(email.draft);
    }
  }, [showDraft, email.draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fake typing generation effect
  const startGeneration = useCallback(() => {
    setIsGenerating(true);
    setReplyText("");
    setSendState("idle");
    setIsEditing(false);

    let charIndex = 0;
    const speed = 12; // ms per character

    const typeNext = () => {
      if (charIndex < fullDraft.length) {
        charIndex++;
        setReplyText(fullDraft.slice(0, charIndex));
        generationRef.current = window.setTimeout(typeNext, speed);
      } else {
        setIsGenerating(false);
        generationRef.current = null;
      }
    };

    generationRef.current = window.setTimeout(typeNext, 400); // small initial delay
  }, [fullDraft]);

  const handleReplyClick = () => {
    onToggleDraft(); // opens the draft panel
    if (!showDraft) {
      // Panel is about to open
      if (email.draft) {
        setReplyText(email.draft);
      } else {
        startGeneration();
      }
    }
  };

  const handleSend = () => {
    if (!replyText.trim()) return;
    setSendState("sending");
    setTimeout(() => {
      setSendState("sent");
    }, 1200);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2 shrink-0">
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <Archive className="h-4 w-4 text-gray-500" />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <Trash2 className="h-4 w-4 text-gray-500" />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <Star
            className={`h-4 w-4 ${email.isStarred ? "text-amber-400 fill-amber-400" : "text-gray-500"}`}
          />
        </button>
        <button
          onClick={handleReplyClick}
          className={`ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            showDraft
              ? "bg-blue-500 text-white"
              : "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 shadow-sm"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {showDraft ? "Masquer la réponse" : "Répondre avec Synthèse"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-3">{email.subject}</h1>

            {/* Synthèse summary card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm text-sm">
                  ✨
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Résumé Synthèse
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{email.summary}</p>
                </div>
              </div>
            </div>

            {/* Sender info */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold text-sm">
                {email.from.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">{email.from.name}</div>
                <div className="text-xs text-gray-500">
                  {email.from.email} · {email.dateDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {email.body}
          </div>

          {/* Attachment */}
          {email.hasAttachment && email.attachmentName && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <Paperclip className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">{email.attachmentName}</span>
            </div>
          )}
        </div>

        {/* Reply / Draft panel */}
        {showDraft && (
          <div className="border-t border-gray-200 bg-blue-50/30 p-6 max-w-3xl">
            {/* Sent confirmation */}
            {sendState === "sent" ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Réponse envoyée
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Votre réponse à {email.from.name} a bien été envoyée.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Edit3 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {isGenerating
                        ? "Synthèse rédige votre réponse..."
                        : "Brouillon préparé par Synthèse"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isGenerating
                        ? "Analyse du contexte et rédaction en cours"
                        : "Relisez, modifiez si besoin, puis envoyez"}
                    </div>
                  </div>
                  {isGenerating && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Génération...
                    </div>
                  )}
                </div>

                {/* Editable / display zone */}
                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={Math.max(8, replyText.split("\n").length + 2)}
                    className="w-full bg-white rounded-xl border border-blue-200 p-5 mb-4 text-sm text-gray-700 leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                ) : (
                  <div
                    className="bg-white rounded-xl border border-blue-200 p-5 mb-4 cursor-text"
                    onClick={!isGenerating ? handleEdit : undefined}
                  >
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                      {replyText}
                      {isGenerating && (
                        <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-text-bottom" />
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={isGenerating || !replyText.trim() || sendState === "sending"}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendState === "sending" ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </button>
                  {!isGenerating && !isEditing && (
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      Modifier
                    </button>
                  )}
                  {!isGenerating && (
                    <button
                      onClick={startGeneration}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RotateCw className="h-4 w-4" />
                      Régénérer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyEmailState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/30">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
          <Mail className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Sélectionnez un email pour le lire</p>
      </div>
    </div>
  );
}
