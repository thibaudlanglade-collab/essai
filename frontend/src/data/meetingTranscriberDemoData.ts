export interface MeetingExample {
  id: string
  iconName: string
  title: string
  subtitle: string
  description: string
  filePath: string
  fileType: "text" | "audio"
  duration: string
  participantsCount: number
  suggestedInstruction: string
  result: MeetingResult
}

export interface MeetingResult {
  title: string
  date: string
  duration: string
  participantsCount: number
  participants: string[]
  executiveSummary: string[]
  decisions: { decision: string; by: string; deadline?: string }[]
  actions: { action: string; owner: string; deadline: string }[]
  pendingItems: string[]
  keyNumbers?: { label: string; value: string }[]
}

export const MEETING_EXAMPLES: MeetingExample[] = [
  {
    id: "comex",
    iconName: "Briefcase",
    title: "COMEX hebdomadaire",
    subtitle: "Comité de direction · 35 min · 5 participants",
    description: "Réunion de direction d'une PME industrielle : commercial, qualité fournisseur, recrutement, projet ERP",
    filePath: "/demo-meetings/transcription-comex-hebdo.txt",
    fileType: "text",
    duration: "35 minutes",
    participantsCount: 5,
    suggestedInstruction: "Extraire les décisions prises avec leurs responsables, lister toutes les actions à mener avec leurs échéances, identifier les sujets en suspens à traiter la semaine prochaine, et préparer un résumé exécutif de 5 points pour les absents.",
    result: {
      title: "COMEX Hebdomadaire — Industries Durand SAS",
      date: "Lundi 14 avril 2025 · 09h00 - 09h35",
      duration: "35 minutes",
      participantsCount: 5,
      participants: ["Catherine MARTIN (DG)", "Pascal ROUSSEL (DAF)", "Marc DUBOIS (Directeur Production)", "Sophie LAURENT (RH)", "Pierre BERNARD (Directeur Commercial)"],
      executiveSummary: [
        "Q1 en croissance : 2,87 M€ de CA (+12%) mais marge en baisse à 15,5% (vs 18%)",
        "Décision stratégique : fin de la relation avec Vallourec suite à 22% de pièces non-conformes, bascule chez Tubacex",
        "Augmentation tarifaire de 4% sur tous les nouveaux devis à partir du 1er mai",
        "Validation projet ERP Divalto pour 87 000 € HT, démarrage 28 avril, mise en production septembre",
        "Recrutement chef d'équipe ligne 3 en cours : 4 candidats à rencontrer cette semaine pour une prise de poste début juin"
      ],
      decisions: [
        { decision: "Augmentation tarifaire de 4% sur tous les nouveaux devis", by: "Catherine MARTIN", deadline: "À partir du 1er mai" },
        { decision: "Fin de la relation commerciale avec Vallourec", by: "Catherine MARTIN", deadline: "Notification d'ici vendredi" },
        { decision: "Validation du devis Divalto pour le projet ERP (87 000 € HT)", by: "Catherine MARTIN", deadline: "Signature demain matin" },
        { decision: "Démarrage du projet ERP au 28 avril, mise en production en septembre", by: "Catherine MARTIN" },
        { decision: "Sophie LAURENT prend en charge le dossier RSE Airbus", by: "Catherine MARTIN", deadline: "Note de synthèse semaine prochaine" }
      ],
      actions: [
        { action: "Préparer un courrier client pour expliquer la hausse tarifaire de 4%", owner: "Pierre BERNARD", deadline: "Fin de semaine" },
        { action: "Envoyer un courrier officiel à Vallourec pour notifier la fin de la relation", owner: "Marc DUBOIS", deadline: "Vendredi 18 avril" },
        { action: "Acter la commande chez Tubacex en remplacement de Vallourec", owner: "Marc DUBOIS", deadline: "Cette semaine" },
        { action: "Valider le surcoût Tubacex avec l'équipe finance", owner: "Pascal ROUSSEL", deadline: "Cette semaine" },
        { action: "Conduire les entretiens des 4 candidats chef d'équipe ligne 3", owner: "Sophie LAURENT", deadline: "Cette semaine" },
        { action: "Caler les créneaux d'entretien finaux avec Marc", owner: "Sophie LAURENT", deadline: "Demain" },
        { action: "Signer le devis Divalto et lancer le projet ERP", owner: "Pascal ROUSSEL", deadline: "Demain matin" },
        { action: "Préparer le plan de formation des équipes ERP", owner: "Sophie LAURENT", deadline: "Présentation dans 2 semaines" },
        { action: "Étudier le cahier des charges RSE Airbus et préparer une note", owner: "Sophie LAURENT", deadline: "Semaine prochaine" },
        { action: "Déposer la déclaration TVA Q1 avec le cabinet comptable", owner: "Pascal ROUSSEL", deadline: "Avant le 25 avril" }
      ],
      pendingItems: [
        "Plan de formation détaillé pour le déploiement de l'ERP Divalto (à présenter dans 2 semaines)",
        "Réponse complète au cahier des charges RSE d'Airbus (échéance 15 juin)",
        "Validation finale des candidats retenus pour le poste de chef d'équipe ligne 3"
      ],
      keyNumbers: [
        { label: "CA Q1 2025", value: "2,87 M€ (+12%)" },
        { label: "Marge Q1", value: "15,5% (vs 18% précédent)" },
        { label: "Pénalités Q1", value: "47 000 €" },
        { label: "Pièces Vallourec non-conformes", value: "22%" },
        { label: "Surcoût annualisé Tubacex", value: "+35 000 €" },
        { label: "Investissement ERP", value: "87 000 € HT" }
      ]
    }
  },
  {
    id: "projet-client",
    iconName: "Users",
    title: "Point projet client",
    subtitle: "Suivi de projet · 47 min · 4 participants",
    description: "Réunion entre une agence web et son client : avancement, retards, validation maquettes, avenant",
    filePath: "/demo-meetings/transcription-projet-novatek.txt",
    fileType: "text",
    duration: "47 minutes",
    participantsCount: 4,
    suggestedInstruction: "Identifier les engagements pris envers le client (qui, quoi, quand), lister les blocages à lever, extraire les décisions techniques prises, et structurer une note de synthèse à envoyer au client.",
    result: {
      title: "Point Projet — Refonte site web Novatek Solutions",
      date: "Mercredi 16 avril 2025 · 14h00 - 14h47",
      duration: "47 minutes",
      participantsCount: 4,
      participants: ["Isabelle MARCHAND (Cheffe de projet, Digital Craft)", "Thomas LEGRAND (Lead Developer)", "Julie ROUX (UX Designer)", "Pascal ROUSSEL (Client, Novatek)"],
      executiveSummary: [
        "Projet à 75% d'avancement, maquettes desktop validées, intégration React en cours",
        "Retard de 2 semaines sur le module e-commerce (complexité frais de port + intégration Cegid)",
        "Décision de livrer une V1 le 15 mai sans codes promo ni ventes croisées pour respecter le lancement client du 1er juin",
        "Avenant V2 chiffré à 3 750 € HT (5 jours homme) pour livraison fin juin",
        "Formations utilisateurs programmées la semaine du 26 mai sur place chez Novatek"
      ],
      decisions: [
        { decision: "Retours mobile envoyés ce soir, livraison vendredi, validation lundi matin", by: "Pascal ROUSSEL" },
        { decision: "Livraison V1 e-commerce le 15 mai sans codes promo ni ventes croisées", by: "Pascal ROUSSEL" },
        { decision: "Création d'un avenant V2 de 5 jours homme (3 750 € HT) pour livraison fin juin", by: "Pascal ROUSSEL & Isabelle MARCHAND" },
        { decision: "Formations utilisateurs sur site programmées la semaine du 26 mai", by: "Pascal ROUSSEL" },
        { decision: "Audit SEO complet livré en juillet, mission complémentaire éventuelle à discuter ensuite", by: "Isabelle MARCHAND" }
      ],
      actions: [
        { action: "Envoyer les retours sur les maquettes mobile par mail", owner: "Pascal ROUSSEL", deadline: "Ce soir" },
        { action: "Livrer la version finalisée des maquettes mobile", owner: "Julie ROUX", deadline: "Vendredi 18 avril soir" },
        { action: "Valider définitivement les maquettes mobile", owner: "Pascal ROUSSEL", deadline: "Lundi 21 avril matin" },
        { action: "Préparer et envoyer l'avenant V2 pour signature", owner: "Isabelle MARCHAND", deadline: "Demain (jeudi 17 avril)" },
        { action: "Caler les créneaux exacts des formations avec la secrétaire de Pascal", owner: "Isabelle MARCHAND", deadline: "Cette semaine" },
        { action: "Traiter la facture intermédiaire de 11 000 € émise le 13 avril", owner: "DAF de Pascal", deadline: "Dans le délai 30 jours" },
        { action: "Finaliser l'intégration du module e-commerce V1", owner: "Thomas LEGRAND", deadline: "15 mai" },
        { action: "Démarrer la phase d'optimisation SEO après le lancement", owner: "Julie ROUX", deadline: "Courant juin" }
      ],
      pendingItems: [
        "Discussion mission complémentaire SEO après livraison du rapport de juillet",
        "Validation finale du périmètre V2 avant développement (codes promo + ventes croisées)"
      ],
      keyNumbers: [
        { label: "Avancement projet", value: "75%" },
        { label: "Retard module e-commerce", value: "2 semaines" },
        { label: "Coût avenant V2", value: "3 750 € HT (5 jours)" },
        { label: "Facture intermédiaire en cours", value: "11 000 € HT" },
        { label: "Date livraison V1", value: "15 mai 2025" },
        { label: "Date lancement client", value: "1er juin 2025" }
      ]
    }
  },
  {
    id: "production",
    iconName: "Factory",
    title: "Comité production",
    subtitle: "Réunion atelier · 25 min · 6 participants · Audio MP3",
    description: "Comité de production hebdomadaire en atelier : retards de lignes, qualité, sécurité, planning",
    filePath: "/demo-meetings/audio-comite-production.mp3",
    fileType: "audio",
    duration: "25 minutes",
    participantsCount: 6,
    suggestedInstruction: "Lister les problèmes opérationnels remontés, identifier les actions correctives décidées avec responsables et délais, extraire les chiffres clés mentionnés (retards, défauts, capacité), et générer un récap pour le directeur d'usine.",
    result: {
      title: "Comité de Production — Industries Durand SAS",
      date: "Mardi 15 avril 2025 · 08h00 - 08h27",
      duration: "27 minutes",
      participantsCount: 6,
      participants: ["Marc DUBOIS (Directeur Production)", "Karim BENALI (Chef d'équipe ligne 1-2)", "Antoine GARCIA (Chef d'équipe ligne 3-4)", "Julie MARTINEZ (Responsable Qualité)", "François LECOMTE (Responsable Sécurité)", "Nadia FERREIRA (Planificatrice)"],
      executiveSummary: [
        "Capacité globale réduite à 78% cette semaine suite aux problèmes lignes 2 et 4",
        "Casse anormale broche Mazak ligne 2 (18 mois) : prise en charge garantie demandée",
        "Lot 1847 Safran : 11,7% de pièces non-conformes liées aux défauts d'acier Vallourec, retraitement manuel en cours",
        "3 commandes clients décalées (Renault, Safran, Stellantis), commerciaux à informer",
        "Nouvelle procédure cariste à diffuser aux 11 caristes d'ici le 28 avril"
      ],
      decisions: [
        { decision: "Demande de prise en charge garantie pour la broche Mazak cassée", by: "Marc DUBOIS" },
        { decision: "Préparation d'un dossier qualité complet sur les 3 derniers incidents Vallourec", by: "Marc DUBOIS", deadline: "Vendredi 18 avril" },
        { decision: "Retraitement manuel des 28 pièces non-conformes du lot 1847", by: "Marc DUBOIS" },
        { decision: "Contrôle 100% des pièces du lot 1847 (au lieu d'un échantillonnage)", by: "Julie MARTINEZ" },
        { decision: "Diffusion de la nouvelle procédure cariste pendant les tours de relève", by: "François LECOMTE" }
      ],
      actions: [
        { action: "Envoyer mail récap Mazak pour demander prise en charge garantie", owner: "Karim BENALI", deadline: "Aujourd'hui" },
        { action: "Prévenir Pierre (commercial) des 3 décalages de livraison", owner: "Nadia FERREIRA", deadline: "Aujourd'hui" },
        { action: "Préparer le dossier qualité complet Vallourec (3 incidents)", owner: "Julie MARTINEZ", deadline: "Vendredi 18 avril" },
        { action: "Mobiliser 2 compagnons cet après-midi pour le retraitement du lot 1847", owner: "Antoine GARCIA", deadline: "Aujourd'hui après-midi" },
        { action: "Diffuser la nouvelle procédure cariste auprès des équipes ligne 1-2", owner: "Karim BENALI", deadline: "Avant le 28 avril" },
        { action: "Diffuser la nouvelle procédure cariste auprès des équipes ligne 3-4", owner: "Antoine GARCIA", deadline: "Avant le 28 avril" },
        { action: "Confirmer les volontaires pour le redémarrage ligne 3 samedi 19 avril", owner: "Antoine GARCIA", deadline: "Demain" },
        { action: "Formation des 2 opérateurs sur la nouvelle référence Safran", owner: "Sophie LAURENT (RH)", deadline: "Du 21 au 23 avril" }
      ],
      pendingItems: [
        "Retour du technicien Mazak prévu vendredi pour analyser la cause de la casse de broche",
        "Évaluation de la capacité de retour à la nominale après formation des opérateurs Safran (à partir du 24 avril)",
        "Maintenance préventive ligne 3 samedi 19 avril 6h-14h (perte estimée 4h de production)"
      ],
      keyNumbers: [
        { label: "Capacité globale cette semaine", value: "78%" },
        { label: "Capacité ligne 1", value: "94%" },
        { label: "Capacité ligne 2 (avec arrêt)", value: "60%" },
        { label: "Capacité ligne 3", value: "88%" },
        { label: "Pièces non-conformes lot 1847", value: "11,7% (28 sur 240)" },
        { label: "Retard cumulé ligne 4", value: "8% sur 3 semaines" },
        { label: "Caristes à former", value: "11" }
      ]
    }
  }
]

export const MEETING_FEATURES = [
  {
    iconName: "FileAudio",
    title: "Texte ou audio, peu importe",
    description: "Déposez la transcription Teams, ou directement l'enregistrement audio (MP3, M4A, WAV). Synthèse transcrit puis structure. Le résultat est le même : un compte-rendu clair et exploitable."
  },
  {
    iconName: "Link2",
    title: "Connexion Teams native",
    description: "Connectez votre compte Teams une seule fois. Après chaque réunion enregistrée, Synthèse récupère automatiquement la transcription et prépare le compte-rendu. Vous le retrouvez prêt dans votre boîte mail."
  },
  {
    iconName: "CheckCircle2",
    title: "Décisions et actions extraites",
    description: "Synthèse identifie automatiquement les décisions prises et les actions assignées : qui fait quoi, pour quand. Plus jamais de « qui devait faire ça déjà ? » trois semaines plus tard."
  },
  {
    iconName: "Settings2",
    title: "Format de sortie personnalisable",
    description: "Compte-rendu détaillé pour les participants, résumé exécutif pour la direction, plan d'actions pour l'équipe : vous décrivez ce que vous voulez, Synthèse adapte le format à votre demande."
  },
  {
    iconName: "MessageSquare",
    title: "Posté directement dans Teams",
    description: "Une fois validé, le compte-rendu est publié dans le canal Teams concerné. Tous les participants le reçoivent au même moment. Tout le monde repart de la réunion avec la même version des décisions."
  },
  {
    iconName: "Globe",
    title: "Multilingue",
    description: "Réunion en français, anglais, espagnol, italien, allemand ? Synthèse comprend toutes ces langues et peut vous rendre le compte-rendu dans celle de votre choix. Idéal pour les équipes internationales."
  }
]
