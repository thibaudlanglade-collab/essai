import {
  Lightbulb, Brain, Cable,
  Mail, FolderOpen, FileSpreadsheet, Building2, Calculator,
  Calendar, Users, Zap, Bot,
  MessageSquare, CheckCircle2, Clock, Wrench,
  Target, RefreshCw,
  Sheet,
} from "lucide-react"
import RadialOrbitalTimeline, { type OrbitalNode } from "@/components/ui/radial-orbital-timeline"
import DemoCallout from "@/components/DemoCallout"

export default function ComprendreView() {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 pb-24">

      {/* ============================================ */}
      {/* HERO */}
      {/* ============================================ */}
      <div className="text-center mb-12 sm:mb-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-50 mb-4 sm:mb-5">
          <Lightbulb className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-5 tracking-tight leading-tight">
          Comprendre Synthèse en 5 minutes
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Avant de vous montrer ce que Synthèse fait, on aimerait vous
          expliquer <strong>pourquoi</strong> ça marche et{" "}
          <strong>comment</strong> les possibilités sont aussi grandes.
          C'est simple, promis.
        </p>
        <p className="mt-4 text-sm sm:text-base text-gray-500 italic leading-relaxed">
          On sait que c'est un peu long — mais c'est important que vous
          compreniez bien le concept. Une fois que c'est clair, tout le reste
          coule de source.
        </p>
      </div>


      {/* ============================================ */}
      {/* SECTION 1 — LES BOÎTES SÉPARÉES */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            1
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Aujourd'hui, vos outils ne se parlent pas.
          </h2>
        </div>

        <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6 sm:mb-8">
          Vous avez un CRM pour vos clients. Une boîte mail pour vos
          échanges. Un Drive pour vos documents. Un Excel pour vos
          chiffres. Un logiciel de compta. Un outil de planning.
          Chacun fait son travail. Mais aucun ne sait ce que l'autre
          contient. Pour croiser une information, vous devez ouvrir 3
          outils, chercher manuellement, copier-coller, et espérer ne
          rien oublier.
        </p>

        {/* VISUAL: Isolated boxes */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-8">
          {[
            { icon: "Mail", label: "Emails", color: "bg-red-50 text-red-500 border-red-200" },
            { icon: "FolderOpen", label: "Drive", color: "bg-blue-50 text-blue-500 border-blue-200" },
            { icon: "Sheet", label: "Excel", color: "bg-green-50 text-green-500 border-green-200" },
            { icon: "Building2", label: "CRM", color: "bg-purple-50 text-purple-500 border-purple-200" },
            { icon: "Calculator", label: "Compta", color: "bg-amber-50 text-amber-500 border-amber-200" },
            { icon: "Calendar", label: "Planning", color: "bg-indigo-50 text-indigo-500 border-indigo-200" }
          ].map((box) => {
            const Icon = COMPRENDRE_ICON_MAP[box.icon]
            return (
              <div
                key={box.label}
                className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl border-2 border-dashed ${box.color}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-semibold">{box.label}</span>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-500 italic mt-4">
          Des boîtes fermées, posées les unes à côté des autres, sans
          aucune connexion.
        </p>
      </div>


      {/* ============================================ */}
      {/* SECTION 2 — LE CERVEAU + LES BRAS */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            2
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Puis une nouvelle technologie est arrivée.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* The Brain */}
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                <Brain className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Le cerveau</h3>
                <p className="text-xs text-violet-600 font-medium">L'intelligence artificielle</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Un cerveau capable de lire un document de 50 pages en 3
              secondes, de comprendre un email en 14 langues, de rédiger
              une réponse dans votre ton, de comparer 200 lignes de
              factures sans erreur.
            </p>
            <p className="text-sm text-gray-500 italic mt-3">
              Mais un cerveau tout seul, sans bras, il ne peut rien
              toucher. Il pense, mais il n'agit pas.
            </p>
          </div>

          {/* The Arms */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <Cable className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Les bras</h3>
                <p className="text-xs text-blue-600 font-medium">Les API et connecteurs</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Ce sont des connecteurs qui permettent au cerveau d'aller
              chercher dans vos boîtes — votre CRM, votre mail, votre
              Drive — de prendre l'information, de la traiter, et de la
              remettre au bon endroit.
            </p>
            <p className="text-sm text-gray-700 font-medium mt-3">
              Le cerveau + les bras = un assistant qui peut tout faire,
              à condition qu'on lui dise quoi faire.
            </p>
          </div>
        </div>
      </div>


      {/* ============================================ */}
      {/* SECTION 3 — SCHÉMA INTERACTIF */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            3
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Voici comment Synthèse fonctionne.
          </h2>
        </div>

        <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6 sm:mb-8">
          Le cerveau au centre, connecté à tous vos outils. Vous lui
          parlez, il va chercher pour vous.
        </p>

        <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
          <RadialOrbitalTimeline nodes={ORBITAL_NODES} />
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-500 italic mt-5 sm:mt-6 px-4">
          Cliquez sur chaque application pour voir ce que Synthèse fait avec.
        </p>
      </div>


      {/* ============================================ */}
      {/* SECTION 4 — FONCTIONNALITÉS / AGENTS / AUTO */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            4
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Ce que vous voyez dans la démo, en clair.
          </h2>
        </div>

        {/* Intro — démo = exemples généraux */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-5 mb-8">
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">En gros, ce que vous voyez à gauche, ce sont les exemples de la démo.</span>{" "}
            On a choisi des fonctionnalités générales pour vous montrer ce qui est possible — tri d'emails, planification, extraction de documents, agents IA.
            Mais dans la réalité, aucun client ne reçoit exactement ça.{" "}
            <span className="font-semibold">Votre Synthèse serait construit autour de vos outils, vos processus, votre vocabulaire métier.</span>{" "}
            Ce que vous voyez n'est qu'une infime partie de ce qu'on peut faire.
          </p>
        </div>

        <p className="text-base text-gray-700 leading-relaxed mb-6">
          Pour que ce soit clair, on a découpé ce qu'on construit en 3 grandes familles :
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-gradient-to-br from-blue-100 via-cyan-50 to-sky-100 border-2 border-blue-200/70 rounded-2xl p-5 sm:p-6 shadow-md shadow-blue-500/10">
            <div className="w-11 h-11 rounded-xl bg-blue-200/70 flex items-center justify-center mb-4">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Les fonctionnalités
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Ce sont des outils que vous connaissez déjà — gestion des emails, planification, traitement de documents.
              Sauf qu'ici, ils sont connectés à l'IA et à vos outils existants via des <span className="font-medium text-gray-800">API</span>.
              Concrètement : au lieu de remplir un formulaire à la main, l'outil comprend ce que vous faites et s'adapte.
            </p>
            <p className="text-xs text-blue-600 italic leading-relaxed">
              Un planificateur classique vous demande de tout saisir. Le nôtre se connecte à votre agenda, lit vos emails, comprend vos contraintes — et compose le planning pour vous.
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 border-2 border-amber-200/70 rounded-2xl p-5 sm:p-6 shadow-md shadow-amber-500/10">
            <div className="w-11 h-11 rounded-xl bg-amber-200/70 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Les automatisations
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Des règles intelligentes que Synthèse applique seul, à chaque fois, sans que vous ayez à intervenir.
              Vous définissez la logique une fois — ensuite ça tourne tout seul, 24h/24.
            </p>
            <p className="text-xs text-amber-600 italic leading-relaxed">
              « Quand une facture arrive par email, extrais les montants, range le PDF dans le bon dossier et mets à jour le tableau Excel. » Une fois configuré, plus besoin d'y penser.
            </p>
          </div>

          <div className="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 border-2 border-violet-200/70 rounded-2xl p-5 sm:p-6 shadow-md shadow-violet-500/10">
            <div className="w-11 h-11 rounded-xl bg-violet-200/70 flex items-center justify-center mb-4">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Les agents IA
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              C'est le niveau supérieur. Un agent IA ne réagit pas à un déclencheur — il prend une mission, réfléchit, va chercher l'information là où elle est, et vous rend un résultat complet.
            </p>
            <p className="text-xs text-violet-600 italic leading-relaxed">
              « Prépare-moi un résumé de l'activité de ce client. » Il fouille les emails, les documents, la compta, croise tout et vous rend un rapport en 30 secondes.
            </p>
          </div>
        </div>
      </div>


      {/* ============================================ */}
      {/* SECTION 5 — POURQUOI C'EST INFINI */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            5
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Pourquoi les possibilités sont aussi grandes.
          </h2>
        </div>

        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-violet-50 rounded-2xl sm:rounded-3xl border border-violet-100 px-5 py-6 sm:px-8 sm:py-8 md:px-10">
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-4">
            On ne vous vend pas un logiciel avec 50 boutons dont vous
            utiliserez 10. On vous construit un outil sur-mesure en
            assemblant : le cerveau (l'IA), les bras (les connexions à
            vos outils), et une interface pensée pour vous.
          </p>
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-4">
            Vous avez une nouvelle idée ? On ajoute un nouveau bras.
            Vous changez de process ? On reconfigure le cerveau. Votre
            activité évolue ? L'outil évolue avec vous.
          </p>
          <p className="text-base sm:text-lg text-gray-900 font-semibold leading-relaxed">
            La seule limite, c'est ce que vous pouvez décrire. Si vous
            pouvez expliquer comment vous travaillez aujourd'hui, on peut
            construire l'outil qui le fait mieux, plus vite, sans erreur.
          </p>
        </div>
      </div>


      {/* ============================================ */}
      {/* SECTION 6 — NOTRE FAÇON DE TRAVAILLER ENSEMBLE */}
      {/* ============================================ */}
      <div className="mb-14 sm:mb-20">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            6
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Notre façon de travailler ensemble
          </h2>
        </div>

        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-8 sm:mb-10 ml-11">
          On ne livre pas un logiciel. On construit quelque chose avec vous.
        </p>

        {/* 5 étapes */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 sm:gap-8 mb-10 sm:mb-12">
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-violet-200 via-blue-200 to-emerald-200" aria-hidden />

          {[
            { icon: "🎙️", gradient: "from-violet-500 to-violet-600",  title: "On écoute",     desc: "Un rendez-vous pour comprendre votre activité, vos outils, vos douleurs quotidiennes. On pose les bonnes questions." },
            { icon: "🔍", gradient: "from-blue-500 to-blue-600",      title: "On décortique", desc: "On analyse votre façon de travailler. On identifie ce qui vous coûte du temps et ce dont vous avez vraiment besoin — pas juste ce que vous pensez." },
            { icon: "🏗️", gradient: "from-indigo-500 to-violet-600",  title: "On construit",  desc: "On développe une V1 en quelques semaines. Pas un prototype vague — quelque chose que vous pouvez utiliser dès le départ." },
            { icon: "🧪", gradient: "from-emerald-500 to-teal-600",   title: "Vous testez",   desc: "Vous utilisez, vous faites vos retours. Ce qui marche, ce qui manque, ce qu'on n'avait pas anticipé. Tout est noté." },
            { icon: "🔄", gradient: "from-emerald-500 to-green-600",  title: "On améliore",   desc: "On itère chaque semaine. Synthèse évolue avec vous, indéfiniment. Votre activité change ? Synthèse change aussi." },
          ].map((step) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg shadow-gray-900/10 mb-4 relative z-10`}>
                <span className="text-2xl sm:text-3xl">{step.icon}</span>
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                {step.title}
              </h4>
              <p className="text-[12px] sm:text-[13px] text-gray-500 leading-relaxed max-w-[15rem]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Bloc — Profils (avant la CTA L'objectif) */}
        <div className="mb-10 sm:mb-14">
          <div className="text-center mb-6 sm:mb-8 px-2 max-w-3xl mx-auto">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              À votre échelle
            </span>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5 leading-tight">
              « À mon échelle, qu'est-ce que ça peut vraiment m'apporter ? »
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Que vous soyez <strong className="text-gray-800">tout seul ou une équipe
              de 50</strong>, dans le BTP, la restauration, le conseil ou
              l'industrie, l'application se calque sur vous. Mais au-delà de
              « ça peut me correspondre », la vraie question, c'est :
              <strong className="text-gray-800"> qu'est-ce que j'y gagne concrètement à ma taille</strong> ?
              Voici ce que nos clients récupèrent, selon leur échelle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

            <div className="bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100 border-2 border-emerald-200/70 rounded-2xl p-5 sm:p-6 flex flex-col shadow-md shadow-emerald-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-200/70 flex items-center justify-center text-2xl">
                  🌱
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 leading-tight">
                    Indépendants & TPE
                  </h4>
                  <p className="text-xs text-gray-500">1 à 10 personnes</p>
                </div>
              </div>
              <p className="text-sm italic text-gray-500 mb-3 leading-relaxed border-l-2 border-gray-200 pl-3">
                « Je suis tout seul, ça va vraiment changer ma vie ? »
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Quand on est seul, on porte <strong className="text-gray-900">tous les rôles</strong> :
                commercial, admin, compta, relation client, production. Synthèse
                devient votre assistant sur tous ces fronts — il trie vos emails,
                prépare vos devis, relance vos clients, organise vos documents,
                résume vos échanges, prépare vos réunions. Vous n'êtes plus seul
                pour faire tourner la boutique.
              </p>
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 leading-relaxed">
                💡 Comme un assistant qui connaît votre métier, disponible en continu.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 border-2 border-blue-200/70 rounded-2xl p-5 sm:p-6 flex flex-col shadow-md shadow-blue-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-200/70 flex items-center justify-center text-2xl">
                  🏗️
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 leading-tight">
                    PME & équipes structurées
                  </h4>
                  <p className="text-xs text-gray-500">10 à 50 personnes</p>
                </div>
              </div>
              <p className="text-sm italic text-gray-500 mb-3 leading-relaxed border-l-2 border-gray-200 pl-3">
                « On est 15, qu'est-ce qu'on y gagne vraiment en équipe ? »
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Chaque collaborateur reprend la main sur <strong className="text-gray-900">son vrai
                métier</strong>, au lieu de se noyer dans la saisie et les tableaux.
                Les process tiennent même quand quelqu'un est en congé, les erreurs
                disparaissent, l'onboarding des nouveaux devient beaucoup plus simple.
                L'équipe avance sur <strong className="text-gray-900">ce qui compte vraiment</strong>.
              </p>
              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
                💡 Vous grandissez sans démultiplier les profils admin.
              </p>
            </div>

            <div className="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 border-2 border-violet-200/70 rounded-2xl p-5 sm:p-6 flex flex-col shadow-md shadow-violet-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-violet-200/70 flex items-center justify-center text-2xl">
                  🏢
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 leading-tight">
                    Grandes structures
                  </h4>
                  <p className="text-xs text-gray-500">50+, avec DSI ou équipe tech</p>
                </div>
              </div>
              <p className="text-sm italic text-gray-500 mb-3 leading-relaxed border-l-2 border-gray-200 pl-3">
                « On a déjà tout — en quoi c'est utile pour nous ? »
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Vos équipes métier deviennent <strong className="text-gray-900">autonomes sur
                l'automatisation</strong> sans passer par la DSI. Les sujets
                qui traînent dans le backlog se résolvent enfin, en parallèle.
                Vous libérez votre équipe tech pour les <strong className="text-gray-900">vrais enjeux
                stratégiques</strong>, pas pour écrire des scripts de migration CSV.
              </p>
              <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2 leading-relaxed">
                💡 Vos process « bouche-trou » Excel disparaissent du paysage.
              </p>
            </div>
          </div>

          <div className="text-center mt-6 sm:mt-8 px-2">
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Pas besoin de formation longue, pas besoin de changer vos habitudes.
              On construit l'outil <strong className="text-gray-800">autour de vos préférences</strong>
              {" "}— votre vocabulaire, vos process, votre façon de fonctionner.
              Vous continuez à travailler comme avant, Synthèse s'occupe juste de
              ce qui vous agace.
            </p>
          </div>
        </div>

        {/* Bloc — "Synthèse peut aller plus loin que la démo" */}
        <div className="mb-10 sm:mb-14">
          <div className="text-center mb-6 sm:mb-8 px-2 max-w-3xl mx-auto">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">
              Voir plus grand
            </span>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5 leading-tight">
              Synthèse peut aller plus loin que la démo, ne vous inquiétez pas.
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Vous vous dites peut-être : <em>« joli, mais ça reste un peu gadget »</em>.
              Rappelez-vous : on a <strong className="text-gray-800">un cerveau</strong> (l'IA)
              et <strong className="text-gray-800">des bras</strong> (les API) qui touchent
              tous vos outils. Ça veut dire qu'on ne fait pas que trier des emails
              ou ranger des PDF — on <strong className="text-gray-800">orchestre des workflows
              entiers</strong>, avec des décisions prises en cours de route. Un exemple
              concret pour que vous visualisiez ce qu'on peut vraiment construire.
            </p>
          </div>

          {/* Un seul workflow fort — Agent commercial de bout en bout */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                💼
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
                  Exemple : workflow commercial complet
                </span>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                  Un prospect vous écrit. Synthèse déroule toute la chaîne jusqu'à la signature.
                </h4>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-5 sm:mb-6">
              Voilà ce qui se passe <strong className="text-gray-900">sans que vous ayez
              à lever le petit doigt</strong>, dès qu'un email de prospect atterrit
              dans votre boîte :
            </p>

            {/* Chaîne d'étapes */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mb-5 sm:mb-6">
              {[
                "📧 Email prospect reçu",
                "🔍 Enrichissement auto (LinkedIn, Pappers, site web)",
                "🧠 Scoring chaud / tiède / froid",
                "✍️ Réponse personnalisée rédigée dans votre ton",
                "📝 Fiche CRM créée et enrichie",
                "📅 RDV proposé selon votre agenda",
                "⏰ Relance programmée si pas de réponse",
                "📄 Devis pré-rempli selon le secteur du prospect",
                "✉️ Envoi + accusé de lecture",
                "🔔 Alerte dès qu'il clique sur le devis",
              ].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="inline-block px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100">
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="text-gray-300 font-bold">→</span>}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl bg-red-50/50 border border-red-100 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-500 mb-1.5">
                  Avant
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Du travail éparpillé sur plusieurs personnes (commercial, assistant,
                  admin). Des étapes oubliées, des prospects perdus, des relances
                  faites trop tard.
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">
                  Avec Synthèse
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Tout tourne en arrière-plan. Vous intervenez juste pour valider le
                  devis et signer. Zéro prospect oublié, zéro relance manquée.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 sm:mt-8 px-2">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-2xl mx-auto">
              Ce ne sont plus des gadgets. Ce sont <strong className="text-gray-900">des pans
              entiers de votre métier</strong> qui tournent tout seuls, avec la même
              logique que vos meilleurs collaborateurs — décisions comprises. Et ce
              workflow, c'est <strong className="text-gray-900">juste un exemple</strong> :
              tant que vous pouvez décrire le process, on peut le construire.
            </p>
          </div>
        </div>

        {/* CTA final — L'objectif */}
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-6 py-8 sm:px-10 sm:py-10 text-center">
          <h4 className="text-xl sm:text-2xl font-semibold text-white mb-4">
            L'objectif, au fond, c'est simple.
          </h4>
          <p className="text-sm sm:text-base text-violet-50 leading-relaxed max-w-3xl mx-auto">
            Profiter des nouvelles technologies pour vous aider dans votre travail. Vous faire gagner du temps
            sur ce qui est répétitif, vous libérer la tête pour ce qui compte vraiment, et vous permettre de
            mieux travailler — sans changer votre façon de fonctionner.
          </p>
        </div>
      </div>


      {/* ============================================ */}
      {/* SECTION 7 — POURQUOI PASSER À CETTE TECHNO */}
      {/* ============================================ */}
      <div className="mb-12 sm:mb-16">
        <div className="flex items-start sm:items-center gap-3 mb-5 sm:mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5 sm:mt-0">
            7
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Mais alors, pourquoi changer ?
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 mb-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
            Parce que cette technologie vous débloque une autre manière
            de travailler.
          </p>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
            Avant, vos applications c'étaient des <strong>boîtes fermées</strong>.
            Chacune dans son coin. Pour trouver une info, vous deviez
            ouvrir la bonne boîte, chercher dedans, et refermer.
          </p>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
            L'IA est arrivée — un <strong>cerveau</strong> capable de
            comprendre, analyser, rédiger. Puis les API sont arrivées —
            des <strong>bras</strong> qui permettent au cerveau d'aller
            chercher dans toutes vos boîtes en même temps.
          </p>
          <p className="text-sm sm:text-base text-gray-900 font-semibold leading-relaxed mb-3 sm:mb-4">
            Résultat : vous parlez au cerveau, il va chercher pour vous.
            Vous n'avez plus à ouvrir 5 outils. Vous posez une question,
            vous donnez une instruction, et le cerveau fait le reste.
          </p>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Et parce que vous n'utilisez qu'une petite partie de chacune
            de ces boîtes, on peut les recréer en <strong>une seule
            grande boîte</strong> — centralisée, simplifiée, adaptée à
            vous. C'est ça, Synthèse.
          </p>
        </div>
      </div>


      {/* ============================================ */}
      {/* CTA — démo 14 jours gratuits */}
      {/* ============================================ */}
      <DemoCallout />
    </div>
  )
}


// ============================================
// DATA
// ============================================

const COMPRENDRE_ICON_MAP: Record<string, React.ElementType> = {
  Mail, FolderOpen, Sheet, Building2, Calculator, Calendar,
  Target, Clock, RefreshCw, CheckCircle2,
  MessageSquare, Brain, Cable, Wrench, Zap, Bot
}

// ============================================
// ORBITAL NODES — apps connected to the Synthèse brain
// ============================================

const ORBITAL_NODES: OrbitalNode[] = [
  {
    id: 1,
    title: "Gmail",
    subtitle: "Emails",
    description: "Lit vos emails, trie par priorité, prépare des réponses et extrait les pièces jointes.",
    icon: Mail,
    color: "#EA4335",
  },
  {
    id: 2,
    title: "Drive",
    subtitle: "Documents",
    description: "Range vos fichiers, les renomme, les classe automatiquement dans les bons dossiers.",
    icon: FolderOpen,
    color: "#4285F4",
  },
  {
    id: 3,
    title: "Excel",
    subtitle: "Tableaux",
    description: "Met à jour vos tableaux, détecte les anomalies, répond à vos questions en langage naturel.",
    icon: FileSpreadsheet,
    color: "#22C55E",
  },
  {
    id: 4,
    title: "Teams",
    subtitle: "Réunions",
    description: "Résume vos réunions, capture les décisions, alerte votre équipe sur les actions à mener.",
    icon: Users,
    color: "#818CF8",
  },
  {
    id: 5,
    title: "Compta",
    subtitle: "Finances",
    description: "Rapproche factures et paiements, prépare vos déclarations, surveille votre trésorerie.",
    icon: Calculator,
    color: "#F59E0B",
  },
  {
    id: 6,
    title: "CRM",
    subtitle: "Clients",
    description: "Enrichit vos fiches clients, génère des rapports, suit l'état de vos ventes en temps réel.",
    icon: Building2,
    color: "#A78BFA",
  },
]

