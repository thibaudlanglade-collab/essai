import { Rocket, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "../lib/navigate";

interface DemoCalloutProps {
  variant?: "full" | "compact";
  className?: string;
}

export default function DemoCallout({ variant = "full", className = "" }: DemoCalloutProps) {
  const navigate = useNavigate();

  if (variant === "compact") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-blue-50 px-5 py-5 sm:px-6 sm:py-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-md shadow-violet-500/20">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                Essayez Synthèse 14 jours gratuitement
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">
                Demandez votre démo et obtenez-la directement, sans nous contacter.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/demo")}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-sm hover:shadow-md"
          >
            <Sparkles className="h-4 w-4" />
            Obtenir mon aperçu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-100 via-pink-50 to-fuchsia-100 p-6 sm:p-8 md:p-10 text-center shadow-lg shadow-violet-500/10 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(#7c3aed 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/80 text-violet-700 border border-violet-200 mb-4">
          <Zap className="h-3 w-3" />
          14 jours offerts · sans engagement
        </span>

        <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3 leading-tight tracking-tight max-w-2xl">
          Vous voulez essayer toutes ces fonctionnalités et plus pendant 14 jours gratuitement ?
        </h3>

        <p className="text-sm sm:text-base text-gray-700 mb-6 max-w-xl mx-auto leading-relaxed">
          Un seul clic suffit pour accéder à votre démo, <strong>tout de suite et
          gratuitement</strong>. Pas de formulaire à remplir, pas d'appel à attendre.
        </p>

        <button
          onClick={() => navigate("/demo")}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
          Obtenir ma démo gratuitement
        </button>

        <p className="mt-3 text-[11px] sm:text-xs text-gray-500">
          Aucune carte bancaire requise · Accès immédiat
        </p>
      </div>
    </div>
  );
}
