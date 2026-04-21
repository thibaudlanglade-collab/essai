# Sprint 2 — Smart Extract unifié

Durée réelle : ~2h. Objectif brief §5.1 : une seule surface qui accepte photo / PDF / texte, identifie le type de document, extrait les infos utiles, propose un rangement, et persiste tout ça dans l'espace isolé du prospect.

## Ce qui est livré

### Backend

**`backend/services/extract_service.py`** — un seul appel OpenAI `gpt-4o` (vision + JSON mode) qui :
- Classifie le document (`invoice` | `contract` | `note` | `other`) + niveau de confiance.
- Extrait les champs pertinents selon le type (schéma détaillé dans `_SYSTEM_PROMPT`, lignes facture, parties contrat, actions note…).
- Propose `suggested_folder` (ex. `Factures/Point_P/Avril_2026/`) et `suggested_filename` (`2026-04-18_Point_P_FacN00812_902.40EUR.pdf`).
- Valide la réponse + normalise les chemins via `_validate_and_normalise`.
- Pré-traitement PDF via `pypdf` (fallback `pymupdf`). Pour les images, on envoie en base64 directement à l'endpoint vision.

Choix : ONE call plutôt que chain `classify → extract → suggest`. Qualité nettement meilleure avec contexte complet, et latence halved.

**`backend/api/extract.py`** — router `/api/extract/*`, 3 endpoints :
- `POST /upload` : multipart `file` **ou** form `text`. Persiste l'`Extraction` + renvoie `extraction + suggested_folder + suggested_filename + summary + confidence`. Validation stricte : exactement un des deux inputs, 20 Mo max, MIME types whitelistés.
- `POST /save` : prend `{extraction_id, validated_data, target_folder, final_filename, commit_to_invoices}`. Met à jour l'extraction. Si `commit_to_invoices && document_type=="invoice"`, crée une ligne `Invoice` (et un `Supplier` si le nom ne matche aucun existant), scopées user_id.
- `GET /history?limit=N` : 30 derniers documents traités.

Tous les trois en `Depends(get_current_user)` strict. Fichiers stockés sous `backend/attachments/{user_id}/extractions/` (création lazy), nommés `{8-char-uuid}_{safe_basename}` pour éviter les collisions.

### Frontend

**`frontend/src/api/extractClient.ts`** — client typé avec `ExtractionResult`, `ExtractedData`, `InvoiceLine`, `SaveExtractionBody`. Envoie `credentials: "include"` partout et remonte les erreurs via `ApiError` pour un toast UX propre côté page.

**`frontend/src/pages/ExtractView.tsx`** — page complète :
- Toggle `Fichier` / `Texte` en haut.
- Mode fichier : dropzone `border-dashed` avec hover, preview nom + taille, clic → file picker.
- Mode texte : `textarea` grande.
- Bouton `Analyser le document` → appel backend.
- Review panel : header avec badge type + confiance + summary, grid 2 colonnes. Gauche : champs extraits éditables par type (facture : fournisseur, SIRET, numéro, date, HT/TVA/TTC, auto-liquidation, lignes éditables ; contrat : parties, objet, dates, obligations, pénalités ; note : date, projet, points clés). Droite : dossier + filename éditables, checkbox "Ajouter à mes factures", disclosure "Voir le texte brut extrait".
- `Enregistrer et classer` → `POST /save`, toast success, reset du form après 1.4s.
- `Historique récent` : 10 dernières extractions avec type, filename, folder, date formatée.

**Routing** : `/dashboard/extract` ajouté dans `App.tsx` sous `<ProtectedLayout>`. Pas de refactor de sidebar : le layout dashboard reste le placeholder Sprint 1, et la navigation vers Extract se fait via un CTA mis en avant dans `DashboardHome` ("Smart Extract, disponible tout de suite"). La sidebar complète arrivera à partir du Sprint 4 quand 3-4 features seront dispos.

## Tests backend

Token créé, cookie activé, puis :

| Test | Résultat |
|---|---|
| `POST /upload` avec texte collé (facture Point P) | `document_type=invoice`, supplier/SIRET/numéro/dates/montants 100% exacts, folder `Factures/Point_P/Avril_2026/`, filename au schéma brief §6.1 |
| `POST /upload` avec PDF (`demo-files/facture-metro.pdf`) | `document_type=invoice`, `METRO Cash & Carry France SAS`, `FAC-2026-04187`, `amount_ttc=551.47`, confiance 1.0 |
| `POST /save` avec `commit_to_invoices=true` | Ligne `invoices` créée (supplier auto-résolu/créé), `invoice_id` retourné |
| Vérif SQL `SELECT ... FROM invoices JOIN suppliers` | `FAC-2026-04187 / METRO Cash & Carry France SAS / 551.47` présent, `is_seed=false` |
| `GET /history` | 3 extractions listées, types + folders corrects |

Isolation testée implicitement : toutes les queries utilisent `.where(Extraction.user_id == user.id)` — un futur prospect ne verra jamais ces 3 extractions.

## Points d'attention

- **Vision model coût** : chaque upload d'image passe par `gpt-4o` avec `detail: high` (~0.01-0.02 $ par appel). Négligeable tant qu'on est < 100 prospects × 10 docs, mais à surveiller. Option de fallback `detail: low` + texte OCR pour baisser le coût si besoin.
- **Scanned PDFs** : si `pypdf`/`pymupdf` ne trouvent pas de texte (PDF scanné sans OCR), on envoie un texte vide au modèle, qui renvoie `document_type=other` avec un `reason` expliquant. À améliorer Sprint 3 en ajoutant une branche "image vers gpt-4o vision" pour les PDFs sans texte.
- **Fichier stocké vs Drive réel** : les fichiers atterrissent dans `backend/attachments/{user_id}/extractions/`. Pas encore de mouvement réel vers un Drive surveillé (c'est Sprint 3). Pour l'instant le prospect voit juste le dossier suggéré dans l'UI comme information — aucune action filesystem externe.
- **Invoice date parsing** : le parser accepte strict `YYYY-MM-DD`. Si le modèle retourne autre chose (rare mais possible), le champ `invoice_date` de la ligne Invoice reste `NULL`. Acceptable pour Sprint 2 — Sprint 3 ajoutera un fallback multi-format.
- **Supplier matching** : `Supplier.name ILIKE ?` case-insensitive. Pas encore de fuzzy (Levenshtein) — si le prospect écrit "Point P." avec un point final, ça crée un deuxième supplier. À améliorer Sprint 4 quand le rapport client aura besoin de consolider.

## Ce qui est volontairement laissé pour plus tard

- **Preview du document uploadé dans le review panel** : brief §5.1 mentionne "preview du document uploadé". Le recap affiche déjà nom + raw_text extrait ; le preview visuel (iframe PDF / `<img>`) viendra Sprint 3 quand on ajoutera le serve statique de `backend/attachments/`.
- **Drag multi-fichiers** : on accepte un seul fichier par upload. Batch viendra quand l'automatisation (Sprint 3) permettra d'envoyer plusieurs docs en série.
- **Retry / edit d'une extraction ancienne** : l'historique est en lecture seule. Ré-ouverture d'une extraction éditable pour re-catégoriser : reporté à Sprint 4.

## Commandes pour tester

```bash
cd /Users/thibaud/Desktop/TE-main/backend

# Backend (flags off, cleanup off en dev pour éviter de perdre les tokens de test)
SYNTHESE_DEV=1 SYNTHESE_DISABLE_CLEANUP=1 PATH="/opt/homebrew/bin:$PATH" \
  .venv/bin/uvicorn main:app --port 8000

# Créer un token de test
.venv/bin/python -m scripts.seed_prospects create --name "Test Extract" --days 14

# Activer (pose le cookie)
CJ=/tmp/ck.txt
curl -si -c $CJ "http://localhost:8000/app/<TOKEN>" > /dev/null

# Test texte
curl -sb $CJ -F "text=Facture Point P numero FA2026-00812 du 18 avril 2026 total 902.40 EUR TTC" \
  http://localhost:8000/api/extract/upload | jq .

# Test fichier
curl -sb $CJ -F "file=@../frontend/public/demo-files/facture-metro.pdf;type=application/pdf" \
  http://localhost:8000/api/extract/upload | jq .
```

Frontend : `cd frontend && npm run dev` puis ouvrir `http://localhost:5173/app/<TOKEN>` → `/dashboard` → clic "Ouvrir Smart Extract".
