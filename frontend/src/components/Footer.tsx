import { Sparkles, Mail, Phone, MapPin, User, Facebook, Linkedin } from "lucide-react";
import { useNavigate } from "../lib/navigate";
import { openCookieConsent } from "./CookieConsent";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Col 1 — brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold text-gray-900">
                Synthèse
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              L'assistant IA qui comprend votre activité et automatise les
              tâches répétitives — simplement, en français.
            </p>
          </div>

          {/* Col 2 — nav */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-gray-900">
              Navigation
            </span>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <button
                  onClick={() => navigate("/")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/comprendre")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Comprendre
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/qui-sommes-nous")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Qui sommes-nous
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/tarification")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Tarification
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/rgpd")}
                  className="hover:text-violet-600 transition-colors"
                >
                  RGPD
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/mentions-legales")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Mentions légales
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/politique-confidentialite")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Politique de confidentialité
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-violet-600 transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 — contact */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-gray-900">Contact</span>
            <ul className="flex flex-col gap-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-gray-400" />
                Thibaud Langlade
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <a
                  href="mailto:thibaud@synthese.app"
                  className="hover:text-violet-600 transition-colors break-all"
                >
                  thibaud@synthese.app
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <a
                  href="tel:+33769455078"
                  className="hover:text-violet-600 transition-colors"
                >
                  07 69 45 50 78
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                France
              </li>
              <li className="flex items-center gap-3 pt-1">
                <a
                  href="https://www.linkedin.com/company/113218148/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61560648534495"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-y-2 gap-x-4 text-xs text-gray-500">
          <span>© 2025 Synthèse · RGPD conforme</span>
          <Sep />
          <button
            onClick={openCookieConsent}
            className="hover:text-violet-600 transition-colors"
          >
            Préférences cookies
          </button>
        </div>
      </div>
    </footer>
  );
}

function Sep() {
  return <span className="hidden sm:inline text-gray-300">·</span>;
}
