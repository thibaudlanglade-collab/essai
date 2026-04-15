import { useCallback, useEffect, useState } from "react";
import {
  Sparkles, Calendar, Search,
  Target, Wallet, Wrench, HandHeart, Bot,
  Mail, MessageSquare, FolderOpen, Sheet, Users,
  X, CheckCircle2, CalendarCheck,
} from "lucide-react";
import {
  GmailLogo, OutlookLogo, TeamsLogo, SlackLogo,
  GoogleDriveLogo, ExcelLogo,
} from "@/components/IntegrationLogos";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — "Pourquoi choisir Synthèse" cards
   ═══════════════════════════════════════════════════════════════════════════ */

const argumentsList = [
  {
    iconName: "Target",
    title: "Sur-mesure, configuré avec vous",
    description:
      "Synthèse n'arrive pas avec un mode d'emploi rigide. On commence par comprendre votre activité, vos outils existants, votre façon de travailler. Ensuite seulement, on configure Synthèse autour de vous — pas l'inverse.",
  },
  {
    iconName: "Wallet",
    title: "Un seul outil au lieu de 10",
    description:
      "Vous payez aujourd'hui un abonnement pour la facture, un autre pour la planification, un autre pour l'extraction PDF, un autre pour les emails, un autre pour la transcription. Synthèse fait tout ça. Vous arrêtez les abonnements éparpillés et vous concentrez votre budget sur un seul outil cohérent.",
  },
  {
    iconName: "Wrench",
    title: "Flexible, évolutif, modulable",
    description:
      "Votre activité change ? Synthèse change avec vous. On ajoute une nouvelle automatisation, un nouvel agent IA, une nouvelle source de données quand vous en avez besoin. Pas besoin de migrer vers un autre logiciel quand vous grandissez.",
  },
  {
    iconName: "HandHeart",
    title: "Vous n'êtes jamais seul",
    description:
      "Pas de chatbot anonyme ni de support qui ne répond jamais. Une vraie personne vous accompagne au démarrage, reste joignable, comprend votre métier, et fait évoluer Synthèse avec vous. Comme un collègue technique, mais en mieux.",
  },
  {
    iconName: "Bot",
    title: "L'IA qui travaille pour vous",
    description:
      "Smart Extract, transcription audio, agents conversationnels : l'intelligence artificielle est intégrée partout dans Synthèse, pas comme un gadget marketing, mais comme un vrai outil qui vous fait gagner des heures chaque semaine. Sans que vous ayez besoin de comprendre comment ça marche.",
  },
  {
    iconName: "Sparkles",
    title: "Votre seule limite, c'est votre imagination",
    description:
      "Vous nous décrivez ce que vous voulez, on vous le construit. Une automatisation sur-mesure, un tableau de bord spécifique, un agent qui fait exactement ce dont vous avez besoin — si vous pouvez l'expliquer, Synthèse peut le faire.",
  },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Wallet,
  Wrench,
  HandHeart,
  Bot,
  Sparkles,
};

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Integration example cards (below the banner)
   ═══════════════════════════════════════════════════════════════════════════ */

const INTEGRATION_ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  MessageSquare,
  FolderOpen,
  Sheet,
  Wallet,
  Users,
};

const INTEGRATION_EXAMPLES = [
  {
    iconName: "Mail",
    apps: "Gmail · Outlook",
    title: "Votre boîte mail enfin maîtrisée",
    description:
      "Connectez votre boîte mail. Synthèse lit les emails entrants, identifie les factures, classe les messages par priorité, prépare des brouillons de réponse, et vous fait un briefing chaque matin. Votre boîte mail devient un outil de pilotage, pas une source de stress.",
  },
  {
    iconName: "Sheet",
    apps: "Excel · Google Sheets",
    title: "Vos tableaux deviennent conversationnels",
    description:
      "Vos tableaux Excel et Sheets sont au cœur de votre activité ? Synthèse les lit, les met à jour, et permet de les interroger en langage naturel. « Quel est mon top 5 clients ce mois ? » devient une simple question, plus une recherche fastidieuse.",
  },
  {
    iconName: "MessageSquare",
    apps: "Teams · Slack",
    title: "Vos canaux deviennent intelligents",
    description:
      "Synthèse écoute vos canaux Teams ou Slack, capture les documents importants pour qu'ils ne se perdent pas dans le flow, résume les réunions enregistrées, et répond à vos collaborateurs quand vous les mentionnez avec @Synthèse.",
  },
  {
    iconName: "FolderOpen",
    apps: "Drive · OneDrive · Dropbox",
    title: "Vos documents enfin organisés",
    description:
      "Vos documents sont éparpillés sur plusieurs espaces de stockage ? Synthèse les surveille, les analyse, les renomme intelligemment, et les range dans la bonne arborescence. Vous retrouvez n'importe quel fichier en posant simplement la question.",
  },
  {
    iconName: "Wallet",
    apps: "Qonto · Pennylane · Sage",
    title: "Votre comptabilité sous contrôle",
    description:
      "Connectez votre banque ou votre logiciel comptable. Synthèse rapproche automatiquement vos factures et vos paiements, alerte sur les anomalies, prépare votre déclaration TVA, et vous donne une vision claire de votre trésorerie en temps réel.",
  },
  {
    iconName: "Users",
    apps: "HubSpot · Salesforce · Notion",
    title: "Toutes vos données réunies",
    description:
      "Votre CRM, vos bases de données projet, votre wiki interne : Synthèse les interroge tous d'un coup. Préparer un point client, retrouver un historique de relation, croiser des données entre systèmes — tout devient une conversation simple.",
  },
];

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
   IntegrationModal
   ═══════════════════════════════════════════════════════════════════════════ */

function IntegrationModal({
  app,
  onClose,
}: {
  app: IntegrationApp;
  onClose: () => void;
}) {
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
            onClick={() => alert("Modal de réservation à connecter (démo)")}
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
   IntegrationsGrid — 6 apps as static clickable cards
   ═══════════════════════════════════════════════════════════════════════════ */

function IntegrationsGrid({
  onSelect,
}: {
  onSelect: (app: IntegrationApp) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {INTEGRATIONS_APPS.map((app) => {
        const Logo = app.Logo;
        return (
          <button
            key={app.name}
            onClick={() => onSelect(app)}
            className="flex flex-col items-center gap-3 px-4 py-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm cursor-pointer
                       hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-600 hover:scale-[1.03]
                       transition-all duration-200"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: app.color + "18" }}
            >
              <Logo className="w-7 h-7" />
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {app.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mt-0.5">
                {app.category}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HomeView
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HomeView() {
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(null);

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* HERO */}
      <div className="text-center mb-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 mb-6 shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-5 tracking-tight">
          Bienvenue chez Synthèse
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Une plateforme unique qui regroupe tout ce dont vous avez besoin pour
          gérer votre activité au quotidien : extraction de documents, gestion
          des emails, planification, transcription de réunions, automatisations,
          agents IA.
        </p>
        <p className="text-base text-violet-600 dark:text-violet-400 italic font-medium">
          Configurée avec vous. Pour vous. Selon votre façon de travailler.
        </p>
      </div>

      {/* SECTION ARGUMENTS */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            Pourquoi choisir Synthèse
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Synthèse n'est pas un outil de plus dans votre arsenal. C'est
            l'outil qui remplace votre arsenal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {argumentsList.map((arg) => {
            const Icon = ICON_MAP[arg.iconName] || Sparkles;
            return (
              <div
                key={arg.title}
                className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  {arg.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {arg.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION INTÉGRATIONS */}
      <div className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            Se connecte à tous vos outils du quotidien
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Synthèse ne vous demande pas de changer vos habitudes. Il s'intègre
            à ce que vous utilisez déjà — emails, messagerie, stockage,
            comptabilité, CRM — pour travailler avec vos données existantes, là
            où elles sont.
          </p>
        </div>

        {/* INTEGRATION CARDS */}
        <IntegrationsGrid onSelect={setSelectedApp} />

        {/* 6 EXAMPLE CARDS */}
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {INTEGRATION_EXAMPLES.map((example) => {
              const Icon =
                INTEGRATION_ICON_MAP[example.iconName] || Mail;
              return (
                <div
                  key={example.title}
                  className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-violet-500" />
                  </div>
                  <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">
                    {example.apps}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                    {example.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {example.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-violet-50 dark:from-violet-900/20 dark:via-blue-900/20 dark:to-violet-900/20 rounded-3xl p-10 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3">
          Prêt à découvrir Synthèse en action ?
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-300 mb-8 max-w-xl mx-auto">
          Explorez librement la plateforme, ou prenons un moment ensemble pour
          parler de votre activité.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => alert("Modal de réservation à connecter (démo)")}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-base font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <Calendar className="h-5 w-5" />
            Réserver une démo
          </button>

          <button
            onClick={() =>
              alert("Naviguez librement dans la sidebar pour explorer")
            }
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-base font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
          >
            <Search className="h-5 w-5" />
            Explorer la plateforme
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
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
  );
}
