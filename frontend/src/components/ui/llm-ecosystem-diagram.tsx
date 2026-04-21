import {
  Mail, HardDrive, Users, MessageSquare,
  FileSpreadsheet, Calendar, Bot, Zap,
} from "lucide-react";
import RadialOrbitalTimeline, { type OrbitalNode } from "./radial-orbital-timeline";

const NODES: OrbitalNode[] = [
  {
    id: 1,
    title: "Gmail",
    subtitle: "Email",
    description: "L'IA lit, trie et répond à vos emails via l'API Gmail. Plus aucun tri manuel.",
    icon: Mail,
    color: "#EA4335",
  },
  {
    id: 2,
    title: "Drive",
    subtitle: "Stockage",
    description: "Vos fichiers analysés, renommés et classés automatiquement sans action de votre part.",
    icon: HardDrive,
    color: "#0066DA",
  },
  {
    id: 3,
    title: "CRM",
    subtitle: "Clients",
    description: "Données clients enrichies et synchronisées entre tous vos outils sans effort.",
    icon: Users,
    color: "#00A1E0",
  },
  {
    id: 4,
    title: "Teams",
    subtitle: "Messagerie",
    description: "Conversations résumées, décisions extraites, comptes-rendus générés automatiquement.",
    icon: MessageSquare,
    color: "#5059C9",
  },
  {
    id: 5,
    title: "Excel",
    subtitle: "Tableur",
    description: "Interrogez vos données en français — le cerveau analyse et répond à votre place.",
    icon: FileSpreadsheet,
    color: "#185C37",
  },
  {
    id: 6,
    title: "Agenda",
    subtitle: "Calendrier",
    description: "Réunions planifiées selon vos priorités. Le cerveau gère votre temps à votre place.",
    icon: Calendar,
    color: "#4285F4",
  },
  {
    id: 7,
    title: "Agents IA",
    subtitle: "Les bras",
    description: "Les agents sont les bras du cerveau — ils agissent dans vos outils à votre place.",
    icon: Bot,
    color: "#7C3AED",
  },
  {
    id: 8,
    title: "Automations",
    subtitle: "Les bras auto",
    description: "Les automatisations répètent vos tâches récurrentes 24h/24, sans aucune intervention.",
    icon: Zap,
    color: "#F59E0B",
  },
];

export default function LLMEcosystemDiagram() {
  return <RadialOrbitalTimeline nodes={NODES} />;
}
