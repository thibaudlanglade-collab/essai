import { useState } from "react";
import {
  Mail,
  Shield,
  Tag,
  Sunrise,
  Target,
  FileText,
  PenLine,
  Bell,
  Workflow,
  Eye,
  Inbox,
  Mic,
  Calendar,
  Users,
  Paperclip,
  Link as LinkIcon,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { getConnectUrl } from "../../api/emailsClient";
import ContextBadge from "@/components/ContextBadge";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES_CURRENT: Feature[] = [
  {
    icon: Shield,
    title: "Connexion sécurisée",
    description:
      "Synthèse se connecte à votre Gmail ou Outlook via OAuth2, sans jamais stocker votre mot de passe. Synchronisation automatique toutes les 5 minutes, en arrière-plan.",
  },
  {
    icon: Tag,
    title: "Classement automatique",
    description:
      "Chaque email est classé dans la bonne catégorie : Factures, Clients, Admin, Newsletters, Personnel... 8 catégories intelligentes, entièrement personnalisables selon votre activité.",
  },
  {
    icon: Sunrise,
    title: "Briefing du matin",
    description:
      "Chaque jour à 8h, un résumé structuré de votre boîte mail vous attend : les priorités du jour, les actions à mener, les messages urgents. Vous commencez votre journée en 2 minutes.",
  },
  {
    icon: Target,
    title: "Priorités automatiques",
    description:
      "Chaque email est analysé : urgent, important, normal ou faible. Vous voyez en un coup d'œil ce qui mérite votre attention maintenant, et ce qui peut attendre.",
  },
  {
    icon: FileText,
    title: "Résumés intelligents",
    description:
      "Plus besoin d'ouvrir chaque email pour comprendre. Un résumé en une phrase est généré automatiquement pour chaque message reçu.",
  },
  {
    icon: PenLine,
    title: "Brouillons de réponse",
    description:
      "Une réponse est préparée pour vous, dans votre style habituel. Vous relisez, ajustez si besoin, envoyez en un clic. Plus de page blanche devant un email difficile.",
  },
  {
    icon: Bell,
    title: "Alertes urgentes",
    description:
      "Un email vraiment important arrive ? Vous recevez une notification. Les autres attendent le prochain briefing. Vous n'êtes plus interrompu pour rien.",
  },
  {
    icon: Workflow,
    title: "Emails = déclencheurs",
    description:
      "Un email peut déclencher tout un workflow : une facture reçue est classée, un devis signé déclenche la préparation d'une facture d'acompte, un message client urgent est notifié à votre équipe.",
  },
];

const FEATURES_EXTRA: Feature[] = [
  {
    icon: Inbox,
    title: "Centralisation des messageries",
    description:
      "Gmail, Outlook, WhatsApp, Messenger, SMS… toutes vos messageries réunies en un seul endroit. Plus besoin de jongler entre 5 applications. Vous lisez, répondez et suivez toutes vos conversations depuis Synthèse, quel que soit le canal d'origine.",
  },
  {
    icon: Mic,
    title: "Réponses vocales",
    description:
      "Dictez votre réponse à voix haute depuis votre téléphone ou votre ordinateur. Synthèse la met en forme dans votre style écrit. Idéal en déplacement ou entre deux rendez-vous.",
  },
  {
    icon: Calendar,
    title: "Suivi des engagements",
    description:
      "Vous écrivez « je vous envoie le devis la semaine prochaine » ? Synthèse s'en souvient et vous rappelle au bon moment. Plus de promesses oubliées.",
  },
  {
    icon: Users,
    title: "Liens avec vos dossiers clients",
    description:
      "Chaque email d'un client est automatiquement rattaché à sa fiche. Vous ouvrez un dossier et vous avez tout l'historique sous les yeux. Fini les recherches dans 10 dossiers différents.",
  },
  {
    icon: Paperclip,
    title: "Pièces jointes intelligentes",
    description:
      "Une facture ou un devis reçu en pièce jointe ? Synthèse le détecte, l'envoie automatiquement dans Smart Extract, et le classe au bon endroit. Zéro manipulation de votre part.",
  },
  {
    icon: Mail,
    title: "Connexion Outlook & Office 365",
    description:
      "Vous utilisez Outlook ou Office 365 ? Synthèse peut aussi s'y connecter, avec toutes les mêmes fonctionnalités déjà disponibles pour Gmail.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all">
      <div className="mb-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-500" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
    </div>
  );
}

export default function EmailsPresentation({ onVisualize }: { onVisualize: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const { auth_url } = await getConnectUrl();
      window.location.href = auth_url;
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Impossible d'ouvrir la connexion Gmail."
      );
      setConnecting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 overflow-y-auto h-full">
      <ContextBadge
        variant="feature"
        label="Fonctionnalité de base"
        description="Une fonctionnalité qu'on connaît, mais boostée par l'IA et adaptée à votre métier."
      />

      {/* HERO */}
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-5">
          <Mail className="h-7 w-7 text-blue-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 tracking-tight">
          Boîte mail intelligente
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
          Connectez votre Gmail ou Outlook. Synthèse lit vos emails, les classe, prépare vos
          réponses et vous prévient des priorités. Votre boîte mail devient un outil de pilotage,
          pas une source de stress.
        </p>
        <p className="text-sm text-gray-500">
          Vos données restent les vôtres. Rien n'est stocké ni partagé.
        </p>
      </div>

      {/* CTA primaire — connecter Gmail pour de vrai */}
      <div className="max-w-2xl mx-auto mb-16 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 px-6 py-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connectez votre vraie boîte Gmail
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          OAuth2 Google sécurisé, en lecture. Vous pouvez vous déconnecter à tout moment.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 px-7 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
          {connecting ? "Ouverture de Google…" : "Se connecter à Gmail"}
        </button>
        {connectError && (
          <p className="text-xs text-red-600 mt-3">{connectError}</p>
        )}
      </div>

      {/* SECTION 1 — FONCTIONNALITÉS ACTUELLES */}
      <div className="mb-20 rounded-3xl bg-white dark:bg-gray-800/50 p-8 -mx-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Disponible aujourd'hui
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Ce que Synthèse fait pour vos emails
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Synthèse se connecte à votre boîte mail et travaille pour vous en arrière-plan. Voici
          tout ce qu'il fait dès aujourd'hui.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES_CURRENT.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>

      {/* SECTION 2 — CE QUE SYNTHÈSE PEUT AUSSI VOUS PROPOSER */}
      <div className="mb-20 rounded-3xl bg-white dark:bg-gray-800/50 p-8 -mx-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Tout dépend de vos envies
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Ce que Synthèse peut aussi vous proposer
        </h2>
        <p className="text-base text-gray-600 mb-8 max-w-2xl">
          Chaque entreprise a ses propres besoins. Ces fonctionnalités sont disponibles
          selon votre formule et vos envies — on s'adapte.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES_EXTRA.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-white rounded-3xl p-10 border border-blue-100 mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Envie de voir à quoi ça ressemble ?
        </h2>
        <p className="text-base text-gray-600 mb-8">
          Explorez une fausse boîte mail avec tous ces outils déjà actifs.
        </p>
        <button
          onClick={onVisualize}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-500 text-white text-base font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow-md transition-all"
        >
          <Eye className="h-5 w-5" />
          Visualiser la démo
        </button>
        <p className="text-xs text-gray-500 mt-5">
          Compte de démonstration — aucune donnée réelle, vous pouvez explorer librement.
        </p>
      </div>
    </div>
  );
}
