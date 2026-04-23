import { Scale, Mail, Phone, Globe, Server, Shield, AlertCircle } from "lucide-react";

export default function MentionsLegalesView() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* HERO */}
      <div className="text-center mb-12">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-gray-100 border border-slate-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Scale className="h-7 w-7 text-slate-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-gray-900 mb-4 tracking-tight leading-tight">
          Mentions légales
        </h1>
        <p className="text-base text-gray-600 max-w-xl mx-auto">
          Informations légales relatives au site synthèse.fr, conformément à la loi
          n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique.
        </p>
      </div>

      {/* Éditeur */}
      <Section icon={Globe} title="Éditeur du site">
        <Field label="Nom" value="Thibaud Langlade" />
        <Field label="Statut" value="Service en cours d'immatriculation" />
        <Field
          label="Email"
          value={
            <a href="mailto:langlade.thibaud@xn--synthse-6xa.fr" className="text-violet-600 hover:underline">
              langlade.thibaud@synthèse.fr
            </a>
          }
        />
        <Field
          label="Téléphone"
          value={
            <a href="tel:+33769455078" className="text-violet-600 hover:underline">
              07 69 45 50 78
            </a>
          }
        />
        <Field label="Pays" value="France" />
      </Section>

      {/* Directeur publication */}
      <Section icon={Mail} title="Directeur de la publication">
        <p className="text-sm text-gray-700 leading-relaxed">
          Thibaud Langlade, en sa qualité d'éditeur du site.
        </p>
      </Section>

      {/* Hébergement */}
      <Section icon={Server} title="Hébergeur">
        <Field label="Société" value="Railway Corporation" />
        <Field label="Adresse" value="2261 Market Street #4382, San Francisco, CA 94114, États-Unis" />
        <Field
          label="Site"
          value={
            <a
              href="https://railway.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline"
            >
              railway.com
            </a>
          }
        />
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Railway est certifié SOC 2 Type II. L'infrastructure utilisée pour héberger
          synthèse.fr est conforme aux standards internationaux de sécurité.
        </p>
      </Section>

      {/* Propriété intellectuelle */}
      <Section icon={Shield} title="Propriété intellectuelle">
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          L'ensemble des éléments présents sur le site synthèse.fr (textes, images,
          logos, graphismes, code source, marque « Synthèse ») est protégé par le droit
          d'auteur et le droit des marques.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          Toute reproduction, représentation, modification, publication ou adaptation,
          totale ou partielle, sans autorisation écrite préalable est interdite et constitue
          une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la
          propriété intellectuelle.
        </p>
      </Section>

      {/* Données personnelles */}
      <Section icon={Phone} title="Données personnelles & cookies">
        <p className="text-sm text-gray-700 leading-relaxed">
          Le traitement des données personnelles collectées via ce site est détaillé dans
          notre{" "}
          <a
            href="#politique-confidentialite"
            className="text-violet-600 hover:underline font-medium"
          >
            politique de confidentialité
          </a>
          . Vous pouvez à tout moment modifier vos préférences cookies depuis le pied de
          page du site.
        </p>
      </Section>

      {/* Responsabilité */}
      <Section icon={AlertCircle} title="Limitation de responsabilité">
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations
          diffusées sur ce site. Toutefois, il ne peut garantir l'exhaustivité ou
          l'absence d'erreurs des informations mises à disposition.
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          L'éditeur ne saurait être tenu responsable des dommages directs ou indirects
          résultant de l'accès au site ou de l'utilisation des informations qui y sont
          présentées.
        </p>
      </Section>

      {/* Droit applicable */}
      <Section icon={Scale} title="Droit applicable">
        <p className="text-sm text-gray-700 leading-relaxed">
          Les présentes mentions légales sont régies par le droit français. Tout litige
          relatif à l'utilisation du site relève de la compétence exclusive des tribunaux
          français.
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
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-violet-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 text-sm">
      <span className="text-gray-500 sm:w-32 shrink-0">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
