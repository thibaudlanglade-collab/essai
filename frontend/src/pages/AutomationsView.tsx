/**
 * Dashboard Automations page (brief §6).
 *
 * Two "volets":
 * - Volet 1 (toujours actif) : explique le classement auto déclenché par
 *   Smart Extract quand le prospect valide une facture avec commit_to_invoices.
 * - Volet 2 : connexion Google Drive + surveillance d'un dossier. Le
 *   prospect connecte Drive via popup, colle l'ID d'un dossier (v1 sans
 *   file picker Google), et Synthèse poll ce dossier toutes les 5 min.
 *
 * Route: /dashboard/automations.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  Clock,
  FolderInput,
  Mail,
  MessagesSquare,
  Plus,
  RotateCw,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  disconnectDrive,
  disconnectWatchedFolder,
  getDriveStatus,
  getWatchedFolder,
  setupWatchedFolder,
  startDriveConnect,
  type DriveStatus,
  type WatchedFolder,
} from "@/api/driveClient";
import DriveFolderPicker, {
  type DriveFolderPickerValue,
} from "@/components/DriveFolderPicker/DriveFolderPicker";
import {
  AUTOMATION_TEMPLATES,
  type AutomationTemplate,
} from "@/data/automatisationsDemoData";

const TPL_ICON_MAP: Record<string, typeof Mail> = {
  Mail,
  FolderInput,
  MessagesSquare,
  RotateCw,
  Bell,
};


export default function AutomationsView() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [watched, setWatched] = useState<WatchedFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, w] = await Promise.all([getDriveStatus(), getWatchedFolder()]);
      setStatus(s);
      setWatched(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="py-10 px-6 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <Header />
        {error && (
          <div className="mb-6 px-4 py-2.5 rounded border border-red-200 bg-red-50 text-sm text-red-900">
            {error}
          </div>
        )}
        <Volet1Card />
        <Volet2Card
          status={status}
          watched={watched}
          loading={loading}
          onRefresh={refresh}
        />
        <TemplatesSection />
      </div>
    </div>
  );
}

// ── Templates prêts à l'emploi ──────────────────────────────────────────────

function TemplatesSection() {
  const [activated, setActivated] = useState<Set<string>>(new Set());
  const categories = Array.from(
    new Set(AUTOMATION_TEMPLATES.map((t) => t.category)),
  );

  function activate(id: string) {
    setActivated((prev) => new Set(prev).add(id));
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-medium text-violet-700 mb-2">
            <Sparkles className="h-3 w-3" />
            Bibliothèque
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Modèles prêts à l'emploi
          </h2>
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-6">
        Plutôt que de partir d'une page blanche, choisissez un modèle déjà
        paramétré pour les besoins courants. Vous l'adaptez ensuite à vos
        dossiers et vos règles.
      </p>

      {categories.map((category) => {
        const templates = AUTOMATION_TEMPLATES.filter(
          (t) => t.category === category,
        );
        return (
          <div key={category} className="mb-7 last:mb-0">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  activated={activated.has(tpl.id)}
                  onActivate={() => activate(tpl.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TemplateCard({
  template,
  activated,
  onActivate,
}: {
  template: AutomationTemplate;
  activated: boolean;
  onActivate: () => void;
}) {
  const Icon = TPL_ICON_MAP[template.iconName] || Zap;

  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:border-violet-200 hover:shadow-sm transition-all flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg ${template.iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`h-4 w-4 ${template.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
              {template.title}
            </h4>
            {template.popular && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide shrink-0">
                Populaire
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {template.description}
          </p>
        </div>
      </div>

      <div className="bg-stone-50 rounded p-2.5 mb-3 space-y-1.5">
        <div className="flex items-start gap-2 text-xs">
          <span className="font-semibold text-amber-700 shrink-0">Quand</span>
          <span className="text-gray-700">{template.trigger}</span>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <span className="font-semibold text-emerald-700 shrink-0">Alors</span>
          <span className="text-gray-700">{template.action}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
          <Clock className="h-3 w-3" />~{template.estimatedSetupMinutes} min
        </span>
        <button
          type="button"
          onClick={onActivate}
          disabled={activated}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
            activated
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
              : "bg-gray-900 text-white hover:bg-gray-700"
          }`}
        >
          {activated ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Activé
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Activer
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
        Ces enchaînements s'exécutent pour vous. Le premier est actif dès que
        vous validez un document dans Smart Extract. Le second lit un dossier
        Google Drive de votre choix toutes les cinq minutes.
      </p>
    </div>
  );
}

function Volet1Card() {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-900 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Actif
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Classement automatique à l'enregistrement
          </h2>
        </div>
        <Link
          to="/dashboard/extract"
          className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2 whitespace-nowrap"
        >
          Ouvrir Smart Extract →
        </Link>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-3">
        Quand vous validez une facture dans Smart Extract en cochant{" "}
        <span className="font-medium">
          « Ajouter cette facture à mon historique fournisseur »
        </span>
        , Synthèse applique en une fois :
      </p>
      <ol className="text-sm text-gray-700 leading-relaxed space-y-1.5 pl-5 list-decimal marker:text-gray-400">
        <li>
          Renommage du fichier au schéma{" "}
          <code className="bg-stone-100 px-1 rounded text-[12px]">
            AAAA-MM-JJ_Fournisseur_FacN&lt;numéro&gt;_&lt;montant&gt;EUR.pdf
          </code>
          .
        </li>
        <li>
          Classement dans{" "}
          <code className="bg-stone-100 px-1 rounded text-[12px]">
            Factures/&lt;Fournisseur&gt;/&lt;Mois_Année&gt;/
          </code>
          .
        </li>
        <li>
          Ajout d'une ligne dans{" "}
          <code className="bg-stone-100 px-1 rounded text-[12px]">
            Suivi_Factures_&lt;année&gt;.xlsx
          </code>{" "}
          (créé s'il n'existe pas).
        </li>
      </ol>
    </section>
  );
}

function Volet2Card({
  status,
  watched,
  loading,
  onRefresh,
}: {
  status: DriveStatus | null;
  watched: WatchedFolder | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickerValue, setPickerValue] = useState<DriveFolderPickerValue>({
    folder_id: "",
    folder_name: "",
  });
  const popupRef = useRef<Window | null>(null);

  const connected = !!status?.connected;

  async function handleConnect() {
    setBusy("connect");
    setLocalError(null);
    try {
      const { auth_url } = await startDriveConnect();
      const popup = window.open(
        auth_url,
        "synthese-drive-oauth",
        "width=520,height=640,noopener=no",
      );
      if (!popup) {
        throw new Error(
          "Le navigateur a bloqué la popup. Autorisez les popups pour synthese.fr puis réessayez.",
        );
      }
      popupRef.current = popup;

      // Poll until the popup closes, then refresh the state. No postMessage
      // (Google would strip it) — we detect closure instead and re-fetch.
      const interval = window.setInterval(async () => {
        if (popup.closed) {
          window.clearInterval(interval);
          popupRef.current = null;
          await onRefresh();
        }
      }, 1000);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Déconnecter votre Drive supprimera aussi le dossier surveillé. Confirmer ?",
      )
    ) {
      return;
    }
    setBusy("disconnect");
    setLocalError(null);
    try {
      await disconnectDrive();
      await onRefresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSetupWatched() {
    const fid = pickerValue.folder_id.trim();
    if (!fid) return;
    setBusy("setup");
    setLocalError(null);
    try {
      await setupWatchedFolder({
        folder_id: fid,
        folder_name: pickerValue.folder_name.trim() || undefined,
      });
      setPickerValue({ folder_id: "", folder_name: "" });
      await onRefresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStopWatched() {
    setBusy("stop");
    setLocalError(null);
    try {
      await disconnectWatchedFolder();
      await onRefresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium mb-2 border ${
              connected
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-stone-100 border-gray-200 text-gray-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            {connected ? "Drive connecté" : "Drive non connecté"}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Surveillance d'un dossier Google Drive
          </h2>
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-4">
        Déposez vos factures dans un dossier Drive de votre choix. Synthèse le
        consulte toutes les cinq minutes, traite les nouveaux fichiers, les
        classe au même endroit que le volet 1, et met à jour le suivi Excel.
      </p>

      <div className="mb-4 px-3 py-2.5 rounded border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed">
        <span className="font-medium">Version test</span> : pendant la
        connexion, Google affichera un écran « Google n'a pas vérifié cette
        application ». C'est normal. Cliquez sur{" "}
        <span className="font-medium">Paramètres avancés</span> puis{" "}
        <span className="font-medium">Accéder à synthese.fr</span> pour continuer.
      </div>

      {localError && (
        <div className="mb-4 px-3 py-2 rounded border border-red-200 bg-red-50 text-sm text-red-900">
          {localError}
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-500">Chargement de l'état…</p>
      )}

      {!loading && !connected && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={busy === "connect"}
          className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {busy === "connect" ? "Connexion…" : "Connecter mon Google Drive"}
        </button>
      )}

      {!loading && connected && (
        <div>
          <div className="text-sm text-gray-700 mb-4">
            Connecté en tant que{" "}
            <span className="font-mono text-gray-900">
              {status?.account_email || "compte inconnu"}
            </span>
            .{" "}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={!!busy}
              className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50"
            >
              Déconnecter
            </button>
          </div>

          {watched ? (
            <WatchedFolderDisplay
              watched={watched}
              onStop={handleStopWatched}
              busy={busy === "stop"}
            />
          ) : (
            <WatchedFolderForm
              pickerValue={pickerValue}
              onPickerChange={setPickerValue}
              onSubmit={handleSetupWatched}
              busy={busy === "setup"}
            />
          )}
        </div>
      )}
    </section>
  );
}

function WatchedFolderDisplay({
  watched,
  onStop,
  busy,
}: {
  watched: WatchedFolder;
  onStop: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded border border-gray-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {watched.folder_name || "Dossier sans nom"}
          </p>
          <p className="text-xs text-gray-500 font-mono break-all">
            ID : {watched.folder_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onStop}
          disabled={busy}
          className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50 whitespace-nowrap"
        >
          Arrêter la surveillance
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
        <div>
          <span className="block text-gray-500">Fichiers traités</span>
          <span className="text-gray-900 font-medium">
            {watched.files_processed}
          </span>
        </div>
        <div>
          <span className="block text-gray-500">Dernière vérification</span>
          <span className="text-gray-900 font-medium">
            {formatRelative(watched.last_checked_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function WatchedFolderForm({
  pickerValue,
  onPickerChange,
  onSubmit,
  busy,
}: {
  pickerValue: DriveFolderPickerValue;
  onPickerChange: (next: DriveFolderPickerValue) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <p className="text-sm text-gray-700 mb-3">
        Choisissez un dossier Drive dans la liste ci-dessous. Synthèse le
        consulte toutes les cinq minutes et classe les nouveaux fichiers.
      </p>
      <div className="mb-3">
        <DriveFolderPicker
          value={pickerValue}
          onChange={onPickerChange}
          label="Dossier à surveiller"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !pickerValue.folder_id.trim()}
        className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {busy ? "Activation…" : "Activer la surveillance"}
      </button>
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Jamais";
  try {
    const delta = Date.now() - new Date(iso).getTime();
    const mins = Math.round(delta / 60000);
    if (mins < 1) return "il y a quelques secondes";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.round(hours / 24);
    return `il y a ${days} j`;
  } catch {
    return "";
  }
}
