import {
  Shield,
  CheckCircle2,
  Train,
  Database,
  Brain,
  Sparkles,
  Lock,
  Eye,
  Server,
  RefreshCw,
  Bell,
  ExternalLink,
  ShieldCheck,
  FileSearch,
  Award,
  ScanSearch,
  Hammer,
  FileText,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const STACK_CERTIFICATIONS = [
  {
    name: "Railway",
    role: "Hébergement de l'infrastructure",
    cert: "SOC 2 Type II certifié",
    certColor: "text-green-700 bg-green-50",
    detail:
      "Vos serveurs tournent sur Railway, une infrastructure cloud certifiée SOC 2 Type II — le même standard utilisé par Stripe, Notion, et des milliers d'entreprises mondiales.",
    trustUrl: "https://railway.app/legal/privacy",
    trustLabel: "Trust Center Railway",
  },
  {
    name: "Supabase",
    role: "Base de données & authentification",
    cert: "SOC 2 Type II + ISO 27001",
    certColor: "text-green-700 bg-green-50",
    detail:
      "Votre base de données est hébergée sur Supabase, certifié SOC 2 Type II et ISO 27001. Chiffrement AES-256, sauvegardes automatiques, accès strictement contrôlé.",
    trustUrl: "https://supabase.com/security",
    trustLabel: "Trust Center Supabase",
  },
  {
    name: "OpenAI",
    role: "Modèles de langage (GPT-4)",
    cert: "Pas d'entraînement sur vos données",
    certColor: "text-blue-700 bg-blue-50",
    detail:
      "L'IA de Synthèse utilise OpenAI via API. Par contrat, OpenAI ne peut pas entraîner ses modèles sur vos données via l'API. Vos documents restent les vôtres.",
    trustUrl: "https://openai.com/enterprise-privacy",
    trustLabel: "Privacy Policy OpenAI",
  },
  {
    name: "Anthropic",
    role: "Agent IA avancé (Claude)",
    cert: "API enterprise — zéro rétention",
    certColor: "text-violet-700 bg-violet-50",
    detail:
      "Pour les tâches les plus complexes, on utilise Claude d'Anthropic via API. Anthropic s'engage contractuellement à ne pas utiliser vos données pour l'entraînement.",
    trustUrl: "https://www.anthropic.com/legal/privacy",
    trustLabel: "Privacy Policy Anthropic",
  },
];

const STACK_ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Railway: (props) => <Train {...props} />,
  Supabase: (props) => <Database {...props} />,
  OpenAI: (props) => <Brain {...props} />,
  Anthropic: (props) => <Sparkles {...props} />,
};

const HACKING_CARDS = [
  {
    icon: Lock,
    title: "Chiffrement de bout en bout",
    desc: "Toutes vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Même si quelqu'un interceptait vos données, elles seraient illisibles.",
  },
  {
    icon: Eye,
    title: "Accès strictement contrôlé",
    desc: "Seuls vous et les membres de votre équipe que vous autorisez ont accès à vos données. Chaque accès est journalisé. Aucun employé de Synthèse n'accède à vos données sans votre accord explicite.",
  },
  {
    icon: Server,
    title: "Infrastructure isolée",
    desc: "Vos données sont isolées dans un environnement dédié. Une faille chez un autre client ne vous affecte pas. C'est l'un des grands avantages d'une infrastructure professionnelle.",
  },
  {
    icon: RefreshCw,
    title: "Sauvegardes automatiques",
    desc: "Vos données sont sauvegardées automatiquement toutes les 24h, avec une rétention de 30 jours. En cas de problème, on peut restaurer votre environnement en quelques minutes.",
  },
  {
    icon: Bell,
    title: "Monitoring 24/7",
    desc: "Notre infrastructure est surveillée en continu. En cas d'anomalie, une alerte est déclenchée immédiatement. On est notifiés avant même que vous ne vous en aperceviez.",
  },
];

const TRUST_LINKS = [
  { name: "Railway Security", url: "https://railway.app/legal/privacy", color: "#6366F1" },
  { name: "Supabase Security", url: "https://supabase.com/security", color: "#22C55E" },
  { name: "OpenAI Enterprise Privacy", url: "https://openai.com/enterprise-privacy", color: "#3B82F6" },
  { name: "Anthropic Privacy Policy", url: "https://www.anthropic.com/legal/privacy", color: "#8B5CF6" },
];

// ─── Main view ───────────────────────────────────────────────────────────────

export default function RgpdView() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* HERO */}
      <div className="text-center mb-16">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm shadow-emerald-500/10">
          <Shield className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-gray-900 mb-4 tracking-tight leading-tight">
          Sécurité, RGPD et confiance
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          On sait que confier ses données professionnelles à un outil tiers, ça ne se fait pas à la légère.
          Voici tout ce que vous devez savoir, sans jargon.
        </p>
      </div>

      {/* SECTION 1 — Le RGPD en 30 secondes (aligné à gauche) */}
      <div className="mb-20">
        <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
          Le RGPD, c'est quoi en 30 secondes ?
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-3xl">
          Le Règlement Général sur la Protection des Données (RGPD) est une loi européenne qui impose aux entreprises de traiter les données personnelles de façon transparente, sécurisée, et avec le consentement des personnes concernées.
        </p>

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border border-blue-200/60 rounded-2xl p-5 mb-8 shadow-sm shadow-blue-500/5">
          <p className="text-sm text-blue-900 leading-relaxed">
            <span className="font-semibold">En clair :</span> vous avez le droit de savoir quelles données on collecte, pourquoi, comment elles sont protégées, et de demander leur suppression à tout moment. Synthèse respecte tout ça — par conception, pas juste sur le papier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Droit d'accès", desc: "Vous pouvez demander à tout moment la liste complète des données que nous détenons sur vous.", tint: "from-violet-50 to-fuchsia-50 border-violet-200/60" },
            { title: "Droit de rectification", desc: "Vous pouvez corriger ou mettre à jour vos données à tout moment, directement depuis la plateforme.", tint: "from-pink-50 to-rose-50 border-pink-200/60" },
            { title: "Droit à l'effacement", desc: "Vous pouvez demander la suppression totale de votre compte et de vos données. On l'exécute sous 72h.", tint: "from-fuchsia-50 to-violet-50 border-fuchsia-200/60" },
            { title: "Droit à la portabilité", desc: "Vos données vous appartiennent. Vous pouvez les exporter dans un format standard à tout moment.", tint: "from-rose-50 to-pink-50 border-rose-200/60" },
          ].map((item) => (
            <div key={item.title} className={`flex items-start gap-3 bg-gradient-to-br ${item.tint} border rounded-xl p-5 shadow-sm`}>
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2 — Stack certifiée (alignée à droite) */}
      <div className="mb-20">
        <div className="md:text-right md:ml-auto md:max-w-3xl mb-8">
          <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
            Une stack 100% certifiée, vérifiable publiquement
          </h2>
          <p className="text-sm text-gray-600">
            Chaque brique technique de Synthèse est choisie pour ses certifications de sécurité reconnues. Rien n'est laissé au hasard : hébergement, base de données, IA — tout est audité et documenté. Vous pouvez vérifier chaque certification directement sur les sites officiels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {STACK_CERTIFICATIONS.map((tool) => {
            const IconComp = STACK_ICON_MAP[tool.name];
            return (
              <div key={tool.name} className="bg-gradient-to-br from-white via-violet-50/30 to-pink-50/40 border border-violet-200/50 rounded-2xl p-6 hover:shadow-md hover:shadow-violet-500/10 hover:border-violet-300/60 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {IconComp && <IconComp className="h-5 w-5 text-slate-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tool.name}</p>
                      <p className="text-xs text-gray-500">{tool.role}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md ${tool.certColor}`}>
                    {tool.cert}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">{tool.detail}</p>
                <a
                  href={tool.trustUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tool.trustLabel}
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3 — Dispositif de sécurité (aligné à gauche) */}
      <div className="mb-20">
        <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
          Notre dispositif de sécurité
        </h2>
        <p className="text-sm text-gray-600 mb-8 max-w-3xl">
          La sécurité ne repose pas sur un seul mécanisme, mais sur plusieurs couches complémentaires. Voici ce que nous avons mis en place pour protéger vos données en permanence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {HACKING_CARDS.map((card, i) => {
            const Icon = card.icon;
            const tints = [
              "from-violet-50 to-fuchsia-50 border-violet-200/60 hover:border-violet-300/70 hover:shadow-violet-500/10",
              "from-pink-50 to-rose-50 border-pink-200/60 hover:border-pink-300/70 hover:shadow-pink-500/10",
              "from-fuchsia-50 to-pink-50 border-fuchsia-200/60 hover:border-fuchsia-300/70 hover:shadow-fuchsia-500/10",
              "from-rose-50 to-pink-50 border-rose-200/60 hover:border-rose-300/70 hover:shadow-rose-500/10",
              "from-indigo-50 to-violet-50 border-indigo-200/60 hover:border-indigo-300/70 hover:shadow-indigo-500/10",
            ];
            const iconColors = [
              "bg-violet-100 text-violet-600",
              "bg-pink-100 text-pink-600",
              "bg-fuchsia-100 text-fuchsia-600",
              "bg-rose-100 text-rose-600",
              "bg-indigo-100 text-indigo-600",
            ];
            return (
              <div key={card.title} className={`bg-gradient-to-br ${tints[i % tints.length]} border rounded-xl p-5 hover:shadow-md transition-all`}>
                <div className={`w-9 h-9 rounded-lg ${iconColors[i % iconColors.length]} flex items-center justify-center mb-3`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{card.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            );
          })}
        </div>

      </div>

      {/* SECTION — LA PREUVE PAR L'AUDIT (alignée à droite) */}
      <div className="mb-16 sm:mb-20">
        <div className="md:text-right md:ml-auto md:max-w-3xl mb-6 sm:mb-8">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-violet-600 mb-3">
            Transparence absolue
          </span>
          <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
            La preuve par l'audit — pas juste des promesses
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            À la livraison de votre Synthèse, on ne se contente pas de vous dire qu'il est sécurisé.
            On le prouve. Chaque instance passe par <span className="font-semibold text-gray-900">4 scanners de sécurité indépendants</span>,
            et vous recevez les rapports publics — consultables par n'importe qui, daté du jour de la livraison.
          </p>
        </div>

        {/* Process en 3 étapes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {[
            {
              num: "1",
              icon: Hammer,
              title: "On construit votre Synthèse",
              desc: "Votre instance est développée avec les standards de sécurité les plus stricts dès le départ.",
              color: "from-violet-500 to-violet-600",
            },
            {
              num: "2",
              icon: ScanSearch,
              title: "On le soumet à 4 auditeurs indépendants",
              desc: "Chaque scanner analyse votre instance sous un angle différent : chiffrement, en-têtes, vulnérabilités.",
              color: "from-blue-500 to-blue-600",
            },
            {
              num: "3",
              icon: FileText,
              title: "On vous remet les rapports vérifiables",
              desc: "Vous recevez un lien public pour chaque audit. Consultable par vous, votre DSI, vos clients.",
              color: "from-emerald-500 to-emerald-600",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="rounded-2xl border border-violet-200/50 bg-gradient-to-br from-white via-violet-50/40 to-pink-50/40 p-5 sm:p-6 shadow-sm shadow-violet-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-400">Étape {step.num}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">{step.title}</p>
                <p className="text-[13px] sm:text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Titre "Nos scanners" */}
        <div className="mb-5 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">
            Nos 4 scanners de sécurité
          </h3>
          <p className="text-[13px] sm:text-sm text-gray-500 leading-relaxed">
            Chacun couvre un angle différent. Ensemble, ils couvrent l'intégralité de la surface d'exposition de votre Synthèse.
          </p>
        </div>

        {/* Les 4 auditeurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            {
              name: "Qualys SSL Labs",
              organism: "Qualys · Fortune 500 cybersécurité",
              color: "#dc2626",
              icon: Lock,
              checks: "Vérifie le chiffrement TLS, la robustesse du HTTPS et la résistance aux attaques par interception. Utilisé par les plus grandes banques mondiales.",
              grade: "A+",
              gradeLabel: "Note attendue",
              url: "https://www.ssllabs.com/ssltest/",
            },
            {
              name: "Mozilla Observatory",
              organism: "Mozilla Foundation · éditeur de Firefox",
              color: "#ea580c",
              icon: Eye,
              checks: "Analyse les en-têtes HTTP, les politiques de sécurité de contenu (CSP) et les protections contre les attaques XSS et clickjacking.",
              grade: "A+",
              gradeLabel: "Note attendue",
              url: "https://observatory.mozilla.org",
            },
            {
              name: "Snyk",
              organism: "Snyk Ltd · utilisé par Google, Salesforce",
              color: "#4c2889",
              icon: ShieldCheck,
              checks: "Scanne en continu les dépendances logicielles et détecte les vulnérabilités connues (CVE). Correctifs appliqués dès qu'une faille est publiée.",
              grade: "0 faille",
              gradeLabel: "Résultat attendu",
              url: "https://snyk.io",
            },
            {
              name: "OWASP ZAP",
              organism: "OWASP Foundation · standard mondial",
              color: "#7c3aed",
              icon: FileSearch,
              checks: "Scanner de vulnérabilités couvrant le Top 10 OWASP : injections SQL, XSS, CSRF, failles d'authentification, exposition de données, etc.",
              grade: "0 critique",
              gradeLabel: "Résultat attendu",
              url: "https://www.zaproxy.org",
            },
          ].map((auditor) => {
            const Icon = auditor.icon;
            return (
              <div
                key={auditor.name}
                className="bg-gradient-to-br from-white via-violet-50/20 to-pink-50/30 border border-violet-200/50 rounded-2xl overflow-hidden hover:shadow-md hover:shadow-violet-500/10 hover:border-violet-300/60 transition-all"
              >
                {/* Top stripe avec couleur de l'auditeur */}
                <div className="h-1.5 w-full" style={{ backgroundColor: auditor.color }} />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: auditor.color + "15" }}
                      >
                        <Icon className="h-5 w-5" style={{ color: auditor.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{auditor.name}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">{auditor.organism}</p>
                      </div>
                    </div>
                    {/* Badge note */}
                    <div className="text-right shrink-0">
                      <div
                        className="inline-flex items-center justify-center min-w-[44px] h-9 px-2 rounded-lg font-bold text-sm"
                        style={{
                          color: auditor.color,
                          backgroundColor: auditor.color + "15",
                          border: `1px solid ${auditor.color}30`,
                        }}
                      >
                        {auditor.grade}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{auditor.gradeLabel}</p>
                    </div>
                  </div>

                  <p className="text-[13px] sm:text-xs text-gray-600 leading-relaxed">
                    {auditor.checks}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Closer */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 shrink-0 mt-0.5" />
            <p className="text-[13px] sm:text-sm text-gray-700 leading-relaxed">
              Ce n'est pas Synthèse qui vous dit qu'il est sécurisé.{" "}
              <span className="font-semibold text-gray-900">Ce sont 4 organismes indépendants</span>,
              au moment de la livraison, avec des rapports datés que vous pouvez consulter, garder et partager.
              La sécurité devient un livrable contractuel — pas un argument marketing.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4 — CRM et données clients (alignée à droite) */}
      <div className="mb-20">
        <div className="md:text-right md:ml-auto md:max-w-3xl mb-8">
          <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
            Traitement et gouvernance de vos données clients
          </h2>
          <p className="text-sm text-gray-600">
            Si vous utilisez Synthèse comme CRM ou pour gérer vos contacts clients, voici exactement comment on traite ces données.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              num: "1",
              title: "Vos données clients vous appartiennent",
              desc: "Les noms, emails, numéros de téléphone et historiques que vous importez dans Synthèse restent votre propriété. On ne les utilise jamais à d'autres fins que vous les afficher et vous aider à les gérer.",
              tint: "from-violet-50 via-white to-fuchsia-50 border-violet-200/50",
              badge: "bg-violet-100 text-violet-700",
            },
            {
              num: "2",
              title: "Aucun partage avec des tiers",
              desc: "Vos données clients ne sont jamais vendues, partagées ou transmises à des tiers — ni à des partenaires commerciaux, ni à des régies publicitaires, ni à des data brokers. Jamais.",
              tint: "from-pink-50 via-white to-rose-50 border-pink-200/50",
              badge: "bg-pink-100 text-pink-700",
            },
            {
              num: "3",
              title: "Suppression propre à la résiliation",
              desc: "Si vous résiliez votre abonnement, l'intégralité de vos données (y compris celles de vos clients) est supprimée de nos serveurs dans un délai de 30 jours. Vous pouvez en exporter une copie avant.",
              tint: "from-fuchsia-50 via-white to-violet-50 border-fuchsia-200/50",
              badge: "bg-fuchsia-100 text-fuchsia-700",
            },
          ].map((step) => (
            <div key={step.num} className={`flex items-start gap-5 bg-gradient-to-br ${step.tint} border rounded-xl p-6 shadow-sm`}>
              <div className={`w-8 h-8 rounded-full ${step.badge} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className="text-xs font-bold">{step.num}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 — Trust Center links (aligné à gauche) */}
      <div className="mb-16">
        <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
          Vérifiez par vous-même
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Chaque outil de notre stack publie ses certifications et politiques de confidentialité. Voici les liens officiels.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRUST_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-br from-white via-violet-50/30 to-pink-50/30 border border-violet-200/50 rounded-xl px-5 py-4 hover:border-violet-300/70 hover:shadow-sm hover:shadow-violet-500/10 transition-all group"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: link.color }}
              />
              <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                {link.name}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400 ml-auto group-hover:text-gray-600 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-violet-100 via-pink-50 to-fuchsia-100 border border-violet-200/60 rounded-2xl p-8 text-center shadow-lg shadow-violet-500/5">
        <h3 className="text-2xl sm:text-3xl font-display text-gray-900 mb-2 tracking-tight leading-tight">
          Vous avez encore des questions sur la sécurité ?
        </h3>
        <p className="text-sm text-gray-600 mb-6 max-w-xl mx-auto">
          On est transparents sur tout. Si vous voulez aller plus loin — demander nos attestations, comprendre notre architecture, ou juste avoir une conversation franche — on est disponibles.
        </p>
        <button className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors">
          Parlons-en directement
        </button>
      </div>

    </div>
  );
}
