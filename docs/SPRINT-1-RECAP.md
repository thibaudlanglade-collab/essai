# Sprint 1 — Recap

Durée réelle : ~3h30. Objectif du sprint §11 du brief : fondations multi-tenant prêtes pour que chaque prospect reçoive un espace isolé activable par `/app/{token}`, et que les données d'un prospect ne puissent jamais fuiter vers un autre.

## Ce qui est livré

### Schéma et migrations
- **8 nouvelles tables** (brief §4) dans `db/models.py` : `oauth_connections`, `clients`, `suppliers`, `invoices`, `quotes`, `extractions`, `watched_folders`, `activity_logs`. Chacune porte un `user_id` `NOT NULL` en `FK` sur `access_tokens.id` avec `ON DELETE CASCADE`.
- **Fusion de `emails`** : la table Gmail-only a été étendue avec `user_id`, `category`, `is_important`, `summary`, `suggested_reply`, `related_client_id`, `is_seed`, `is_from_gmail`. `gmail_id`, `thread_id`, `connection_id` sont devenus `nullable` pour que les emails seed (§10.5) et les emails Gmail-synced partagent la même table.
- **`user_id` nullable** ajouté aux 7 tables legacy (`employees`, `gmail_connections`, `email_attachments`, `email_topics`, `automations`, `automation_runs`, `morning_briefings`). `nullable=True` parce que la DB de dev contenait déjà des lignes legacy sans propriétaire ; tout nouveau insert passe par un endpoint qui force `user_id=user.id`.
- **Alembic** initialisé. DB `synthese_dev` dropped+recreated puis `alembic revision --autogenerate -m "baseline_all_tables"` + `alembic upgrade head` → 17 tables + `alembic_version`. `alembic/env.py` charge `backend/.env` et traduit l'URL `asyncpg` en `psycopg2` pour que migrations et runtime app se partagent la même `DATABASE_URL`.

### Isolation des endpoints
Pattern appliqué sur **5 routers** couvrant 43 routes :

```python
@router.get("/...")
async def handler(
    ...,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
):
    result = await db.execute(
        select(Model).where(Model.id == X, Model.user_id == user.id)
    )
    ...
```

- `api/employees.py` : 7/7 routes, inserts + bulk-delete + CSV import isolés.
- `api/email_topics.py` : 5/5 routes, `reset-defaults` recrée les topics défaut par tenant au lieu d'appeler `seed_default_topics` global.
- `api/automations.py` : 12/12 routes, `run_history` double-filtré (Automation.user_id + AutomationRun.user_id).
- `api/gmail_auth.py` : 4 routes auth + 1 callback public (state-bound au `user_id` à la génération, pas au cookie).
- `api/emails.py` : 14/15 routes auth, attachments/stats/briefing-mark-read/send-reply tous isolés. **Exception conservée publique** : `GET /api/emails/briefing/today` est l'endpoint qu'appelle `LegacyLanding` (`getTodayBriefing`) pour son encart marketing ; il accepte une session optionnelle mais ne filtre pas encore par `user_id` car le service `generate_today_briefing` ne sait pas scoper par tenant. À refactorer en Sprint 6 quand Gmail sera vraiment multi-tenant.

Non-touchés : `api/features.py` (registry statique), `api/execute.py` + `api/execute_planner.py` + `api/execute_team_planner.py` (pipelines stateless appelés par les démos LegacyLanding), `api/debug.py` (déjà prévu pour être gated par `SYNTHESE_ENABLE_DEBUG=1`).

### Endpoints RGPD
Nouveau router `api/my_data.py` :
- `GET /api/my-data/export` : renvoie un JSON `{exported_at, access, data:{suppliers, clients, invoices, quotes, emails, email_attachments, extractions, watched_folders, activity_logs, oauth_connections, employees, email_topics, automations, automation_runs, gmail_connections, morning_briefings}}`. Les ciphertexts OAuth sont scrubbés en plus du `to_dict` qui les exclut déjà.
- `DELETE /api/my-data` : `DELETE FROM access_tokens WHERE id = :user_id` → `CASCADE` wipe toutes les tables scoped. Clear le cookie `session_token` sur la réponse.

### Cron cleanup
Nouveau service `services/cleanup_scheduler.py` : `AsyncIOScheduler` dédié (séparé du scheduler Gmail qui est gated), tâche cron quotidienne 03:00 Europe/Paris, appelle `cleanup_expired(db, grace_days=7)`. Toujours actif par défaut (engagement RGPD), désactivable via `SYNTHESE_DISABLE_CLEANUP=1`.

### Feature flags lifespan
`main.py` `lifespan` ne démarre plus `start_scheduler()` (Gmail polling) ni `trigger_manager.refresh_all()` (automations engine) par défaut. Il faut explicitement :
- `SYNTHESE_ENABLE_GMAIL_SCHEDULER=1` pour le poller Gmail.
- `SYNTHESE_ENABLE_AUTOMATIONS=1` pour le trigger manager.

Ces deux workers ne tournent que quand un prospect a réellement connecté Gmail / configuré un watched folder, ce qui n'arrive pas en dev isolé. Le cleanup RGPD reste inconditionnel.

### Tests e2e
`backend/scripts/test_isolation.sh` : crée 2 prospects (Alice + Bob), active chaque session, pose les cookies httpOnly, vérifie 23 propriétés :

- activation `/app/{token}` → 302 `/welcome` + `Set-Cookie`
- `/api/auth/me` retourne le bon prospect, sans fuiter ni `token` ni `session_token`
- CRUD employees : A voit son employé, B le sien, et aucun ne voit l'employé de l'autre
- B essayant `GET/PUT/DELETE /api/employees/{id-de-A}` → 404 (pas de fuite d'existence)
- Sans cookie / cookie bidon → 401
- `GET /api/my-data/export` ne contient que les données du caller
- `GET /api/automations/{id-de-A}` depuis B → 404 et la liste automations de B est vide

Résultat courant : **23/23 vert**.

## Ce qui est volontairement laissé pour plus tard

- **`/api/emails/briefing/today`** reste global-scope (voir ci-dessus). À reconfigurer en Sprint 6.
- **Seed data BTP** : le JSON `backend/data/btp_seed.json` + `backend/scripts/seed_btp_data.py` sont livrés par le Worker #1 mais **pas encore appelés** par `seed_prospects.py`. Câblage prévu en Sprint 3 (brief §11). Qualité : 70 KB de données, 10 fournisseurs réels + 1 fictif, 12 clients PACA avec cohérence cross-data factures/devis/emails.
- **Crypto pour OAuth access/refresh tokens** (Fernet) : la colonne `access_token` de `oauth_connections` est typée `Text` et prévue pour accueillir du ciphertext, mais `services/crypto.py` n'existe pas encore. `gmail_connections` (legacy) stocke toujours les tokens en clair. À faire en Sprint 6 quand Gmail passe en prod.
- **Documentation du setup Google OAuth** : `docs/GOOGLE-OAUTH-SETUP.md` livré par le Worker #3. Thibaud pourra s'en servir quand il aura besoin du Client ID/Secret en Sprint 6.
- **`init_db()` appelle toujours `create_all` au démarrage** alors qu'Alembic gère désormais le schéma. Fonctionnellement inoffensif (create_all est idempotent), mais redondant — à supprimer après avoir confirmé que la prod ne démarre que via Alembic.
- **Uniqueness per-tenant** sur `email_topics.name`, `automations.name`, `morning_briefings.briefing_date` : les contraintes `unique=True` legacy ont été retirées pour permettre à plusieurs prospects d'avoir un topic "Clients" ou une automation "Classement factures" simultanément. Reposer une `UniqueConstraint("user_id", "name")` serait propre ; reporté car dépend de la finition du seed.

## Décisions d'archi prises pendant la closure

1. **Repo git init fait dans TE-main/** (pas dans Synthèse/te/ qui reste dédié au site marketing public). Branch `main`, pas encore de remote. Tous les engagements décrits dans le brief peuvent maintenant être respectés (commit par sprint, PRs).
2. **`briefing/today` reste public** via `get_current_user_optional` plutôt que d'être isolé agressivement. Choix motivé par la dépendance `LegacyLanding → getTodayBriefing()` : casser cette route casserait la page d'accueil marketing, donc on privilégie la continuité visuelle en attendant la migration Sprint 6.
3. **`GmailConnection` lookup scoped par `user_id`** dans le callback OAuth, pas par `email_address`. Deux prospects peuvent connecter la même boîte sans conflit tant que la contrainte `unique=True` sur `email_address` est tolérée (elle échouera si les deux tentent en même temps ; accepté pour Sprint 1).
4. **`AutomationRun.user_id` dénormalisé** depuis `Automation.user_id` pour simplifier l'isolation en lecture sans join. Cohérence assurée au `INSERT` par `user_id=user.id`.
5. **Un scheduler par finalité** (`cleanup_scheduler.py` distinct du Gmail `services.gmail_sync._scheduler`) plutôt qu'un scheduler global partagé. Deux raisons : (a) le scheduler cleanup doit toujours tourner, le Gmail non ; (b) isolation des pannes — si Gmail tombe, le cleanup RGPD continue.

## Points d'attention pour Sprint 2

- Le câblage `seed_btp_data()` dans `seed_prospects.py` (Sprint 3) attend que les tables soient OK — elles le sont. Le JSON et le loader sont prêts, il reste juste à invoquer.
- `services/crypto.py` (Fernet) devra atterrir avant d'écrire des OAuth refresh tokens en DB (Sprint 6 pour Gmail réel ; Sprint 2 reste hors OAuth).
- Les tests `backend/scripts/test_isolation.sh` tournent contre un backend local (port 8000) et une DB dev ; ils assument que la DB est vide ou contrôlée. À adapter si intégrés en CI.

## Commandes pour redémarrer proprement

```bash
cd /Users/thibaud/Desktop/TE-main/backend

# Nuke + migrate
/opt/homebrew/bin/dropdb synthese_dev
/opt/homebrew/bin/createdb synthese_dev
.venv/bin/alembic upgrade head

# Start backend (flags off par défaut)
SYNTHESE_DEV=1 PATH="/opt/homebrew/bin:$PATH" .venv/bin/uvicorn main:app --port 8000

# Test isolation
./scripts/test_isolation.sh
```
