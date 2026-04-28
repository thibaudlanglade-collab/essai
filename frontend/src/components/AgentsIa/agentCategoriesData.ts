import {
  BarChart3,
  FileText,
  Repeat,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

export interface AgentCategoryExample {
  title: string
  scenario: string
}

export interface AgentCategoryDetail {
  id: string
  icon: LucideIcon
  badge: string
  title: string
  /** Short teaser shown on the overview cards. */
  shortExample: string
  /** Optional one-line insight on the overview card. */
  insight?: string
  /** Used to highlight the card visually (réactivation). */
  highlight?: boolean
  /** Single-paragraph hook on the detail page. */
  lead: string
  /** What the agent actually does — bullet points. */
  whatItDoes: string[]
  /** Concrete scenarios. */
  examples: AgentCategoryExample[]
  /** One-sentence quotable promise. */
  punchline: string
  /** Tangible business outcome. */
  benefit: string
}

export const AGENT_CATEGORIES: AgentCategoryDetail[] = [
  {
    id: "speed-to-lead",
    icon: Zap,
    badge: "Réactivité",
    title: "Speed to Lead",
    shortExample:
      "Un prospect vous contacte → réponse instantanée + notification à votre équipe.",
    insight:
      "La vitesse de réponse est le premier facteur de conversion sur un lead web.",
    lead:
      "Quand un prospect vous contacte, chaque minute compte. L’agent Speed to Lead répond en quelques secondes — pendant que vos concurrents dorment encore sur leur boîte mail.",
    whatItDoes: [
      "Détecte instantanément un nouveau lead, peu importe la source (formulaire, email, WhatsApp, Calendly).",
      "Envoie une réponse personnalisée et utile — pas un accusé de réception générique.",
      "Notifie votre équipe sur le canal qu’elle utilise déjà (Slack, WhatsApp, SMS).",
      "Pré-qualifie le prospect : besoin, budget, urgence, secteur — tout est résumé.",
    ],
    examples: [
      {
        title: "Agence immobilière",
        scenario:
          "Un visiteur soumet le formulaire « visite » sur votre site à 22h08. À 22h08m12s, il reçoit un email avec 3 créneaux disponibles. Le lendemain à 8h, vous découvrez un lead chaud déjà engagé.",
      },
      {
        title: "Cabinet d’avocats",
        scenario:
          "Une demande arrive par email. L’agent identifie le type d’affaire, vérifie la disponibilité de l’avocat concerné, propose un appel de 15 minutes. Le client accepte avant que vous n’ayez ouvert votre boîte.",
      },
      {
        title: "B2B SaaS",
        scenario:
          "Demande de démo via Calendly. Avant le rendez-vous, l’agent recherche l’entreprise, prépare une fiche : taille, stack technique, levée de fonds récente. Vous arrivez au call déjà briefé.",
      },
    ],
    punchline:
      "Vos concurrents répondent demain. Vous avez déjà commencé la discussion.",
    benefit:
      "+30 à +50 % de taux de conversion sur les leads web. La 1ʳᵉ entreprise à répondre remporte 50 % des deals.",
  },
  {
    id: "traitement-documents",
    icon: FileText,
    badge: "Documents",
    title: "Traitement de documents",
    shortExample:
      "Factures, devis, PDF, contrats — extraction et classement automatiques.",
    insight:
      "Pas toujours besoin d’IA : parfois, juste automatiser ce que vous faites à la main.",
    lead:
      "Factures, devis, contrats, bons de commande... L’agent lit, comprend, classe et range. Vous ne touchez plus aux PDF.",
    whatItDoes: [
      "Extrait automatiquement les données structurées (montants, dates, références, TVA).",
      "Classe les documents dans les bons dossiers (Drive, GED, comptabilité).",
      "Saisit les écritures dans votre logiciel comptable ou ERP — sans recopier.",
      "Détecte les anomalies : doublons, montants incohérents, échéances dépassées.",
    ],
    examples: [
      {
        title: "PME — Comptabilité",
        scenario:
          "80 factures fournisseurs par mois. L’agent les ouvre, extrait les données, vérifie la TVA, et les pousse directement dans Pennylane. Vous validez en lot, 5 minutes le vendredi.",
      },
      {
        title: "BTP — Suivi de chantier",
        scenario:
          "Bon de livraison photographié sur le chantier. L’agent reconnaît les références, met à jour le suivi des matériaux, alerte si une commande manque.",
      },
      {
        title: "Cabinet d’expertise",
        scenario:
          "15 contrats à analyser par semaine. L’agent extrait les clauses critiques (durée, indemnités, juridiction) et fournit un résumé d’une page par contrat.",
      },
    ],
    punchline: "Vous ne recopiez plus jamais une facture.",
    benefit:
      "Jusqu’à 80 % de temps de saisie économisé. Zéro erreur de transcription.",
  },
  {
    id: "suivi-relance",
    icon: Repeat,
    badge: "Conversion",
    title: "Suivi & relance",
    shortExample:
      "Webinar terminé → séquence de relances → arrêt automatique dès qu’un prospect répond.",
    insight:
      "80 % des ventes nécessitent plusieurs relances. Personne ne les fait toutes.",
    lead:
      "80 % des ventes se font au-delà du 5ᵉ contact. Personne ne fait 5 relances. L’agent, si — et il s’arrête à la seconde où le prospect répond.",
    whatItDoes: [
      "Crée des séquences de relance personnalisées par segment et par canal.",
      "Adapte le ton selon le profil (email court, message LinkedIn, SMS amical).",
      "S’arrête automatiquement dès qu’un prospect répond ou montre un signal négatif.",
      "Détecte les signaux d’intérêt (clics, réponses courtes, ouvertures multiples).",
    ],
    examples: [
      {
        title: "Webinar B2B",
        scenario:
          "100 inscrits, 60 présents. L’agent envoie le replay aux absents, puis 3 emails de valeur sur 2 semaines aux participants engagés. Résultat : 12 RDV pris, sans intervention humaine.",
      },
      {
        title: "Devis non signé",
        scenario:
          "Devis envoyé il y a 7 jours, pas de réponse. L’agent envoie un message court : « Avez-vous des questions sur tel point ? » Si pas de réponse à J+14, propose un appel de 10 min.",
      },
      {
        title: "Coaching / formation",
        scenario:
          "Quelqu’un télécharge votre lead magnet. Sur 4 semaines, il reçoit du contenu calibré sur son problème, puis une invitation à un appel découverte. L’agent arrête tout à la première réponse.",
      },
    ],
    punchline: "Vous n’oubliez plus jamais un prospect intéressé.",
    benefit:
      "+50 % de RDV pris sur la même base de leads, sans en générer de nouveaux.",
  },
  {
    id: "reactivation",
    icon: Users,
    badge: "Base clients",
    title: "Réactivation base clients",
    shortExample:
      "Vous avez un CRM avec une liste de clients ? C’est une mine d’or. On relance vos anciens leads automatiquement, au bon moment, avec le bon message.",
    insight:
      "Un client qui vous connaît déjà est bien plus facile à convaincre qu’un inconnu.",
    highlight: true,
    lead:
      "Vous avez un CRM avec 500, 1 000, 5 000 contacts ? C’est une mine d’or. L’agent va creuser pour vous — sans spammer.",
    whatItDoes: [
      "Identifie les clients dormants et les segmente par pertinence (récence, panier, secteur).",
      "Envoie un message personnalisé selon l’historique d’achat ou de contact.",
      "Réveille les anciens leads non convertis avec une accroche fraîche.",
      "Reprogramme les opérations selon les saisons et cycles métier.",
    ],
    examples: [
      {
        title: "Coiffeur / esthétique",
        scenario:
          "Une cliente n’est pas revenue depuis 6 mois. L’agent envoie un SMS : « Manon, ça fait un moment ! Je vous garde un créneau jeudi 17h ? » Taux de retour observé : 30-40 %.",
      },
      {
        title: "B2B service",
        scenario:
          "200 anciens leads jamais convertis depuis 2 ans. L’agent rédige un message individualisé selon leur secteur et leur dernière objection. 18 RDV reprogrammés en 3 semaines.",
      },
      {
        title: "E-commerce",
        scenario:
          "Un client a commandé 2 fois en 2024 puis plus rien. L’agent envoie un email avec 3 produits cohérents avec son historique + un code de fidélité.",
      },
    ],
    punchline:
      "Vous cherchez des clients dehors alors qu’ils sont déjà chez vous.",
    benefit:
      "Coût d’acquisition divisé par 5 vs leads froids. Vendre à un client existant : 60-70 % de chance de succès, contre 5-20 % pour un prospect.",
  },
  {
    id: "reporting",
    icon: BarChart3,
    badge: "Pilotage",
    title: "Reporting & notifications",
    shortExample:
      "Résumé quotidien des chiffres clés, alertes en temps réel, suivi par email ou WhatsApp.",
    lead:
      "Plus besoin de réunions pour faire le point. L’agent vous tient informé en temps réel — uniquement quand ça compte vraiment.",
    whatItDoes: [
      "Briefing quotidien des chiffres clés (CA, leads, équipe) sur le canal de votre choix.",
      "Alertes en temps réel sur les événements critiques (commande bloquée, client mécontent).",
      "Rapports hebdomadaires automatiques pour vos clients ou votre direction.",
      "Détection proactive : « Vos taux de conversion ont chuté de 12 % cette semaine. »",
    ],
    examples: [
      {
        title: "Dirigeant PME",
        scenario:
          "Chaque matin à 8h, message WhatsApp : « Hier — 3 nouveaux leads, 1 devis signé (4 200 €), 2 livraisons en retard à valider. Aucun client mécontent. »",
      },
      {
        title: "Agence",
        scenario:
          "Lundi 9h, email auto avec dashboard client : campagnes en cours, KPIs, prochaines actions. Le client a tout — sans qu’un junior y passe 4 heures.",
      },
      {
        title: "E-commerce",
        scenario:
          "Notification immédiate dès qu’un avis < 4 étoiles est posté ou qu’une commande > 1 000 € entre. Vous réagissez en 5 minutes, pas en 5 jours.",
      },
    ],
    punchline: "Moins de réunions. Plus de décisions.",
    benefit:
      "Une vision claire de l’activité — sans devoir l’aller chercher. Décisions prises en temps réel, pas en post-mortem.",
  },
]

export function getAgentCategory(id: string): AgentCategoryDetail | undefined {
  return AGENT_CATEGORIES.find((c) => c.id === id)
}
