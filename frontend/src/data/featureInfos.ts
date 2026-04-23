// ============================================================
// Feature Infos — sidebar tooltips and info modals
// ============================================================
// Each entry describes a feature of Synthèse that appears in the
// dashboard sidebar. The `tooltip` is shown on hover of the info
// icon, and the rest is rendered inside <FeatureInfoModal> when
// the user clicks the icon.

export interface FeatureInfo {
  key: string;
  title: string;
  tooltip: string;
  summary: string;
  howItWorks: string[];
  examples: string[];
  status?: "active" | "soon";
  soonLabel?: string;
}

export const FEATURE_INFOS: Record<string, FeatureInfo> = {
  "mon-espace": {
    key: "mon-espace",
    title: "Mon espace",
    tooltip: "Votre tableau de bord personnel : vue d'ensemble de votre activité Synthèse.",
    summary:
      "Mon espace est le point d'entrée de votre version d'essai. Vous y retrouvez en un coup d'œil ce que Synthèse a fait pour vous, les fonctionnalités disponibles et celles à venir.",
    howItWorks: [
      "Connectez-vous avec le code d'accès fourni par Synthèse.",
      "Parcourez les fonctionnalités actives (Smart Extract, Photo → PDF/Excel, Emails, Automatisations, Rapport client).",
      "Les fonctionnalités marquées « Bientôt » arrivent automatiquement dans votre espace à mesure que les sprints avancent.",
    ],
    examples: [
      "Revenir à l'accueil de votre espace après avoir testé une fonctionnalité.",
      "Suivre les jours restants de votre essai de 14 jours.",
      "Accéder rapidement à la déconnexion et à vos informations de compte.",
    ],
  },
  "assistant-synthese": {
    key: "assistant-synthese",
    title: "Assistant Synthèse",
    tooltip: "Un chat IA qui répond à partir de vos propres documents et données.",
    status: "active",
    summary:
      "L'Assistant Synthèse est un chat qui interroge en direct vos données : clients, fournisseurs, devis, factures reçues et emails synchronisés. Vous posez une question en français ; il choisit les bons outils, croise ce qu'il trouve, et vous répond en citant précisément ce qu'il a consulté.",
    howItWorks: [
      "Tapez une question en français naturel (ou cliquez sur une question suggérée).",
      "L'assistant exécute en live les recherches nécessaires — vous voyez les badges « Recherche clients… » / « Recherche devis… » s'afficher avec leurs résultats.",
      "Une réponse structurée s'affiche, avec les sources utilisées en bas et un bouton « Copier » pour la réutiliser.",
    ],
    examples: [
      "« Donne-moi la répartition de mes devis par statut »",
      "« Mme Garcia — donne-moi tout ce que tu sais sur elle »",
      "« J'ai une réunion avec la Mairie demain, fais-moi une synthèse (contact, devis, derniers échanges) »",
      "« Combien je dois à mes fournisseurs ? »",
    ],
  },
  "smart-extract": {
    key: "smart-extract",
    title: "Smart Extract",
    tooltip: "Déposez un document, Synthèse le lit, le classe et l'enregistre au bon endroit.",
    status: "active",
    summary:
      "Smart Extract lit automatiquement vos documents (factures, devis, bons de commande, contrats) et les range dans l'arborescence adaptée à votre activité. Vous relisez, corrigez si besoin, puis validez.",
    howItWorks: [
      "Glissez un PDF, une photo ou collez du texte dans la zone d'analyse.",
      "Synthèse identifie le type de document et en extrait les informations clés (fournisseur, montant, date…).",
      "Le document est classé automatiquement dans le bon dossier — vous pouvez ajuster avant validation.",
    ],
    examples: [
      "Déposer une facture METRO : elle est classée dans Factures/METRO/Avril_2026.",
      "Analyser un contrat pour en extraire les clauses et dates clés.",
      "Traiter un lot de tickets de caisse photographiés depuis le téléphone.",
    ],
  },
  "email-devis": {
    key: "email-devis",
    title: "Email → Devis",
    tooltip: "Un client envoie une demande par email, Synthèse génère le devis prêt à envoyer.",
    status: "soon",
    soonLabel: "Arrive en Sprint 5",
    summary:
      "Email → Devis transforme une demande reçue par email en devis structuré. Synthèse lit la demande, identifie les prestations, applique votre grille tarifaire et prépare un brouillon que vous pouvez relire puis envoyer.",
    howItWorks: [
      "Un email entrant est détecté comme une demande de devis (manuel ou automatique).",
      "Synthèse extrait les besoins du client et rapproche avec votre catalogue.",
      "Un brouillon de devis est généré, que vous validez ou ajustez avant envoi.",
    ],
    examples: [
      "« Bonjour, je voudrais 3 jours de prestation sur mon chantier » → devis pré-rempli avec tarif jour et TVA.",
      "Demande de plusieurs articles depuis un formulaire de contact → devis multi-lignes.",
      "Réponse à un appel d'offres simple à partir du cahier des charges reçu.",
    ],
  },
  "photo-pdf-excel": {
    key: "photo-pdf-excel",
    title: "Photo → PDF / Excel",
    tooltip: "Prenez une photo (note, ticket, tableau) et récupérez un PDF ou un Excel propre.",
    status: "active",
    summary:
      "Photo → PDF / Excel convertit une simple photo (note manuscrite, ticket, tableau, formulaire) en document numérique exploitable. Synthèse lit le contenu, vous corrigez si besoin, puis téléchargez en PDF ou Excel.",
    howItWorks: [
      "Déposez une photo (JPG, PNG, WEBP, HEIC — jusqu'à 20 Mo).",
      "Synthèse reconnaît le texte et la structure (tableau, formulaire, liste).",
      "Vous vérifiez le rendu puis exportez en PDF lisible ou en Excel éditable.",
    ],
    examples: [
      "Photographier un tableau de chantier écrit à la main → Excel prêt à partager.",
      "Transformer un ticket de caisse en PDF classé automatiquement.",
      "Numériser un formulaire rempli à la main pour le réintégrer dans un outil numérique.",
    ],
  },
  transcripteur: {
    key: "transcripteur",
    title: "Transcripteur",
    tooltip: "Enregistrez une réunion, récupérez la transcription et un résumé actionnable.",
    status: "soon",
    soonLabel: "Disponible dans votre version définitive",
    summary:
      "Le Transcripteur enregistre vos réunions (ou transcrit un fichier audio existant) et produit une retranscription complète, un résumé, les décisions prises et les tâches à suivre.",
    howItWorks: [
      "Lancez un enregistrement depuis votre ordinateur ou importez un fichier audio/vidéo.",
      "Synthèse transcrit la conversation en identifiant chaque intervenant.",
      "Vous recevez la retranscription, un résumé, et une liste d'actions associées aux bonnes personnes.",
    ],
    examples: [
      "Réunion client d'une heure → compte-rendu envoyé automatiquement aux participants.",
      "Point interne hebdo → résumé des décisions et tâches dans Synthèse.",
      "Appel commercial → relevé des objections et des engagements pris.",
    ],
  },
  planificateur: {
    key: "planificateur",
    title: "Planificateur",
    tooltip: "Synthèse organise votre semaine et celle de votre équipe à partir de vos contraintes.",
    status: "soon",
    soonLabel: "Disponible dans votre version définitive",
    summary:
      "Le Planificateur construit un planning cohérent à partir de vos contraintes (équipes, disponibilités, priorités clients, urgence). Vous décrivez votre besoin, Synthèse propose un planning que vous pouvez ajuster.",
    howItWorks: [
      "Décrivez la charge à planifier : chantiers, rendez-vous, équipes, contraintes.",
      "Synthèse construit une proposition en respectant les règles que vous avez fixées.",
      "Vous ajustez, validez, puis le planning est diffusé aux bonnes personnes.",
    ],
    examples: [
      "Planifier 5 chantiers sur 3 équipes avec contraintes de matériel.",
      "Organiser une tournée commerciale hebdomadaire par secteur.",
      "Répartir des rendez-vous client en fonction des disponibilités de chaque collaborateur.",
    ],
  },
  emails: {
    key: "emails",
    title: "Emails",
    tooltip: "Votre boîte mail triée automatiquement, avec réponses pré-rédigées.",
    status: "active",
    summary:
      "Synthèse connecte votre boîte mail et la réorganise : priorisation, regroupement par client, brouillons de réponse générés à partir de votre style et de vos documents.",
    howItWorks: [
      "Connectez votre adresse email (Gmail, Outlook…).",
      "Synthèse classe vos emails par priorité (Urgent, Important, Normal, Faible).",
      "Cliquez sur « Répondre avec Synthèse » pour obtenir un brouillon pertinent, basé sur vos échanges passés.",
    ],
    examples: [
      "Identifier en 30 secondes les 3 emails urgents du jour.",
      "Générer un brouillon de réponse à un client qui relance sur un devis.",
      "Rechercher un email précis en langage naturel dans toute votre boîte.",
    ],
  },
  automatisations: {
    key: "automatisations",
    title: "Automatisations",
    tooltip: "Créez des règles « quand ceci, alors cela » pour déléguer vos tâches répétitives.",
    status: "active",
    summary:
      "Les Automatisations vous permettent d'enchaîner des actions sans y penser : quand un email arrive, quand un document est déposé, quand un rendez-vous est ajouté… Synthèse déclenche la suite.",
    howItWorks: [
      "Choisissez un déclencheur (ex : email reçu d'un client, nouveau document ajouté).",
      "Choisissez les actions à enchaîner (classer, répondre, notifier, créer une tâche).",
      "Activez la règle : Synthèse exécute tout automatiquement en arrière-plan.",
    ],
    examples: [
      "Quand une facture PDF arrive par email → la classer dans le bon dossier fournisseur.",
      "Quand un nouveau prospect remplit le formulaire → créer une fiche + envoyer un accusé.",
      "Tous les lundis à 8h → générer et envoyer le rapport de la semaine passée.",
    ],
  },
  connexions: {
    key: "connexions",
    title: "Connexions",
    tooltip: "Branchez Synthèse à vos outils : Drive, CRM, comptabilité, messagerie.",
    status: "soon",
    soonLabel: "Arrive en Sprint 6",
    summary:
      "Les Connexions permettent à Synthèse d'aller chercher l'information directement dans vos outils existants, et d'y déposer ses résultats. Vous travaillez toujours dans vos logiciels habituels.",
    howItWorks: [
      "Depuis l'écran Connexions, choisissez l'outil à brancher (Drive, Gmail, CRM, compta…).",
      "Autorisez l'accès en quelques clics.",
      "Les fonctionnalités de Synthèse peuvent désormais lire et écrire dans cet outil.",
    ],
    examples: [
      "Connecter Google Drive pour que Smart Extract y range vos documents.",
      "Connecter votre CRM pour que l'Assistant puisse répondre à partir de vos fiches clients.",
      "Connecter votre boîte mail pour activer le tri et les brouillons automatiques.",
    ],
  },
  "mes-agents-ia": {
    key: "mes-agents-ia",
    title: "Mes agents IA",
    tooltip: "Des assistants spécialisés que vous configurez pour des missions précises.",
    status: "soon",
    soonLabel: "Arrive en Sprint 5",
    summary:
      "Les agents IA sont des assistants taillés pour un usage précis : relance client, veille, reporting, standardiste. Vous leur donnez une mission et ils travaillent en continu pour vous.",
    howItWorks: [
      "Choisissez un modèle d'agent (relance, veille, reporting, standardiste…) ou partez de zéro.",
      "Donnez-lui sa mission, ses sources et ses règles.",
      "L'agent travaille en autonomie et vous rend compte à la fréquence que vous avez choisie.",
    ],
    examples: [
      "Un agent qui relance chaque semaine les clients avec une facture impayée.",
      "Un agent de veille qui vous résume chaque matin l'actualité de votre secteur.",
      "Un agent qui prépare un brouillon de reporting mensuel à partir de vos données.",
    ],
  },
  "rapport-client": {
    key: "rapport-client",
    title: "Rapport client",
    tooltip: "Une synthèse claire et exportable sur chacun de vos clients, mise à jour en continu.",
    status: "active",
    summary:
      "Le Rapport client rassemble tout ce que Synthèse sait sur un client : échanges, documents, factures, suivi, prochains rendez-vous. Idéal pour préparer un rendez-vous ou transmettre un dossier.",
    howItWorks: [
      "Sélectionnez un client dans votre espace.",
      "Synthèse consolide les documents, emails et événements liés à ce client.",
      "Vous obtenez une synthèse structurée, exportable en PDF, à partager avec votre équipe.",
    ],
    examples: [
      "Préparer un rendez-vous commercial en 2 minutes avec tout l'historique du compte.",
      "Onboarder un nouveau collaborateur sur un client stratégique.",
      "Envoyer un récapitulatif trimestriel à votre client avec toutes les actions menées.",
    ],
  },
  "rgpd-securite": {
    key: "rgpd-securite",
    title: "RGPD / Sécurité",
    tooltip: "Ce que Synthèse fait — et ne fait pas — avec vos données.",
    status: "soon",
    soonLabel: "Page vitrine — Sprint 6",
    summary:
      "Synthèse est conçu pour que vos données restent vos données : hébergement en France, chiffrement, contrôle des accès, traçabilité. Cette page détaille nos engagements RGPD et sécurité.",
    howItWorks: [
      "Vos documents sont chiffrés au repos et en transit.",
      "Vous gardez à tout moment la main pour exporter ou supprimer vos données.",
      "Les accès sont tracés, les traitements documentés — conformes au RGPD.",
    ],
    examples: [
      "Justifier auprès d'un client que son dossier est traité de manière conforme.",
      "Répondre à une demande d'accès RGPD en quelques clics.",
      "Supprimer l'intégralité des données d'un client archivé.",
    ],
  },
  "par-secteur": {
    key: "par-secteur",
    title: "Par secteur",
    tooltip: "Comment Synthèse s'adapte concrètement à votre métier.",
    status: "soon",
    soonLabel: "Page vitrine — Sprint 6",
    summary:
      "Synthèse n'est pas un outil générique : l'arborescence, les automatisations et les agents sont adaptés à votre secteur (BTP, santé, commerce, conseil, associations…).",
    howItWorks: [
      "Vous choisissez votre secteur à l'inscription.",
      "Synthèse charge un espace pré-configuré (dossiers types, règles de classement, modèles de documents).",
      "Vous ajustez à votre réalité pendant les 14 jours d'essai.",
    ],
    examples: [
      "Un artisan du BTP retrouve : Chantiers, Fournisseurs, Devis, Factures.",
      "Un cabinet de conseil retrouve : Missions, Clients, Notes de frais, Livrables.",
      "Une association retrouve : Adhérents, Subventions, Événements, Comptabilité.",
    ],
  },
  "qui-sommes-nous": {
    key: "qui-sommes-nous",
    title: "Qui sommes-nous",
    tooltip: "L'équipe et la mission derrière Synthèse.",
    status: "soon",
    soonLabel: "Page vitrine — Sprint 6",
    summary:
      "Synthèse est une équipe française qui veut rendre le meilleur de l'IA accessible aux TPE/PME, sans complexité technique et sans compromis sur la confidentialité des données.",
    howItWorks: [
      "Une équipe produit basée en France.",
      "Un modèle d'accompagnement (pas juste un outil) avec un interlocuteur dédié.",
      "Des partenaires pour l'hébergement et les modèles IA, tous européens quand c'est possible.",
    ],
    examples: [
      "Savoir à qui vous parlez quand vous demandez une évolution.",
      "Comprendre notre vision à long terme avant de nous confier vos données.",
      "Accéder aux mentions légales et informations société.",
    ],
  },
  "agent-rapport": {
    key: "agent-rapport",
    title: "Agent Rapport client",
    tooltip: "Tapez un nom de client : l'agent IA compile son rapport en quelques secondes.",
    summary:
      "L'agent Rapport client orchestre 4 skills sur vos données réelles pour produire en un clic un rapport synthétique : profil du client, KPIs financiers, devis en cours, derniers échanges et alertes IA.",
    howItWorks: [
      "1. Identification du client (matching tolérant aux fautes sur vos vrais clients).",
      "2. Agrégation des devis et calcul des KPIs (CA YTD, devis en cours, devis acceptés).",
      "3. Lecture des derniers emails liés au client.",
      "4. Génération d'alertes contextuelles par l'IA (paiements en retard, baisse de CA, signaux positifs).",
    ],
    examples: [
      "Préparer une réunion en 5 secondes au lieu de chercher dans 4 outils.",
      "Repérer un client qui décroche avant qu'il ne parte chez la concurrence.",
      "Briefer un commercial avant qu'il n'appelle un compte.",
    ],
  },
  briefing: {
    key: "briefing",
    title: "Briefing du jour",
    tooltip: "Un résumé clair et priorisé de votre journée, généré chaque matin.",
    summary:
      "Chaque matin à 8h, Synthèse passe en revue votre boîte mail et prépare un briefing : ce qui est urgent, ce qui peut attendre, les échéances à venir et les actions déjà effectuées pour vous.",
    howItWorks: [
      "Synthèse analyse les nouveaux emails reçus depuis la veille.",
      "L'IA classe par priorité et identifie les échéances à venir.",
      "Un briefing structuré est généré et disponible dès votre arrivée.",
    ],
    examples: [
      "Voir d'un coup d'œil les 3 priorités de la journée.",
      "Repérer une échéance fiscale ou contractuelle dans les 10 jours.",
      "Savoir que la facture de M. Martin a déjà été rapprochée automatiquement.",
    ],
  },
  "mon-equipe": {
    key: "mon-equipe",
    title: "Mon équipe",
    tooltip: "Vue centralisée de vos employés, leurs compétences et leurs disponibilités.",
    summary:
      "Mon équipe regroupe les fiches de vos collaborateurs : leurs compétences, jours travaillés, indisponibilités et coordonnées. Synthèse s'en sert pour le planificateur et pour adapter ses suggestions.",
    howItWorks: [
      "Ajoutez vos employés (ou importez un CSV).",
      "Renseignez compétences, jours et heures de travail.",
      "Consultez l'emploi du temps hebdomadaire d'un coup d'œil.",
    ],
    examples: [
      "Voir qui est présent le mercredi pour planifier un chantier.",
      "Vérifier les compétences disponibles avant d'accepter une demande client.",
      "Préparer le planning de la semaine en quelques clics.",
    ],
  },
  tarification: {
    key: "tarification",
    title: "Tarification",
    tooltip: "Les formules de Synthèse, claires et sans surprise.",
    status: "soon",
    soonLabel: "Page vitrine — Sprint 6",
    summary:
      "Synthèse propose plusieurs formules selon la taille de votre structure et les fonctionnalités dont vous avez besoin. Tout est inclus : pas de facturation au clic, pas de surcoût caché.",
    howItWorks: [
      "Vous choisissez la formule adaptée à votre équipe.",
      "Un accompagnement est inclus pour la mise en route.",
      "Vous pouvez changer de formule ou résilier à tout moment.",
    ],
    examples: [
      "Formule solo pour un indépendant.",
      "Formule équipe pour une TPE de 5 à 20 personnes.",
      "Formule sur-mesure pour un besoin spécifique ou une PME plus grande.",
    ],
  },
};
