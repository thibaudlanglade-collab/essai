import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "../lib/navigate";
import {
  Search,
  Wallet, Wrench, HandHeart,
  X, CheckCircle2, CalendarCheck,
  Shield,
  Smartphone, CloudSun, FileSpreadsheet, Camera,
  TrendingUp, RefreshCw, Leaf,
  Building2, Sparkles,
} from "lucide-react";
import { StarButton } from "@/components/ui/star-button";
import { GlobeInteractive } from "@/components/ui/cobe-globe-interactive";
import { HeroSection } from "@/components/ui/hero-section";
import { FeatureCard, AnimatedContainer } from "@/components/ui/grid-feature-cards";
import {
  GmailLogo, OutlookLogo, TeamsLogo, SlackLogo,
  GoogleDriveLogo, ExcelLogo,
} from "@/components/IntegrationLogos";
import IntegrationHero from "@/components/ui/integration-hero";
import ComprendreView from "@/pages/ComprendreView";
import { GradientCard } from "@/components/ui/gradient-card";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import { Switch } from "@/components/ui/switch";
import BoostedFeaturesSection from "@/components/BoostedFeaturesSection";

const INTEGRATION_GRADIENT_MAP: Record<string, "orange" | "blue" | "purple" | "gray" | "green" | "teal"> = {
  "Gmail":            "orange",
  "Outlook":          "blue",
  "Microsoft Teams":  "purple",
  "Slack":            "gray",
  "Google Drive":     "green",
  "Microsoft Excel":  "teal",
};


/* ═══════════════════════════════════════════════════════════════════════════
   DATA — 6 apps for the scrolling banner + modal
   ═══════════════════════════════════════════════════════════════════════════ */

interface IntegrationApp {
  name: string;
  category: string;
  color: string;
  tagline: string;
  description: string;
  Logo: React.FC<React.SVGProps<SVGSVGElement>>;
  features: string[];
}

const INTEGRATIONS_APPS: IntegrationApp[] = [
  {
    name: "Gmail",
    category: "Email",
    color: "#EA4335",
    tagline: "Votre boîte mail, pilotée par l'IA",
    Logo: GmailLogo,
    description:
      "Synthèse se connecte à votre compte Gmail pour lire, trier, analyser et répondre à vos emails automatiquement. Fini les heures perdues à trier votre boîte de réception — Synthèse identifie les messages importants, extrait les pièces jointes, et vous prépare un briefing chaque matin.",
    features: [
      "Briefing quotidien automatique de votre boîte mail",
      "Détection et extraction automatique des factures",
      "Classement intelligent par priorité et catégorie",
      "Génération de brouillons de réponse contextuels",
      "Résumé des fils de discussion longs",
      "Alertes sur les emails urgents ou en attente",
      "Archivage automatique des newsletters et spam",
      "Recherche en langage naturel dans vos emails",
      "Suivi des relances clients et fournisseurs",
      "Export des données extraites vers vos tableaux",
    ],
  },
  {
    name: "Outlook",
    category: "Email",
    color: "#0078D4",
    tagline: "Microsoft Outlook connecté à votre workflow",
    Logo: OutlookLogo,
    description:
      "Synthèse s'intègre directement à Outlook pour automatiser la gestion de vos emails professionnels. Que vous utilisiez Outlook en entreprise ou en indépendant, Synthèse transforme votre messagerie en un véritable outil de productivité.",
    features: [
      "Synchronisation en temps réel de votre boîte Outlook",
      "Tri automatique par projet, client ou priorité",
      "Extraction des pièces jointes et classement intelligent",
      "Détection des demandes d'action dans les emails",
      "Brouillons de réponse générés par IA",
      "Intégration avec votre calendrier Outlook",
      "Suivi automatique des conversations en cours",
      "Résumé hebdomadaire de votre activité email",
      "Alertes personnalisées sur mots-clés ou expéditeurs",
      "Conformité RGPD : vos données restent privées",
    ],
  },
  {
    name: "Microsoft Teams",
    category: "Messagerie",
    color: "#5059C9",
    tagline: "Vos conversations Teams deviennent productives",
    Logo: TeamsLogo,
    description:
      "Synthèse se branche sur vos canaux Microsoft Teams pour capturer l'essentiel, résumer les échanges, et vous permettre de ne plus rien manquer. Mentionnez @Synthèse dans un canal pour obtenir une réponse instantanée basée sur vos données.",
    features: [
      "Résumé automatique des conversations de canal",
      "Capture des documents partagés dans les messages",
      "Agent @Synthèse répondant dans les canaux",
      "Transcription et résumé des réunions Teams",
      "Extraction des décisions et actions à faire",
      "Notifications intelligentes sur les sujets importants",
      "Recherche dans l'historique des conversations",
      "Création automatique de comptes-rendus de réunion",
      "Intégration avec votre calendrier et vos tâches",
      "Tableau de bord des sujets actifs par équipe",
    ],
  },
  {
    name: "Slack",
    category: "Messagerie",
    color: "#611F69",
    tagline: "Slack augmenté par l'intelligence artificielle",
    Logo: SlackLogo,
    description:
      "Synthèse s'intègre à votre workspace Slack pour transformer vos canaux en source d'information structurée. Plus besoin de scroller des centaines de messages — Synthèse capture, résume et organise tout pour vous.",
    features: [
      "Résumé quotidien des canaux que vous suivez",
      "Capture automatique des fichiers importants",
      "Bot @Synthèse disponible dans tous vos canaux",
      "Extraction des liens, dates et engagements",
      "Résumé des threads longs en un clic",
      "Alertes sur les mentions et mots-clés importants",
      "Recherche en langage naturel dans Slack",
      "Archivage intelligent des conversations anciennes",
      "Rapport hebdomadaire d'activité par canal",
      "Intégration avec vos autres outils via Synthèse",
    ],
  },
  {
    name: "Google Drive",
    category: "Stockage",
    color: "#0066DA",
    tagline: "Vos fichiers Drive, organisés et accessibles",
    Logo: GoogleDriveLogo,
    description:
      "Synthèse surveille votre Google Drive en continu pour analyser, renommer et classer vos documents automatiquement. Retrouvez n'importe quel fichier en posant simplement la question — plus besoin de naviguer dans des arborescences complexes.",
    features: [
      "Surveillance automatique des nouveaux fichiers",
      "Renommage intelligent basé sur le contenu",
      "Classement automatique dans les bons dossiers",
      "Extraction de texte depuis les PDF et images",
      "Recherche en langage naturel dans vos documents",
      "Détection des doublons et versions obsolètes",
      "Résumé automatique des documents longs",
      "Alertes sur les modifications de fichiers partagés",
      "Export des données extraites vers Excel/Sheets",
      "Synchronisation avec vos autres espaces de stockage",
    ],
  },
  {
    name: "Microsoft Excel",
    category: "Tableur",
    color: "#185C37",
    tagline: "Vos tableaux Excel en conversation avec l'IA",
    Logo: ExcelLogo,
    description:
      "Synthèse lit, analyse et met à jour vos fichiers Excel automatiquement. Posez vos questions en français — « Quel est mon chiffre d'affaires ce trimestre ? » — et obtenez une réponse instantanée, sans formule ni macro.",
    features: [
      "Import et lecture automatique de vos fichiers Excel",
      "Interrogation en langage naturel de vos données",
      "Mise à jour automatique des tableaux récurrents",
      "Génération de graphiques et résumés visuels",
      "Détection d'anomalies dans vos données",
      "Rapprochement automatique entre plusieurs fichiers",
      "Export des résultats en PDF ou nouveau fichier Excel",
      "Création de tableaux de bord à partir de vos données",
      "Historique des modifications et versioning",
      "Intégration avec vos données email et documents",
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   BENTO CARD COMPONENTS — "Et comme si ça ne suffisait pas..."
   ═══════════════════════════════════════════════════════════════════════════ */

function BentoSupportCard() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 rounded-2xl border border-violet-300/50 shadow-md shadow-violet-500/10 p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
        <HandHeart className="h-6 w-6 text-violet-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">Vous n'êtes jamais seul</h3>
      <p className="text-sm text-gray-600 leading-relaxed flex-1">
        Pas de chatbot anonyme ni de support qui ne répond jamais. Une vraie personne vous accompagne au démarrage, reste joignable, comprend votre métier, et fait évoluer Synthèse avec vous. Comme un collègue technique, mais en mieux.
      </p>
      <div className="mt-auto pt-6 flex items-center justify-between">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <CalendarCheck className="h-4 w-4" />
          Parler à un expert
        </button>
        <Switch defaultChecked aria-label="Support actif" />
      </div>
    </div>
  )
}

function BentoPricingCard() {
  return (
    <div className="h-full bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 rounded-2xl border border-pink-300/50 shadow-md shadow-pink-500/10 p-6 flex flex-col justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Payez pour ce que vous utilisez vraiment</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Avec un logiciel classique, vous payez 100% du prix pour utiliser 20% des fonctionnalités. Avec Synthèse, on construit ensemble exactement ce dont vous avez besoin. Vous payez pour ce que vous utilisez, pas pour les 80% de fonctions qui prennent la poussière.
        </p>
      </div>
      <div className="flex items-baseline gap-2">
        <Wallet className="h-5 w-5 text-violet-500 shrink-0 mb-1" />
        <span className="text-2xl font-bold text-gray-900">1 outil</span>
        <span className="text-sm text-gray-500">construit pour vous</span>
      </div>
    </div>
  )
}

function BentoStatCard() {
  return (
    <div className="relative h-full bg-gradient-to-br from-fuchsia-100 via-violet-100 to-pink-100 rounded-2xl border border-fuchsia-300/50 shadow-md shadow-fuchsia-500/10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(#7c3aed 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">On évolue avec vous</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Synthèse n'est pas un achat ponctuel. C'est une relation sur le long terme. Vous grandissez, votre logiciel grandit avec vous. Vos besoins changent en mars ? On adapte en mars. Vous avez une nouvelle idée en juin ? On la construit en juin.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <TrendingUp className="h-5 w-5 text-violet-500 shrink-0 mb-1" />
          <span className="text-4xl font-bold text-gray-900/90">On avance ensemble.</span>
        </div>
      </div>
    </div>
  )
}

function BentoEvolveCard() {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-100 via-violet-100 to-purple-100 rounded-2xl border border-indigo-300/50 shadow-md shadow-indigo-500/10 p-6 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">Flexible, évolutif, modulable</h3>
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider shrink-0">
          Sur-mesure
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">
        Votre activité change ? Synthèse change avec vous. On ajoute une nouvelle automatisation, un nouvel agent IA, une nouvelle source de données quand vous en avez besoin. Pas besoin de migrer vers un autre logiciel quand vous grandissez.
      </p>
      <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
        <span>personnalisable</span>
        <span>évolutif</span>
        <span>modulable</span>
      </div>
    </div>
  )
}

function BentoImprovementCard() {
  return (
    <div className="h-full bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 rounded-2xl border border-amber-300/50 shadow-md shadow-amber-500/10 p-6 flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 shrink-0">
        <RefreshCw className="h-5 w-5 text-amber-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">Rien n'est parfait, même pas nous</h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        Le premier mois, il y a toujours des choses auxquelles on n'avait pas pensé. C'est normal. C'est pour ça qu'on fait des audits réguliers : on prend du recul, on regarde ce qui marche et ce qui marche moins, on ajuste. L'objectif, c'est de faire évoluer Synthèse chaque semaine pour qu'il vous corresponde parfaitement. Et la chance qu'on a, c'est qu'on peut tout modifier à 100%.
      </p>
    </div>
  )
}

function BentoSecurityCard() {
  return (
    <div className="h-full bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 rounded-2xl border border-emerald-300/50 shadow-md shadow-emerald-500/10 p-6 flex flex-wrap items-center justify-between gap-6">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 shrink-0 mt-0.5">
          <Shield className="h-5 w-5 text-green-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-1">RGPD et sécurité, c'est non-négociable</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Données hébergées en France, chiffrées, jamais partagées, jamais exploitées. Conforme RGPD. Serveurs certifiés ISO 27001. Vos fichiers ne quittent jamais le territoire français. On utilise les mêmes standards de sécurité que les banques et les hôpitaux.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
          <Leaf className="h-3.5 w-3.5 text-green-500" />
          Éco-responsable
        </div>
        <div className="flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          ISO 27001
        </div>
        <div className="flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
          <Wrench className="h-3.5 w-3.5 text-violet-500" />
          Flexible
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Personalisation examples
   ═══════════════════════════════════════════════════════════════════════════ */

const PERSONALIZATION_ICON_MAP: Record<string, any> = {
  Smartphone, CloudSun, FileSpreadsheet, Camera,
}

const PERSONALIZATION_EXAMPLES = [
  {
    iconName: "Smartphone",
    title: "Vos commandes arrivent par WhatsApp ?",
    description: "On configure Synthèse pour les capter et les transformer en bons de commande. Chaque message devient une ligne dans votre suivi, sans rien retaper."
  },
  {
    iconName: "CloudSun",
    title: "Votre planning dépend de la météo ?",
    description: "On intègre la météo dans le planificateur pour anticiper les reports. Synthèse décale automatiquement les tâches extérieures quand la pluie est annoncée."
  },
  {
    iconName: "FileSpreadsheet",
    title: "Vous avez un Excel que vous remplissez depuis 10 ans ?",
    description: "On connecte Synthèse dessus. Vous continuez de l'utiliser comme avant, mais il devient intelligent : il se met à jour tout seul, répond à vos questions, et vous alerte quand quelque chose cloche."
  },
  {
    iconName: "Camera",
    title: "Vos techniciens prennent des photos sur le terrain ?",
    description: "On les transforme automatiquement en rapports d'intervention classés par client. La photo arrive, le rapport se génère, le dossier se range. Sans intervention de votre part."
  }
]

/* ═══════════════════════════════════════════════════════════════════════════
   IntegrationModal
   ═══════════════════════════════════════════════════════════════════════════ */

function IntegrationModal({
  app,
  onClose,
}: {
  app: IntegrationApp;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  // Close on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const Logo = app.Logo;
  const mid = Math.ceil(app.features.length / 2);
  const col1 = app.features.slice(0, mid);
  const col2 = app.features.slice(mid);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: app.color + "18" }}
            >
              <Logo className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {app.name}
                </h3>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    color: app.color,
                    backgroundColor: app.color + "15",
                  }}
                >
                  {app.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {app.tagline}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pb-5 border-b border-gray-100 dark:border-gray-800">
            {app.description}
          </p>

          {/* Features */}
          <div className="pt-5">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest mb-4">
              Ce que Synthèse fait avec {app.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {[col1, col2].map((col, ci) =>
                col.map((feat, fi) => (
                  <div
                    key={`${ci}-${fi}`}
                    className="flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                      {feat}
                    </span>
                  </div>
                )),
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={() => { onClose(); navigate("/contact"); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <CalendarCheck className="w-4 h-4" />
            Parler à un expert
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HomeView
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HomeView({ onComprendreClick, onRgpdClick }: { onComprendreClick?: () => void; onRgpdClick?: () => void }) {
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(null);
  const navigate = useNavigate();

  return (
    <div>
      <HeroSection onComprendreClick={onComprendreClick} />

      {/* CARTES PERSONNALISATION */}
      <section className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <AnimatedContainer className="mx-auto max-w-3xl text-center">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Concrètement, on fait quoi
            </span>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-balance md:text-5xl lg:text-6xl leading-tight text-gray-900">
              Tout le travail que vous ne devriez plus faire à la main.
            </h2>
            <p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance md:text-base leading-relaxed">
              Synthèse est un assistant IA qui travaille <strong>dans vos outils du
              quotidien</strong> — Gmail, Excel, Drive, WhatsApp, votre CRM,
              votre compta. Il lit vos emails, classe vos documents, extrait les
              données de vos PDF, met à jour vos tableaux, rédige vos réponses,
              génère vos plannings, transcrit vos réunions, surveille vos
              factures. Tout ce qui vous prend du temps aujourd'hui devient
              automatique demain — sans changer vos habitudes, sans migration,
              sans nouveau logiciel à apprendre.
            </p>
          </AnimatedContainer>

          <AnimatedContainer delay={0.35} className="text-center pt-4">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
              Quelques scénarios
            </span>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Quatre situations typiques — entre beaucoup d'autres.
            </p>
          </AnimatedContainer>

          <AnimatedContainer
            delay={0.4}
            className="grid grid-cols-1 rounded-2xl overflow-hidden sm:grid-cols-2 md:grid-cols-2 gap-3"
          >
            {PERSONALIZATION_EXAMPLES.map((example, i) => {
              const Icon = PERSONALIZATION_ICON_MAP[example.iconName]
              const tints = [
                "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 border border-violet-200/70 [&_h3]:text-violet-950 [&_svg]:!text-violet-600",
                "bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 border border-pink-200/70 [&_h3]:text-pink-950 [&_svg]:!text-pink-600",
                "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 border border-emerald-200/70 [&_h3]:text-emerald-950 [&_svg]:!text-emerald-600",
                "bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 border border-indigo-200/70 [&_h3]:text-indigo-950 [&_svg]:!text-indigo-600",
              ]
              return (
                <FeatureCard
                  key={i}
                  className={`rounded-2xl ${tints[i % tints.length]}`}
                  feature={{ title: example.title, icon: Icon, description: example.description }}
                />
              )
            })}
          </AnimatedContainer>

          <p className="text-center text-base sm:text-lg font-semibold text-violet-600 dark:text-violet-400">
            Et bien plus encore…
          </p>

          <AnimatedContainer delay={0.5} className="relative">
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" aria-hidden />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" aria-hidden />

            <div className="overflow-hidden">
              <div
                className="flex gap-3 w-max py-2"
                style={{ animation: "scroll-left 50s linear infinite" }}
              >
                {(() => {
                  const items = [
                    "Un email reçu déclenche une mise à jour dans votre Excel",
                    "Une photo de chantier devient un rapport d'intervention classé",
                    "Votre planning se réorganise quand un client annule",
                    "Vos devis PDF se transforment en tableau comparatif",
                    "Chaque matin, un briefing de vos priorités du jour",
                    "Un bon de commande WhatsApp devient une ligne de suivi",
                    "Vos factures se saisissent toutes seules dans votre logiciel",
                    "Vos réunions se transcrivent et s'archivent automatiquement",
                  ];
                  return [...items, ...items].map((label, i) => (
                    <div
                      key={i}
                      className="w-64 sm:w-72 shrink-0 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 dark:border-violet-800/50 dark:bg-violet-950/20 px-4 py-3"
                    >
                      <p className="text-[13px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {label}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </AnimatedContainer>
        </div>
      </section>

      <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* SECTION 2 — ACCROCHE ÉMOTIONNELLE "JARVIS" */}
      <div className="mb-14 sm:mb-20">
        <div className="bg-gradient-to-br from-violet-100/80 via-pink-50 to-fuchsia-100/70 rounded-2xl sm:rounded-3xl border border-violet-200/60 overflow-hidden shadow-lg shadow-violet-500/5">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* LEFT — Contenu "Jarvis" */}
            <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-10 md:px-12 md:border-r border-violet-200/60 order-2 md:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-gray-900 mb-5 sm:mb-8 leading-tight">
                Synthèse, c'est cette petite voix que vous avez tous les jours.
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed">
                  « Si seulement mes emails pouvaient se trier tout seuls. »
                </p>
                <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed">
                  « Si seulement mes fichiers se rangeaient dans le bon dossier. »
                </p>
                <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed">
                  « Si seulement quelqu'un pouvait me faire un résumé en arrivant au bureau. »
                </p>
                <p className="text-sm sm:text-base text-gray-700 italic leading-relaxed">
                  « Si seulement j'avais un assistant qui connaît mes dossiers par cœur. »
                </p>
              </div>

              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                C'est exactement ce que fait Synthèse.
              </p>

              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                Et ce ne sont que des exemples. Si vous pouvez le décrire, on peut
                le construire. La seule limite, c'est votre imagination.
              </p>
            </div>

            {/* RIGHT — Globe interactif */}
            <div className="flex items-center justify-center p-6 sm:p-8 md:p-10 border-b md:border-b-0 border-violet-200/60 order-1 md:order-2">
              <GlobeInteractive className="w-full max-w-[240px] sm:max-w-xs" />
            </div>

          </div>
        </div>
      </div>

      {/* SECTION — COMPRENDRE SYNTHÈSE (page complète intégrée) */}
      <ComprendreView />

      {/* SECTION — FONCTIONNALITÉS BOOSTÉES (outils de base × IA) */}
      <BoostedFeaturesSection />

      {/* SECTION — POURQUOI ÇA N'EXISTAIT PAS AVANT */}
      <div className="mb-16 sm:mb-20">

        {/* Titre */}
        <div className="text-center mb-8 sm:mb-12 px-2">
          <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
            Une opportunité historique
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight tracking-tight">
            Pourquoi Synthèse n'existait pas il y a 5 ans
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Ce n'est pas qu'on n'y avait pas pensé. C'est que les technologies pour le construire n'existaient tout simplement pas.
          </p>
        </div>

        {/* Timeline avant / maintenant */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-14">
          {[
            {
              era: "Avant",
              color: "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50/60 dark:bg-gray-900/40",
              badge: "text-rose-700 bg-rose-100",
              items: [
                "Un outil IA sur-mesure = 200 000 € minimum",
                "Une équipe de 10 développeurs pendant 6 mois",
                "Réservé aux grandes entreprises du CAC 40",
                "Obsolète au bout de 2 ans, sans mise à jour",
              ],
            },
            {
              era: "Le tournant",
              color: "border-violet-200 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:bg-violet-900/20",
              badge: "text-violet-700 bg-violet-100",
              items: [
                "GPT-4 rend l'IA accessible via API en 2023",
                "Le cloud certifié devient abordable pour tous",
                "Les outils no-code explosent en qualité",
                "L'IA passe de laboratoire à production en 6 mois",
              ],
            },
            {
              era: "Aujourd'hui",
              color: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:bg-emerald-900/20",
              badge: "text-emerald-700 bg-emerald-100",
              items: [
                "Un outil sur-mesure accessible à toutes les entreprises",
                "Configuré en semaines, pas en années",
                "Évolue chaque semaine avec vos besoins",
                "Même niveau de sécurité que les grandes entreprises",
              ],
            },
          ].map((col) => (
            <div key={col.era} className={`rounded-2xl border p-5 sm:p-6 ${col.color}`}>
              <span className={`inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-4 sm:mb-5 ${col.badge}`}>
                {col.era}
              </span>
              <ul className="space-y-2.5 sm:space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CARTE 1 — PREUVE SOCIALE : les mêmes outils que les meilleurs */}
        <div className="rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
          <div className="px-5 py-6 sm:px-8 sm:py-8 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
              Pour que vous profitiez au mieux de cette révolution, on a sélectionné les meilleurs outils du marché
            </h3>
            <p className="text-[13px] sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
              Pour chaque élément de Synthèse — le moteur IA, l'agent, la base de données,
              l'hébergement — on a choisi la brique la plus robuste et la plus avancée, déjà éprouvée à
              grande échelle par les plus grandes entreprises. On les assemble pour vous, pour que vous
              bénéficiiez du meilleur de l'IA sans avoir à chercher.
            </p>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[
              {
                tool: "OpenAI API",
                role: "Intelligence artificielle",
                color: "#10a37f",
                desc: "Le même moteur IA que",
                trustedBy: [
                  { name: "Notion", color: "#000" },
                  { name: "Shopify", color: "#96bf48" },
                  { name: "Duolingo", color: "#58cc02" },
                  { name: "Stripe", color: "#635bff" },
                ],
              },
              {
                tool: "Anthropic Claude",
                role: "Agent IA avancé",
                color: "#c96442",
                desc: "Le même agent IA que",
                trustedBy: [
                  { name: "Slack", color: "#611f69" },
                  { name: "Salesforce", color: "#009edb" },
                  { name: "DoorDash", color: "#ff3008" },
                  { name: "GitLab", color: "#e24329" },
                ],
              },
              {
                tool: "Supabase",
                role: "Base de données & auth",
                color: "#3ecf8e",
                desc: "La même infrastructure que",
                trustedBy: [
                  { name: "Mozilla", color: "#e66000" },
                  { name: "PwC", color: "#d04a02" },
                  { name: "1Password", color: "#1a8cff" },
                  { name: "Pika", color: "#8b5cf6" },
                ],
              },
              {
                tool: "Railway",
                role: "Hébergement cloud",
                color: "#6366f1",
                desc: "Le même standard (SOC 2 Type II) que",
                trustedBy: [
                  { name: "Stripe", color: "#635bff" },
                  { name: "Twilio", color: "#f22f46" },
                  { name: "Datadog", color: "#632ca6" },
                  { name: "GitHub", color: "#24292e" },
                ],
              },
            ].map((row) => (
              <div key={row.tool} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-5 py-5 sm:px-8">
                {/* Tool */}
                <div className="flex items-center gap-3 md:w-52 md:shrink-0">
                  <div
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.tool}</p>
                    <p className="text-xs text-gray-400">{row.role}</p>
                  </div>
                </div>

                {/* Desc — visible sur mobile aussi mais plus petit */}
                <p className="text-[11px] sm:text-xs text-gray-400 md:w-44 md:shrink-0 italic">
                  {row.desc}
                </p>

                {/* Companies */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {row.trustedBy.map((co) => (
                    <span
                      key={co.name}
                      className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full border"
                      style={{
                        color: co.color,
                        borderColor: co.color + "30",
                        backgroundColor: co.color + "0f",
                      }}
                    >
                      {co.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer de la carte — renforce la preuve sociale */}
          <div className="px-5 py-5 sm:px-8 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[13px] sm:text-sm text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
              Des briques déjà en place chez{" "}
              <span className="font-semibold text-gray-900 dark:text-white">Notion, Stripe, Salesforce ou Mozilla</span>
              {" "}— on les a simplement assemblées avec soin pour vous.
            </p>
          </div>
        </div>

        {/* CARTE 2 — RGPD : vos données, votre propriété */}
        {onRgpdClick && (
          <div className="mt-10 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-900/10 dark:to-gray-900/50 overflow-hidden">
            <div className="px-8 py-8 flex flex-col md:flex-row md:items-center gap-6">

              {/* Icône + texte */}
              <div className="flex items-start gap-4 flex-1">
                <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                    Conformité & sécurité
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                    Parce que quand on vous parle de logiciel et de données, on parle aussi de RGPD
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                    Chiffrées, hébergées en Europe, jamais revendues ni utilisées pour entraîner des modèles
                    tiers. Conformité RGPD native, sans collecte à des fins publicitaires.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={onRgpdClick}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
              >
                Voir notre page RGPD
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* SECTION — "ET COMME SI ÇA NE SUFFISAIT PAS..." */}
      <div className="mb-16 sm:mb-20">
        <div className="text-center mb-8 sm:mb-12 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight tracking-tight">
            Et comme si ça ne suffisait pas...
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Quelques raisons de plus de nous faire confiance.
          </p>
        </div>

        <BentoGridShowcase
          integration={<BentoSupportCard />}
          trackers={<BentoPricingCard />}
          statistic={<BentoStatCard />}
          focus={<BentoEvolveCard />}
          productivity={<BentoImprovementCard />}
          shortcuts={<BentoSecurityCard />}
        />

        <div className="text-center mt-8 sm:mt-10 px-2">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Et si vous avez encore des interrogations sur la RGPD, la maintenance
            ou les aspects techniques, on vous explique tout en détail un peu plus
            bas sur cette page — pour ceux qui aiment bien les détails.
          </p>
        </div>
      </div>

      {/* SYNTHÈSE C'EST QUI + TARIFICATION — DUO */}
      <div className="mb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

          {/* Qui sommes-nous */}
          <div
            onClick={() => navigate("/qui-sommes-nous")}
            className="group relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-100 rounded-2xl p-7 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-200/30 blur-3xl group-hover:bg-violet-300/40 transition-colors" aria-hidden />

            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mb-5 shadow-md shadow-violet-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">
                À l'origine de Synthèse
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Une équipe qui se calque à votre activité. On écoute, on
                comprend votre métier, et on construit ensemble.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 group-hover:gap-2.5 transition-all">
                En savoir plus
                <span aria-hidden>→</span>
              </span>
            </div>
          </div>

          {/* Tarification */}
          <div
            onClick={() => navigate("/tarification")}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-violet-50 border border-blue-100 rounded-2xl p-7 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-blue-200/30 blur-3xl group-hover:bg-blue-300/40 transition-colors" aria-hidden />

            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5 shadow-md shadow-blue-500/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">
                Un budget adapté à votre réalité
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Sur-mesure aussi pour le budget. Vous payez uniquement ce
                que vous utilisez, adapté à votre taille et vos besoins.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:gap-2.5 transition-all">
                Voir les formules
                <span aria-hidden>→</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION INTÉGRATIONS */}
      <div className="mb-20">
        {/* Animated carousel hero */}
        <IntegrationHero />

        {/* INTEGRATION CARDS — gradient cards, clickable, open detail modal */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {INTEGRATIONS_APPS.map((app) => (
            <GradientCard
              key={app.name}
              badgeText={app.category}
              badgeColor={app.color}
              title={app.name}
              description={app.tagline}
              onClick={() => setSelectedApp(app)}
              Logo={app.Logo}
              gradient={INTEGRATION_GRADIENT_MAP[app.name] ?? "gray"}
            />
          ))}
        </div>

      </div>

      {/* CTA FINAL */}
      <div className="bg-gradient-to-br from-violet-100 via-pink-50 to-fuchsia-100 dark:from-violet-900/20 dark:via-pink-900/20 dark:to-fuchsia-900/20 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center border border-violet-200/50 shadow-lg shadow-violet-500/5">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
          Prêt à découvrir Synthèse en action ?
        </h2>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
          Explorez librement la plateforme, ou prenons un moment ensemble pour
          parler de votre activité.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
          <StarButton
            lightColor="#7C3AED"
            className="rounded-xl h-12 px-6 touch-manipulation"
            onClick={() => navigate("/contact")}
          >
            ✨ Réserver une démo
          </StarButton>

          <button
            onClick={() =>
              alert("Naviguez librement dans la sidebar pour explorer")
            }
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all touch-manipulation"
          >
            <Search className="h-5 w-5" />
            Explorer la plateforme
          </button>
        </div>

        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-5 sm:mt-6 leading-relaxed">
          Compte de démonstration — toutes les fonctionnalités sont accessibles
          dans la sidebar
        </p>
      </div>

      {/* MODAL */}
      {selectedApp && (
        <IntegrationModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
      </div>
    </div>
  );
}
