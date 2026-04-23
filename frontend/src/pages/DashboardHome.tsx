/**
 * Dashboard landing inside the protected shell.
 *
 * Mounted at `/dashboard`. The shell (DashboardShell) provides the
 * sidebar and topbar; this component is the first thing a trial visitor
 * sees — a warm, colorful welcome that mirrors the public landing page's
 * visual language.
 */
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Sparkles,
  Zap,
  FileText,
  BarChart3,
  ShieldCheck,
  Mail,
  Clock,
  ArrowRight,
  Lock,
  Server,
  Trash2,
} from "lucide-react";
import type { AuthContextShape } from "@/layouts/ProtectedLayout";


interface QuickStartCard {
  icon: typeof Zap;
  title: string;
  description: string;
  to: string;
  tint: string;
  accent: string;
}


const QUICK_START: QuickStartCard[] = [
  {
    icon: Zap,
    title: "Smart Extract",
    description:
      "Déposez un document — Synthèse l'identifie, en extrait les infos utiles et vous propose un rangement.",
    to: "/dashboard/extract",
    tint: "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 border-violet-200/70",
    accent: "#7c3aed",
  },
  {
    icon: FileText,
    title: "Générer un devis",
    description:
      "Décrivez un chantier ou collez un email client : Synthèse prépare un devis structuré en quelques secondes.",
    to: "/dashboard/devis",
    tint: "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 border-emerald-200/70",
    accent: "#059669",
  },
  {
    icon: BarChart3,
    title: "Rapport client",
    description:
      "Choisissez un client, posez votre question : CA cumulé, factures en retard, résumé des échanges, devis en attente.",
    to: "/dashboard/clients",
    tint: "bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 border-indigo-200/70",
    accent: "#4f46e5",
  },
];


const RGPD_POINTS = [
  {
    icon: Lock,
    label: "Espace isolé, chiffré",
  },
  {
    icon: Server,
    label: "Hébergement en France",
  },
  {
    icon: Trash2,
    label: "Suppression à l'issue de l'essai",
  },
];


export default function DashboardHome() {
  const { user } = useOutletContext<AuthContextShape>();
  const navigate = useNavigate();
  const daysLeft = user.days_left;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      {/* HERO */}
      <div className="mb-10">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 mb-5">
          <Clock className="h-3 w-3" />
          {daysLeft > 1
            ? `${daysLeft} jours pour explorer`
            : daysLeft === 1
              ? "Dernier jour de votre essai"
              : "Essai terminé"}
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-4 leading-tight tracking-tight">
          Bonjour
        </h1>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed max-w-4xl">
          Votre essai Synthèse est lancé. Pendant 14 jours, vous avez accès à
          un extrait de nos fonctionnalités pour les tester avec vos
          données. Baladez-vous dans le menu à gauche et testez librement.
          L'équipe de Synthèse vous souhaite un bon essai.
        </p>
      </div>

      {/* QUICK START */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            Par où commencer ?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUICK_START.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                onClick={() => navigate(card.to)}
                className={`group relative overflow-hidden text-left rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${card.tint}`}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: `radial-gradient(${card.accent} 1px, transparent 1px)`,
                    backgroundSize: "18px 18px",
                  }}
                  aria-hidden
                />
                <div className="relative z-10">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-white mb-4"
                    style={{ color: card.accent }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight leading-tight mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-gray-700 leading-relaxed mb-4">
                    {card.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2"
                    style={{ color: card.accent }}
                  >
                    Essayer
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RGPD */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">
                Vos données restent chez vous
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Tout ce que vous ajoutez pendant vos {daysLeft > 0 ? daysLeft : 14} jours
                d'essai est cloisonné dans votre espace personnel. Aucun
                partage avec un autre prospect, aucune réutilisation de notre
                côté, conformité RGPD.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {RGPD_POINTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 bg-white/80 border border-emerald-200/60 text-[13px] text-gray-700 px-3 py-1.5 rounded-full"
              >
                <Icon className="h-3.5 w-3.5 text-emerald-600" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-100 via-pink-50 to-fuchsia-100 p-8 sm:p-10 text-center shadow-lg shadow-violet-500/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(#7c3aed 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
            aria-hidden
          />
          <div className="relative z-10 max-w-xl mx-auto">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm mb-4">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 tracking-tight">
              Synthèse vous plaît&nbsp;?
            </h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-7">
              Écrivez-moi un mot : je construirai avec vous une version
              adaptée à votre métier, vos documents et vos process. Pas de
              démarchage automatique — je vous réponds en personne.
            </p>
            <a
              href="mailto:contact@synthese.fr?subject=Synthèse%20—%20intéressé(e)%20après%20l'essai"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Prendre contact
            </a>
            <p className="mt-5 text-xs sm:text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Thibaud Langlade</span>{" "}
              ·{" "}
              <a
                href="mailto:contact@synthese.fr"
                className="underline underline-offset-2 hover:text-gray-900"
              >
                contact@synthese.fr
              </a>{" "}
              · 07&nbsp;69&nbsp;45&nbsp;50&nbsp;78
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
