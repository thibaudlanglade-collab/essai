// ── Demo data for the Emails feature showcase ───────────────────────────────

export interface DemoTopic {
  id: string;
  label: string;
  color: string;
  count: number;
}

export interface DemoEmailFrom {
  name: string;
  email: string;
}

export interface DemoSynthBadge {
  label: string;
  icon: string;
  color: string;
}

export interface DemoEmail {
  id: string;
  from: DemoEmailFrom;
  subject: string;
  preview: string;
  body: string;
  date: string;
  dateDisplay: string;
  isRead: boolean;
  isStarred: boolean;
  topic: string;
  priority: "urgent" | "important" | "normal" | "low";
  summary: string;
  draft: string | null;
  hasAttachment: boolean;
  attachmentName?: string;
  synthBadges: DemoSynthBadge[];
}

export interface DemoBriefingPriority {
  level: "urgent" | "important";
  title: string;
  description: string;
  emailId: string;
  actionLabel: string;
}

export interface DemoBriefingDeadline {
  date: string;
  description: string;
}

export interface DemoBriefingNote {
  icon: string;
  color: string;
  text: string;
}

export interface DemoBriefing {
  date: string;
  time: string;
  greeting: string;
  summary: string;
  stats: {
    newEmails: number;
    urgent: number;
    important: number;
    draftsReady: number;
  };
  priorities: DemoBriefingPriority[];
  deadlines: DemoBriefingDeadline[];
  notes: DemoBriefingNote[];
}

export interface DemoUser {
  email: string;
  name: string;
  company: string;
  connected: boolean;
}

// ── Topics ───────────────────────────────────────────────────────────────────

export const DEMO_TOPICS: DemoTopic[] = [
  { id: "travail-interne", label: "Travail — Interne", color: "#8B5CF6", count: 0 },
  { id: "travail-client", label: "Travail — Client", color: "#10B981", count: 3 },
  { id: "personnel", label: "Personnel", color: "#3B82F6", count: 0 },
  { id: "newsletter", label: "Newsletter", color: "#6B7280", count: 0 },
  { id: "admin-factures", label: "Admin & Factures", color: "#EF4444", count: 3 },
  { id: "promo-marketing", label: "Promo & Marketing", color: "#F59E0B", count: 1 },
  { id: "notifications-systeme", label: "Notifications système", color: "#94A3B8", count: 1 },
  { id: "autre", label: "Autre", color: "#71717A", count: 0 },
];

// ── 8 Demo Emails ────────────────────────────────────────────────────────────

export const DEMO_EMAILS: DemoEmail[] = [
  {
    id: "email-1",
    from: { name: "Catherine Leblanc", email: "catherine.leblanc78@gmail.com" },
    subject: "Demande de devis pour travaux à la maison",
    preview:
      "Bonjour Monsieur Durand, Je me permets de vous écrire suite à la recommandation de Mme Rousseau, votre cliente depuis plusieurs années qui habite au 12 rue des Lilas à Villeneuve-lès-Avignon...",
    body: `Bonjour Monsieur Durand,

Je me permets de vous écrire suite à la recommandation de Mme Rousseau, votre cliente depuis plusieurs années qui habite au 12 rue des Lilas à Villeneuve-lès-Avignon, juste à côté de chez nous. Elle nous a beaucoup parlé de la qualité de votre travail suite à la rénovation de leur cuisine l'année dernière, et nous avons donc décidé de faire appel à vous pour les travaux qu'on envisage.

Pour vous donner un peu de contexte : nous venons d'emménager dans une maison ancienne (1962) au 34 route de Nîmes à Villeneuve-lès-Avignon (30400), et il y a pas mal de travaux à prévoir. Nous aimerions commencer par le plus urgent, qui est la salle de bain. Elle fait environ 8 ou 9 m², et elle est vraiment dans son jus des années 80. On aimerait en faire une salle de bain moderne avec douche italienne, un meuble vasque suspendu, et refaire toute la plomberie.

Côté budget, on a prévu entre 15 000 et 18 000 euros pour ces travaux. Nous aimerions idéalement que les travaux soient terminés avant fin juin.

Je suis disponible tous les après-midi à partir de 14h en semaine, ou samedi matin.

Dans l'attente de votre retour,

Bien cordialement,
Catherine Leblanc
34 route de Nîmes — 30400 Villeneuve-lès-Avignon
06 42 58 91 23
catherine.leblanc78@gmail.com`,
    date: "2025-04-15T09:12:00",
    dateDisplay: "09:12",
    isRead: false,
    isStarred: false,
    topic: "travail-client",
    priority: "important",
    summary:
      "Mme Leblanc souhaite rénover une salle de bain de 8-9 m² à Villeneuve-lès-Avignon, budget 15-18 000 €, urgence fin juin. Recommandée par Mme Rousseau.",
    draft: `Bonjour Madame Leblanc,

Merci beaucoup pour votre message et pour la recommandation de Mme Rousseau. Je serais ravi de venir voir votre salle de bain pour vous préparer un devis précis.

Je suis disponible samedi 19 avril en matinée ou mardi 22 avril à partir de 14h. Quel créneau vous conviendrait le mieux ?

Concernant vos questions :
- Assurance décennale : je vous transmettrai l'attestation MAAF (n° 2024-DEC-4582) dès notre premier échange
- Aides possibles : oui, plusieurs postes peuvent être éligibles (MaPrimeRénov', TVA à 10% sur les travaux de rénovation). Nous en reparlerons lors de la visite.

Dans l'attente de votre retour,
Cordialement,

Jean-Michel Durand
Durand BTP — 04 90 XX XX XX`,
    hasAttachment: false,
    synthBadges: [{ label: "Brouillon de réponse prêt", icon: "Mail", color: "blue" }],
  },
  {
    id: "email-2",
    from: { name: "URSSAF PACA", email: "no-reply@urssaf.fr" },
    subject: "Échéance cotisations Q1 2025 — rappel",
    preview:
      "Nous vous rappelons que votre déclaration de cotisations du premier trimestre 2025 doit être transmise et réglée avant le 25 avril 2025...",
    body: `Monsieur Durand,

Nous vous rappelons que votre déclaration de cotisations du premier trimestre 2025 doit être transmise et réglée avant le 25 avril 2025.

Montant dû : 1 850,00 €
Mode de paiement recommandé : virement bancaire sur le compte habituel

En cas de retard, des majorations seront appliquées conformément à la réglementation en vigueur.

Cordialement,
URSSAF PACA`,
    date: "2025-04-15T08:45:00",
    dateDisplay: "08:45",
    isRead: false,
    isStarred: false,
    topic: "admin-factures",
    priority: "urgent",
    summary: "Échéance URSSAF au 25/04 — cotisations Q1 2025 de 1 850 €. Délai : 10 jours.",
    draft: null,
    hasAttachment: false,
    synthBadges: [{ label: "Échéance dans 10 jours", icon: "Clock", color: "red" }],
  },
  {
    id: "email-3",
    from: { name: "METRO Cash & Carry", email: "facturation@metro.fr" },
    subject: "Facture n°2024-1847 — Échéance 15/04",
    preview:
      "Veuillez trouver ci-joint votre facture n° 2024-1847 d'un montant de 822,91 € TTC, payable par virement bancaire...",
    body: `Bonjour,

Veuillez trouver ci-joint votre facture n° 2024-1847 d'un montant de 822,91 € TTC, payable par virement bancaire avant le 11 avril 2025.

Détail de la facture en pièce jointe (12 lignes de produits alimentaires).

Cordialement,
Service facturation METRO Cash & Carry`,
    date: "2025-04-14T14:30:00",
    dateDisplay: "Hier",
    isRead: true,
    isStarred: false,
    topic: "admin-factures",
    priority: "normal",
    summary:
      "Facture Metro reçue pour 822,91 € TTC, 12 produits alimentaires. Paiement par virement avant le 11 avril.",
    draft: null,
    hasAttachment: true,
    attachmentName: "facture-metro-2024-1847.pdf",
    synthBadges: [
      { label: "Facture détectée — traitée par Smart Extract", icon: "FileText", color: "purple" },
    ],
  },
  {
    id: "email-4",
    from: { name: "Qonto", email: "notifications@qonto.com" },
    subject: "Virement reçu — 4 917,00 €",
    preview:
      "Un virement de 4 917,00 € a été reçu sur votre compte Qonto en provenance de M. MARTIN...",
    body: `Un virement de 4 917,00 € a été reçu sur votre compte Qonto en provenance de M. MARTIN.

Libellé : ACOMPTE DEVIS DEV-2025-0089
Date de valeur : 14/04/2025
Solde après opération : 14 340,00 €

Cette opération a été rapprochée automatiquement avec votre devis signé.

À bientôt,
L'équipe Qonto`,
    date: "2025-04-14T11:23:00",
    dateDisplay: "Hier",
    isRead: false,
    isStarred: false,
    topic: "notifications-systeme",
    priority: "normal",
    summary:
      "Paiement reçu de M. Martin (4 917 €) — acompte devis DEV-2025-0089. Compte crédité.",
    draft: null,
    hasAttachment: false,
    synthBadges: [
      { label: "Paiement identifié — rapproché automatiquement", icon: "CheckCircle2", color: "green" },
    ],
  },
  {
    id: "email-5",
    from: { name: "Sophie Dubois — Mairie Avignon", email: "s.dubois@mairie-avignon.fr" },
    subject: "RE: Travaux salle des fêtes — planning",
    preview:
      "Bonjour M. Durand, Le conseil municipal a validé le budget pour la réhabilitation de la salle des fêtes...",
    body: `Bonjour M. Durand,

Le conseil municipal a validé le budget pour la réhabilitation de la salle des fêtes. Nous aimerions que les travaux démarrent la semaine du 5 mai 2025.

Pouvez-vous me confirmer la disponibilité de votre équipe pour cette date ? Il serait également utile de prévoir une réunion de lancement pour caler les derniers points techniques et logistiques.

Dans l'attente de votre retour,
Cordialement,
Sophie Dubois
Adjointe au maire — Mairie d'Avignon`,
    date: "2025-04-14T10:15:00",
    dateDisplay: "Hier",
    isRead: true,
    isStarred: true,
    topic: "travail-client",
    priority: "important",
    summary:
      "La Mairie valide le budget proposé et demande de démarrer les travaux la semaine du 5 mai. Disponibilité équipe à confirmer.",
    draft: `Bonjour Madame Dubois,

Merci pour ce retour positif. Je confirme que notre équipe peut démarrer les travaux la semaine du 5 mai, comme vous le suggérez.

Je vous propose une réunion de lancement le vendredi 2 mai à 10h en mairie pour caler les derniers détails (accès site, plannings coordonnés, livraisons matériaux).

Bien cordialement,
Jean-Michel Durand`,
    hasAttachment: false,
    synthBadges: [{ label: "Brouillon de réponse prêt", icon: "Mail", color: "blue" }],
  },
  {
    id: "email-6",
    from: { name: "Pierre Bellanger", email: "p.bellanger@free.fr" },
    subject: "Devis cuisine reçu, on va réfléchir",
    preview:
      "Bonjour, Merci pour le devis détaillé pour notre cuisine. Ma femme et moi allons y réfléchir et nous revenons vers vous...",
    body: `Bonjour,

Merci pour le devis détaillé pour notre cuisine. Ma femme et moi allons y réfléchir et nous revenons vers vous assez rapidement.

Je profite du message pour vous demander si le prix est négociable sur certains postes, notamment l'électroménager que nous pouvons peut-être acheter nous-mêmes.

Bonne journée,
Pierre`,
    date: "2025-04-12T16:42:00",
    dateDisplay: "Il y a 3 jours",
    isRead: true,
    isStarred: false,
    topic: "travail-client",
    priority: "normal",
    summary:
      "Client reçoit le devis (15 400 € TTC) et dit qu'il va réfléchir. Aucune date de décision donnée.",
    draft: null,
    hasAttachment: false,
    synthBadges: [{ label: "Relance suggérée dans 7 jours", icon: "RotateCw", color: "amber" }],
  },
  {
    id: "email-7",
    from: { name: "La Plateforme du Bâtiment", email: "newsletter@laplateforme.fr" },
    subject: "Nouveautés outillage — Promos de printemps jusqu'à -40%",
    preview:
      "Découvrez nos nouvelles offres sur l'outillage professionnel : perceuses, scies circulaires, visseuses...",
    body: `[Contenu newsletter promotionnel]

Profitez de nos offres exceptionnelles de printemps :
- Perceuses Bosch Pro : jusqu'à -30%
- Visseuses Makita : jusqu'à -40%
- Scies circulaires DeWalt : à partir de 189 € HT
- Nouveautés Milwaukee en avant-première

Offres valables jusqu'au 30 avril 2025 dans votre dépôt.`,
    date: "2025-04-11T09:00:00",
    dateDisplay: "Il y a 4 jours",
    isRead: true,
    isStarred: false,
    topic: "promo-marketing",
    priority: "low",
    summary: "Newsletter promotionnelle sur l'outillage. Aucune action requise.",
    draft: null,
    hasAttachment: false,
    synthBadges: [
      { label: "Newsletter — archivée automatiquement", icon: "Archive", color: "gray" },
    ],
  },
  {
    id: "email-8",
    from: { name: "MAAF Assurances", email: "pro@maaf.fr" },
    subject: "Renouvellement de votre contrat décennale — échéance 30/06/2025",
    preview:
      "Monsieur Durand, Votre contrat de garantie décennale arrive à échéance le 30/06/2025...",
    body: `Monsieur Durand,

Votre contrat de garantie décennale arrive à échéance le 30/06/2025.

Pour préparer le renouvellement, nous aurions besoin que vous nous confirmiez :
- Les activités réellement exercées sur la dernière période
- Le chiffre d'affaires annuel 2024
- Les sinistres éventuels (aucun sinistre déclaré à notre connaissance)

Merci de nous retourner ces informations avant le 31 mai 2025.

Cordialement,
MAAF Pro — Service assurance entreprises`,
    date: "2025-04-10T14:20:00",
    dateDisplay: "Il y a 5 jours",
    isRead: true,
    isStarred: false,
    topic: "admin-factures",
    priority: "normal",
    summary:
      "MAAF rappelle le renouvellement de la décennale avant le 30/06. Appel à confirmation des activités couvertes.",
    draft: null,
    hasAttachment: false,
    synthBadges: [{ label: "Rappel dans 60 jours", icon: "Calendar", color: "amber" }],
  },
];

// ── Morning Briefing ─────────────────────────────────────────────────────────

export const DEMO_BRIEFING: DemoBriefing = {
  date: "Mercredi 15 avril 2025",
  time: "08:00",
  greeting: "Bonjour.",
  summary:
    "Voici votre journée préparée. 8 nouveaux emails ce matin, 3 demandent votre attention.",
  stats: {
    newEmails: 8,
    urgent: 1,
    important: 2,
    draftsReady: 2,
  },
  priorities: [
    {
      level: "urgent",
      title: "Échéance URSSAF dans 10 jours",
      description:
        "Vos cotisations du premier trimestre 2025 doivent être réglées avant le 25 avril. Montant : 1 850 €. Penser à préparer le virement cette semaine pour ne pas laisser traîner.",
      emailId: "email-2",
      actionLabel: "Ouvrir l'email URSSAF",
    },
    {
      level: "important",
      title: "Demande de devis chaude (recommandation)",
      description:
        "Catherine Leblanc vous a contacté ce matin pour une rénovation salle de bain. Budget 15-18 000 €, urgence fin juin, recommandée par Mme Rousseau (votre cliente). Réponse préparée pour un RDV samedi ou mardi — vous n'avez qu'à valider.",
      emailId: "email-1",
      actionLabel: "Voir le brouillon de réponse",
    },
    {
      level: "important",
      title: "Validation budget mairie d'Avignon",
      description:
        "Sophie Dubois (Mairie) confirme le budget pour la salle des fêtes et demande un démarrage semaine du 5 mai. Réponse préparée proposant une réunion de lancement le 2 mai.",
      emailId: "email-5",
      actionLabel: "Voir le brouillon de réponse",
    },
  ],
  deadlines: [
    { date: "25 avril", description: "Cotisations URSSAF Q1 (1 850 €)" },
    {
      date: "30 juin",
      description: "Renouvellement décennale MAAF — confirmer activités couvertes",
    },
  ],
  notes: [
    {
      icon: "CheckCircle2",
      color: "green",
      text: "**Paiement reçu hier** — M. Martin a versé l'acompte du devis DEV-2025-0089 (**4 917 €**). Rapproché automatiquement avec la facture d'acompte.",
    },
    {
      icon: "RotateCw",
      color: "amber",
      text: "**Relance à programmer** — Pierre Bellanger (devis cuisine 15 400 €) vous a répondu il y a 3 jours pour réfléchir. Relance suggérée dans 4 jours.",
    },
    {
      icon: "Archive",
      color: "gray",
      text: "**Archivé automatiquement** — 1 newsletter promotionnelle (La Plateforme du Bâtiment) sans action requise.",
    },
  ],
};

// ── Fake User ────────────────────────────────────────────────────────────────

export const DEMO_USER: DemoUser = {
  email: "synthese@gmail.com",
  name: "Jean-Michel Durand",
  company: "Durand BTP",
  connected: true,
};
