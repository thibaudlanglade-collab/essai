# Sprint 4 — Rapport Client

Durée réelle : ~2h. Objectif brief §5.3 / P3 du MVP : le prospect choisit un de ses clients, pose une question en langage naturel, et obtient une réponse synthétique construite à partir de tous les documents liés à ce client (devis, emails, factures, extractions, fichiers Drive), avec citations de sources.

## Pivot produit en début de sprint

Le plan initial (`docs/PLAN-INTEGRATION-MULTITENANT.md` §C) parlait d'un "rapport client" sous forme de dashboard chiffré fixe (CA cumulé, factures, impayés). Arbitrage avec Thibaud : c'est **moins wow** qu'une vraie réponse en langage naturel qui cite des sources, et ça crée du code mort si le prospect pose une question un peu différente. La feature livrée est donc un mini-assistant scopé à un client, qui anticipe la brique technique de Sprint 5 (assistant Synthèse global).

Conséquence : la migration `Quote.invoiced_at/paid_at/due_date` envisagée n'a pas été faite — le LLM déduit "impayés" depuis les emails de relance et les statuts de devis existants, ce qui est plus souple.

## Ce qui est livré

### Backend

#### Modèle `ClientReportFolder` + migration `81e7b3f768d6` (§4 nouveau)
- Table tenant-level qui stocke les dossiers Drive que le prospect a ajoutés au périmètre de fouille "rapport client". Différent du `WatchedFolder` Sprint 3 (qui ingère automatiquement toutes les 5 min dans la DB) : `ClientReportFolder` est fouillé **à la demande** au moment où le prospect pose une question sur un client.
- Colonnes : `id, user_id, provider, folder_id, folder_name, is_enabled, created_at`. `UNIQUE` soft via dedup dans l'endpoint d'ajout.
- Pas d'impact sur les 24/24 tests d'isolation Sprint 3.

#### Skill `skills/core/answer_client_question.py` (§5)
- Pur LLM. Reçoit `{client_name, client_type, question, context_docs}`, renvoie `{answer, sources, confidence}`.
- Prompt strict : vouvoiement, français, aucune extrapolation hors documents, interdiction des mots "IA", "automatisation", "intelligence artificielle", "aider", interdiction des tirets longs, 2 à 6 phrases, sources citées par `source_id`.
- Garde-fous : hallucination de sources filtrée côté skill (les `source_id` inventés sont droppés), troncature snippets 2 200 chars, cap 40 docs.
- Empty-context : renvoie une réponse pédagogique ("vérifiez que vos documents contiennent bien le nom de ce client") sans payer d'appel OpenAI.
- Skill auto-découvert par import `from skills.core import answer_client_question` (pas d'__init__ à toucher, le pattern est `from skills.core import <module>`).

#### Service `services/client_report_service.py` (§6 nouveau orchestrator)
Pourquoi un service et pas un skill "gather_client_context" comme annoncé SPRINT-2-3-REFACTO §5 : les skills existants sont purs, le context `user_id`+DB session ne doit pas être composable par un planner LLM. Le service porte cette logique de scope, conformément à l'exception déjà actée pour `invoice_tracker`.

Pipeline par question :

1. **DB links explicites** — `Quote.client_id`, `Email.related_client_id` scoped `user_id` (caps 25 devis / 30 emails).
2. **DB filet large** — `Invoice.raw_text ILIKE '%client_name%'` + `Extraction.raw_text ILIKE '%client_name%'` (+ `cast(extracted_data, String)` pour que le JSON Postgres soit fouillable). Caps 10/10. Dédup avec les factures déjà linkées via les emails.
3. **Drive à la demande** — pour chaque `ClientReportFolder` enabled, `list_new_files_in_folder(since=None)` (max 30 fichiers listés), filtre par nom de fichier mentionnant le client (tokens significatifs ≥4 lettres hors stopwords FR + BTP), puis `download_file_bytes` + `extract_file_content` (pypdf/pymupdf/docx/text) pour les 12 premiers matches. Les tokens refresh OAuth sont persistés si renouvelés pendant l'appel.
4. **Merge + cap** — 40 docs max envoyés au skill.
5. **Skill call** — un seul appel GPT-4o, ~700 tokens max.
6. **Resolve sources** — mappe les `source_id` cités vers `{kind, id, label, url|null, date}` pour que le frontend affiche des chips cliquables (URL directe pour les fichiers Drive, null pour l'intérieur de l'app — à câbler vers les vues devis/email dans un sprint ultérieur).

Stats retournées : `{quotes, emails, invoices, extractions, drive_files, total_docs, folders_searched}` — le frontend les affiche en footer de chaque réponse.

#### API `backend/api/clients.py` (§7)
- `GET /api/clients` : liste des clients du tenant, triée par nom.
- `POST /api/clients/{client_id}/ask` : body `{question}`. Retourne `{client, question, answer, sources, confidence, stats}`. 400 sur question vide / >500 chars, 404 si client pas dans le tenant, 500 sur erreur amont (loggée).
- `GET /api/client-report/folders` : `{drive_connected, folders}`. Signale si un Drive est connecté pour que l'UI puisse guider le prospect.
- `POST /api/client-report/folders` : body `{folder_id, folder_name?}`. Refuse 400 si Drive pas connecté. Dedup soft : second POST sur le même `folder_id` réactive la ligne au lieu d'en créer une deuxième.
- `DELETE /api/client-report/folders/{id}` : 404 si pas trouvé.

Tous strictement `Depends(get_current_user)`, filtrage `user_id` partout. Routeurs `clients_router` + `client_report_router` mount dans `main.py`.

### Frontend

#### `api/clientReportClient.ts`
- Types exportés : `ClientSummary`, `ClientReportAnswer`, `ClientReportSource`, `ClientReportStats`, `ClientReportFolder`, `ClientReportFoldersState`, `SourceKind`.
- Helpers : `listClients`, `askClient`, `listReportFolders`, `addReportFolder`, `removeReportFolder`. Tous `credentials: "include"`, erreurs remontées via `ApiError` (même pattern que `extractClient.ts`).

#### `pages/ClientsView.tsx`
Split layout :
- **Colonne gauche (320 px desktop, overlay mobile via DashboardShell)** : liste des clients avec champ de recherche (name / type / email), item actif surligné violet.
- **Panneau droit** :
  - Header client : nom, type, adresse courte, email, téléphone.
  - **Panneau repliable "Dossiers Drive à parcourir"** : montre les `ClientReportFolder` configurés, CTA "Ajouter" (inputs `folder_id` + `folder_name` optionnel), lien d'info sur où trouver l'identifiant (partie après `folders/` dans l'URL Drive). Guide explicite si Drive pas connecté. Cadre pour Sprint 6 qui ajoutera le vrai Google Picker.
  - **Zone question** : textarea + 4 questions suggérées en chips (CA, impayés, résumé échanges, devis en attente) qui s'exécutent au clic. Bouton "Analyser" avec spinner. Raccourci Cmd/Ctrl-Enter.
  - **Historique de réponses** empilées : chaque carte affiche question posée + réponse + chips sources (icône selon `kind`) + footer stats (doc count, devis/emails/factures/drive) + badge "Confiance N%".

Respect de la charte copie : vouvoiement, pas de "IA", pas de "automatisation", pas de tirets longs. Wording : "Les réponses sont construites uniquement à partir de vos documents" comme hint de confiance.

#### Routage
- `App.tsx` : route `/dashboard/clients` ajoutée sous `<DashboardShell />`.
- `DashboardShell.tsx` : `PAGE_TITLES["/dashboard/clients"] = "Rapport client"` pour la topbar.
- `DashboardSidebar.tsx` : l'item "Rapport client" passe de `status="soon"` à `status="active"` avec `to="/dashboard/clients"`.

## Tests

### Backend

```
✓ Alembic upgrade head (81e7b3f768d6 → applied on Postgres)
✓ /api/auth/me returns the seeded prospect
✓ /api/clients returns 12 seed clients
✓ /api/client-report/folders returns {drive_connected:false, folders:[]}
✓ POST /folders without Drive → 400 avec message FR
✓ POST /clients/{id}/ask sur "SCI Les Oliviers" — question "quel CA et devis en attente ?"
    → réponse correcte citant DV-2026-001 + email d'accord, 2 sources, confidence 0.95
✓ POST /ask sur "M. et Mme Dupont" — question "impayés ?"
    → répond "Les documents fournis ne permettent pas de répondre précisément" + signale un autre prestataire (Plomberie Provençale) qui apparaît dans les emails
✓ POST /ask question hors domaine ("météo") → refuse proprement, 0 sources
✓ POST /ask question vide → 400
✓ POST /ask client UUID inconnu → 404
✓ GET /api/clients sans cookie → 401
```

Latence `/ask` : ~2.7-3 s sur 5 docs injectés (c'est un appel `gpt-4o` unique).

### Régression
- `backend/scripts/test_isolation.sh` → **24/24 vert**. Aucune fuite cross-tenant.
- `npx tsc --noEmit` (frontend) → 0 erreur.

## Points d'attention

### Drive OAuth + Google Picker toujours Sprint 6
Comme acté en début de sprint, l'UI actuelle demande au prospect de coller l'identifiant Drive du dossier (partie après `folders/` dans l'URL). C'est fonctionnel mais friction UX. Sprint 6 remplacera ça par le Google Picker (`gapi.load('picker')`) — déjà reporté pour la `developerKey` + le domaine à ajouter à la config OAuth. Pour l'instant, les prospects peuvent configurer les dossiers via copier-coller.

### Caps performance hardcodés dans le service
- 25 devis / 30 emails max par DB
- 10 invoices + 10 extractions max sur le filet large
- 30 fichiers Drive listés par dossier, 12 téléchargés + extraits après filtre nom
- 40 docs max envoyés au LLM
- 2 200 chars max par snippet

Ces caps protègent le contexte GPT-4o et la facture OpenAI. Un prospect très actif avec 100 devis sur un même client verra les 25 plus récents. À revoir si retour terrain.

### Sources internes app : URL à venir
Les chips sources pour `kind in (quote, email, invoice, extraction)` n'ont pas de `url` (null). Idéalement, clic → ouvre une drawer ou route vers la vue détail. Sprint 5 exposera les pages devis/email dédiées ; on branchera les URLs à ce moment.

### Filet large sur noms courts
Un client nommé "M. Martin" aura un tokenisation pauvre (4 lettres hors stopwords : `martin`). Si d'autres documents mentionnent "martin-martin-sarl" ou un `St-Martin`, ils remonteront. Le LLM ne devrait pas être trompé — il cite seulement ce qui sert sa réponse — mais on pourrait resserrer avec un `word-boundary` regex SQL. Low priority pour Sprint 4.

### Vision fallback PDF scanné : toujours Sprint 6
Le reporté Sprint 3 est maintenu en Sprint 6, hors scope de ce sprint comme arbitré. Les PDFs scannés sans texte (nuls côté `pypdf`) sortent `text=""` et sont droppés du contexte (pas de tokens brûlés pour rien).

### Skills `query_clients`/`query_invoices`/etc. annoncés Sprint 4 dans refacto : repoussés Sprint 5
Annoncé en `SPRINT-2-3-REFACTO-RECAP §5` mais pas livrés sous forme de skill autonome : la logique vit dans `client_report_service` car pour Sprint 4 le flow est déterministe (prospect → client fixé → backend → LLM). Quand Sprint 5 introduira l'assistant Synthèse avec planner agentique, il faudra extraire les collect_* du service en skills `TOOL_SCHEMA` pour qu'un planner puisse les tool-caller. Actuellement les fonctions sont déjà bien découpées pour faciliter ce repackaging.

### Pas encore d'upload de fichier client direct
Aujourd'hui un prospect qui veut "charger 10 PDFs facture émise à ce client pour que Synthèse les utilise dans ses réponses" doit passer par Smart Extract + commit sur `invoices` (achats) OU par un dossier Drive configuré. Il manque une troisième voie "upload direct rattaché à un client" si on veut simplifier. À arbitrer retour terrain.

## Commit

État visible au test : un prospect créé via `.venv/bin/python -m scripts.seed_prospects create --name …` active son lien, arrive sur `/dashboard`, clique "Rapport client" dans la sidebar, sélectionne un client, pose une question libre (ou clique une des 4 suggérées), lit une réponse de 2 à 6 phrases qui cite 1 à 5 sources avec type et date, et voit en footer combien de documents ont été analysés.

Commandes pour relancer tout en dev :

```bash
# Backend
cd /Users/thibaud/Desktop/TE-main/backend && source .venv/bin/activate \
  && SYNTHESE_DEV=1 SYNTHESE_DISABLE_CLEANUP=1 uvicorn main:app --port 8000

# Frontend
cd /Users/thibaud/Desktop/TE-main/frontend && npm run dev

# Prospect test
cd /Users/thibaud/Desktop/TE-main/backend && .venv/bin/python -m scripts.seed_prospects create --name "Rapport test" --days 14
```
