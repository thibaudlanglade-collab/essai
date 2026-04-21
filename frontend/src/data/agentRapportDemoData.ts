export interface ProcessingStep {
  id: string
  label: string
  iconName: string
  durationMs: number
}

export interface Order {
  ref: string
  label: string
  date: string
  amount: number
  status: "livré" | "en production" | "en attente"
}

export interface Invoice {
  ref: string
  date: string
  amount: number
  status: "payée" | "en attente" | "en retard"
  dueDate: string
}

export interface Exchange {
  date: string
  channel: "Email" | "Teams" | "Téléphone"
  contact: string
  summary: string
}

export interface Alert {
  level: "info" | "warning" | "success"
  message: string
}

export interface ChartDataPoint {
  month: string
  amount: number
}

export interface RapportClient {
  clientName: string
  clientCode: string
  sector: string
  city: string
  accountManager: string
  relationSince: string
  kpis: {
    caYTD: number
    caLastYear: number
    commandesEnCours: number
    facturesImpayees: number
    satisfactionScore: number
  }
  orders: Order[]
  invoices: Invoice[]
  exchanges: Exchange[]
  alerts: Alert[]
  chartData: ChartDataPoint[]
}

export const PROCESSING_STEPS: ProcessingStep[] = [
  { id: "identify", label: "Identification du client Renault Trucks…", iconName: "Search", durationMs: 900 },
  { id: "orders", label: "Récupération des commandes en cours…", iconName: "Package", durationMs: 1100 },
  { id: "invoices", label: "Analyse des factures et paiements…", iconName: "FileText", durationMs: 1000 },
  { id: "exchanges", label: "Lecture des derniers échanges…", iconName: "MessageSquare", durationMs: 800 },
  { id: "generate", label: "Génération du rapport…", iconName: "BarChart3", durationMs: 1200 },
]

export const RENAULT_TRUCKS_REPORT: RapportClient = {
  clientName: "Renault Trucks SAS",
  clientCode: "RT-004821",
  sector: "Industrie — Transport & Logistique",
  city: "Lyon (69)",
  accountManager: "Pierre Blanchard",
  relationSince: "2019",
  kpis: {
    caYTD: 487200,
    caLastYear: 612000,
    commandesEnCours: 4,
    facturesImpayees: 1,
    satisfactionScore: 9.1,
  },
  orders: [
    {
      ref: "CMD-2024-1182",
      label: "Kit maintenance moteur DXi 13 × 12",
      date: "08/04/2024",
      amount: 147850,
      status: "en production",
    },
    {
      ref: "CMD-2024-1089",
      label: "Pièces carrosserie T480 × 8",
      date: "01/04/2024",
      amount: 92400,
      status: "livré",
    },
    {
      ref: "CMD-2024-0994",
      label: "Filtres et consommables Q1 × 200",
      date: "18/03/2024",
      amount: 38600,
      status: "livré",
    },
    {
      ref: "CMD-2024-1231",
      label: "Outillage diagnostic OBD × 3",
      date: "12/04/2024",
      amount: 15200,
      status: "en attente",
    },
  ],
  invoices: [
    {
      ref: "FAC-2024-0782",
      date: "01/04/2024",
      amount: 92400,
      status: "payée",
      dueDate: "01/05/2024",
    },
    {
      ref: "FAC-2024-0741",
      date: "18/03/2024",
      amount: 38600,
      status: "payée",
      dueDate: "17/04/2024",
    },
    {
      ref: "FAC-2024-0830",
      date: "10/04/2024",
      amount: 147850,
      status: "en attente",
      dueDate: "10/05/2024",
    },
    {
      ref: "FAC-2024-0699",
      date: "01/03/2024",
      amount: 27200,
      status: "en retard",
      dueDate: "01/04/2024",
    },
  ],
  exchanges: [
    {
      date: "13/04/2024",
      channel: "Teams",
      contact: "Sophie Martin (Achat)",
      summary: "Demande de disponibilité pour la nouvelle gamme T-High — intéressée par une présentation en mai.",
    },
    {
      date: "08/04/2024",
      channel: "Email",
      contact: "Marc Dupont (Directeur Achats)",
      summary: "Confirmation commande CMD-2024-1182. Délai de livraison demandé : 3 semaines max.",
    },
    {
      date: "02/04/2024",
      channel: "Téléphone",
      contact: "Pierre Blanchard → Marc Dupont",
      summary: "Appel de suivi Q1. Client satisfait des délais. Évoque un budget supplémentaire en Q2.",
    },
  ],
  alerts: [
    {
      level: "warning",
      message: "Facture FAC-2024-0699 (27 200 €) en retard de 12 jours — relance à envoyer.",
    },
    {
      level: "info",
      message: "CA YTD en baisse de 20 % vs. N-1 — lié à un gel budgétaire annoncé en janvier.",
    },
    {
      level: "success",
      message: "Aucun litige ou réclamation ouverte. Score satisfaction : 9,1 / 10.",
    },
  ],
  chartData: [
    { month: "Jan", amount: 48000 },
    { month: "Fév", amount: 62000 },
    { month: "Mar", amount: 105000 },
    { month: "Avr", amount: 147850 },
    { month: "Mai", amount: 0 },
    { month: "Jun", amount: 0 },
  ],
}
