import { useState, type FormEvent } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Sparkles,
  Shield,
  Globe,
  MessageSquare,
  PhoneCall,
  Clock,
} from "lucide-react";

type FormState = {
  nom: string;
  entreprise: string;
  email: string;
  telephone: string;
  message: string;
};

const INITIAL: FormState = {
  nom: "",
  entreprise: "",
  email: "",
  telephone: "",
  message: "",
};

export default function ContactView() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nom.trim() || !form.email.trim()) return;
    setSubmitting(true);

    const subject = `Nouveau contact — ${form.nom}${form.entreprise ? ` (${form.entreprise})` : ""}`;
    const bodyLines = [
      `Nom : ${form.nom}`,
      `Entreprise : ${form.entreprise || "—"}`,
      `Email : ${form.email}`,
      `Téléphone : ${form.telephone || "—"}`,
      "",
      "Message :",
      form.message || "—",
    ];
    const mailto =
      "mailto:contact@synthèse.fr" +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailto;

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  }

  function resetForm() {
    setForm(INITIAL);
    setSubmitted(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
          <Mail className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            Parlons de votre activité
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Racontez-nous ce qui vous occupe — on vous répond sous 24&nbsp;h.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* ─────────── Left: Form (3/5) ─────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Message envoyé&nbsp;!
                </h2>
                <p className="text-sm text-gray-600 max-w-md mb-6">
                  Merci pour votre message. Un membre de l'équipe vous
                  recontactera dans les 24 heures ouvrées.
                </p>
                <button
                  onClick={resetForm}
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Nom"
                    required
                    value={form.nom}
                    onChange={(v) => update("nom", v)}
                    placeholder="Jean-Michel Durand"
                  />
                  <Field
                    label="Entreprise"
                    value={form.entreprise}
                    onChange={(v) => update("entreprise", v)}
                    placeholder="Durand BTP"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Email"
                    required
                    type="email"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    placeholder="jm.durand@durandbtp.fr"
                  />
                  <Field
                    label="Téléphone"
                    type="tel"
                    value={form.telephone}
                    onChange={(v) => update("telephone", v)}
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Ex : Je gère une PME de BTP avec 12 salariés. On reçoit beaucoup de factures fournisseurs en PDF et je perds un temps fou à les saisir. Comment Synthèse pourrait m'aider ?"
                    className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.nom.trim() || !form.email.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Envoyer ma demande
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  En envoyant ce formulaire, vous acceptez d'être recontacté par
                  un membre de l'équipe Synthèse.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* ─────────── Right: Contact info (2/5) ─────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Contact card */}
          <div className="bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl p-6 text-white shadow-md">
            <h3 className="text-base font-semibold mb-4">Nos coordonnées</h3>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <a
                  href="tel:+33769455078"
                  className="hover:underline underline-offset-2"
                >
                  07 69 45 50 78
                </a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <a
                  href="mailto:contact@synthèse.fr"
                  className="hover:underline underline-offset-2"
                >
                  contact@synthèse.fr
                </a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>France</span>
              </li>
            </ul>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Comment ça se passe
            </h3>
            <ol className="flex flex-col gap-4">
              <Step
                icon={<MessageSquare className="h-4 w-4" />}
                title="Vous envoyez un message"
                body="Décrivez votre besoin, même en deux lignes. Pas de jargon requis."
              />
              <Step
                icon={<PhoneCall className="h-4 w-4" />}
                title="On vous rappelle sous 24 h"
                body="Un échange court pour comprendre votre activité et vos priorités."
              />
              <Step
                icon={<Clock className="h-4 w-4" />}
                title="On discute concrètement"
                body="Démo personnalisée et estimation adaptées à votre contexte."
              />
            </ol>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            <Badge icon={<Sparkles className="h-4 w-4" />} label="Gratuit" />
            <Badge icon={<Globe className="h-4 w-4" />} label="France" />
            <Badge icon={<Shield className="h-4 w-4" />} label="RGPD" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── small components ─────────── */

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {props.label}
        {props.required && <span className="text-violet-600">&nbsp;*</span>}
      </label>
      <input
        type={props.type ?? "text"}
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
      />
    </div>
  );
}

function Step(props: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
        {props.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">
          {props.title}
        </span>
        <span className="text-xs text-gray-600 leading-relaxed mt-0.5">
          {props.body}
        </span>
      </div>
    </li>
  );
}

function Badge(props: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3 bg-white border border-gray-200 rounded-xl text-gray-700">
      <span className="text-violet-600">{props.icon}</span>
      <span className="text-xs font-semibold">{props.label}</span>
    </div>
  );
}
