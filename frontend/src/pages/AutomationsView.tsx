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
  disconnectDrive,
  disconnectWatchedFolder,
  getDriveStatus,
  getWatchedFolder,
  setupWatchedFolder,
  startDriveConnect,
  type DriveStatus,
  type WatchedFolder,
} from "@/api/driveClient";


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
    <div className="min-h-screen bg-stone-50 py-12 px-6">
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
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <Link
        to="/dashboard"
        className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
      >
        ← Retour à mon espace
      </Link>
      <h1 className="text-3xl font-semibold text-gray-900 mt-2 mb-2">
        Automatisations
      </h1>
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
  const [folderIdDraft, setFolderIdDraft] = useState("");
  const [folderNameDraft, setFolderNameDraft] = useState("");
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
    const fid = folderIdDraft.trim();
    if (!fid) return;
    setBusy("setup");
    setLocalError(null);
    try {
      await setupWatchedFolder({
        folder_id: fid,
        folder_name: folderNameDraft.trim() || undefined,
      });
      setFolderIdDraft("");
      setFolderNameDraft("");
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
              folderIdDraft={folderIdDraft}
              folderNameDraft={folderNameDraft}
              setFolderIdDraft={setFolderIdDraft}
              setFolderNameDraft={setFolderNameDraft}
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
  folderIdDraft,
  folderNameDraft,
  setFolderIdDraft,
  setFolderNameDraft,
  onSubmit,
  busy,
}: {
  folderIdDraft: string;
  folderNameDraft: string;
  setFolderIdDraft: (v: string) => void;
  setFolderNameDraft: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <p className="text-sm text-gray-700 mb-3">
        Dans Google Drive, ouvrez le dossier à surveiller. L'URL a la forme{" "}
        <code className="bg-stone-100 px-1 rounded text-[12px]">
          drive.google.com/drive/folders/<span className="text-gray-500">XXXXX</span>
        </code>
        . Copiez la partie XXXXX et collez-la ci-dessous.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">
            ID du dossier
          </span>
          <input
            value={folderIdDraft}
            onChange={(e) => setFolderIdDraft(e.target.value)}
            placeholder="1a2B3c4D…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-700"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">
            Nom affiché (optionnel)
          </span>
          <input
            value={folderNameDraft}
            onChange={(e) => setFolderNameDraft(e.target.value)}
            placeholder="Factures reçues"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-700"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !folderIdDraft.trim()}
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
