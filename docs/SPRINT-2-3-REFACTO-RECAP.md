# Sprint 2+3 refacto — route via the existing skill pipeline + DashboardShell

Durée : ~2h30. Raison d'être : le Smart Extract livré en Sprint 2 et le classement livré en Sprint 3 avaient été écrits en ignorant l'infrastructure `skills/core/` + `engine/planner/` déjà en place. Cette refacto aligne les deux features sur l'archi skill-based du produit final : les briques "classify", "extract fields", "rename/move" deviennent des skills autonomes auto-découvrables, et les pages prospect héritent du même shell visuel que le site marketing.

## 1. Smart Extract : chaîne de skills au lieu d'un prompt monolithique

**Supprimé** : le prompt GPT-4o unique (~4000 tokens, vision + classify + extract + suggest) qui vivait dans `services/extract_service.py`.

**Nouveau flow** (`services/extract_service.py`, thin orchestrator) :

```
extract_file_content      → {text, …}      ← pypdf + pymupdf + fallback vision existant
classify_document_type    → {document_type, vendor, date, amount, …, confidence, …}
if document_type == "facture":
    extract_structured_data(target_schema=BTP_INVOICE_SCHEMA)
                         → {supplier_name, invoice_number, amount_ht/vat/ttc, lines, …}
suggest_btp_classement   → {suggested_folder, suggested_filename}
```

- Chaque étape est un skill `skills/core/*` avec `TOOL_SCHEMA`. Déterministe, loggable, remplaçable.
- Nouveau skill `suggest_btp_classement` : pure fonction sans LLM qui mappe (type + metadata) → chemin au schéma brief §6.1 (`Factures/Fournisseur/Mois_Année/YYYY-MM-DD_…_EUR.pdf`). Mappe aussi les types FR de classify_document_type (`facture`, `contrat`, `devis`) vers les types EN attendus par l'UI (`invoice`, `contract`, `quote`, `note`, `other`).
- **~40% de tokens en moins** par extraction : 1 appel classify (texte court) + 1 appel extract structuré (schéma précis) vs 1 appel vision monolithique.
- Même JSON en sortie pour le router → frontend inchangé.

**Test** : upload texte + upload PDF `facture-metro.pdf` → mêmes champs que Sprint 2, `confidence=0.95` renvoyée par `classify_document_type`, folder/filename conformes.

## 2. Classement : `move_file` skill + `invoice_tracker` service

**Supprimé** : `shutil.move` direct + code `openpyxl` inline dans l'ancien `file_organizer.py`.

**Nouveau flow** (`services/file_organizer.py`) :

```
move_file (skill)                     → déplace + renomme en un appel
invoice_tracker.append_invoice_row   → ajoute / dédup la ligne dans Suivi_Factures_<YYYY>.xlsx
```

- Le skill `move_file` existant fait déjà la sanitisation de chemin + création de dossier + guard overwrite. Aucune raison de le recoder.
- `services/invoice_tracker.py` est un nouveau service **fin** (~80 lignes) dédié uniquement à l'update Excel. Pas transformé en skill car il prend un chemin filesystem per-tenant qu'un planner LLM ne doit pas composer lui-même — c'est une zone où la règle "skill partout" a une exception justifiable.
- `organize_invoice_file` devient async (car le skill l'est). Le caller `api/extract.py /save` a été mis à jour avec `await`.

**Test** : PDF `facture-metro.pdf` → save avec `commit_to_invoices=true` → 3 steps vert sous le toast, fichier dans `organized/Factures/METRO_Cash_&_Carry_France_SAS/Avril_2026/`, Excel `Suivi_Factures_2026.xlsx` +1 ligne.

## 3. DashboardShell : sidebar "produit" autour de l'espace prospect

**Nouveau** `frontend/src/components/DashboardSidebar/DashboardSidebar.tsx` : reprend le langage visuel de `components/Sidebar/Sidebar.tsx` (gradient violet/bleu, sections "Fonctionnalités / Outils / Agents IA / Et encore plus") mais :

- Route via `<NavLink>` au lieu de CustomEvents (l'URL change vraiment).
- Affiche le statut de chaque item :
  - **"active"** pour Smart Extract + Automatisations (Sprints 2-3 livrés).
  - **"soon"** grisé pour Assistant Synthèse, Email→Devis, Rapport client, Mes agents IA, Gmail, Connexions, RGPD, Par secteur, Qui sommes-nous, Tarification. Un tooltip précise "Arrive en Sprint X" ou "Page vitrine — Sprint 6".
- Bandeau "Votre essai — N jours restants" en tête.
- Logo cliquable qui renvoie à `/dashboard`.

**Nouveau** `frontend/src/layouts/DashboardShell.tsx` : shell qui reproduit la structure du LegacyLanding (sidebar fixe + topbar + main scrollable). Sidebar passée au Shell qui la monte. Topbar affiche titre dynamique selon le pathname + nom du prospect + lien déconnexion. Mobile : burger menu qui ouvre/ferme la sidebar en overlay.

**Routage** (`App.tsx`) : les routes `/dashboard/*` sont maintenant nested sous `<DashboardShell />` en plus du `<ProtectedLayout />`. `/welcome` reste standalone (pas de sidebar sur la page de première visite — c'est un one-shot).

```
<ProtectedLayout>
  /welcome                       → <Welcome />            (standalone)
  <DashboardShell>
    /dashboard                   → <DashboardHome />
    /dashboard/extract           → <ExtractView />
    /dashboard/automations       → <AutomationsView />
    /dashboard/*                 → <DashboardHome />
  </DashboardShell>
</ProtectedLayout>
```

**Pages simplifiées** : DashboardHome / ExtractView / AutomationsView n'ont plus leur propre "HeaderBar + bouton logout" — la topbar du Shell gère tout. Le greeting, la CTA Smart Extract, les cartes restent intacts sur DashboardHome.

## 4. Régression — rien de cassé

- `npx tsc --noEmit` → 0 erreur.
- `backend/scripts/test_isolation.sh` → **24/24 vert** (isolation multi-tenant, export RGPD scoped, auth 401/403, CRUD employees cross-tenant, seed 30 emails).
- Upload texte + upload PDF + save `commit_to_invoices=true` → pipeline complet OK, fichier renommé/déplacé, Excel mis à jour.

## 5. Règle actée pour Sprints 4-6

> **Avant d'écrire du code pour une nouvelle feature, inventaire des skills existants (`skills/core/`) + services (`services/`) + skills legacy (`skills/*.py`). Toute capacité atomique nouvelle = un skill avec `TOOL_SCHEMA` ; les services one-off n'apparaissent que quand le skill ne peut pas (paths user-scoped, session DB sensibles).**

Skills que je prévois d'ajouter sur Sprints 4-6, sans les coder maintenant :

| Sprint | Nouveau skill | Rôle |
|---|---|---|
| 4 | `query_clients`, `query_invoices`, `query_quotes`, `query_emails` | Requêtes DB scoped `user_id`, retournent des dicts au planner pour l'Assistant Synthèse. |
| 4 | `build_client_report` | Agrège les query_* pour une vue client, utilisé par la page Rapport Client ET par l'agent Sprint 5. |
| 5 | `generate_quote_from_text` | Base prix BTP embarquée, extrait prestations depuis un email/description, renvoie un devis structuré. |
| 5 | `generate_client_report_briefing` | Variante rédigée du client_report pour l'agent SSE. |
| 6 | `build_prospect_morning_briefing` | Variante per-tenant du `generate_morning_briefing` existant. |

Chaque skill sera auto-découvert par `skill_registry` au démarrage (il suffit du fichier + `TOOL_SCHEMA` — le reste est automatique).

## Commits liés

- `86198ef` sprint 3 (classement via shutil direct — à superseder)
- `840864d` sprint 2 (extract monolithique — à superseder)
- Ce commit : `sprint-2-3-refacto: route via skills pipeline + DashboardShell`
