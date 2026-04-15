// ============================================================
// Chat Assistant Demo Data — Synthèse
// ============================================================

export interface ChatSource {
  type: "document" | "spreadsheet" | "database" | "email"
  label: string
  detail: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: ChatSource[]
  insight?: string
  warning?: string
}

export interface SuggestedQuestion {
  id: string
  question: string
  icon: string
  category: string
}

export interface DemoConversation {
  id: string
  title: string
  category: "today" | "yesterday" | "thisWeek" | "older"
}

export interface ConnectedSource {
  id: string
  label: string
  icon: string
}

// ── Connected Sources ──────────────────────────────────────
export const CONNECTED_SOURCES: ConnectedSource[] = [
  { id: "sheets", label: "Sheets", icon: "Sheet" },
  { id: "database", label: "Database", icon: "Database" },
  { id: "documents", label: "Documents", icon: "FolderOpen" },
  { id: "comptabilite", label: "Comptabilité", icon: "Receipt" },
]

// ── 5 Suggested Questions ──────────────────────────────────
export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "vallourec",
    question: "Quel est l'encours total des factures Vallourec sur les 6 derniers mois ?",
    icon: "Receipt",
    category: "Comptabilité",
  },
  {
    id: "top-clients",
    question: "Quels sont nos 5 plus gros clients par chiffre d'affaires cette année ?",
    icon: "TrendingUp",
    category: "Analyse commerciale",
  },
  {
    id: "contrat-safran",
    question: "Où en est le renouvellement du contrat Safran Helicopter Engines ?",
    icon: "FileText",
    category: "Suivi contrats",
  },
  {
    id: "point-renault",
    question: "Fais-moi un point sur les dernières commandes Renault Trucks.",
    icon: "Users",
    category: "Suivi clients",
  },
  {
    id: "qualite-fournisseurs",
    question: "Y a-t-il des alertes qualité fournisseurs en cours ?",
    icon: "AlertTriangle",
    category: "Qualité",
  },
]

// ── 5 Pre-computed Answers ─────────────────────────────────
export const SUGGESTED_ANSWERS: Record<string, ChatMessage> = {
  vallourec: {
    id: "ans-vallourec",
    role: "assistant",
    content: `J'ai consulté votre comptabilité et vos fichiers Sheets sur les 6 derniers mois pour Vallourec.

**Encours total : 12 487 €** répartis sur 4 factures :

**FAC-VAL-2025-0182** — 3 200 € — échue le 15/01/2025 (payée)
**FAC-VAL-2025-0205** — 4 150 € — échue le 28/02/2025 (payée)
**FAC-VAL-2025-0243** — 2 837 € — échue le 12/03/2025 (en attente)
**FAC-VAL-2025-0271** — 2 300 € — échéance le 30/04/2025 (non échue)

> 2 factures sont réglées, 1 est en attente de paiement depuis 34 jours, et 1 n'est pas encore échue.`,
    sources: [
      { type: "spreadsheet", label: "Suivi facturation 2025.xlsx", detail: "Onglet Vallourec — lignes 42-58" },
      { type: "database", label: "Base comptable", detail: "Table factures — filtre client Vallourec" },
      { type: "document", label: "Contrat-cadre Vallourec.pdf", detail: "Conditions de paiement — article 7" },
    ],
    insight: "La facture 0243 (2 837 €) dépasse de 4 jours le délai contractuel de 30 jours. Un mail de relance pourrait être envoyé cette semaine.",
    warning: "Attention : le contrat-cadre Vallourec arrive à échéance le 30/06/2025. Pensez à anticiper le renouvellement.",
  },

  "top-clients": {
    id: "ans-top-clients",
    role: "assistant",
    content: `Voici le classement de vos 5 plus gros clients par chiffre d'affaires cumulé depuis le 1er janvier 2025 :

**1. Safran Helicopter Engines** — 187 400 € (23 % du CA)
**2. Renault Trucks** — 142 800 € (18 % du CA)
**3. Vallourec** — 98 500 € (12 % du CA)
**4. Airbus Atlantique** — 76 200 € (10 % du CA)
**5. Dassault Aviation** — 61 300 € (8 % du CA)

> Ces 5 clients représentent **71 % de votre chiffre d'affaires total** (566 200 € sur 797 600 €).`,
    sources: [
      { type: "database", label: "Base commerciale", detail: "Vue agrégée CA par client — 2025" },
      { type: "spreadsheet", label: "Dashboard CA 2025.xlsx", detail: "Onglet Synthèse — tableau croisé" },
    ],
    insight: "Safran et Renault Trucks représentent à eux seuls 41 % du CA. Une diversification client pourrait réduire le risque de dépendance.",
  },

  "contrat-safran": {
    id: "ans-contrat-safran",
    role: "assistant",
    content: `Le contrat Safran Helicopter Engines est actuellement en phase de renégociation. Voici le point :

**Contrat actuel** : accord-cadre 3 ans signé le 01/07/2022, échéance le 30/06/2025.
**Montant annuel** : ~185 000 € (en hausse de 12 % vs. le contrat précédent).

**État du renouvellement :**
- Réunion de cadrage tenue le 18/03/2025 avec le service achats Safran.
- Nouvelle proposition commerciale envoyée le 25/03/2025 (+8 % sur les tarifs unitaires).
- Retour attendu de Safran pour le **15/04/2025** (aujourd'hui).
- Point de négociation : Safran demande une clause de révision annuelle indexée sur l'indice ICC.`,
    sources: [
      { type: "document", label: "Proposition commerciale Safran v3.pdf", detail: "Envoyée le 25/03 — 12 pages" },
      { type: "email", label: "RE: Renouvellement contrat-cadre", detail: "Email du 18/03 — J. Dupont (Safran Achats)" },
      { type: "spreadsheet", label: "Historique contrats Safran.xlsx", detail: "Onglet Renouvellement 2025" },
    ],
    insight: "Le retour de Safran était attendu pour aujourd'hui. Il serait judicieux de relancer J. Dupont cet après-midi si vous n'avez pas reçu de réponse.",
    warning: "Si le renouvellement n'est pas finalisé avant le 30/06, une période de transition de 3 mois s'applique (article 14.2 du contrat actuel), mais aux tarifs actuels non revalorisés.",
  },

  "point-renault": {
    id: "ans-point-renault",
    role: "assistant",
    content: `Voici le point sur les dernières commandes Renault Trucks :

**Commandes en cours :**
- **CMD-0421** — Lot de 250 pièces réf. RT-4472 — Livraison prévue le 22/04/2025 — Montant : 18 700 €
- **CMD-0431** — Maintenance préventive site Lyon — Intervention planifiée le 28/04/2025 — Montant : 4 200 €

**Dernières commandes livrées :**
- CMD-0398 — Livrée le 02/04/2025 — 12 500 € — **Payée**
- CMD-0407 — Livrée le 08/04/2025 — 8 900 € — **En attente de paiement**

> CA cumulé Renault Trucks depuis janvier : **142 800 €** (2e client).`,
    sources: [
      { type: "database", label: "Base commandes", detail: "Filtre client Renault Trucks — commandes 2025" },
      { type: "spreadsheet", label: "Planning livraisons avril.xlsx", detail: "Lignes 12-15" },
      { type: "document", label: "BL-0398.pdf", detail: "Bon de livraison signé le 02/04" },
      { type: "email", label: "Confirmation CMD-0431", detail: "Email du 10/04 — S. Bernard (Renault)" },
    ],
    insight: "La commande CMD-0407 livrée il y a 7 jours n'est toujours pas réglée. Le délai contractuel est de 15 jours — à surveiller.",
  },

  "qualite-fournisseurs": {
    id: "ans-qualite-fournisseurs",
    role: "assistant",
    content: `J'ai analysé les données qualité fournisseurs sur les 30 derniers jours. **2 alertes actives** :

**Alerte 1 — Fournisseur MetalPro (critique)**
- Non-conformité détectée le 03/04/2025 sur le lot LP-2025-0892.
- Pièces réf. MP-330 : 12 % du lot hors tolérance dimensionnelle.
- Impact : retard de 5 jours sur la commande CMD-0421 (Renault Trucks).
- Action corrective demandée le 05/04, réponse reçue le 10/04 — nouveau lot en production.

**Alerte 2 — Fournisseur ChimiFrance (mineur)**
- Retard de livraison récurrent : 3 livraisons sur 5 en retard de 2-4 jours depuis février.
- Pas d'impact qualité produit, mais tension sur le planning de production.
- Réunion qualité prévue le 18/04/2025.

> Taux de conformité global fournisseurs (30 jours) : **94,2 %** (objectif : 97 %).`,
    sources: [
      { type: "database", label: "Base qualité", detail: "Incidents ouverts — 30 derniers jours" },
      { type: "document", label: "Rapport NC MetalPro LP-0892.pdf", detail: "Non-conformité du 03/04" },
      { type: "spreadsheet", label: "Suivi livraisons fournisseurs.xlsx", detail: "Onglet ChimiFrance" },
    ],
    insight: "Le taux de conformité est passé sous l'objectif de 97 %. L'alerte MetalPro impacte directement la commande Renault Trucks CMD-0421 — à suivre de près.",
    warning: "Si le nouveau lot MetalPro n'est pas livré d'ici le 18/04, le retard sur CMD-0421 pourrait passer de 5 à 10 jours. Prévenir le client Renault Trucks en amont serait prudent.",
  },
}

// ── 8 Demo Conversations (sidebar) ────────────────────────
export const DEMO_CONVERSATIONS: DemoConversation[] = [
  { id: "conv-1", title: "Factures Vallourec en retard", category: "today" },
  { id: "conv-2", title: "Prévisions CA T2 2025", category: "today" },
  { id: "conv-3", title: "Suivi commande Renault Trucks", category: "yesterday" },
  { id: "conv-4", title: "Relance fournisseur MetalPro", category: "yesterday" },
  { id: "conv-5", title: "Point contrat Safran", category: "thisWeek" },
  { id: "conv-6", title: "Analyse marges par produit", category: "thisWeek" },
  { id: "conv-7", title: "Rapport qualité mensuel", category: "thisWeek" },
  { id: "conv-8", title: "Budget prévisionnel 2025", category: "older" },
]

// ── Features (for presentation page) ──────────────────────
export const CHAT_FEATURES = [
  {
    iconName: "MessageSquare",
    title: "Conversation naturelle",
    description:
      "Posez vos questions comme à un collègue. Synthèse comprend le contexte et répond de manière précise et structurée.",
  },
  {
    iconName: "Database",
    title: "Sources multiples connectées",
    description:
      "Sheets, bases de données, documents, comptabilité : Synthèse interroge toutes vos sources en une seule question.",
  },
  {
    iconName: "FileText",
    title: "Réponses sourcées et vérifiables",
    description:
      "Chaque réponse cite ses sources. Vous savez exactement d'où vient l'information et pouvez la vérifier.",
  },
  {
    iconName: "Lightbulb",
    title: "Insights et alertes automatiques",
    description:
      "Synthèse détecte les anomalies, les retards et les opportunités, et vous alerte proactivement.",
  },
  {
    iconName: "Shield",
    title: "Données sécurisées",
    description:
      "Vos documents et conversations restent privés. Aucune donnée n'est utilisée pour entraîner des modèles externes.",
  },
  {
    iconName: "History",
    title: "Mémoire de contexte",
    description:
      "Synthèse se souvient de vos échanges précédents et de vos préférences pour des réponses toujours plus pertinentes.",
  },
]
