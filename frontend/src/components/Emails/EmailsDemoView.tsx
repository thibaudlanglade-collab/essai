import { useState } from "react";
import {
  Mail,
  Star,
  Sparkles,
  Paperclip,
  Reply,
} from "lucide-react";

// ── Demo email data ───────────────────────────────────────────────────────────

interface DemoEmail {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  body: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  badge: { label: string; color: string; bgColor: string; borderColor: string };
  ai_summary: string;
  draft_reply?: string;
  has_attachment?: boolean;
}

const DEMO_EMAILS: DemoEmail[] = [
  {
    id: "demo-1",
    from_name: "METRO Cash & Carry",
    from_email: "facturation@metro.fr",
    subject: "Facture FAC-2026-04187 - Échéance 10/05/2026",
    snippet: "Veuillez trouver ci-joint votre facture du 10/04/2026 d'un montant de 551,47 € TTC...",
    body: `Bonjour,

Veuillez trouver ci-joint votre facture FAC-2026-04187 du 10/04/2026.

Montant HT : 513,70 €
TVA : 37,77 €
Montant TTC : 551,47 €

Date d'échéance : 10/05/2026
Mode de règlement : Virement bancaire

Merci de votre confiance.

Cordialement,
Service Facturation METRO
facturation@metro.fr`,
    received_at: "2026-04-14T09:23:00Z",
    is_read: false,
    is_starred: false,
    badge: { label: "Facture détectée", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
    ai_summary: "Facture METRO de 551,47 € TTC pour des achats alimentaires. Échéance le 10 mai 2026. 12 lignes de produits (viande, poisson, épicerie, boissons).",
    has_attachment: true,
  },
  {
    id: "demo-2",
    from_name: "Pierre Duchamp",
    from_email: "p.duchamp@gmail.com",
    subject: "Demande de devis pour anniversaire 40 personnes",
    snippet: "Bonjour, je souhaiterais organiser un anniversaire pour 40 personnes le samedi 17 mai...",
    body: `Bonjour,

Je me permets de vous contacter car j'organise l'anniversaire de ma femme le samedi 17 mai prochain.

Nous serons environ 40 personnes et j'aimerais privatiser votre restaurant pour la soirée (à partir de 19h30).

Pourriez-vous me proposer un menu et un tarif par personne ? Nous avons un budget d'environ 60-70 € par personne boissons comprises.

Il y aura 3 personnes végétariennes et 1 allergie aux noix.

Merci d'avance pour votre retour.

Cordialement,
Pierre Duchamp
06 42 18 95 33`,
    received_at: "2026-04-14T08:45:00Z",
    is_read: false,
    is_starred: true,
    badge: { label: "Réponse suggérée", color: "text-violet-600", bgColor: "bg-violet-50", borderColor: "border-violet-200" },
    ai_summary: "Demande de privatisation pour un anniversaire le 17/05 — 40 personnes, budget 60-70 €/pers. 3 végétariens, 1 allergie noix. Réponse rapide recommandée (événement dans 1 mois).",
    draft_reply: `Bonjour M. Duchamp,

Merci pour votre demande ! C'est avec plaisir que nous vous accueillerons pour cet anniversaire.

Pour 40 personnes en privatisation le samedi 17 mai, je vous propose notre formule « Soirée Privée » à 65 € par personne comprenant :

- Cocktail d'accueil (1h) : 4 pièces salées + 1 coupe de champagne
- Menu en 3 services : entrée, plat, dessert
- Boissons incluses : vin, eau, café
- Gâteau d'anniversaire personnalisé offert

Nous adaptons bien sûr les menus pour vos convives végétariens et pour l'allergie aux noix.

Privatisation de 19h30 à minuit, mise en place et décoration selon vos souhaits.

Souhaitez-vous que nous planifiions un rendez-vous pour en discuter ?

Cordialement,
Restaurant Le Petit Zinc`,
  },
  {
    id: "demo-3",
    from_name: "Qonto",
    from_email: "notifications@qonto.com",
    subject: "Paiement reçu : 2 340,00 € - Dubois Traiteur",
    snippet: "Un virement de 2 340,00 € a été reçu sur votre compte professionnel...",
    body: `Bonjour,

Un nouveau paiement a été crédité sur votre compte :

Émetteur : Dubois Traiteur SARL
Montant : 2 340,00 €
Référence : FAC-2026-0312
Date de valeur : 14/04/2026

Solde actuel : 15 481,37 €

Cordialement,
L'équipe Qonto`,
    received_at: "2026-04-14T07:12:00Z",
    is_read: true,
    is_starred: false,
    badge: { label: "Paiement identifié", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
    ai_summary: "Paiement de 2 340 € reçu de Dubois Traiteur, correspondant à la facture FAC-2026-0312. Nouveau solde : 15 481,37 €.",
  },
  {
    id: "demo-4",
    from_name: "URSSAF Rhône-Alpes",
    from_email: "ne-pas-repondre@urssaf.fr",
    subject: "Rappel : échéance de cotisations le 25/04/2026",
    snippet: "Votre prochaine échéance de cotisations sociales est fixée au 25 avril 2026...",
    body: `Bonjour,

Nous vous rappelons que votre prochaine échéance de cotisations est fixée au 25/04/2026.

Montant à régler : 3 845,00 €
Période : T1 2026
Mode de règlement : Prélèvement automatique

Le prélèvement sera effectué le 25/04/2026 sur le compte bancaire enregistré.

En cas de modification, connectez-vous à votre espace sur urssaf.fr avant le 20/04/2026.

L'URSSAF Rhône-Alpes`,
    received_at: "2026-04-13T14:30:00Z",
    is_read: false,
    is_starred: false,
    badge: { label: "Échéance le 25/04", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
    ai_summary: "Échéance URSSAF de 3 845 € le 25/04/2026 (cotisations T1). Prélèvement automatique prévu. Action requise avant le 20/04 si modification nécessaire.",
  },
  {
    id: "demo-5",
    from_name: "Marie-Claire Fontaine",
    from_email: "mcfontaine@orange.fr",
    subject: "Re: Réservation table de 6 vendredi soir",
    snippet: "Merci pour la confirmation ! Nous viendrons à 20h. Est-ce possible d'avoir la table près...",
    body: `Bonjour,

Merci pour la confirmation de notre réservation vendredi à 20h pour 6 personnes.

Serait-il possible d'avoir la table près de la baie vitrée ? C'est pour fêter les 30 ans de mariage de mes parents.

Si vous avez un petit geste possible pour marquer l'occasion, ce serait merveilleux !

Merci beaucoup,
Marie-Claire Fontaine`,
    received_at: "2026-04-13T11:18:00Z",
    is_read: true,
    is_starred: false,
    badge: { label: "Réponse suggérée", color: "text-violet-600", bgColor: "bg-violet-50", borderColor: "border-violet-200" },
    ai_summary: "Cliente fidèle — réservation confirmée pour 6, vendredi 20h. Demande la table baie vitrée + geste pour 30 ans de mariage de ses parents.",
    draft_reply: `Bonjour Marie-Claire,

Avec plaisir ! Je vous réserve la table 7 près de la baie vitrée, c'est noté.

Pour les 30 ans de mariage de vos parents, nous leur préparerons un dessert spécial avec un petit mot personnalisé de notre chef pâtissière. C'est offert par la maison !

À vendredi soir,
Le Petit Zinc`,
  },
  {
    id: "demo-6",
    from_name: "Transgourmet Livraisons",
    from_email: "livraisons@transgourmet.fr",
    subject: "Confirmation livraison - Commande CMD-88412",
    snippet: "Votre commande CMD-88412 a été expédiée et sera livrée demain entre 6h et 8h...",
    body: `Bonjour,

Votre commande CMD-88412 a été expédiée.

Livraison prévue : mercredi 16/04/2026 entre 6h00 et 8h00
Adresse : 12 rue Mercière, 69002 Lyon
Nombre de colis : 4
Poids total : 47 kg

Contenu :
- Légumes frais de saison (2 caisses)
- Produits laitiers (1 caisse)
- Épicerie sèche (1 carton)

Le livreur vous contactera 30 minutes avant son arrivée.

Cordialement,
Service Livraisons Transgourmet`,
    received_at: "2026-04-13T09:05:00Z",
    is_read: true,
    is_starred: false,
    badge: { label: "Commande confirmée", color: "text-teal-600", bgColor: "bg-teal-50", borderColor: "border-teal-200" },
    ai_summary: "Livraison Transgourmet prévue demain 6h-8h. 4 colis / 47 kg (légumes, produits laitiers, épicerie). Le livreur appellera 30 min avant.",
  },
  {
    id: "demo-7",
    from_name: "Point P",
    from_email: "facturation@pointp.fr",
    subject: "Facture FV-2026-19204 - Fournitures sanitaires",
    snippet: "Ci-joint la facture pour votre commande de fournitures sanitaires du 08/04/2026...",
    body: `Bonjour,

Veuillez trouver ci-joint votre facture FV-2026-19204.

Commande du 08/04/2026
Montant HT : 187,30 €
TVA 20% : 37,46 €
Montant TTC : 224,76 €

Détail :
- Robinet mitigeur cuisine pro x1 : 89,00 €
- Joint silicone alimentaire x3 : 28,50 €
- Flexible inox 50cm x2 : 34,80 €
- Bonde à grille inox x1 : 35,00 €

Échéance : à réception

Cordialement,
Point P Lyon Part-Dieu`,
    received_at: "2026-04-12T16:40:00Z",
    is_read: true,
    is_starred: false,
    badge: { label: "Facture détectée", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
    ai_summary: "Facture Point P de 224,76 € TTC pour fournitures sanitaires (robinet, joints, flexibles). Paiement à réception.",
    has_attachment: true,
  },
];

function demoTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailsDemoView({ onExit }: { onExit: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState(false);

  const selected = DEMO_EMAILS.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Demo banner */}
      <div className="shrink-0 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-700 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">
            Mode démo — explorez comment Synthèse traite vos emails
          </span>
        </div>
        <button
          onClick={onExit}
          className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
        >
          Quitter le mode démo
        </button>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-violet-100/60 dark:border-gray-800 flex items-center px-6 py-3 gap-3 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "Total", value: DEMO_EMAILS.length },
            { label: "Non lus", value: DEMO_EMAILS.filter((e) => !e.is_read).length },
            { label: "Étoilés", value: DEMO_EMAILS.filter((e) => e.is_starred).length },
          ].map(({ label, value }) => (
            <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              {label} <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span>
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 dark:text-gray-500">demo@lepetitzinc.fr · Données exemple</span>
      </div>

      {/* Two-pane layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left pane — email list */}
        <aside className="w-96 min-w-80 border-r border-violet-100/60 dark:border-gray-800 flex flex-col min-h-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto min-h-0">
            {DEMO_EMAILS.map((email) => (
              <button
                key={email.id}
                onClick={() => { setSelectedId(email.id); setShowDraft(false); }}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 ${
                  selectedId === email.id ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                }`}
              >
                <div className="pt-1.5 shrink-0 w-2">
                  {!email.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-sm truncate ${email.is_read ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100 font-semibold"}`}>
                      {email.from_name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {email.is_starred && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                      <span className="text-xs text-gray-400 dark:text-gray-500">{demoTimeAgo(email.received_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{email.subject}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{email.snippet}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${email.badge.color} ${email.badge.bgColor} ${email.badge.borderColor}`}>
                      {email.badge.label}
                    </span>
                    {email.has_attachment && (
                      <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                        <Paperclip className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right pane — email detail */}
        <main className="flex-1 min-h-0 flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          {!selected && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sélectionnez un email à gauche</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                  Chaque email est analysé par Synthèse : classification automatique, résumés, et brouillons de réponse.
                </p>
              </div>
            </div>
          )}

          {selected && (
            <>
              {/* Header */}
              <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-8 py-5">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selected.subject}
                </h2>
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${selected.badge.color} ${selected.badge.bgColor} ${selected.badge.borderColor}`}>
                    <Sparkles className="h-3 w-3" />
                    {selected.badge.label}
                  </span>
                  {selected.has_attachment && (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      <Paperclip className="h-3 w-3" />
                      Pièce jointe
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{selected.from_name}</span>
                    <span className="ml-1 text-gray-400 dark:text-gray-500">&lt;{selected.from_email}&gt;</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(selected.received_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Reply action */}
              {selected.draft_reply && (
                <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 px-8 py-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowDraft(!showDraft)}
                    className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium transition-all
                      bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 shadow-sm"
                  >
                    <Reply className="h-4 w-4" />
                    {showDraft ? "Masquer le brouillon" : "Voir le brouillon Synthèse"}
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto min-h-0 px-8 py-5">
                <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 font-sans leading-relaxed">
                  {selected.body}
                </pre>

                {/* AI Summary */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-700">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Résumé Synthèse</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{selected.ai_summary}</p>
                </div>

                {/* Draft reply */}
                {showDraft && selected.draft_reply && (
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Reply className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Brouillon de réponse préparé par Synthèse</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300 font-sans leading-relaxed">
                      {selected.draft_reply}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
