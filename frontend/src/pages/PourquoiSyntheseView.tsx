/**
 * PourquoiSyntheseView
 *
 * Page dédiée qui développe l'argumentaire "Synthèse vs les autres agents IA
 * du marché". Accessible depuis la sidebar ("Pourquoi Synthèse") et depuis
 * la landing page via le tableau comparatif + CTA.
 *
 * Structure narrative (6 scènes) :
 *   1. Hook émotionnel — nommer la peur ("je suis largué par l'IA")
 *   2. Promesse centrale — "votre conseiller IA personnel"
 *   3. Tableau comparatif — la preuve rationnelle
 *   4. 3 différences développées — sur-mesure, intégration, anti-obsolescence
 *   5. 3 garanties — bande de rassurance
 *   6. Punchline + CTA final
 */
import {
  Target, Link2, ShieldCheck,
  RefreshCw, Heart, Sparkles, ArrowRight,
  X, Check, Headphones, MessageCircle, Rocket,
  Zap, Handshake, Search, BookOpen,
} from "lucide-react";
import { useNavigate } from "../lib/navigate";
import { AnimatedContainer } from "@/components/ui/grid-feature-cards";

type Difference = {
  icon: React.ElementType;
  title: string;
  gradient: string;
  border: string;
  iconBg: string;
  problem: string;
  solution: string;
  example: string;
};

const DIFFERENCES: Difference[] = [
  {
    icon: Target,
    title: "Sur-mesure, gratuit, à volonté",
    gradient: "bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50",
    border: "border-violet-200/70",
    iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    problem:
      "Les agents IA du marché sont des boîtes noires. Un job = un agent = un abonnement. Besoin d'un deuxième cas d'usage ? Vous repayez.",
    solution:
      "Chez nous, dès que vous avez une idée, on vous crée l'agent. Gratuitement. Autant que vous voulez. Il apparaît dans votre interface quelques jours plus tard, prêt à l'emploi.",
    example:
      "Un client du BTP nous a demandé un agent qui détecte les devis à risque. 48h après, il était dans son interface.",
  },
  {
    icon: Link2,
    title: "S'appuie sur ce que vous avez déjà",
    gradient: "bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50",
    border: "border-blue-200/70",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500",
    problem:
      "Chaque outil IA que vous achetez ajoute un compte de plus, un mot de passe de plus, une interface de plus à apprendre. À la fin, vous jonglez avec 8 apps.",
    solution:
      "Synthèse se branche sur Gmail, Outlook, Drive, Excel, Teams, Slack — les outils que vous utilisez déjà. Vous n'ajoutez rien à votre stack, on booste ce qui existe.",
    example:
      "Votre boîte mail devient 10× plus puissante. Votre agenda est relié à vos documents. Vos fichiers se parlent entre eux. Sans migration, sans perte de repères.",
  },
  {
    icon: ShieldCheck,
    title: "Toujours à jour — la garantie anti-obsolescence",
    gradient: "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50",
    border: "border-emerald-200/70",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    problem:
      "L'agent IA que vous achetez aujourd'hui sera dépassé dans 6 mois. L'IA avance chaque semaine. Pour suivre, il faudra racheter, migrer, réapprendre.",
    solution:
      "Chaque avancée IA pertinente est intégrée à votre application. Automatiquement. Sans surcoût. Vous ouvrez Synthèse, et les nouvelles capacités sont déjà là.",
    example:
      "C'est comme avoir un conseiller IA personnel qui fait la veille pour vous. Vous n'avez plus à scruter LinkedIn, tester 10 apps, comparer les agents. Vous utilisez, point.",
  },
];

type Guarantee = {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
};

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: "Mises à jour continues",
    description: "Votre app vieillit à l'envers. Chaque nouvelle techno IA utile y est intégrée.",
    color: "text-violet-600 bg-violet-50 border-violet-100",
  },
  {
    icon: Target,
    title: "Agents sur-mesure, gratuits",
    description: "Autant que vous en avez besoin. Créés à la demande, adaptés à votre métier.",
    color: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100",
  },
  {
    icon: Heart,
    title: "Zéro FOMO",
    description: "Arrêtez de scruter LinkedIn. Si c'est utile pour vous, vous l'avez déjà.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
];

export default function PourquoiSyntheseView() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-b from-stone-100 via-white to-stone-100">

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 1 — HOOK ÉMOTIONNEL
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pt-12 sm:pt-20 pb-10 sm:pb-16">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 text-center">
          <AnimatedContainer>
            <div className="flex justify-center mb-5">
              <div className="h-[2px] w-24 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-gray-900 mb-5">
              L'IA avance chaque semaine. Vos concurrents s'y mettent.{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                Et vous, vous vous sentez largué.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              On vous démarche tous les jours avec un nouvel agent IA. Vous ne savez plus quoi
              choisir, vous avez peur d'acheter le mauvais outil, peur que votre voisin prenne
              une longueur d'avance.{" "}
              <strong className="text-gray-900">Le temps, vous ne l'avez pas. Former toute une équipe à un nouvel outil, encore moins.</strong>{" "}
              Respirez. Ce n'est plus votre problème.
            </p>
          </AnimatedContainer>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 2 — PROMESSE CENTRALE
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <AnimatedContainer delay={0.1}>
            <div className="rounded-3xl bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 border border-violet-100 p-8 sm:p-12 shadow-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-md mb-5">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>

                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight mb-5">
                  Synthèse, c'est votre{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                    conseiller IA personnel.
                  </span>
                </h2>

                <p className="text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-5">
                  <strong className="text-gray-900">Ce qui se fait de mieux en IA</strong>, directement sur votre application,
                  adapté à votre métier, <strong className="text-gray-900">votre vocabulaire</strong>, votre manière de travailler — et{" "}
                  <strong className="text-gray-900">expliqué pour que vous compreniez vraiment ce que vous faites.</strong>
                </p>

                <p className="font-display text-base sm:text-lg md:text-xl text-gray-900 leading-snug max-w-2xl mx-auto mb-5">
                  Vous continuez à faire tourner votre entreprise.{" "}
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                    On s'occupe du reste.
                  </span>
                </p>

                <p className="text-[13px] sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
                  Une question sur tout ça ?{" "}
                  <strong className="text-gray-900">Un mail suffit, vous avez la réponse.</strong>
                </p>
              </div>
            </div>
          </AnimatedContainer>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 2.5 — COMMENT ÇA MARCHE + AVANTAGES
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <AnimatedContainer className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Comment ça marche
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight text-gray-900 mb-3">
              On prend le meilleur de l'IA,{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                on l'adapte à vous.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Suivre toutes les nouveautés de l'IA demande du temps — un temps que vous n'avez pas.
              On s'en charge à votre place, avec une méthode claire en 4 étapes.
            </p>
          </AnimatedContainer>

          {/* 4 ÉTAPES DU PROCESS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-14 sm:mb-20">
            {[
              {
                num: "1",
                title: "On capte le top de l'IA",
                description: "On suit chaque avancée utile, en temps réel, pour ne garder que ce qui a un vrai intérêt pour votre métier.",
              },
              {
                num: "2",
                title: "Vous nous expliquez votre métier",
                description: "Comment vous travaillez, ce qui vous prend du temps, où sont les frictions. On écoute vraiment.",
              },
              {
                num: "3",
                title: "On réfléchit à l'intégration",
                description: "Quels agents créer, quelles automatisations ajouter, comment brancher ça à vos outils existants.",
              },
              {
                num: "4",
                title: "Vous avez votre propre app",
                description: "Pas une démo partagée, pas un outil standard : votre cockpit à vous, à votre nom, pensé pour votre métier.",
              },
            ].map((step, idx) => (
              <AnimatedContainer key={step.num} delay={0.15 + idx * 0.08}>
                <div className="relative h-full bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                  {/* Grand numéro */}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white font-bold text-base mb-4 shadow-md">
                    {step.num}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 tracking-tight leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </AnimatedContainer>
            ))}
          </div>

          {/* AVANTAGES */}
          <AnimatedContainer delay={0.35} className="text-center mb-8">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Ce que ça change pour vous
            </span>
            <h3 className="font-display text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight text-gray-900">
              Les vrais avantages, sans baratin.
            </h3>
          </AnimatedContainer>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: BookOpen,
                title: "Pas de formation à planifier",
                description: "Aucun nouvel outil à maîtriser pour vous ou vos équipes. Tout le monde utilise ce qu'il connait déjà, en mieux.",
              },
              {
                icon: Rocket,
                title: "Toujours à la pointe",
                description: "Dès qu'une techno IA utile sort, elle est intégrée. Vous restez en tête, sans effort.",
              },
              {
                icon: Handshake,
                title: "Votre métier reste votre métier",
                description: "On ne change pas votre façon de travailler — on la booste là où c'est pertinent.",
              },
              {
                icon: Search,
                title: "On fait la veille à votre place",
                description: "Plus besoin de scruter les sorties IA. On trie, on teste, on sélectionne pour vous.",
              },
              {
                icon: Zap,
                title: "Zéro friction",
                description: "Une interface unique, connectée à vos outils. Pas 10 apps à jongler, pas 10 mots de passe.",
              },
              {
                icon: Target,
                title: "Adapté à votre réalité",
                description: "Pas une solution générique. Chaque fonctionnalité est pensée pour votre métier spécifique.",
              },
            ].map((adv, idx) => {
              const Icon = adv.icon;
              return (
                <AnimatedContainer key={adv.title} delay={0.4 + idx * 0.05}>
                  <div className="flex items-start gap-3 h-full bg-gradient-to-br from-violet-50/60 via-fuchsia-50/40 to-amber-50/40 rounded-xl border border-violet-100 p-4 sm:p-5">
                    <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-violet-100 shadow-sm">
                      <Icon className="h-[18px] w-[18px] text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mb-1 leading-tight">
                        {adv.title}
                      </h4>
                      <p className="text-[12.5px] text-gray-600 leading-relaxed">
                        {adv.description}
                      </p>
                    </div>
                  </div>
                </AnimatedContainer>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 3 — POURQUOI UNE MENSUALITÉ ?
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <AnimatedContainer delay={0.15} className="text-center mb-8 sm:mb-10">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Et concernant le prix
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight text-gray-900 mb-3">
              Oui, c'est un abonnement.{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                Et c'est votre meilleur atout.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Payer une mensualité plutôt qu'un gros chèque d'un coup, ce n'est pas une
              contrainte — c'est la garantie que Synthèse reste à votre service,{" "}
              <strong className="text-gray-800">mois après mois.</strong>
            </p>
          </AnimatedContainer>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-8">
            {[
              {
                icon: Headphones,
                title: "Un suivi humain",
                gradient: "bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50",
                border: "border-violet-200/70",
                iconBg: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
                description: "Un vrai contact qui vous connait, pas un helpdesk anonyme. On vérifie que l'outil vous sert, on ajuste ce qui coince, on avance avec vous.",
              },
              {
                icon: MessageCircle,
                title: "Vos questions, toujours",
                gradient: "bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50",
                border: "border-blue-200/70",
                iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500",
                description: "Vous bloquez sur un usage ? Vous voulez adapter une fonctionnalité ? Une nouvelle idée d'agent ? On répond, on construit, on livre. Sans surcoût.",
              },
              {
                icon: Rocket,
                title: "Toujours à la pointe",
                gradient: "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50",
                border: "border-emerald-200/70",
                iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
                description: "Chaque avancée IA utile est intégrée à votre application. Vous ne décrochez jamais. Votre mensualité achète du présent ET de l'avenir.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <AnimatedContainer key={item.title} delay={0.2 + idx * 0.08}>
                  <div
                    className={`relative h-full flex flex-col ${item.gradient} border-2 ${item.border} rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden`}
                  >
                    <div
                      className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-40 blur-2xl"
                      style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)" }}
                      aria-hidden
                    />

                    <div className={`relative w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-4 shadow-md shadow-gray-900/10`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <h3 className="relative text-base sm:text-lg font-semibold text-gray-900 mb-2 tracking-tight leading-snug">
                      {item.title}
                    </h3>

                    <p className="relative text-[13px] text-gray-700 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </AnimatedContainer>
              );
            })}
          </div>

          <AnimatedContainer delay={0.4}>
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 border border-violet-100 p-5 sm:p-6 text-center">
              <p className="text-[13px] sm:text-sm text-gray-700 leading-relaxed">
                <strong className="text-gray-900">La vraie différence</strong> : un agent IA du marché, vous le payez une fois
                et vous espérez qu'il vous serve. Avec Synthèse, vous payez un peu chaque mois
                — et vous êtes certain qu'on reste là, qu'on vous écoute, et que votre outil
                grandit en même temps que vos besoins.
              </p>
            </div>
          </AnimatedContainer>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 4 — LES 3 DIFFÉRENCES DÉVELOPPÉES
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <AnimatedContainer delay={0.2} className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Dans le détail
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight text-gray-900 mb-3">
              Les trois différences non-négociables.
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Ce n'est pas juste "un peu mieux". C'est un modèle fondamentalement différent.
            </p>
          </AnimatedContainer>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {DIFFERENCES.map((diff, idx) => {
              const Icon = diff.icon;
              return (
                <AnimatedContainer key={diff.title} delay={0.25 + idx * 0.1}>
                  <div
                    className={`relative h-full flex flex-col ${diff.gradient} border-2 ${diff.border} rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden`}
                  >
                    <div
                      className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-40 blur-2xl"
                      style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)" }}
                      aria-hidden
                    />

                    <div className={`relative w-12 h-12 rounded-xl ${diff.iconBg} flex items-center justify-center mb-4 shadow-md shadow-gray-900/10`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <h3 className="relative text-lg sm:text-xl font-semibold text-gray-900 mb-4 tracking-tight leading-snug">
                      {diff.title}
                    </h3>

                    <div className="relative space-y-4 flex-1">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 mb-1.5">
                          <X className="h-2.5 w-2.5" /> Le problème
                        </span>
                        <p className="text-[13px] text-gray-600 leading-relaxed">
                          {diff.problem}
                        </p>
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 mb-1.5">
                          <Check className="h-2.5 w-2.5" /> Chez Synthèse
                        </span>
                        <p className="text-[13px] text-gray-800 leading-relaxed">
                          {diff.solution}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-200/60">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-violet-600 mb-1.5">
                          Exemple
                        </span>
                        <p className="text-[12.5px] text-gray-600 italic leading-relaxed">
                          "{diff.example}"
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedContainer>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 5 — 3 GARANTIES (BANDE DE RASSURANCE)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <AnimatedContainer delay={0.3} className="text-center mb-8 sm:mb-10">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Nos 3 promesses
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight text-gray-900">
              Ce que vous obtenez, pour de vrai.
            </h2>
          </AnimatedContainer>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {GUARANTEES.map((g, idx) => {
              const Icon = g.icon;
              return (
                <AnimatedContainer key={g.title} delay={0.35 + idx * 0.08}>
                  <div className="h-full bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${g.color} mb-3`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 tracking-tight">
                      {g.title}
                    </h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed">
                      {g.description}
                    </p>
                  </div>
                </AnimatedContainer>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCÈNE 6 — PUNCHLINE + CTA FINAL
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <AnimatedContainer delay={0.4}>
            <div className="rounded-3xl bg-gradient-to-r from-violet-500 to-blue-500 p-8 sm:p-12 text-center shadow-lg">
              <div className="inline-flex items-center gap-2 mb-5">
                <Sparkles className="h-4 w-4 text-white/90" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-white/90">
                  Pour finir
                </span>
                <Sparkles className="h-4 w-4 text-white/90" />
              </div>

              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-white leading-tight mb-4">
                Les autres vendent un outil IA.{" "}
                <span className="underline decoration-white/60 decoration-[3px] underline-offset-4">
                  Nous, on vend la tranquillité.
                </span>
              </h2>

              <p className="text-white/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                Vous n'avez plus à comprendre l'IA. Vous n'avez plus à la suivre. Vous n'avez
                plus à craindre qu'elle vous dépasse.{" "}
                <strong className="text-white">Vous l'utilisez, point.</strong>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => navigate("/demo")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-violet-700 text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Obtenir une démo
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/contact")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/40 text-white text-sm font-semibold hover:bg-white/20 transition-all"
                >
                  Nous contacter
                </button>
              </div>
            </div>
          </AnimatedContainer>
        </div>
      </section>

    </div>
  );
}
