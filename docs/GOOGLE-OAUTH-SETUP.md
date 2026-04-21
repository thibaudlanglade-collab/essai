# Setup Google OAuth pour Synthèse

## 1. Objectif

Ce setup vous permet d'obtenir un **Client ID** et un **Client Secret** Google, puis d'autoriser l'app test de Synthèse à se connecter aux comptes Gmail et Google Drive des prospects. Sans cette étape, deux fonctions clés de l'app test ne marchent pas : la lecture Gmail readonly (§5.5 du brief) et la surveillance du dossier Drive pour classer les factures (§6.2 du brief).

## 2. Prérequis

- Un compte Google. Utilisez de préférence le compte de Synthèse (`contact@synthese.fr`), pas votre compte personnel, pour que la propriété du projet reste rattachée à l'entreprise.
- Accès à [console.cloud.google.com](https://console.cloud.google.com) connecté avec ce compte.
- 15 minutes devant vous, sans interruption (la procédure se fait d'un bloc).

## 3. Étapes

### Étape 1 — Créer le projet "Synthèse Test"

**Ce que vous faites :**
1. Allez sur [console.cloud.google.com](https://console.cloud.google.com).
2. En haut de la page, cliquez sur le sélecteur de projet (à droite du logo Google Cloud).
3. Cliquez sur **Nouveau projet**.
4. Dans le champ **Nom du projet**, tapez `Synthèse Test`.
5. Laissez le champ **Organisation** tel quel (vide si vous n'en avez pas).
6. Cliquez **Créer**.

**Ce que vous voyez :**
- Une notification en haut à droite confirme la création du projet (quelques secondes).
- Le sélecteur de projet bascule automatiquement sur `Synthèse Test`.

**À garder de côté :** rien pour l'instant. Vérifiez juste que `Synthèse Test` est bien le projet actif (nom affiché en haut de page) avant de passer à l'étape suivante.

---

### Étape 2 — Activer Gmail API et Google Drive API

**Ce que vous faites :**
1. Dans le menu de gauche, allez dans **APIs & Services** > **Library** (Bibliothèque).
2. Dans la barre de recherche, tapez `Gmail API`.
3. Cliquez sur le résultat **Gmail API**, puis sur le bouton bleu **Enable** (Activer).
4. Revenez dans **Library** (bouton retour ou même chemin).
5. Tapez `Google Drive API` dans la recherche.
6. Cliquez sur **Google Drive API**, puis **Enable**.

**Ce que vous voyez :**
- Pour chaque API, après clic sur Enable, vous êtes redirigé vers la page de l'API avec le statut **Enabled** et quelques métriques à zéro.

**À garder de côté :** rien. Vérifiez simplement que les deux API sont bien dans l'état **Enabled**.

---

### Étape 3 — Configurer l'écran de consentement OAuth

**Ce que vous faites :**
1. Dans le menu de gauche, allez dans **APIs & Services** > **OAuth consent screen**.
2. Choisissez **User Type : External**, puis cliquez **Create**.

Vous arrivez sur un formulaire en 4 pages (OAuth consent screen, Scopes, Test users, Summary).

**Page 1 — OAuth consent screen :**
- **App name** : `Synthèse`
- **User support email** : `contact@synthese.fr`
- **App logo** : laissez vide pour l'instant (vous pourrez l'ajouter plus tard).
- **App domain** :
  - Application home page : `https://synthese.fr`
  - Application privacy policy link : `https://synthese.fr/confidentialite` (à créer avant de passer en Production, optionnel en Testing)
  - Application terms of service link : `https://synthese.fr/cgu` (idem)
- **Authorized domains** : ajoutez `synthese.fr`.
- **Developer contact information** : `contact@synthese.fr`.
- Cliquez **Save and Continue**.

**Page 2 — Scopes :**
1. Cliquez **Add or Remove Scopes**.
2. Dans la liste, cochez ou recherchez puis ajoutez les trois scopes suivants :

| Scope | Valeur exacte | Justification à coller |
|---|---|---|
| Gmail readonly | `https://www.googleapis.com/auth/gmail.readonly` | Lecture des emails entrants pour détecter les factures et documents chantier. |
| Drive readonly | `https://www.googleapis.com/auth/drive.readonly` | Lecture des documents Drive pour identifier les factures à classer. |
| Drive file | `https://www.googleapis.com/auth/drive.file` | Nécessaire pour déplacer les factures classées dans les bons dossiers Drive. |

3. Cliquez **Update**, puis **Save and Continue**.

**Page 3 — Test users :**
1. Cliquez **Add Users**.
2. Ajoutez `contact@synthese.fr` (votre email de test).
3. Si vous avez déjà la liste des emails de vos prospects, ajoutez-les ici (voir section 5 ci-dessous). Limite : **100 test users maximum**.
4. Cliquez **Save and Continue**.

> Important : chaque prospect doit être ajouté comme test user **avant** de recevoir votre cold email. Sinon il tombera sur une erreur "access_denied" au moment de connecter son Gmail.

**Page 4 — Summary :** vérifiez les infos, cliquez **Back to Dashboard**.

**Publishing status :** laissez sur **Testing**. Ne cliquez **pas** sur "Publish App". Passer en Production déclenche la vérification Google (4 à 6 semaines), ce qu'on veut éviter tant que la phase test n'est pas terminée.

**À garder de côté :** rien de technique à copier ici, mais gardez en tête que le statut doit rester **Testing**.

---

### Étape 4 — Créer l'OAuth 2.0 Client ID

**Ce que vous faites :**
1. Dans le menu de gauche, allez dans **APIs & Services** > **Credentials**.
2. Cliquez **Create Credentials** > **OAuth client ID**.
3. **Application type** : `Web application`.
4. **Name** : `Synthèse Web Client`.
5. Dans la section **Authorized redirect URIs**, ajoutez les **4 URIs suivantes** d'un coup (cliquez **Add URI** pour chaque) :

```
http://localhost:8000/api/oauth/gmail/callback
http://localhost:8000/api/oauth/drive/callback
https://synthese.fr/api/oauth/gmail/callback
https://synthese.fr/api/oauth/drive/callback
```

> Ajoutez les 4 maintenant, même si vous ne passez pas encore en prod. Revenir plus tard pour en ajouter une nouvelle oblige à refaire un cycle de test côté app.

6. Cliquez **Create**.

**Ce que vous voyez :**
- Une popup intitulée **OAuth client created** affichant **Your Client ID** et **Your Client Secret**.

**À garder de côté : les deux valeurs affichées dans la popup.**

Copiez-les immédiatement dans le fichier `backend/.env` du repo :

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

Remplacez `xxx` par les valeurs réelles. Le Client Secret commence par `GOCSPX-`.

---

### Étape 5 — Télécharger le fichier JSON de credentials (backup)

**Ce que vous faites :**
1. Toujours dans **APIs & Services** > **Credentials**, repérez la ligne **Synthèse Web Client** dans la liste des OAuth 2.0 Client IDs.
2. À droite de la ligne, cliquez sur l'icône de téléchargement (flèche vers le bas).
3. Sauvegardez le fichier JSON dans un endroit sûr (par exemple un dossier chiffré, ou un gestionnaire de mots de passe).

**Ce que vous voyez :** le fichier téléchargé s'appelle `client_secret_xxx.json`.

**À garder de côté :** ce fichier est un backup. Il contient les mêmes valeurs que ce qui est dans `.env`, mais permet de récupérer le Client Secret si vous le perdez (Google ne le ré-affiche pas dans la console après la popup initiale).

---

## 4. Gestion de l'écran d'avertissement côté prospect

Tant que l'app est en statut **Testing**, Google affiche un écran d'avertissement à chaque prospect qui tente de connecter son Gmail. Voici exactement ce qu'il voit et les clics qu'il doit faire :

**Écran 1 — "Google n'a pas vérifié cette application"**
- Un écran jaune/orange avec le titre **"Google n'a pas vérifié cette application"**.
- Le nom `Synthèse` est affiché avec une icône d'avertissement.
- Deux boutons visibles : **Retour à la sécurité** (bouton principal bleu) et, plus discret, un lien **Paramètres avancés** (ou **Afficher les paramètres avancés**) en bas à gauche de la boîte.

**Clic 1 :** cliquer sur **Paramètres avancés**.

**Écran 2 — texte déplié**
- Un paragraphe apparaît sous le lien, avec une phrase du type : "Accédez à synthese.fr (non sécurisé)".

**Clic 2 :** cliquer sur **Accéder à synthese.fr (non sécurisé)**.

**Écran 3 — écran de consentement normal**
- Liste des permissions demandées (Gmail readonly, Drive readonly, Drive file).
- Bouton **Continuer** ou **Autoriser**.

**Clic 3 :** cliquer **Continuer**.

### Ce qu'il faut prévoir dans l'app test

Le CTA "Connecter mon Gmail" dans l'app test doit **préparer le prospect avant le clic**, pas après. Prévoyez un encart rassurant qui explique :
- Pourquoi cet écran apparaît (app en phase de test fermée, limitée à 100 utilisateurs invités).
- Les 3 clics à faire (Paramètres avancés > Accéder à synthese.fr > Continuer).
- Que les données restent chez lui (pas de stockage côté Synthèse au-delà du traitement).

Voir §5.5 du brief pour le wording exact de cet encart.

### Limite 100 test users

Google plafonne à **100 test users** par projet en statut Testing. Au-delà, deux options :
- Passer en Production (implique la vérification Google, 4 à 6 semaines).
- Faire du roulement : retirer les prospects inactifs de la liste pour libérer des places.

---

## 5. Ajouter un test user

À faire **avant** d'envoyer la cold email au prospect concerné. Sinon il tombe sur une erreur `access_denied` au moment de cliquer sur "Connecter mon Gmail".

**Procédure :**
1. Allez sur [console.cloud.google.com](https://console.cloud.google.com) avec le projet `Synthèse Test` sélectionné.
2. **APIs & Services** > **OAuth consent screen**.
3. Descendez jusqu'à la section **Test users**.
4. Cliquez **Add Users**.
5. Collez l'email du prospect (un par ligne si plusieurs).
6. Cliquez **Save**.

**Conseil :** dès que vous avez la liste des emails de votre campagne, ajoutez-les tous d'un coup (jusqu'à 100). Si votre campagne dépasse 100 prospects, deux choix :
- Faire du roulement (voir section 4 ci-dessus).
- Passer en Production (voir section 6 ci-dessous).

---

## 6. Quand publier en Production

**Ne publiez pas avant** d'avoir **10 à 20 prospects engagés** sur l'app test (qui ont vraiment connecté leur Gmail et utilisé le produit). Avant ce stade, Testing suffit.

### Ce que demande la vérification Google

1. **Preuve de propriété du domaine** `synthese.fr` via Google Search Console.
2. **Démo vidéo** de l'app montrant concrètement où chaque scope est utilisé (Gmail readonly, Drive readonly, Drive file). Format YouTube unlisted généralement accepté.
3. **Homepage publique** sur `synthese.fr` avec description claire du produit.
4. **Politique de confidentialité** publique à une URL dédiée (`https://synthese.fr/confidentialite` par exemple).
5. **Conditions d'utilisation** publiques (`https://synthese.fr/cgu`).
6. **Délai** : comptez **4 à 6 semaines** entre la soumission et la validation, avec possibles allers-retours par email.

### Alternative recommandée

Tant que vous êtes sous 100 test users, **restez en Testing**. Le passage en Production n'apporte rien de plus à ce stade, et le délai de vérification peut bloquer la campagne commerciale.

---

## 7. Checklist finale

- [ ] Projet `Synthèse Test` créé dans Google Cloud Console
- [ ] Gmail API activée
- [ ] Drive API activée
- [ ] OAuth consent screen configuré en statut **Testing**
- [ ] 3 scopes ajoutés : `gmail.readonly`, `drive.readonly`, `drive.file`
- [ ] OAuth 2.0 Client ID créé (type Web application, nom `Synthèse Web Client`)
- [ ] 4 redirect URIs ajoutées (localhost + prod, gmail + drive)
- [ ] `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` copiés dans `backend/.env`
- [ ] Fichier JSON de credentials téléchargé et stocké en backup
- [ ] Premier test user ajouté : `contact@synthese.fr`
