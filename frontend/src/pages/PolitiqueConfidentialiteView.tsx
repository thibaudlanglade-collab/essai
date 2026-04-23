import {
  Lock,
  FileText,
  Database,
  Cookie,
  UserCheck,
  Mail,
  Clock,
  Shield,
  Settings,
} from "lucide-react";
import { openCookieConsent } from "../components/CookieConsent";

export default function PolitiqueConfidentialiteView() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10" id="politique-confidentialite">
      {/* HERO */}
      <div className="text-center mb-12">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm shadow-emerald-500/10">
          <Lock className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-gray-900 mb-4 tracking-tight leading-tight">
          Politique de confidentialité
        </h1>
        <p className="text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
          Comment nous traitons vos données personnelles, conformément au Règlement Général
          sur la Protection des Données (RGPD).
        </p>
      </div>

      {/* Responsable du traitement */}
      <Section icon={UserCheck} title="Responsable du traitement">
        <p className="text-sm text-gray-700 leading-relaxed">
          Le responsable du traitement des données collectées sur synthèse.fr est{" "}
          <strong>Thibaud Langlade</strong>. Pour toute question relative à vos données
          personnelles, vous pouvez nous contacter à l'adresse{" "}
          <a
            href="mailto:langlade.thibaud@xn--synthse-6xa.fr"
            className="text-violet-600 hover:underline font-medium"
          >
            langlade.thibaud@synthèse.fr
          </a>
          .
        </p>
      </Section>

      {/* Données collectées */}
      <Section icon={Database} title="Données collectées">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Nous collectons uniquement les données strictement nécessaires aux finalités
          décrites ci-dessous.
        </p>

        <DataBlock
          title="Formulaire de contact / demande de démo"
          items={[
            "Nom et prénom",
            "Adresse e-mail",
            "Numéro de téléphone (facultatif)",
            "Nom de l'entreprise (facultatif)",
            "Message libre",
          ]}
          legal="Base légale : intérêt légitime (article 6.1.f du RGPD) — répondre à votre demande de contact."
        />

        <DataBlock
          title="Mesure d'audience (Google Analytics 4)"
          items={[
            "Pages visitées et durée de visite",
            "Type d'appareil et navigateur",
            "Source de provenance (moteur de recherche, lien direct, etc.)",
            "Adresse IP anonymisée (les derniers chiffres sont masqués)",
          ]}
          legal="Base légale : consentement (article 6.1.a du RGPD) — Google Analytics n'est activé que si vous acceptez les cookies via la bannière de consentement."
        />
      </Section>

      {/* Finalités */}
      <Section icon={FileText} title="Finalités du traitement">
        <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Répondre à vos demandes</strong> de contact, de démonstration ou
              d'information commerciale.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Améliorer notre site</strong> en analysant les pages les plus
              consultées et le parcours des visiteurs (uniquement si vous acceptez les
              cookies de mesure).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Assurer la sécurité du site</strong> et prévenir les utilisations
              abusives.
            </span>
          </li>
        </ul>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-900 leading-relaxed">
            <strong>Important :</strong> vos données ne sont jamais vendues, louées ou
            cédées à des tiers à des fins commerciales ou publicitaires.
          </p>
        </div>
      </Section>

      {/* Durée de conservation */}
      <Section icon={Clock} title="Durée de conservation">
        <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Données issues du formulaire de contact</strong> : 3 ans à compter
              du dernier échange, conformément à la recommandation de la CNIL pour la
              prospection commerciale B2B.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Données Google Analytics</strong> : 14 mois maximum, durée par
              défaut configurée sur la propriété GA4.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              <strong>Cookies de consentement</strong> : 6 mois après votre choix, après
              quoi la bannière vous est représentée.
            </span>
          </li>
        </ul>
      </Section>

      {/* Cookies */}
      <Section icon={Cookie} title="Cookies et traceurs">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Notre site utilise deux catégories de cookies :
        </p>

        <div className="space-y-3 mb-4">
          <CookieItem
            type="Cookies techniques (toujours actifs)"
            desc="Indispensables au fonctionnement du site. Aucun consentement n'est requis."
            tag="Exempt de consentement"
            tagColor="bg-gray-100 text-gray-700"
          />
          <CookieItem
            type="Cookies de mesure d'audience — Google Analytics 4"
            desc="Mesurent l'audience du site de manière anonymisée. Activés uniquement après votre consentement explicite via la bannière."
            tag="Consentement requis"
            tagColor="bg-amber-100 text-amber-800"
          />
        </div>

        <button
          onClick={openCookieConsent}
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Modifier mes préférences cookies
        </button>
      </Section>

      {/* Destinataires */}
      <Section icon={Shield} title="Destinataires des données">
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          Vos données sont accessibles uniquement à :
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>L'éditeur du site (Thibaud Langlade)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-violet-500 font-bold">·</span>
            <span>
              Nos sous-traitants techniques :{" "}
              <strong>Railway</strong> (hébergement, États-Unis — conforme via Data
              Privacy Framework), <strong>Google Ireland Ltd.</strong> (Google Analytics,
              Irlande), et notre fournisseur d'envoi d'e-mails transactionnels.
            </span>
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Tous nos sous-traitants sont liés contractuellement par des engagements de
          confidentialité et de conformité au RGPD.
        </p>
      </Section>

      {/* Droits */}
      <Section icon={UserCheck} title="Vos droits">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Conformément au RGPD, vous disposez des droits suivants sur vos données :
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            ["Droit d'accès", "obtenir une copie de vos données"],
            ["Droit de rectification", "corriger une donnée inexacte"],
            ["Droit à l'effacement", "demander la suppression de vos données"],
            ["Droit d'opposition", "vous opposer à un traitement"],
            ["Droit à la portabilité", "récupérer vos données dans un format structuré"],
            ["Droit de retrait du consentement", "à tout moment, sans justification"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-3">
              <span className="text-violet-500 font-bold">·</span>
              <span>
                <strong>{title}</strong> — {desc}.
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 bg-violet-50 border border-violet-200 rounded-lg p-4">
          <p className="text-sm text-gray-800 leading-relaxed">
            Pour exercer ces droits, écrivez-nous à{" "}
            <a
              href="mailto:langlade.thibaud@xn--synthse-6xa.fr"
              className="text-violet-600 hover:underline font-medium"
            >
              langlade.thibaud@synthèse.fr
            </a>
            . Nous répondons dans un délai maximum d'un mois.
          </p>
          <p className="text-xs text-gray-600 mt-3 leading-relaxed">
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire
            une réclamation auprès de la{" "}
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline"
            >
              CNIL
            </a>
            .
          </p>
        </div>
      </Section>

      {/* Sécurité */}
      <Section icon={Lock} title="Sécurité">
        <p className="text-sm text-gray-700 leading-relaxed">
          Vos données sont protégées par un chiffrement TLS 1.3 en transit et AES-256 au
          repos. L'infrastructure est hébergée chez Railway (certifié SOC 2 Type II). Les
          détails complets de notre dispositif de sécurité sont disponibles sur notre{" "}
          <a href="#rgpd" className="text-violet-600 hover:underline font-medium">
            page RGPD
          </a>
          .
        </p>
      </Section>

      {/* Contact */}
      <Section icon={Mail} title="Contact">
        <p className="text-sm text-gray-700 leading-relaxed">
          Pour toute question relative à cette politique ou au traitement de vos données,
          contactez-nous à{" "}
          <a
            href="mailto:langlade.thibaud@xn--synthse-6xa.fr"
            className="text-violet-600 hover:underline font-medium"
          >
            langlade.thibaud@synthèse.fr
          </a>
          .
        </p>
      </Section>

      <p className="text-xs text-gray-400 text-center mt-12">
        Dernière mise à jour : avril 2026
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-emerald-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DataBlock({
  title,
  items,
  legal,
}: {
  title: string;
  items: string[];
  legal: string;
}) {
  return (
    <div className="mb-4 last:mb-0 bg-gray-50 border border-gray-100 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-900 mb-2">{title}</p>
      <ul className="space-y-1 mb-3">
        {items.map((item) => (
          <li key={item} className="text-sm text-gray-700 flex gap-2">
            <span className="text-gray-400">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 italic leading-relaxed">{legal}</p>
    </div>
  );
}

function CookieItem({
  type,
  desc,
  tag,
  tagColor,
}: {
  type: string;
  desc: string;
  tag: string;
  tagColor: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-medium text-gray-900">{type}</p>
        <span
          className={`shrink-0 inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md ${tagColor}`}
        >
          {tag}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
