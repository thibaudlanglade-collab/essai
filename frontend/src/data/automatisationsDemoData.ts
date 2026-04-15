export interface AutomationExecution {
  status: "success" | "warning" | "error"
  date: string
  time: string
  source: string
  detail: string
  action: string
}

export interface Automation {
  id: string
  iconName: string
  iconColor: string
  iconBg: string
  title: string
  description: string
  triggerLabel: string
  triggerValue: string
  status: "active" | "paused"
  activeSince: string
  config: { label: string; value: string }[]
  plainText: string
  history: AutomationExecution[]
  totalExecutions: number
  successRate: number
}

export const AUTOMATIONS: Automation[] = [
  {
    id: "email-factures",
    iconName: "Mail",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    title: "Surveillance emails — Factures",
    description: "Surveille votre boîte mail et range automatiquement les factures dans le bon dossier",
    triggerLabel: "Déclencheur",
    triggerValue: "Nouvel email reçu avec pièce jointe",
    status: "active",
    activeSince: "5 mars 2025",
    config: [
      { label: "Boîte surveillée", value: "synthese@gmail.com" },
      { label: "Fréquence de vérification", value: "Toutes les 5 minutes" },
      { label: "Détection", value: "Pièces jointes PDF + mots-clés « facture », « invoice », « avoir »" },
      { label: "Dossier de destination", value: "C:\\Synthese\\Factures\\<année>-<mois>\\" },
      { label: "Renommage automatique", value: "Activé (FAC-<fournisseur>-<numéro>.pdf)" },
      { label: "Notification bureau", value: "Activée (popup discret)" }
    ],
    plainText: "Dès qu'un email contenant une facture arrive dans la boîte synthese@gmail.com, Synthèse extrait la pièce jointe PDF, la renomme intelligemment (en utilisant le nom du fournisseur et le numéro de facture), et la déplace dans le dossier Factures de votre bureau, classée par mois.",
    totalExecutions: 47,
    successRate: 98,
    history: [
      { status: "success", date: "14/04/2025", time: "09:23", source: "Email METRO Cash & Carry", detail: "Facture 822,91 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "13/04/2025", time: "14:50", source: "Email Vallourec", detail: "Facture VAL-2025-0271 · 2 337,00 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "12/04/2025", time: "11:12", source: "Email EDF Pro", detail: "Facture 387,42 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "11/04/2025", time: "16:33", source: "Email URSSAF PACA", detail: "Facture 1 850,00 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "10/04/2025", time: "08:47", source: "Email Orange Pro", detail: "Facture 142,80 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "09/04/2025", time: "15:21", source: "Email Point P", detail: "Facture matériaux · 3 248,60 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "warning", date: "09/04/2025", time: "10:05", source: "Email « Re: facture »", detail: "Pas de pièce jointe détectée", action: "Email ignoré, conservé dans la boîte" },
      { status: "success", date: "08/04/2025", time: "14:18", source: "Email Free Pro", detail: "Facture 89,90 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "07/04/2025", time: "09:55", source: "Email Qonto", detail: "Frais bancaires · 29,00 €", action: "Déplacée dans /Factures/2025-04/" },
      { status: "success", date: "05/04/2025", time: "11:42", source: "Email Vallourec", detail: "Facture VAL-2025-0263 · 4 100,00 €", action: "Déplacée dans /Factures/2025-04/" }
    ]
  },

  {
    id: "extraction-dossier",
    iconName: "FolderInput",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
    title: "Extraction auto sur dépôt dossier",
    description: "Surveille un dossier sur votre ordinateur. Tout document déposé est analysé, renommé et rangé automatiquement",
    triggerLabel: "Déclencheur",
    triggerValue: "Nouveau fichier déposé dans le dossier",
    status: "active",
    activeSince: "1er mars 2025",
    config: [
      { label: "Dossier surveillé", value: "C:\\Synthese\\Inbox\\" },
      { label: "Fréquence de vérification", value: "En temps réel" },
      { label: "Types de fichiers", value: "PDF, Word, Excel, images (JPG, PNG)" },
      { label: "Action 1", value: "Analyse du contenu (Smart Extract)" },
      { label: "Action 2", value: "Renommage intelligent selon le type" },
      { label: "Action 3", value: "Déplacement dans le bon dossier de destination" },
      { label: "Notification bureau", value: "Activée" }
    ],
    plainText: "Tout fichier déposé dans le dossier C:\\Synthese\\Inbox\\ est immédiatement analysé par Synthèse. Selon son contenu (devis, contrat, facture, compte-rendu, photo de note), il est renommé intelligemment et rangé dans le bon sous-dossier de votre arborescence.",
    totalExecutions: 134,
    successRate: 96,
    history: [
      { status: "success", date: "14/04/2025", time: "17:18", source: "devis-renovation-villa.pdf", detail: "Type : devis client (Bernard / Villa)", action: "Renommé DEV-2025-0124-Bernard-Villa.pdf · Rangé dans /Devis/2025-04/" },
      { status: "success", date: "14/04/2025", time: "14:32", source: "contrat-novatek-signe.pdf", detail: "Type : contrat signé", action: "Renommé CON-2025-NOVATEK-signe-14-04.pdf · Rangé dans /Contrats/Novatek/" },
      { status: "success", date: "13/04/2025", time: "10:08", source: "scan001.pdf", detail: "Type détecté : devis client (M. Martin)", action: "Renommé DEV-2025-0123-Martin-SDB.pdf · Rangé dans /Devis/2025-04/" },
      { status: "success", date: "12/04/2025", time: "16:45", source: "IMG_4521.jpg", detail: "Photo de note manuscrite · Conversion PDF", action: "Renommée NOTE-RDV-Leblanc-12-04.pdf · Rangée dans /Notes-RDV/2025-04/" },
      { status: "success", date: "12/04/2025", time: "09:30", source: "facture-fournisseur-mars.pdf", detail: "Type : facture entrante (Vallourec)", action: "Renommé FAC-2025-VAL-0263.pdf · Rangé dans /Factures/2025-03/" },
      { status: "success", date: "11/04/2025", time: "11:54", source: "document.pdf", detail: "Type : compte-rendu de réunion", action: "Renommé CR-COMEX-11-04-2025.pdf · Rangé dans /Comptes-rendus/2025-04/" },
      { status: "success", date: "10/04/2025", time: "15:22", source: "PV-securite-mars.pdf", detail: "Type : PV sécurité", action: "Renommé PV-SECURITE-mars-2025.pdf · Rangé dans /Documents-RH/Sécurité/" },
      { status: "warning", date: "10/04/2025", time: "09:11", source: "fichier-corrompu.pdf", detail: "Erreur de lecture du fichier", action: "Conservé dans /Inbox/À-traiter/ · Notification envoyée" },
      { status: "success", date: "09/04/2025", time: "14:33", source: "attestation-decennale-2025.pdf", detail: "Type : attestation assurance", action: "Renommé ATTEST-DECENNALE-2025.pdf · Rangé dans /Documents-Administratifs/Assurances/" },
      { status: "success", date: "08/04/2025", time: "16:50", source: "bon-commande-pointp-bois.pdf", detail: "Type : bon de commande fournisseur", action: "Renommé BC-POINTP-2025-0089-bois.pdf · Rangé dans /Bons-de-commande/2025-04/" }
    ]
  },

  {
    id: "interception-teams",
    iconName: "MessagesSquare",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
    title: "Interception documents Teams",
    description: "Capture les documents importants déposés dans vos canaux Teams et les range automatiquement dans le bon dossier",
    triggerLabel: "Déclencheur",
    triggerValue: "Nouveau document partagé dans un canal Teams",
    status: "active",
    activeSince: "1er avril 2025",
    config: [
      { label: "Canaux surveillés", value: "#compta, #projets-clients, #admin" },
      { label: "Fréquence de vérification", value: "En temps réel" },
      { label: "Types de fichiers", value: "PDF, Word, Excel, ZIP" },
      { label: "Action 1", value: "Copie du document hors de Teams" },
      { label: "Action 2", value: "Détection du type (facture, contrat, CR, projet)" },
      { label: "Action 3", value: "Renommage et rangement dans /TeamsCapture/<canal>/" },
      { label: "Détection des doublons", value: "Activée (vérifie si déjà reçu par email)" }
    ],
    plainText: "Tous les documents partagés dans les canaux Teams sélectionnés sont automatiquement capturés par Synthèse, sortis de Teams (où ils risquent de se perdre dans le flow), analysés, renommés intelligemment, et rangés dans la bonne arborescence de votre serveur. Plus jamais de « il l'avait pas envoyé sur Teams ce contrat ? ».",
    totalExecutions: 28,
    successRate: 100,
    history: [
      { status: "success", date: "14/04/2025", time: "16:42", source: "Canal #compta · Sophie LAURENT", detail: "facture-safran-mars-2025.pdf", action: "Renommé FAC-CLIENT-Safran-mars-2025.pdf · Rangé dans /Factures-clients/2025-03/" },
      { status: "success", date: "14/04/2025", time: "11:15", source: "Canal #projets-clients · Pierre BERNARD", detail: "cahier-charges-renault.docx", action: "Renommé CDC-Renault-Trucks-2025.docx · Rangé dans /Projets/Renault-Trucks/" },
      { status: "success", date: "13/04/2025", time: "17:08", source: "Canal #admin · Catherine MARTIN", detail: "contrat-airbus-renouvele.pdf", action: "Renommé CON-Airbus-renouv-2025.pdf · Rangé dans /Contrats/Airbus/" },
      { status: "success", date: "13/04/2025", time: "09:42", source: "Canal #compta · Pascal ROUSSEL", detail: "rapport-tva-q1-2025.xlsx", action: "Renommé RAP-TVA-Q1-2025.xlsx · Rangé dans /Compta/Déclarations/2025-Q1/" },
      { status: "success", date: "12/04/2025", time: "14:30", source: "Canal #projets-clients · Marc DUBOIS", detail: "planning-chantier-martin.pdf", action: "Renommé PLAN-Martin-SDB-avril-2025.pdf · Rangé dans /Projets/Martin/" },
      { status: "warning", date: "11/04/2025", time: "10:55", source: "Canal #compta · Sophie LAURENT", detail: "facture-vallourec-mars-3.pdf · Doublon détecté", action: "Notification envoyée pour décision (déjà reçu par email le 09/04)" },
      { status: "success", date: "10/04/2025", time: "16:20", source: "Canal #admin · Catherine MARTIN", detail: "PV-comex-10-04.pdf", action: "Renommé PV-COMEX-10-04-2025.pdf · Rangé dans /Comptes-rendus/2025-04/" },
      { status: "success", date: "09/04/2025", time: "11:38", source: "Canal #projets-clients · Isabelle MARCHAND", detail: "maquettes-novatek-mobile.zip", action: "Conservé MAQ-Novatek-mobile-09-04.zip · Rangé dans /Projets/Novatek/Maquettes/" },
      { status: "success", date: "08/04/2025", time: "15:11", source: "Canal #compta · Pascal ROUSSEL", detail: "devis-divalto-erp.pdf", action: "Renommé DEV-Divalto-ERP-87000.pdf · Rangé dans /Achats/ERP-projet/" },
      { status: "success", date: "07/04/2025", time: "09:25", source: "Canal #admin · Sophie LAURENT", detail: "contrat-tubacex-cadre.pdf", action: "Renommé CON-Tubacex-cadre-2025.pdf · Rangé dans /Contrats/Fournisseurs/Tubacex/" }
    ]
  }
]

export const AUTOMATION_FEATURES = [
  {
    iconName: "Eye",
    title: "Surveillance continue",
    description: "Synthèse tourne en arrière-plan, jour et nuit. Toutes les 5 minutes, il vérifie si quelque chose mérite votre attention. Vous n'avez rien à lancer, rien à relancer."
  },
  {
    iconName: "FolderTree",
    title: "Classement automatique",
    description: "Quand un document arrive, Synthèse l'analyse, le renomme intelligemment, et le range au bon endroit. Plus de « je le mets où celui-là ? » trois fois par jour."
  },
  {
    iconName: "Bell",
    title: "Notifications intelligentes",
    description: "Synthèse vous prévient uniquement quand c'est important : facture importante reçue, document urgent capturé, anomalie détectée. Le reste se fait en silence."
  },
  {
    iconName: "MessageCircle",
    title: "Configuration en langage naturel",
    description: "Décrivez ce que vous voulez en français : « surveille mes emails et range les factures », « capture les contrats déposés sur Teams ». Synthèse traduit ça en automatisation."
  },
  {
    iconName: "ListChecks",
    title: "Historique complet",
    description: "Chaque action effectuée par Synthèse est enregistrée. Vous pouvez vérifier ce qui a été fait, quand, et sur quoi. Pour vous rassurer ou retrouver un document."
  },
  {
    iconName: "Pause",
    title: "Vous gardez la main",
    description: "Une automatisation vous gêne ? Vous la mettez en pause d'un clic. Vous voulez modifier la règle ? Vous l'éditez en 30 secondes. Synthèse ne fait jamais rien sans votre accord initial."
  }
]
