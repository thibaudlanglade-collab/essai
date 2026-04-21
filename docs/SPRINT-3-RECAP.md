# Sprint 3 — Automatisation + seed BTP

Durée réelle : ~3h. Objectif brief §6 + §10 : (1) un classement automatique s'applique dès qu'une facture est validée dans Smart Extract, (2) un dossier Google Drive peut être surveillé toutes les 5 min, (3) chaque nouveau prospect reçoit un espace déjà peuplé avec la seed BTP (10 fournisseurs, 12 clients, 18 factures, 8 devis, 30 emails).

## Ce qui est livré

### Seed BTP câblée (§10)
- `backend/scripts/seed_btp_data.py` réécrit pour coller aux modèles actuels : `body` → `body_plain`, `to_email` → `to_emails` (JSON wrap), retrait des champs inexistants (`Invoice.notes`), conversion `created_at` string → `datetime`, `is_from_gmail=False` sur seed.
- 3 nouvelles FK cross-ref ajoutées à `Email` pour exploiter la cohérence cross-data du JSON : `related_supplier_id`, `related_quote_id`, `related_invoice_id`. Migration Alembic `c364b5f798d9`. Ces FK sont load-bearing pour les Sprints 4-5 (assistant + rapport client qui remontent un email vers son devis/facture).
- `scripts/seed_prospects.py create` et `from-csv` injectent la seed automatiquement. Flag `--no-seed` pour l'opt-out (utile pour les tests d'isolation).
- Idempotence : `seed_btp_data` est un no-op si le tenant a déjà au moins une ligne `clients.is_seed=true`.

Validation DB : pour le token de test `Test Seed`, on compte 10 suppliers / 12 clients / 18 invoices / 8 quotes / 30 emails. Les FK cross-ref donnent 14 emails ↔ client, 14 ↔ supplier, 9 ↔ quote, 7 ↔ invoice.

### Volet 1 — classement auto sur upload Smart Extract (§6.1)
- `backend/services/file_organizer.py` : service pur (pas de DB), déplace le fichier uploadé de `attachments/{user_id}/extractions/` vers `attachments/{user_id}/organized/<target_folder>/<final_filename>`, et ajoute une ligne dans `Suivi_Factures_<YYYY>.xlsx` (création avec headers si absent ; dédup par `(invoice_number, supplier_name)`).
- Chemins sanitisés : strip accents, collapse whitespace, remplacement des caractères unsafe Windows, reject des traversées `..`. Dédup auto `filename (1).pdf`, `filename (2).pdf`, … si collision.
- Renvoie une liste ordonnée de `steps` en français (une phrase par étape) que l'UI affiche en toast animé. Échecs non-fatals : étape `"impossible"` teintée en ambre au lieu de vert.
- Wired dans `api/extract.py /save` après la création de l'`Invoice` ; utilise l'original `stored_filename` (nom avec hash) pour localiser le fichier avant renommage.

### Volet 2 — OAuth Drive + surveillance de dossier (§6.2)
- `backend/services/crypto.py` : Fernet pour chiffrer `OAuthConnection.access_token` / `refresh_token` à la volée. Clé dans `SYNTHESE_FERNET_KEY` (génération : `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`). Fallback dev déterministe si `SYNTHESE_DEV=1` sans clé, avec warning log. Refus de démarrer sans clé en prod.
- `backend/services/drive_service.py` : wrapper autour de `google-auth-oauthlib` + `googleapiclient`. Expose `build_oauth_flow`, `exchange_code_for_tokens`, `list_new_files_in_folder(since=…)`, `download_file_bytes`, `get_file_metadata`. Scopes `drive.readonly` + `drive.file`. Refresh automatique via `Credentials.refresh(Request())` avec propagation du nouveau token au caller pour re-chiffrement.
- `backend/api/drive.py` : 6 endpoints isolés `user_id` :
  - `GET /api/drive/status` — état de la connexion.
  - `GET /api/drive/connect` — renvoie l'URL OAuth Google (`state` bindé au `user_id`).
  - `GET /api/drive/callback` — exchange code, encrypt tokens, upsert `OAuthConnection(provider="google_drive")`. Rend une page HTML standalone (success/error) pour que la popup puisse être fermée par le prospect.
  - `POST /api/drive/disconnect` — supprime la connexion + stop les watched folders.
  - `POST /api/drive/watched-folder/setup` / `GET /api/drive/watched-folder` / `POST /api/drive/watched-folder/disconnect` — gère un unique watched folder actif par tenant.
- `backend/services/watch_folder_scheduler.py` : `AsyncIOScheduler` propre (indépendant de ceux Gmail/cleanup). Tick toutes les 5 min, lit tous les `WatchedFolder.is_active=true`, décrypte les tokens, `list_new_files_in_folder(since=watch.last_checked_at)`, pour chaque fichier : download + `extract_document` + persiste `Extraction` + si `document_type=="invoice"` spawn `Invoice` + appelle `file_organizer`. Met à jour `last_checked_at` + `files_processed`. Une panne tenant ne bloque pas les autres.
- Gated par `SYNTHESE_ENABLE_DRIVE_POLLING=1` (off par défaut en dev).

### Frontend
- `frontend/src/api/extractClient.ts` étendu avec `OrganizeResult { steps, final_path, excel_path, ok }`.
- `frontend/src/pages/ExtractView.tsx` : nouveau composant `OrganizeStepsLive` qui révèle les steps du `/save` progressivement (450 ms entre chaque) avec checkmark vert / ! ambre selon échec. Effet "en live" brief §6.1.
- `frontend/src/api/driveClient.ts` : 6 helpers typés (`getDriveStatus`, `startDriveConnect`, `disconnectDrive`, `getWatchedFolder`, `setupWatchedFolder`, `disconnectWatchedFolder`).
- `frontend/src/pages/AutomationsView.tsx` : nouvelle page `/dashboard/automations`. Deux cartes :
  - Volet 1 avec badge "Actif" permanent + explication numérotée + CTA vers Smart Extract.
  - Volet 2 avec encart d'avertissement Google Testing (brief §5.5), bouton "Connecter mon Google Drive" (popup OAuth via `window.open`), polling de la fermeture popup puis refresh du status. Si connecté : formulaire `folder_id` + `folder_name` (input manuel — le vrai Google Picker est reporté à Sprint 6).
- Route `/dashboard/automations` dans `App.tsx`. CTA "Voir les automatisations →" dans `DashboardHome`.

## Tests

- **e2e isolation** : `backend/scripts/test_isolation.sh` passe **24/24 vert** avec la seed activée (dont la nouvelle assertion `Export A contains 30 seed emails`). Fix du quoting fragile : l'export est désormais écrit en fichier avant grep (les apostrophes françaises du seed cassaient `echo '...' | grep`).
- **File organizer** : upload PDF `facture-metro.pdf` → save avec commit → vérifié que le fichier a été déplacé dans `organized/Factures/METRO_Cash_&_Carry_France_SAS/Avril_2026/2026-04-10_…_551.47EUR.pdf` et que `Suivi_Factures_2026.xlsx` existe avec la ligne.
- **Drive endpoints** : `/api/drive/status` retourne `connected:false` pour un fresh tenant ; `/api/drive/connect` retourne une URL Google OAuth valide (client_id présent) ; `/api/drive/watched-folder/setup` refuse avec 400 si pas de connection préalable. Unauth → 401 partout.
- **Scheduler** : les hooks `start_watch_folder_scheduler` / `stop_watch_folder_scheduler` sont câblés dans `main.py` lifespan, no-op quand le flag est off.

## Points d'attention

- **Google Picker absent** (volet 2 UI) : l'embarquement de `gapi.load('picker')` nécessite une `developerKey` Google supplémentaire et d'ajouter le domaine `synthese.fr` à la configuration OAuth. Reporté à Sprint 6 ; pour l'instant le prospect colle l'ID du dossier depuis l'URL Drive — fonctionnel, pas sexy.
- **Fernet key** : le dev tourne avec la clé de fallback déterministe. Pour Railway prod, il faudra générer une vraie clé et la stocker en variable d'env `SYNTHESE_FERNET_KEY`. Rotation = non-trivial (faut re-chiffrer toutes les lignes existantes) : à documenter au moment du deploy.
- **Polling vs push** : le choix du polling 5 min est un compromis (le brief §6.2 le stipulait). À >50 tenants actifs avec Drive surveillé, ça fait 10 appels Drive/min en moyenne — encore dans les quotas gratuits Google, mais à surveiller. Option Sprint 7 : migrer vers Drive push notifications (webhooks) quand la vérification Google sera faite.
- **PDFs Drive scanned** : le scheduler utilise le même `extract_document` que l'UI, donc même limite (pas d'OCR pour PDF scanné sans texte). Les prospects qui mettent des scans purs dans le dossier surveillé verront des `document_type=other` en attente de revue humaine ; pas de classement auto. Upgrade vision fallback reporté Sprint 4.
- **Multi-dossiers surveillés** : contrainte Sprint 3 = un seul dossier actif par tenant. Une deuxième `POST /watched-folder/setup` remplace la précédente. Multi-dossier reporté si demande terrain.
- **Fichier original pas nettoyé** : après move vers `organized/`, `attachments/{user_id}/extractions/` peut garder des résidus si l'utilisateur uploade puis annule. Low priority. À nettoyer via un cron Sprint 6.
- **`UI toast live` est une animation côté client** : les steps viennent dans la réponse `/save` (synchrone) et sont révélés progressivement. Ce n'est pas du SSE — si le backend met 3s à répondre, l'utilisateur voit 3s de spinner puis les 3 steps en 1.3s. Upgradable en SSE au besoin mais c'est assez convaincant pour Sprint 3.

## Commit

État visible au test : un nouveau prospect créé via `.venv/bin/python -m scripts.seed_prospects create --name …` active son lien, arrive sur `/dashboard`, clique "Voir les automatisations", voit les deux volets documentés avec leurs états. L'export `/api/my-data/export` contient 10+12+18+8+30 lignes issues de la seed + toutes les lignes créées par le prospect pendant son essai.
