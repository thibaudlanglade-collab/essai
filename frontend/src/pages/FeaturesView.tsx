import { useState } from "react";
import {
  Building2,
  Stethoscope,
  Hammer,
  ShoppingCart,
  Scale,
  GraduationCap,
  Truck,
  Hotel,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTORS = [
  {
    icon: Building2,
    label: "BTP / Immobilier",
    color: "from-orange-500 to-amber-500",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-100 dark:border-orange-900/40",
    features: [
      { name: "Extraction de devis PDF", desc: "Analyse et structure automatiquement les devis fournisseurs en tableaux comparatifs." },
      { name: "Planification de chantier IA", desc: "Génère un planning d'équipe optimisé à partir d'un plan de production." },
      { name: "Suivi de conformité CCTP", desc: "Vérifie que les documents techniques respectent les clauses contractuelles." },
    ],
  },
  {
    icon: Stethoscope,
    label: "Santé / Médical",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    features: [
      { name: "Synthèse de dossiers patients", desc: "Résume et structure les comptes-rendus médicaux en fiches claires." },
      { name: "Extraction d'ordonnances", desc: "Extrait les données clés d'ordonnances numérisées pour intégration logicielle." },
      { name: "Agenda intelligent", desc: "Optimise la planification des consultations et réduit les créneaux vides." },
    ],
  },
  {
    icon: Scale,
    label: "Juridique / Comptabilité",
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-100 dark:border-violet-900/40",
    features: [
      { name: "Analyse de contrats", desc: "Identifie les clauses sensibles, les obligations et les dates clés dans les contrats." },
      { name: "Classement automatique", desc: "Catégorise les documents entrants (factures, contrats, courriers) sans intervention manuelle." },
      { name: "Rédaction d'emails juridiques", desc: "Génère des réponses conformes aux obligations légales à partir des dossiers existants." },
    ],
  },
  {
    icon: ShoppingCart,
    label: "Commerce / Retail",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50 dark:bg-pink-950/20",
    border: "border-pink-100 dark:border-pink-900/40",
    features: [
      { name: "Traitement des bons de commande", desc: "Extrait et intègre automatiquement les BDC reçus par email ou PDF." },
      { name: "Suivi des fournisseurs", desc: "Centralise et structure les échanges fournisseurs pour un suivi simplifié." },
      { name: "Reporting commercial IA", desc: "Génère des résumés de performance hebdomadaires à partir des données de vente." },
    ],
  },
  {
    icon: Hammer,
    label: "Industrie / Maintenance",
    color: "from-slate-600 to-gray-500",
    bg: "bg-slate-50 dark:bg-slate-950/20",
    border: "border-slate-100 dark:border-slate-800/60",
    features: [
      { name: "Fiches d'intervention structurées", desc: "Transforme les comptes-rendus techniciens en fiches standardisées exploitables." },
      { name: "Gestion des pièces détachées", desc: "Extrait les références et quantités depuis les devis et bons de livraison." },
      { name: "Transcription de réunions terrain", desc: "Convertit les enregistrements audio de réunions en compte-rendu structuré." },
    ],
  },
  {
    icon: GraduationCap,
    label: "Formation / RH",
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    features: [
      { name: "Analyse de CV automatique", desc: "Extrait et compare les profils candidats selon des critères personnalisables." },
      { name: "Génération de supports pédagogiques", desc: "Crée des résumés, quiz et fiches à partir de documents de formation." },
      { name: "Suivi des évaluations", desc: "Structure et centralise les retours d'évaluation des collaborateurs." },
    ],
  },
  {
    icon: Truck,
    label: "Transport / Logistique",
    color: "from-yellow-500 to-orange-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-100 dark:border-yellow-900/40",
    features: [
      { name: "Extraction de CMR / BL", desc: "Lit et structure automatiquement les lettres de voiture et bons de livraison." },
      { name: "Optimisation des tournées", desc: "Génère des plans de tournée optimisés à partir des adresses et contraintes." },
      { name: "Alertes anomalies documentaires", desc: "Détecte les erreurs ou incohérences dans les documents de transport." },
    ],
  },
  {
    icon: Hotel,
    label: "Hôtellerie / Restauration",
    color: "from-fuchsia-500 to-pink-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/20",
    border: "border-fuchsia-100 dark:border-fuchsia-900/40",
    features: [
      { name: "Gestion des réservations", desc: "Centralise et structure les demandes de réservation reçues par email." },
      { name: "Analyse des avis clients", desc: "Synthétise et catégorise les retours clients pour identifier les axes d'amélioration." },
      { name: "Planning du personnel", desc: "Génère des plannings adaptés aux réservations et aux contraintes d'équipe." },
    ],
  },
];

function SectorCard({ sector }: { sector: typeof SECTORS[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = sector.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden",
        sector.bg,
        sector.border,
      )}
    >
      {/* Tap target — full-width, generous height for thumbs */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-4 text-left touch-manipulation active:opacity-70 transition-opacity"
      >
        <div
          className={cn(
            "flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br text-white shrink-0",
            sector.color,
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="flex-1 font-semibold text-gray-900 dark:text-white text-[15px] sm:text-sm leading-tight">
          {sector.label}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Smooth accordion */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          open ? "max-h-[500px]" : "max-h-0",
        )}
      >
        <div className="px-4 pb-5 pt-1 sm:px-5 space-y-4">
          {sector.features.map((f) => (
            <div key={f.name} className="flex gap-3">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
              <div>
                <p className="text-[14px] sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                  {f.name}
                </p>
                <p className="text-[13px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeaturesView() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Fonctionnalités par secteur
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Synthèse s'adapte à votre métier. Découvrez les automatisations pensées pour votre secteur.
        </p>
      </div>

      {/* Cards — 1 col on mobile, 2 col on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTORS.map((sector) => (
          <SectorCard key={sector.label} sector={sector} />
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 p-5 sm:p-6 text-white text-center space-y-3">
        <p className="font-semibold text-base">Votre secteur n'est pas listé ?</p>
        <p className="text-sm text-white/80 leading-relaxed">
          Synthèse est entièrement personnalisable. On construit avec vous les automatisations adaptées à vos processus métier.
        </p>
        <a
          href="#"
          className="inline-block mt-1 px-6 py-3 bg-white text-violet-600 font-semibold text-sm rounded-full hover:bg-violet-50 active:scale-95 transition-all touch-manipulation"
        >
          Parlons de votre activité
        </a>
      </div>
    </div>
  );
}
