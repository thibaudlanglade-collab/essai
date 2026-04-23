/**
 * BoostedFeaturesSection
 *
 * Section landing-page qui montre les 6 fonctionnalités "de base" de Synthèse,
 * mais dopées à l'IA et branchées aux données de l'utilisateur.
 *
 * Principe : Avant → Avec Synthèse. Chaque carte a un boost chirurgical
 * qui raconte pourquoi ce n'est pas "juste un outil de plus".
 *
 * Place : à insérer dans HomeView, idéalement après <ComprendreView /> pour
 * faire le pont "concept → produit concret".
 */
import { MessageSquare, Zap, Camera, Mic, Calendar, Mail, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "../lib/navigate";
import { AnimatedContainer } from "@/components/ui/grid-feature-cards";

type BoostedFeature = {
  icon: React.ElementType;
  name: string;
  path: string;
  gradient: string;        // card background
  border: string;          // card border
  iconBg: string;          // icon square background
  iconColor: string;       // icon color
  accent: string;          // CTA link color
  avant: string;           // "before" punch line
  apres: string;           // "after" punch line
  description: string;     // supporting sentence
};

const FEATURES: BoostedFeature[] = [
  {
    icon: MessageSquare,
    name: "Assistant Synthèse",
    path: "/chat-assistant",
    gradient: "bg-gradient-to-br from-violet-50 via-violet-100/60 to-fuchsia-50",
    border: "border-violet-200/70",
    iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    iconColor: "text-white",
    accent: "text-violet-600 hover:text-violet-700",
    avant: "Un chat IA générique, qui ne connaît ni vos clients ni vos fichiers.",
    apres: "Un chat qui parle à tous vos outils en même temps. Il lit vos emails, vos tableaux, vos documents — et répond avec VOS données.",
    description: "Posez une question en français. Il fouille là où il faut et vous rend la réponse.",
  },
  {
    icon: Zap,
    name: "Smart Extract",
    path: "/smart",
    gradient: "bg-gradient-to-br from-amber-50 via-orange-100/60 to-yellow-50",
    border: "border-amber-200/70",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconColor: "text-white",
    accent: "text-amber-600 hover:text-amber-700",
    avant: "Copier-coller ligne par ligne depuis un PDF vers Excel.",
    apres: "Un PDF devient un tableau structuré, prêt à exploiter — devis, factures, contrats, relevés bancaires.",
    description: "Vous déposez, Synthèse extrait. Les bonnes colonnes, au bon endroit.",
  },
  {
    icon: Camera,
    name: "Photo → PDF / Excel",
    path: "/photo-to-document",
    gradient: "bg-gradient-to-br from-blue-50 via-sky-100/60 to-indigo-50",
    border: "border-blue-200/70",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500",
    iconColor: "text-white",
    accent: "text-blue-600 hover:text-blue-700",
    avant: "Une photo floue d'une note manuscrite, qui finit oubliée dans la galerie.",
    apres: "Une photo prise à la volée devient un document propre, en PDF ou en Excel. Écriture manuscrite, ticket, tableau imprimé, formulaire.",
    description: "Plus jamais de ressaisie manuelle. La photo, puis le document — fini.",
  },
  {
    icon: Mic,
    name: "Transcripteur",
    path: "/meeting-transcriber",
    gradient: "bg-gradient-to-br from-pink-50 via-rose-100/60 to-fuchsia-50",
    border: "border-pink-200/70",
    iconBg: "bg-gradient-to-br from-pink-500 to-rose-500",
    iconColor: "text-white",
    accent: "text-pink-600 hover:text-pink-700",
    avant: "Un enregistrement qu'on ne réécoute jamais, un compte-rendu bâclé.",
    apres: "Une réunion d'1h devient un résumé propre + la liste des décisions + les actions à faire, avec qui fait quoi et pour quand.",
    description: "Uploadez l'audio. En 30 secondes, tout est structuré.",
  },
  {
    icon: Calendar,
    name: "Planificateur",
    path: "/planner",
    gradient: "bg-gradient-to-br from-indigo-50 via-violet-100/60 to-blue-50",
    border: "border-indigo-200/70",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",
    iconColor: "text-white",
    accent: "text-indigo-600 hover:text-indigo-700",
    avant: "Un Excel à la main chaque semaine, avec les congés, les compétences, les astreintes — et 3 oublis à chaque fois.",
    apres: "Des contraintes floues deviennent un planning d'équipe optimisé, en 1 clic. Restauration, BTP, industrie, santé — adapté à votre métier.",
    description: "Vous décrivez vos règles. Synthèse compose le planning.",
  },
  {
    icon: Mail,
    name: "Emails & briefing",
    path: "/emails",
    gradient: "bg-gradient-to-br from-emerald-50 via-teal-100/60 to-green-50",
    border: "border-emerald-200/70",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    iconColor: "text-white",
    accent: "text-emerald-600 hover:text-emerald-700",
    avant: "150 emails reçus dans la nuit. 40 minutes de tri chaque matin.",
    apres: "150 emails deviennent un briefing de 5 lignes, chaque matin. Priorités, pièces jointes extraites, réponses pré-rédigées.",
    description: "Vous ouvrez votre café, Synthèse a déjà trié.",
  },
];

export default function BoostedFeaturesSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">

        {/* HEADER */}
        <AnimatedContainer className="mx-auto max-w-3xl text-center mb-10 sm:mb-14">
          {/* Pen-stroke underline décoratif au-dessus du titre */}
          <div className="flex justify-center mb-5">
            <div className="h-[2px] w-24 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500" />
          </div>

          <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
            Les outils qu'on a déjà construits
          </span>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-gray-900">
            Des outils que vous connaissez.{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
              Mais dopés à l'IA.
            </span>
          </h2>

          <p className="text-muted-foreground mt-5 text-sm sm:text-base md:text-lg leading-relaxed">
            Chat, OCR, transcription, planning, extraction de documents, tri d'emails —
            vous connaissez ces outils. Sauf qu'ici, chaque brique est branchée à{" "}
            <strong className="text-gray-800">vos données</strong> et à un{" "}
            <strong className="text-gray-800">vrai cerveau</strong>. C'est là que la
            magie opère.
          </p>
        </AnimatedContainer>

        {/* GRID */}
        <AnimatedContainer
          delay={0.15}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <button
                key={feat.name}
                type="button"
                onClick={() => navigate(feat.path)}
                className={`group relative text-left flex flex-col ${feat.gradient} border-2 ${feat.border} rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden`}
              >
                {/* Halo décoratif qui s'intensifie au hover */}
                <div
                  className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)" }}
                  aria-hidden
                />

                {/* Icône */}
                <div className={`relative w-12 h-12 rounded-xl ${feat.iconBg} flex items-center justify-center mb-4 shadow-md shadow-gray-900/10`}>
                  <Icon className={`h-6 w-6 ${feat.iconColor}`} />
                </div>

                {/* Nom */}
                <h3 className="relative text-lg sm:text-xl font-semibold text-gray-900 mb-3 tracking-tight leading-tight">
                  {feat.name}
                </h3>

                {/* Avant / Avec Synthèse */}
                <div className="relative space-y-2.5 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-[3px] inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100">
                      Avant
                    </span>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-through decoration-rose-200/60 decoration-[1.5px]">
                      {feat.avant}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-[3px] inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100">
                      Avec
                    </span>
                    <p className="text-[13px] text-gray-700 leading-relaxed">
                      {feat.apres}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="relative text-[12.5px] text-gray-500 italic leading-relaxed mb-5 flex-1">
                  {feat.description}
                </p>

                {/* CTA link */}
                <span className={`relative inline-flex items-center gap-1.5 text-sm font-semibold ${feat.accent} transition-all group-hover:gap-2.5`}>
                  Voir la démo
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </AnimatedContainer>

        {/* Bottom punch line */}
        <AnimatedContainer delay={0.4} className="mt-10 sm:mt-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 border border-violet-100">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <p className="text-[13px] sm:text-sm text-gray-700 leading-relaxed">
              Chaque outil se configure <strong className="text-gray-900">autour de votre métier</strong>.
              Ce ne sont que des points de départ.
            </p>
          </div>
        </AnimatedContainer>

      </div>
    </section>
  );
}
