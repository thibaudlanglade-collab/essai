import {
  Mail,
  Phone,
  MessageSquare,
  CalendarCheck,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function ContactView() {
  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 40%, transparent 70%)",
        }}
      />

      {/* ─── Hero ─── */}
      <div className="text-center mb-14 sm:mb-20">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/80 text-violet-700 border border-violet-200/70 mb-5 shadow-sm shadow-violet-500/5 backdrop-blur">
          <Sparkles className="h-3 w-3" />
          Réponse sous 24 h
        </span>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-gray-900 mb-5 leading-[1.05]">
          Parlons de votre activité
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
          Un email, un appel — même en deux lignes. On prend le temps de
          comprendre votre besoin avant de proposer quoi que ce soit.
        </p>
      </div>

      {/* ─── Contact CTAs ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-20 sm:mb-24">
        <ContactCta
          href="tel:+33769455078"
          icon={<Phone className="h-5 w-5 text-white" />}
          label="Téléphone"
          value="07 69 45 50 78"
          helper="Lundi → vendredi · 9h-19h"
        />
        <ContactCta
          href="mailto:thibaud@synthese.app"
          icon={<Mail className="h-5 w-5 text-white" />}
          label="Email"
          value="thibaud@synthese.app"
          helper="On répond dans la journée"
        />
      </div>

      {/* ─── Comment ça se passe ─── */}
      <div>
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-violet-600 mb-2">
            Et ensuite
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 leading-tight">
            Comment ça se passe
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <Step
            n={1}
            icon={<MessageSquare className="h-5 w-5" />}
            title="Vous envoyez un message"
            body="Un email ou un appel, même en deux lignes. Pas de jargon, pas de formulaire interminable."
          />
          <Step
            n={2}
            icon={<CalendarCheck className="h-5 w-5" />}
            title="On prend contact"
            body="On vous répond sous 24 h et on se fixe un rendez-vous téléphonique si vous le souhaitez."
          />
          <Step
            n={3}
            icon={<Clock className="h-5 w-5" />}
            title="On discute concrètement"
            body="Démo personnalisée avec vos propres cas, estimation adaptée à votre contexte."
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────── sub-components ─────────── */

function ContactCta(props: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <a
      href={props.href}
      className="group relative flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
        {props.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
          {props.label}
        </div>
        <div className="text-[15px] sm:text-base font-semibold text-gray-900 truncate">
          {props.value}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{props.helper}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </a>
  );
}

function Step(props: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 hover:shadow-md hover:border-violet-200 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 flex items-center justify-center shrink-0">
          {props.icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-violet-600">
          Étape {props.n}
        </span>
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 leading-snug">
        {props.title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
        {props.body}
      </p>
    </div>
  );
}
