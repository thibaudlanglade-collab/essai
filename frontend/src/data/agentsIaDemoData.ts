export interface AgentModalContent {
  problem: string
  solution: string
  example: string
}

export interface Agent {
  id: string
  iconName: string
  emoji: string
  category: string
  title: string
  shortDescription: string
  metricClaim: string
  status: "available" | "soon"
  modal?: AgentModalContent
}

export const AVAILABLE_AGENTS: Agent[] = [
  {
    id: "nouveau-prospect",
    iconName: "Target",
    emoji: "\u{1F3AF}",
    category: "Commercial",
    title: "Agent Nouveau prospect",
    shortDescription: "Lit l'email d'un nouveau prospect, enrichit le contexte, pr\u00e9pare une r\u00e9ponse personnalis\u00e9e pr\u00eate \u00e0 valider.",
    metricClaim: "Gain de 30 minutes par prospect entrant",
    status: "available",
    modal: {
      problem: "Vous recevez 5 \u00e0 10 demandes de prospects par semaine. Pour chacune, il faut lire l\u2019email, comprendre le besoin, chercher des infos sur l\u2019entreprise, v\u00e9rifier si vous avez d\u00e9j\u00e0 eu un contact, puis r\u00e9diger une r\u00e9ponse personnalis\u00e9e. R\u00e9sultat : 30 minutes par prospect, et certaines demandes finissent par tra\u00eener ou recevoir une r\u00e9ponse standard impersonnelle qui sent le copier-coller \u00e0 3 km.",
      solution: "D\u00e8s qu\u2019un email de prospect arrive, l\u2019agent prend le relais : il lit la demande, recherche l\u2019entreprise sur internet, v\u00e9rifie tout l\u2019historique de contacts dans vos outils, et vous pr\u00e9pare un brouillon de r\u00e9ponse personnalis\u00e9 qui mentionne des \u00e9l\u00e9ments pr\u00e9cis sur leur activit\u00e9. Vous recevez une notification : \u00ab Nouveau prospect chaud, voici le contexte, voici ma r\u00e9ponse, tu valides ? \u00bb. Vous relisez en 2 minutes et vous envoyez.",
      example: "Catherine Leblanc envoie un email pour une r\u00e9novation de salle de bain. L\u2019agent identifie qu\u2019elle est recommand\u00e9e par Mme Rousseau (cliente depuis 3 ans), rep\u00e8re son budget (15-18K) et son d\u00e9lai (fin juin), puis pr\u00e9pare une r\u00e9ponse qui mentionne la recommandation et propose 2 cr\u00e9neaux de visite. Vous validez d\u2019un clic, l\u2019email part. Temps \u00e9conomis\u00e9 : 28 minutes."
    }
  },
  {
    id: "devis",
    iconName: "FileText",
    emoji: "\u{1F4CB}",
    category: "Commercial",
    title: "Agent Devis",
    shortDescription: "R\u00e9dige un devis complet \u00e0 partir d\u2019une simple instruction, l\u2019envoie au client et programme la relance.",
    metricClaim: "5 minutes au lieu de 90 par devis",
    status: "available",
    modal: {
      problem: "Pr\u00e9parer un devis prend 1 \u00e0 2 heures : retrouver la fiche client, v\u00e9rifier les conditions n\u00e9goci\u00e9es, chercher un devis similaire comme r\u00e9f\u00e9rence, calculer les lignes, ajuster la TVA selon le type de prestation, mettre en page proprement, g\u00e9n\u00e9rer le PDF, \u00e9crire l\u2019email, classer le tout, programmer une relance. Multipli\u00e9 par 5 \u00e0 10 devis par semaine, c\u2019est plusieurs jours par mois rien que pour \u00e7a.",
      solution: "Vous dites simplement \u00ab pr\u00e9pare-moi un devis pour Martin pour une r\u00e9novation salle de bain \u00bb. L\u2019agent va chercher la fiche Martin, retrouve vos derniers devis similaires, r\u00e9dige toutes les lignes d\u00e9taill\u00e9es, calcule HT/TVA/TTC selon la bonne fiscalit\u00e9, g\u00e9n\u00e8re un PDF \u00e0 votre charte graphique, et vous le pr\u00e9sente pour validation. Si vous validez : email envoy\u00e9, devis class\u00e9, relance programm\u00e9e \u00e0 J+7. Tout \u00e7a en 5 minutes au lieu de 90.",
      example: "Jean-Michel a sign\u00e9 un devis avec les Martin il y a 6 mois pour leur cuisine. Aujourd\u2019hui ils veulent leur salle de bain. Il dit \u00e0 l\u2019agent \u00ab Devis salle de bain Martin, douche italienne et meuble vasque, environ 8 m\u00b2 \u00bb. 5 minutes plus tard, le devis est sur son \u00e9cran : 7 prestations d\u00e9taill\u00e9es, conditions habituelles des Martin, acompte 30%, total 14 900 \u20ac HT. Validation, envoi, archivage automatique."
    }
  },
  {
    id: "rapport-client",
    iconName: "BarChart3",
    emoji: "\u{1F4CA}",
    category: "Pilotage",
    title: "Agent Rapport client",
    shortDescription: "Pr\u00e9pare un dashboard PDF d\u2019une page sur n\u2019importe quel client, en croisant toutes vos donn\u00e9es.",
    metricClaim: "2 minutes au lieu de 60 par rapport",
    status: "available",
    modal: {
      problem: "Avant chaque r\u00e9union ou rendez-vous client important, vous passez 30 \u00e0 60 minutes \u00e0 fouiller dans vos outils : combien il a command\u00e9 cette ann\u00e9e, o\u00f9 en sont les paiements, qu\u2019est-ce qu\u2019on a livr\u00e9 r\u00e9cemment, y a-t-il eu des probl\u00e8mes signal\u00e9s, quels projets sont en cours. Vous bricolez un r\u00e9cap dans Excel ou sur un coin de table, jamais complet, jamais \u00e0 jour.",
      solution: "Vous dites \u00e0 l\u2019agent \u00ab pr\u00e9pare-moi le bilan de Renault Trucks pour la r\u00e9union de demain \u00bb. Il va chercher tout : commandes de l\u2019ann\u00e9e, montants factur\u00e9s et pay\u00e9s, derniers \u00e9changes email et Teams, probl\u00e8mes remont\u00e9s, projets en cours, derni\u00e8res communications du commercial. Il vous g\u00e9n\u00e8re un dashboard PDF d\u2019une page, propre, pr\u00eat \u00e0 \u00eatre pr\u00e9sent\u00e9 en r\u00e9union. Tous les chiffres sont sourc\u00e9s et cliquables.",
      example: "Vendredi 17h, vous pr\u00e9parez votre lundi matin avec Renault Trucks. Vous demandez le bilan. 2 minutes plus tard : 4 commandes ce mois (147 850 \u20ac HT), 2 livr\u00e9es, 1 en production, 1 en attente. Derni\u00e8re communication de Pierre il y a 3 jours pour une nouvelle gamme. Aucun litige ouvert. Le PDF est pr\u00eat, vous arrivez en r\u00e9union en confiance, pas en panique du dimanche soir."
    }
  },
  {
    id: "support-client",
    iconName: "Headphones",
    emoji: "\u{1F6E0}\uFE0F",
    category: "Commercial",
    title: "Agent Support client",
    shortDescription: "Lit le message d\u2019un client, retrouve son historique, pr\u00e9pare une r\u00e9ponse pr\u00e9cise pr\u00eate \u00e0 envoyer.",
    metricClaim: "45 secondes au lieu de 10 minutes par message",
    status: "available",
    modal: {
      problem: "Vos clients vous \u00e9crivent par email, Teams ou WhatsApp pour des questions r\u00e9p\u00e9titives : \u00ab o\u00f9 en est ma commande ? \u00bb, \u00ab je n\u2019ai pas re\u00e7u la facture \u00bb, \u00ab vous pouvez me renvoyer le devis ? \u00bb, \u00ab quand est pr\u00e9vue la livraison ? \u00bb. Pour r\u00e9pondre correctement, il faut chercher dans 3 outils diff\u00e9rents, v\u00e9rifier l\u2019historique du client, retrouver le bon document, puis r\u00e9diger une r\u00e9ponse. 10 minutes par message, 20 messages par jour, c\u2019est 3 heures par jour rien que l\u00e0-dessus.",
      solution: "Quand un client vous \u00e9crit, l\u2019agent lit son message, identifie son historique complet (commandes, factures, \u00e9changes pr\u00e9c\u00e9dents), va chercher l\u2019information demand\u00e9e dans votre base de connaissance, et pr\u00e9pare une r\u00e9ponse personnalis\u00e9e pr\u00eate \u00e0 \u00eatre envoy\u00e9e. Vous relisez en 30 secondes et vous validez. Le client re\u00e7oit une r\u00e9ponse pr\u00e9cise, rapide, qui montre que vous le connaissez vraiment.",
      example: "M. Bellanger \u00e9crit \u00ab Bonjour, je n\u2019ai pas re\u00e7u ma facture de mars. \u00bb. L\u2019agent v\u00e9rifie : facture envoy\u00e9e le 5 mars \u00e0 14h22 sur son adresse p.bellanger@free.fr, pas d\u2019erreur de remise. Il pr\u00e9pare la r\u00e9ponse : \u00ab Bonjour M. Bellanger, votre facture du 5 mars est jointe \u00e0 ce message. Elle a \u00e9t\u00e9 envoy\u00e9e \u00e0 votre adresse free.fr, peut-\u00eatre tomb\u00e9e dans les ind\u00e9sirables. Bonne r\u00e9ception. \u00bb + facture en pi\u00e8ce jointe. Validation, envoi. Temps r\u00e9el : 45 secondes."
    }
  }
]

export const SOON_AGENTS: Agent[] = [
  {
    id: "recouvrement",
    iconName: "Coins",
    emoji: "\u{1F4B0}",
    category: "Commercial",
    title: "Agent Recouvrement",
    shortDescription: "Identifie les impay\u00e9s, analyse l\u2019historique de chaque client, choisit le bon ton de relance (douce, ferme, mise en demeure) et l\u2019envoie apr\u00e8s votre validation.",
    metricClaim: "",
    status: "soon"
  },
  {
    id: "vigie-business",
    iconName: "AlertCircle",
    emoji: "\u{1F6A8}",
    category: "Pilotage",
    title: "Agent Vigie business",
    shortDescription: "Surveille en silence vos KPI commerciaux, financiers, op\u00e9rationnels. Vous pr\u00e9vient uniquement quand quelque chose m\u00e9rite votre attention.",
    metricClaim: "",
    status: "soon"
  },
  {
    id: "demarrage-projet",
    iconName: "PackageCheck",
    emoji: "\u{1F4E6}",
    category: "Op\u00e9rationnel",
    title: "Agent D\u00e9marrage projet",
    shortDescription: "Vous dites \u00ab on a sign\u00e9 Martin, lance le chantier \u00bb. L\u2019agent encha\u00eene 10 actions automatiquement : dossier, bons de commande, planning, \u00e9quipe, facture acompte.",
    metricClaim: "",
    status: "soon"
  }
]

export const COMPARISON_DATA = {
  automation: {
    title: "Automatisation",
    icon: "Zap",
    color: "amber",
    description: "Suit une r\u00e8gle stricte",
    formula: "Quand X arrive \u2192 fais exactement Y",
    use: "Id\u00e9ale pour les t\u00e2ches r\u00e9p\u00e9titives et identiques",
    example: "Toutes les factures dans le dossier Factures/"
  },
  agent: {
    title: "Agent IA",
    icon: "Bot",
    color: "violet",
    description: "R\u00e9fl\u00e9chit, comprend le contexte",
    formula: "Tu re\u00e7ois \u00e7a \u2192 d\u00e9brouille-toi pour atteindre Z",
    use: "Id\u00e9al pour les t\u00e2ches vari\u00e9es qui demandent du jugement",
    example: "Quand un client envoie une r\u00e9clamation, r\u00e9dige une r\u00e9ponse adapt\u00e9e \u00e0 son historique"
  }
}
