# Plan d'intégration multi-tenant — Synthèse

**Contexte** : transformer l'app actuelle en app test BTP envoyable en cold email à 100-200 prospects PACA/Occitanie, avec lien unique `synthese.fr/app/{token}` → cookie de session 30 jours, accès isolé 14 jours, données seed BTP pré-remplies.

**Date** : 2026-04-21

---

## 1. Résumé exécutif

Trois constats avant de coder quoi que ce soit.

**Le backend est plus avancé que ne le laisse entendre le brief.** Le brief décrit l'app comme une "landing page / démo solo". C'est vrai pour le frontend, mais le backend FastAPI est déjà une vraie app métier : 10 routers, 70+ endpoints, Gmail OAuth fonctionnel, APScheduler, pipeline/planner/automation engine, 8 modèles SQLAlchemy. Ce n'est pas un MVP squelette — il y a du code utile à préserver et à adapter, pas à réécrire.

**Mais il y a un gap fonctionnel majeur vs le brief.** Les features prioritaires du MVP prospect (P1 photo facture → extraction, P2 génération devis, P3 rapport client) ne sont PAS encore implémentées comme features métier dédiées. Le backend actuel est centré sur Gmail/emails, employés, automations, et un pipeline générique `pdf_to_excel`. Il n'y a pas de table `factures`, `devis`, `clients` en DB. Le chantier "multi-tenant" et le chantier "construire les features BTP" sont donc deux chantiers distincts, et les deux sont nécessaires.

**Le frontend n'a pas de routeur.** Toute la navigation passe par un `activeMode` en state + `CustomEvent`. Aucune URL réelle, donc `/app/{token}` ne peut pas exister tel quel sans ajouter un vrai routeur (react-router v6). C'est un prérequis non négociable — sans ça, pas de lien unique.

**Conséquence sur la timeline.** Les 2-3 semaines du brief sont réalistes pour l'infra multi-tenant seule (auth, tokens, isolation, seed). Si on veut AUSSI livrer les 3 features prioritaires en état "wow", il faut ajouter 1-2 semaines de build BTP (tables, endpoints, UI). À arbitrer avec toi.

---

## 2. État réel vs brief

### 2.1 Ce qui existe déjà et qui est utile

| Zone | État | Réutilisable pour multi-tenant ? |
|---|---|---|
| Backend FastAPI + SQLAlchemy 2.0 async | Solide | Oui, base saine |
| Config CORS avec `allow_credentials=True` | Déjà là | Oui, directement |
| Pipeline d'exécution (engine/pipeline.py) + skills | Bon design plugin | Oui, à isoler par user |
| Planner agentique (engine/planner/) | Utilisable pour "génération devis" et "rapport client" | Oui, à isoler |
| Skills : `extract_pdf_text`, `structure_data`, `generate_excel`, `extract_tables_smart`, `extract_structured_data` | Parfaits pour "photo facture → extraction" | Oui, réutiliser tel quel |
| Frontend React + 7 clients HTTP centralisés | Propre, easy à patcher | Oui, ajouter credentials + routing |
| Composants démo (PhotoToDocument, ChatAssistant, AgentRapport) | UI déjà dessinée | Oui, brancher sur vrais endpoints |
| Fichiers seed BTP dans `public/demo-files/` (planif-btp, devis-renovation, facture-metro, notes-chantier) | Premier jet de données BTP | Oui, embryon, à étoffer |

### 2.2 Ce qui manque et qui est critique

| Manque | Impact | Priorité |
|---|---|---|
| Aucun modèle DB n'a `user_id` | Fuite de données entre prospects | Bloquant |
| Aucun middleware d'auth | N'importe qui peut taper n'importe quel endpoint | Bloquant |
| Pas de table `access_tokens` | Le flow cold email ne peut pas fonctionner | Bloquant |
| Pas de react-router (navigation par CustomEvent) | `/app/{token}` impossible | Bloquant |
| DATABASE_URL hardcodée (`sqlite+aiosqlite:///./synthese.db`) | Migration Postgres impossible sans refacto | Haut |
| Pas d'Alembic | Toute évolution de schéma = code fragile | Haut |
| Pas de tables métier BTP (`factures`, `devis`, `clients`) | Features prioritaires impossibles | Haut (selon ambition) |
| APScheduler global, cache Gmail global, watchers avec chemins hardcodés | Leak entre prospects si activés | Moyen (désactiver en prod test pour commencer) |
| OAuth Gmail UNIQUE sur `email_address` | Incompatible multi-tenant | Moyen (désactiver dans la démo prospect) |
| Stockage attachments en local `/backend/attachments/{email_id}/` | Pas de namespace user | Moyen |

### 2.3 Ce qui diffère silencieusement du brief

Le brief parle d'une migration `SQLite → PostgreSQL` comme décision clé. À étudier : pour 100-200 prospects en parallèle, SQLite en mode WAL avec pool async pourrait tenir. Mais la vraie raison de Postgres, c'est Railway qui le propose natif et qui gère le storage pérenne. Acceptable de prévoir Postgres en prod, SQLite en dev. Alembic devient alors obligatoire pour gérer les deux.

Le brief suggère un cookie `session_token` issu du token d'accès. Subtilité à lever : est-ce qu'on stocke le `token` du lien comme cookie (risque : fuit dans les logs, le prospect partage son lien à un collègue et perd l'isolation à son insu), ou est-ce qu'on génère un `session_token` dérivé à l'activation (propre, mais un poil plus de code) ? Je recommande la deuxième option — voir §4.2.

Le brief ne mentionne pas la gestion des uploads : quand le prospect upload sa vraie facture, où va le fichier ? En local dans `/backend/uploads/{user_id}/`, c'est simple mais pas distribué. Suffisant pour l'app test à 100-200 prospects sur un seul serveur Railway. À retenir.

---

## 3. Plan d'intégration — chantiers dans l'ordre

L'ordre n'est pas chronologique strict, mais reflète les dépendances. Chaque chantier doit pouvoir être testé en isolation avant de passer au suivant.

### Chantier A — Fondations DB et auth (3-4 jours)

**But** : pouvoir créer un token en DB, l'échanger contre une session, et refuser tout appel non authentifié.

Livrables :

1. **Alembic + DATABASE_URL configurable**
   - Rendre `backend/db/database.py` ligne `DATABASE_URL = "sqlite+aiosqlite:///./synthese.db"` lisible depuis `os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./synthese.db")`. Config prod Railway = Postgres URL avec `postgresql+asyncpg://...`.
   - `pip install alembic asyncpg psycopg2-binary` (asyncpg pour async, psycopg2 pour Alembic sync).
   - `alembic init backend/alembic`, configurer `env.py` pour charger les modèles via `from backend.db.models import Base`.
   - Générer la première migration "baseline" à partir de l'état actuel : `alembic revision --autogenerate -m "baseline"`.
   - Le `init_db()` dans `backend/db/database.py` devient un no-op en prod (Alembic gère) et reste actif en dev si variable `USE_ALEMBIC` non set.

2. **Table `access_tokens`**
   - Nouveau modèle dans `backend/db/models.py` :
     ```python
     class AccessToken(Base):
         __tablename__ = "access_tokens"
         id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID hex
         token: Mapped[str] = mapped_column(String, unique=True, index=True)  # secrets.token_urlsafe(32)
         session_token: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)  # délivré à l'activation
         prospect_name: Mapped[str | None]
         prospect_email: Mapped[str | None]
         prospect_company: Mapped[str | None]
         company_sector: Mapped[str] = mapped_column(String, default="BTP")
         created_at, last_seen_at, expires_at, session_count, is_active, notes
     ```
   - Migration Alembic dédiée.
   - Helper `backend/db/access_tokens.py` avec `create_token(...)`, `activate(token)`, `get_by_session_token(...)`, `revoke(...)`, `cleanup_expired()`.

3. **Colonne `owner_id` sur tous les modèles métier**
   - Ajouter `owner_id: Mapped[str | None] = mapped_column(String, ForeignKey("access_tokens.id", ondelete="CASCADE"), index=True, nullable=True)` aux modèles : `employees`, `emails`, `email_attachments`, `email_topics`, `automations`, `automation_runs`, `morning_briefings`, `gmail_connections`.
   - Nullable au début pour ne pas casser les données de dev, index systématique. Migration Alembic.
   - **Note sécurité** : même nullable, on va forcer dans le code que toute query filtre par `owner_id`. Les lignes orphelines (owner_id IS NULL) ne sont accessibles par personne.

4. **Dépendance d'auth + route d'activation**
   - Nouveau fichier `backend/api/auth.py` :
     - `GET /app/{token}` (pas sous `/api` pour matcher le brief) → vérifie token, vérifie non expiré, génère `session_token = secrets.token_urlsafe(32)`, le stocke en DB, set cookie httpOnly secure Lax 30j, redirige vers `/dashboard`.
     - `POST /api/auth/logout` → efface cookie, clear session_token en DB.
     - `GET /api/auth/me` → retourne `{id, prospect_name, company, expires_at, days_left}` (pour le frontend, sans secrets).
   - Nouveau fichier `backend/api/deps.py` :
     ```python
     async def get_current_user(
         session_token: str | None = Cookie(None),
         db: AsyncSession = Depends(get_db),
     ) -> AccessToken:
         if not session_token:
             raise HTTPException(401, "Non authentifié")
         user = await get_by_session_token(db, session_token)
         if not user:
             raise HTTPException(401, "Session invalide")
         if not user.is_active or user.expires_at < datetime.utcnow():
             raise HTTPException(403, "Accès expiré")
         # update last_seen_at, session_count +=1 (throttled)
         return user
     ```
   - `backend/main.py` : inclure le router `auth` (sans préfixe /api pour `/app/{token}`).
   - **Ajout middleware** : cas du `GET /app/{token}` qui pose le cookie PUIS redirige vers `/dashboard` — vérifier que FastAPI + SPA routing Vite ne mangent pas ça (le catch-all ligne 87 de `main.py` doit EXCLURE `/app/{token}` sinon le frontend l'intercepte).

5. **Protection de tous les endpoints existants**
   - Ajouter `user: AccessToken = Depends(get_current_user)` sur tous les endpoints de `backend/api/employees.py`, `backend/api/emails.py`, `backend/api/email_topics.py`, `backend/api/automations.py`, `backend/api/execute.py`, `backend/api/execute_planner.py`, `backend/api/execute_team_planner.py`, `backend/api/features.py`.
   - Filtrer les queries : tout `select(...)` doit avoir `.where(Model.owner_id == user.id)`. Tout `INSERT` doit passer `owner_id=user.id`.
   - Exception : `/api/debug/*` peut rester non-authentifié en dev, mais à désactiver en prod via flag env.
   - Gmail endpoints (`/api/gmail/*`) : à désactiver pour l'app prospect via feature flag (on ne veut pas que le prospect branche son Gmail), ou à masquer côté UI.

6. **Script de seed prospect**
   - `backend/scripts/seed_prospects.py`, CLI : `python -m backend.scripts.seed_prospects prospects.csv --days 14`.
   - Lit CSV `company,email,contact_name`, crée un `AccessToken`, appelle le seeder BTP (chantier D), ressort CSV augmenté avec `access_url`.
   - Sortie : URLs prêtes à coller dans Instantly.

**Fichiers critiques à toucher** :
- `backend/db/database.py` (DATABASE_URL + Alembic)
- `backend/db/models.py` (AccessToken + owner_id partout)
- `backend/api/deps.py` (nouveau)
- `backend/api/auth.py` (nouveau)
- `backend/main.py` (inclure router auth, ajuster catch-all SPA)
- Chaque `backend/api/*.py` existant (ajouter Depends + filtre)
- `backend/scripts/seed_prospects.py` (nouveau)

**Critère de validation** :
- Sans cookie, `GET /api/employees` → 401.
- Avec un cookie de session valide, `GET /api/employees` → uniquement les employés de ce user.
- `GET /app/{token-fictif}` → 404 propre. Avec un vrai token → 302 vers `/dashboard` + cookie posé.
- Expiration testée : on force `expires_at = now() - 1 day`, l'appel retourne 403.

---

### Chantier B — Frontend : routeur, activation, session (2-3 jours)

**But** : rendre `/app/{token}` fonctionnel côté frontend, créer la séparation landing publique / app authentifiée, brancher les clients HTTP sur les cookies.

Livrables :

1. **Installer react-router v6**
   - `npm install react-router-dom@6`.
   - Refactorer `src/App.tsx` pour utiliser `<BrowserRouter>` au lieu de l'`activeMode` state.
   - Conserver le système `CustomEvent` pour les liens internes en attendant la migration complète (gradual), mais toutes les nouvelles routes passent par `react-router`.

2. **Séparation des layouts**
   - `src/layouts/PublicLayout.tsx` : landing actuelle (home, features, tarification, contact, qui-sommes-nous, rgpd, comprendre).
   - `src/layouts/AppLayout.tsx` : dashboard prospect avec Sidebar/Topbar actuels, sans le banner "Bienvenue sur Synthèse" qui est pour la landing.
   - Routes :
     ```tsx
     <Routes>
       <Route element={<PublicLayout />}>
         <Route index element={<HomeView />} />
         <Route path="/contact" element={<ContactView />} />
         {/* ... autres pages publiques */}
       </Route>
       <Route path="/app/:token" element={<ActivateView />} />
       <Route path="/expired" element={<ExpiredView />} />
       <Route element={<ProtectedLayout />}>
         <Route path="/dashboard" element={<DashboardHome />} />
         <Route path="/dashboard/factures" element={<FacturesView />} />
         {/* ... */}
       </Route>
     </Routes>
     ```

3. **`ActivateView`**
   - `src/pages/Activate.tsx` :
     ```tsx
     const { token } = useParams();
     const navigate = useNavigate();
     useEffect(() => {
       fetch(`/app/${token}`, { credentials: 'include', redirect: 'manual' })
         .then(() => navigate('/dashboard'))
         .catch(() => navigate('/expired'));
     }, [token]);
     return <div>Activation de votre espace...</div>;
     ```
   - Alternative plus robuste : backend renvoie `302 /dashboard` avec `Set-Cookie`, le navigateur suit, le frontend charge `/dashboard` directement. Dans ce cas, `ActivateView` n'existe même pas — c'est le backend qui gère le redirect. Je penche pour cette option, plus simple et plus propre.

4. **`ProtectedLayout` avec `useAuth`**
   - Hook `src/hooks/useAuth.ts` :
     ```tsx
     export function useAuth() {
       const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
       useEffect(() => {
         fetch('/api/auth/me', { credentials: 'include' })
           .then(r => r.ok ? r.json() : Promise.reject())
           .then(user => setState({ user, loading: false }))
           .catch(() => setState({ user: null, loading: false }));
       }, []);
       return state;
     }
     ```
   - `ProtectedLayout` : si `loading` affiche spinner, si `!user` redirige vers `/expired`, sinon affiche l'app avec un banner "Votre accès expire dans X jours".

5. **Passage `credentials: 'include'` sur tous les fetch**
   - `src/api/client.ts`, `src/api/emailsClient.ts` (ligne `API = "http://localhost:8000/api"` à supprimer, remplacer par `/api` relatif pour bénéficier du proxy Vite et du même origin en prod), `src/api/emailTopicsClient.ts`, `src/api/automationsClient.ts`, `src/api/plannerClient.ts`, `src/api/teamPlannerClient.ts`, `src/api/employeesClient.ts`.
   - Créer un wrapper commun `src/api/http.ts` :
     ```tsx
     export async function apiFetch(path: string, init?: RequestInit) {
       const res = await fetch(path.startsWith('/') ? path : `/api/${path}`, {
         ...init,
         credentials: 'include',
       });
       if (res.status === 401 || res.status === 403) {
         window.location.href = '/expired';
         throw new Error('Session invalide');
       }
       return res;
     }
     ```
   - Migrer progressivement les clients pour passer par `apiFetch`.

6. **Page `/expired`**
   - `src/pages/Expired.tsx` : message accueillant, CTA mailto `contact@synthese.fr`, CTA tel `07 69 45 50 78`. Respecte le ton du brief (humain, vouvoiement, pas de jargon). Pas de "votre accès a expiré" sec — plutôt "Votre période d'essai Synthèse est terminée. Si vous souhaitez poursuivre, écrivez-nous à contact@synthese.fr ou appelez le 07 69 45 50 78, on chiffre votre projet au cas par cas."

**Fichiers critiques à toucher** :
- `frontend/package.json` (react-router-dom)
- `frontend/src/App.tsx` (refacto BrowserRouter)
- `frontend/src/layouts/` (nouveaux)
- `frontend/src/pages/Activate.tsx`, `Expired.tsx` (nouveaux)
- `frontend/src/hooks/useAuth.ts` (nouveau)
- `frontend/src/api/http.ts` (nouveau wrapper)
- Tous les `frontend/src/api/*Client.ts` (credentials + http wrapper)

**Critère de validation** :
- Cliquer sur `https://.../app/{token}` → aboutit au dashboard, cookie posé.
- Refresh du dashboard → reste sur dashboard (cookie persiste).
- Clear cookies → dashboard redirige vers `/expired`.
- Landing `/`, `/contact`, `/features` accessibles sans cookie.

---

### Chantier C — Features métier BTP (4-6 jours, à arbitrer)

**But** : rendre crédible la démo du point de vue du prospect BTP. Les 3 features prioritaires du brief section 5.

Ce chantier est celui où le gap est le plus grand. Décision à prendre avec toi : tout construire, ou mocker côté backend en gardant UI démo côté frontend ?

**Option 1 — Full build (recommandé si le cold email part dans > 2 semaines)**

Nouveaux modèles SQLAlchemy :
- `Client` : id, owner_id, nom, type (particulier/SCI/copro/collectivité/promoteur), siret, adresse, email, téléphone, notes.
- `Facture` (fournisseur) : id, owner_id, client_id (nullable), fournisseur, numero, date, montant_ht, tva_montant, tva_taux, montant_ttc, file_path, extraction_raw (JSON), created_at.
- `Devis` : id, owner_id, client_id, numero, date, objet, lignes (JSON), montant_ht, tva_montant, montant_ttc, status.
- `LigneDevis` : id, devis_id, description, quantité, unite, prix_unit_ht, tva_taux.

Nouveaux endpoints :
- `POST /api/factures/upload` : upload photo/PDF facture → skills `extract_structured_data` + `extract_tables_smart` → retourne facture créée en DB.
- `GET /api/factures` : liste, filtrable.
- `POST /api/devis/generate` : input `{description: str, client_id?}` → planner avec prompt BTP → devis structuré.
- `GET /api/devis`, `GET /api/devis/{id}/pdf` (export PDF via jsPDF côté frontend ou reportlab côté backend).
- `GET /api/clients`, `GET /api/clients/{id}/rapport` : rapport client (CA cumulé, factures, impayés).

Nouveaux composants frontend (remplacent les démos statiques) :
- `FacturesView` avec upload dropzone + table des extractions.
- `DevisGenerator` : textarea description + bouton "Générer devis" + aperçu en temps réel.
- `ClientDashboard` : sélection client + affichage rapport.

**Option 2 — Wiring minimal (si le cold email part dans < 1 semaine)**

Garder les démos `PhotoToDocumentDemo`, `AgentRapportDemo`, `ChatAssistantDemo` telles quelles, les rendre légèrement dynamiques en lisant depuis la DB des fake factures seedées, mais sans vraie logique d'upload ni de génération. Le prospect voit "quelque chose de BTP" mais ne peut pas vraiment tester. Fallback risqué : un gérant BTP qui upload sa vraie facture et voit un message "fonctionnalité bientôt disponible" va décrocher.

**Ma reco** : Option 1. La feature P1 "photo facture → extraction" utilise directement le pipeline et skills existants (`extract_pdf_text`, `extract_structured_data`, `extract_tables_smart`), donc le travail est modéré. C'est la feature "wow" du MVP, il ne faut pas la bâcler.

---

### Chantier D — Données seed BTP crédibles (2-3 jours)

**But** : quand le prospect se connecte, son espace est déjà rempli de données qui respirent le BTP français.

Sources :
- Pappers (`pappers.fr`) pour des noms réels de SARL BTP en PACA (Avignon, Marseille, Nice, Montpellier).
- Google Maps pour des fournisseurs locaux plausibles (Point.P, Sanitaire Provence, Matériaux du Comtat, etc.).
- Codes TVA : 10% rénovation habitation principale, 20% neuf/locaux pro, 5,5% travaux énergie, auto-liquidation sous-traitance BTP.

Contenu à seeder (dans `backend/scripts/seed_btp_data.py`) :
- **15-20 factures fournisseurs** : PDF générés ou fixture JSON. Fournisseurs plausibles, montants cohérents (300 à 8000€), dates sur les 6 derniers mois, mix TVA 10/20.
- **8-10 fournisseurs types** : Point.P / Bigmat / Gedimat (matériaux), Sanitaire Provence / Cédéo (sanitaire), Rexel / Sonepar (électricité), Loxam / Kiloutou (location engins), Seigneurie / Zolpan (peinture).
- **5-6 clients types** :
  - SCI Les Oliviers (société civile immobilière)
  - Copropriété Résidence des Platanes (copro)
  - M. et Mme Garcia (particuliers)
  - Mme Durand (particulière)
  - Mairie de Pernes-les-Fontaines (collectivité)
  - Promoteur Terres Provence (promoteur)
- **3-4 devis types** :
  - Rénovation salle de bain 8m² carrelage fourni (pose standard)
  - Extension 25m² ossature bois
  - Remise aux normes électriques T3
  - Rénovation énergétique isolation combles + VMC
- **Emails pré-chargés** (si on les garde dans la démo, voir §3.2) :
  - Demande de devis de M. Garcia "Bonjour, pouvez-vous passer chiffrer des travaux salle de bain ?"
  - Relance paiement à la SCI Les Oliviers
  - Commande fournisseur à Point.P

**Contrainte qualité** : pas de "Entreprise Dupont Bâtiment SARL" générique — des noms qui sonnent vrai, des adresses en Provence, des SIRET plausibles. Un gérant BTP va checker.

**Format** : un fichier JSON `backend/data/btp_seed.json` qui est chargé par `seed_btp_data(user_id)` appelée depuis `seed_prospects.py`.

---

### Chantier E — Tracking et dashboard admin (1-2 jours)

**But** : détecter les prospects chauds.

1. Compteurs sur `access_tokens` : `session_count`, `last_seen_at`, `first_seen_at`, `factures_uploaded_by_prospect` (distinct de celles seedées — flag `is_seed` sur `Facture`), `devis_created`, `total_time_seconds` (via heartbeat JS côté frontend, toutes les 30s tant que tab active).

2. Endpoint admin `GET /api/admin/prospects` protégé par une clé admin simple en header (pas besoin de compte admin complet pour 100 prospects) :
   - Liste des tokens, triable par `last_seen_at desc` et `factures_uploaded_by_prospect desc`.
   - Actions : révoquer un token, prolonger un accès, resend URL.

3. Page admin côté frontend `/admin` avec `?key=...` en query — page privée, à ne pas linker publiquement.

4. **Alerte email** à toi quand un prospect atterrit sur `/expired` (signal d'intérêt) : endpoint `GET /expired` déclenche une tâche qui envoie un mail à `contact@synthese.fr` via SMTP (ajout dépendance `aiosmtplib`) ou via Gmail API (tu as déjà le OAuth code, à réutiliser en le réassignant à un compte pro).

---

### Chantier F — Déploiement Railway et RGPD (1 jour)

1. **Migrer la DB de dev → Postgres sur Railway**
   - Activer le plugin Postgres sur Railway, récupérer `DATABASE_URL`.
   - Appliquer les migrations Alembic via `railway run alembic upgrade head` au déploiement.
   - Vérifier que `Dockerfile` installe bien `asyncpg` + `psycopg2-binary`.

2. **Cookie secure + HTTPS**
   - Vérifier que Railway force le HTTPS (c'est le cas par défaut sur leur domaine).
   - Cookie settings : `httpOnly=True`, `secure=True`, `samesite="Lax"` (pas `Strict` pour que le lien du cold email marche depuis un autre domaine), `max_age=30*24*3600`.

3. **Mention RGPD**
   - Dans le cold email (pas dans le code) : "Vos données sont chiffrées, utilisées uniquement pour votre test Synthèse, et supprimées à l'issue de la période de 14 jours."
   - Endpoint `DELETE /api/my-data` : supprime le token (CASCADE sur tout).
   - Cron APScheduler quotidien : `cleanup_expired_tokens()` qui supprime les tokens expirés depuis plus de 7 jours (buffer de grâce au cas où tu prolonges manuellement).
   - Dans la page `/expired` ou dans un footer app : lien "Supprimer mes données maintenant".

4. **Smoke test E2E**
   - Seed un prospect fictif (toi, avec ta propre adresse).
   - Cliquer le lien, vérifier cookie, uploader une facture, générer un devis, logout, revenir, vérifier expiration.

---

## 4. Décisions en suspens

### 4.1 SQLite vs Postgres en prod

Option conservatrice : garder SQLite en prod sur Railway, avec le volume persistant. Fonctionne jusqu'à ~200 users concurrents avec mode WAL. Gain : pas de migration, pas d'Alembic bloquant.

Option robuste : passer Postgres dès la prod. Gain : scalable, migrations propres, natif Railway. Coût : 1 jour de config Alembic + adaptation requirements.

**Ma reco** : Postgres. Même si 200 prospects, les 3 features prioritaires (extraction, génération, rapport) créent du I/O non négligeable, et une fois le code Alembic en place, c'est durable. Le coût d'un jour de plus maintenant est minuscule vs refacto plus tard.

### 4.2 Cookie = token du lien ou session_token dérivé ?

Recommandation : `session_token` dérivé. Ça permet de révoquer une session sans invalider le token (si tu veux re-délivrer un nouvel accès au même prospect). Ça évite que le token se balade dans les headers et logs. Deux colonnes sur `access_tokens` : `token` (dans l'URL) et `session_token` (dans le cookie, régénéré à chaque activation).

### 4.3 Que faire des endpoints Gmail dans l'app prospect

Les endpoints `/api/gmail/*` n'ont aucun sens pour un prospect qui teste (il ne va pas connecter son Gmail). Options :
- Désactiver via feature flag en prod test (`DISABLE_GMAIL_IN_PROSPECT_APP=True`).
- Garder en dev pour toi personnellement pour continuer à bosser sur la feature.

Idem pour les `automations` actives (folder_watch sur `C:\Synthese\Inbox` hardcodé) : désactiver le `TriggerManager` en prod tant que ce n'est pas multi-tenant (sinon tout le monde reçoit les mêmes alertes). C'est ligne 35-51 de `backend/main.py` — ajouter un flag `if os.environ.get("ENABLE_AUTOMATIONS") == "true": ...`.

### 4.4 Faut-il TOUT isoler ou laisser partagé ce qui est générique

Les `email_topics` (catégories "Urgent", "Devis", "Commande") sont-ils par-user ou globaux ? Les templates d'automations ? Les `features` (registry) ?

Ma reco : globaux pour les templates/registry (lecture seule, pas de fuite de données), par-user pour tout ce qui est instance (emails, employees, topics personnalisés, automations configurées). Les templates sont des "blueprints", pas des données.

### 4.5 Arbitrage chantier C (features métier)

C'est la question la plus importante pour toi. Tu veux :
- (a) tout builder proprement (2-3 semaines infra + 1-2 semaines features = 4-5 semaines)
- (b) livrer l'infra multi-tenant en 2-3 semaines et envoyer les cold emails avec des démos statiques personnalisées au nom du prospect mais sans vraie interactivité
- (c) autre découpage

À discuter avant le chantier C.

---

## 5. Fichiers critiques — carte

Pour ne pas te perdre, voici les fichiers qui vont concentrer le gros du travail :

**Backend** :
- `backend/db/database.py` — DATABASE_URL configurable, hook Alembic
- `backend/db/models.py` — AccessToken + owner_id sur tous les modèles
- `backend/api/deps.py` (nouveau) — get_current_user dependency
- `backend/api/auth.py` (nouveau) — /app/{token}, /logout, /me
- `backend/main.py` — inclure router auth, ajuster catch-all SPA, feature flags (gmail/automations)
- `backend/api/employees.py`, `emails.py`, `email_topics.py`, `automations.py`, `execute.py`, `execute_planner.py`, `execute_team_planner.py` — ajouter Depends + filtre owner_id partout
- `backend/scripts/seed_prospects.py` (nouveau)
- `backend/scripts/seed_btp_data.py` (nouveau)
- `backend/alembic/` (nouveau dossier)

**Frontend** :
- `frontend/package.json` — ajout react-router-dom
- `frontend/src/App.tsx` — refacto BrowserRouter (gros changement)
- `frontend/src/layouts/PublicLayout.tsx`, `AppLayout.tsx`, `ProtectedLayout.tsx` (nouveaux)
- `frontend/src/pages/Activate.tsx`, `Expired.tsx`, `DashboardHome.tsx` (nouveaux)
- `frontend/src/hooks/useAuth.ts` (nouveau)
- `frontend/src/api/http.ts` (nouveau) — wrapper commun avec credentials
- `frontend/src/api/*Client.ts` (7 fichiers) — tous à patcher pour passer par http.ts

**Déploiement** :
- `Dockerfile` — ajouter asyncpg/psycopg2-binary, commande Alembic en startup
- `railway.json` — variables d'env (`DATABASE_URL`, `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `DISABLE_GMAIL_IN_PROSPECT_APP`)

---

## 6. Séquencement proposé (3 semaines, option full build partielle)

**Semaine 1 — Infra multi-tenant**
- J1 : Alembic + DATABASE_URL configurable + 1re migration baseline
- J2 : modèle AccessToken + colonne owner_id partout + migration
- J3 : dependency d'auth + endpoint `/app/{token}` + cookie
- J4 : filtrage owner_id sur tous les endpoints existants + tests isolation
- J5 : frontend react-router + ActivateView + ProtectedLayout + useAuth + http wrapper

**Semaine 2 — Features BTP P1 + seed**
- J1-J2 : modèles Facture/Client, endpoints upload + extraction (skills existants)
- J3 : frontend FacturesView (dropzone + table)
- J4-J5 : seed BTP réaliste (JSON + script) + seed_prospects.py + test bout-en-bout sur prospect fictif

**Semaine 3 — Feature P2/P3 + tracking + déploiement**
- J1 : endpoint `POST /api/devis/generate` (planner) + frontend DevisGenerator
- J2 : rapport client (endpoint + ClientDashboard) + tracking + dashboard admin
- J3 : page `/expired` + alerte email + cleanup cron
- J4 : migration Postgres Railway + cookie secure + smoke test prod
- J5 : buffer / polish / premier envoi test à 3-5 prospects amis

Si chantier C reporté (option b) : semaine 2 devient seed + polish, semaine 3 devient déploiement + admin + préparation cold email.

---

## 7. Risques identifiés et mitigations

| Risque | Mitigation |
|---|---|
| Oublier un endpoint dans le filtrage owner_id → fuite de données | Checklist systématique, tests d'intégration qui checkent qu'une session A ne voit jamais les données d'une session B, grep des `select(Model)` sans `.where(owner_id == ...)` |
| Le catch-all SPA `/{full_path:path}` bouffe `/app/{token}` | Définir le router auth AVANT le mount SPA dans `main.py`, tester explicitement |
| Cookie pas posé en prod (cross-site) | Vérifier SameSite=Lax, secure=True, domain correct ; tester depuis un cold email réel |
| Données seed qui sonnent fake → perte de crédibilité | Relecture par 1 personne qui connaît le BTP (quitte à poser 3 questions à ton réseau), pas de "Dupont Bâtiment" |
| Prospect qui upload une vraie facture sensible → on stocke des données confidentielles | Mention RGPD claire, endpoint DELETE, cleanup auto à J+14, chiffrement at-rest du volume Railway (OK par défaut) |
| Alembic qui diverge entre dev SQLite et prod Postgres | Migrations testées sur SQLite ET Postgres en CI, éviter les features Postgres-only (pas de `JSONB`, utiliser `JSON`) |
| Planner / execute endpoints en SSE avec isolation cassée | Le `PipelineContext` doit recevoir `user_id`, tous les skills qui touchent la DB doivent filtrer |
| Test cold email finit en spam | Pas ton chantier Cowork mais attention : warmup 14-21j obligatoire, domaines secondaires, pas de pièces jointes dans le cold, SPF/DKIM/DMARC configurés |

---

## 8. Ce que je propose pour la suite immédiate

Avant de coder, trois points à trancher avec toi :

1. **Arbitrage chantier C** : tout builder (option a), démo wiring minimal (option b), ou autre ? De ça dépend la timeline totale.

2. **Postgres dès maintenant ou SQLite en prod** : ma reco est Postgres, à confirmer.

3. **Décision sur Gmail/automations dans l'app prospect** : désactiver par feature flag (ma reco) ou garder accessibles ? Si désactivés, les composants `Emails/*` et `Automations/*` du frontend doivent être masqués dans la sidebar du dashboard prospect.

Une fois ces 3 points arbitrés, je peux attaquer le Chantier A (fondations DB et auth). C'est le plus critique et le moins risqué à démarrer en premier.
