# Smart Reporting RDJ — Documentation complète

---

## 1. Structure du projet

```
smart-reporting-rdj/
├── public/              ← Fichiers servis tels quels (logo, PWA, service worker)
├── src/                 ← Tout le code source React
│   ├── components/      ← Composants réutilisables (layout, AI)
│   ├── contexts/        ← État global (authentification)
│   ├── data/            ← Données statiques (directions, catégories)
│   ├── firebase/        ← Connexion Firebase
│   ├── hooks/           ← Hooks React personnalisés
│   ├── pages/           ← Pages par rôle (agent/, dg/, admin/)
│   └── utils/           ← Export PDF et Excel
├── .env                 ← Clés secrètes (jamais sur GitHub)
├── .env.example         ← Modèle à partager (sans valeurs)
├── firebase.json        ← Configuration du déploiement Firebase
├── .firebaserc          ← Quel projet Firebase utiliser
├── firestore.rules      ← Règles de sécurité de la base de données
├── commit-push.bat      ← Script de commit + déploiement
└── package.json         ← Dépendances et scripts npm
```

**Pourquoi cette structure ?** Séparation claire entre code source (`src/`), fichiers publics
(`public/`) et configuration. Les pages sont organisées par rôle ce qui facilite l'ajout de
nouvelles fonctionnalités sans toucher au code existant.

---

## 2. Fichier `.env` — Les clés secrètes

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=smart-reporting-rdj.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-reporting-rdj
VITE_FIREBASE_STORAGE_BUCKET=smart-reporting-rdj.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

**Pourquoi VITE_ en préfixe ?**
Vite (le bundler) n'expose au navigateur que les variables qui commencent par `VITE_`.
Les autres restent côté serveur uniquement.

**Pourquoi `.env` est dans `.gitignore` ?**
Pour ne jamais envoyer vos clés secrètes sur GitHub. Si quelqu'un récupère votre clé Firebase,
il peut lire ou détruire toute votre base de données.

**`.env.example`** est le fichier de documentation : il montre quelles variables sont nécessaires,
sans les vraies valeurs. Un nouveau développeur copie ce fichier en `.env` et remplit ses propres clés.

---

## 3. `src/firebase/config.js` — Connexion à Firebase

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const app = initializeApp({ ...vos clés... });
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
```

**Pourquoi exporter `auth`, `db`, `storage` séparément ?**
Chaque page importe uniquement ce dont elle a besoin. Une page qui lit des rapports n'a pas
besoin d'`auth`. Cela évite les dépendances inutiles et rend le code plus lisible.

---

## 4. `src/firebase/adminAuth.js` — Création de comptes sans déconnexion

```js
// Deuxième instance Firebase nommée 'admin-create'
const app2 = initializeApp(config, 'admin-create');
// Crée l'utilisateur dans cette instance secondaire
// puis se déconnecte de l'instance secondaire uniquement
// → le DRH reste connecté dans l'instance principale
```

**Pourquoi cette complexité ?**
Firebase Auth n'a qu'une session active par instance. Si le DRH crée un agent avec
`createUserWithEmailAndPassword()` sur l'instance principale, Firebase le connecte
automatiquement en tant que ce nouvel agent et déconnecte le DRH. La deuxième instance
contourne ce problème.

---

## 5. `src/contexts/AuthContext.jsx` — État global d'authentification

Expose `{ user, userProfile, loading, login, logout }` à toute l'application via React Context.

- `user` → l'objet Firebase Auth (email, uid)
- `userProfile` → le document Firestore `users/{uid}` avec `role`, `nom`, `prenom`, `directionId`

**Pourquoi lire Firestore en plus de Firebase Auth ?**
Firebase Auth ne stocke que email et uid. Le rôle (`dg`, `drh`, `chef`, `agent`) et la direction
sont dans Firestore. Sans ce profil, impossible de savoir quelle interface afficher.

---

## 6. `src/App.jsx` — Routage et protection des pages

```jsx
<ProtectedRoute>                        // vérifie que l'utilisateur est connecté
  <RoleRoute roles={['drh']}>           // vérifie le rôle
    <AdminPanel />
  </RoleRoute>
</ProtectedRoute>
```

- **`ProtectedRoute`** : si non connecté → redirige vers `/login`
- **`RoleRoute`** : si rôle insuffisant → redirige vers `/non-autorise`
- **`RootRedirect`** : DG/DRH → `/dashboard`, agents → `/rdj`

**Pourquoi protéger les routes côté client si Firestore a ses propres règles ?**
Défense en profondeur. Les routes protègent l'interface, les règles Firestore protègent les données.
Si quelqu'un contourne le routage, il ne peut quand même pas lire les données des autres.

---

## 7. `firestore.rules` — Sécurité de la base de données

```
- users      : chaque agent lit son propre profil, DRH lit tout
- rdj_reports: agent écrit uniquement son rapport, DRH/DG/chef lisent tout
- alerts     : DRH/DG seulement
- config     : DRH seulement
```

**Importance critique** : ces règles s'appliquent côté serveur Firebase. Même si quelqu'un
inspecte le code JavaScript de l'app ou utilise un outil comme Postman, il ne peut pas lire
les rapports des autres ou modifier la config système.

---

## 8. `firebase.json` — Configuration du déploiement

```json
"rewrites": [{ "source": "**", "destination": "/index.html" }]
```

**Pourquoi ce rewrite ?**
Smart Reporting est une SPA (Single Page Application). Il n'existe qu'un seul fichier `index.html`.
Quand un utilisateur tape directement `smart-reporting-rdj.web.app/dashboard`, Firebase doit
renvoyer `index.html` et laisser React Router gérer `/dashboard`. Sans ce rewrite, Firebase
renverrait une erreur 404.

```json
"headers": [{ "source": "**/*.@(js|css)", "Cache-Control": "immutable" }]
```

**Pourquoi `immutable` ?**
Les fichiers JS/CSS compilés par Vite ont un hash dans leur nom (`index-CZHaN_uj.js`). Ce hash
change à chaque build. Les navigateurs peuvent donc les mettre en cache indéfiniment — ils sauront
automatiquement télécharger la nouvelle version grâce au nouveau hash.

---

## 9. `public/manifest.json` + `public/sw.js` — PWA

**`manifest.json`** : permet l'installation de l'app sur l'écran d'accueil mobile (comme une app
native). Définit le nom, l'icône, la couleur de fond.

**`sw.js` (Service Worker)** : intercepte les requêtes réseau.
- Navigation → réseau d'abord (toujours la dernière version)
- Assets JS/CSS/images → cache d'abord (chargement instantané)

**Résultat concret** : l'app fonctionne en mode avion pour les pages déjà visitées. Sur mobile,
elle s'installe et ressemble à une vraie application.

---

## 10. `tailwind.config.js` — Thème CNSSAP

```js
colors: {
  cnssap: {
    bg:      '#0a0a0a',   // fond principal très sombre
    surface: '#111111',   // cartes et panneaux
    primary: '#003f7f',   // bleu CNSSAP officiel
    accent:  '#4d9fff',   // bleu clair pour les éléments actifs
    success: '#2ecc71',   // vert pour les statuts positifs
    warning: '#e67e22',   // orange pour les alertes
    danger:  '#e74c3c',   // rouge pour les erreurs
  }
}
```

**Pourquoi un thème personnalisé ?**
Au lieu d'écrire `style={{ color: '#4d9fff' }}` partout, on écrit `text-cnssap-accent`.
Si la charte graphique CNSSAP change, on modifie une seule ligne dans `tailwind.config.js`
et toute l'application est mise à jour automatiquement.

---

## 11. `package.json` — Scripts disponibles

| Commande              | Action                                        |
|-----------------------|-----------------------------------------------|
| `npm run dev`         | Serveur local sur `localhost:5173`            |
| `npm run build`       | Compile tout dans `dist/`                     |
| `npm run deploy`      | Build + envoie sur Firebase Hosting           |
| `npm run deploy:pages`| Build + envoie sur GitHub Pages (alternatif)  |

---

## 12. `commit-push.bat` — Workflow quotidien

Double-clic sur le fichier → il :
1. Affiche les fichiers modifiés
2. Demande un message de commit
3. Envoie le code sur GitHub
4. Propose de déployer aussi sur Firebase Hosting

**Quand l'utiliser ?**
À chaque modification importante du code. Bonne pratique : committer au moins une fois par
session de travail avec un message clair.

Exemples de bons messages de commit :
- `"Ajout validation formulaire RDJ"`
- `"Correction bug taux de soumission"`
- `"Nouveau module : demande de congé"`

---

## 13. Rôles et accès

| Rôle    | Pages accessibles                                     |
|---------|-------------------------------------------------------|
| `agent` | Mon Rapport RDJ, Historique (ses rapports seulement)  |
| `chef`  | Mon Rapport RDJ, Historique (son équipe seulement)    |
| `drh`   | Tout + Administration                                 |
| `dg`    | Tout sauf Administration                              |

---

## 14. URLs importantes

| Ressource        | URL                                                              |
|------------------|------------------------------------------------------------------|
| Application      | https://smart-reporting-rdj.web.app                             |
| Code source      | https://github.com/MMGTech243/smart-reporting-rdj               |
| Console Firebase | https://console.firebase.google.com/project/smart-reporting-rdj |
| Console Anthropic| https://console.anthropic.com/                                  |

---

## 15. Résumé de l'architecture

```
Navigateur (agent / chef / DRH / DG)
    │
    ├── Firebase Auth ────── vérifie l'identité (email + mot de passe)
    ├── Firestore ─────────── stocke les rapports RDJ (règles de sécurité côté serveur)
    ├── Firebase Hosting ──── sert les fichiers compilés (CDN mondial, HTTPS automatique)
    └── Claude API (Haiku) ── assistant IA pour le tableau de bord DG

GitHub ────────────────────── sauvegarde du code source (historique de toutes les modifications)
```

---

## 16. Stack technique complète

| Technologie         | Version  | Rôle                                      |
|---------------------|----------|-------------------------------------------|
| React               | 19       | Interface utilisateur                     |
| Vite                | 8        | Bundler et serveur de développement       |
| Tailwind CSS        | 3        | Styles utilitaires                        |
| Firebase Auth       | 12       | Authentification                          |
| Firestore           | 12       | Base de données temps réel                |
| Firebase Hosting    | —        | Hébergement production                    |
| React Router        | 7        | Navigation entre les pages                |
| Recharts            | 3        | Graphiques (barres, aires, lignes)        |
| jsPDF + autotable   | 4 / 5    | Export PDF                                |
| SheetJS (xlsx)      | 0.18     | Export Excel                              |
| Claude Haiku        | 4.5      | Assistant IA                              |
| gh-pages            | 6        | Déploiement GitHub Pages (alternatif)     |
