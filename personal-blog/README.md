Le pattern "mini-CMS SSR" :

1. STORAGE FICHIERS
   data/articles/{id}.json
   { id, title, date, content }

2. AUTH SESSION
   express-session → cookie signé
   req.session.isAdmin = true après login
   Middleware requireAuth sur les routes admin

3. ROUTES
   GET  /                → liste (public)
   GET  /article/:id     → voir (public)
   GET  /login           → form login
   POST /login           → check password
   POST /logout          → destroy session
   GET  /admin           → dashboard (protégé)
   GET  /new             → form création (protégé)
   POST /new             → créer (protégé) + redirect
   GET  /edit/:id        → form édition (protégé)
   POST /edit/:id        → update (protégé) + redirect
   POST /delete/:id      → supprimer (protégé) + redirect

4. PATTERNS CLÉS
   - POST-Redirect-GET (PRG)
   - requireAuth middleware
   - escapeHtml sur TOUT
   - layout() pour factoriser le HTML

RÈGLES D'OR :
   - express.urlencoded() OBLIGATOIRE
   - requireAuth sur TOUTES les routes admin
   - escapeHtml sur TOUTE donnée utilisateur
   - POST-Redirect-GET après chaque modification
   - secret de session long et aléatoire
   - .env pour les secrets (jamais en dur)

   🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le cycle SSR
Requête GET / :

text
Navigateur → GET / → Express → getAllArticles()
                              ↓
                        renderHome(articles)
                              ↓
                       HTML complet → Navigateur
Requête POST /new :

text
Formulaire → POST /new (title, date, content)
              ↓
        requireAuth (session valide ?)
              ↓
        createArticle(data) → écrit data/articles/3.json
              ↓
        res.redirect('/admin') → le navigateur re-fait un GET
💡 Pattern POST-Redirect-GET (PRG) :

POST modifie les données.

Redirect renvoie vers une page GET.

GET affiche la page mise à jour.

Avantage : si l'utilisateur refresh après un POST, il ne re-soumet pas le formulaire. Anti-double-submit.

🔹 5.2 — Le middleware requireAuth
javascript
export function requireAuth(req, res, next) {
    if (req.session?.isAdmin) {
        return next();
    }
    res.redirect('/login');
}
Décomposons :

req.session : fourni par express-session.

req.session.isAdmin : true si connecté.

next() : passe à la route suivante.

Sinon : redirige vers /login.

Utilisation :

javascript
app.get('/admin', requireAuth, (req, res) => { ... });
💡 Pattern pro : 1 fonction, 1 responsabilité. Le middleware gère l'auth, la route gère la logique.

🔹 5.3 — La session express-session
javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));
Option	Rôle
secret	Clé pour signer le cookie
resave	Ne pas sauver si rien n'a changé
saveUninitialized	Ne pas créer de session si vide
httpOnly	Le cookie n'est pas accessible en JS (anti-XSS)
maxAge	Durée de vie (24h)
⚠️ secret doit être long et aléatoire. En prod : crypto.randomBytes(64).toString('hex').

🔹 5.4 — Le parser .env maison
javascript
function loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        // ...
        process.env[key] = value;
    }
}
💡 Pourquoi maison ? Pour rester zéro dépendance au-delà d'Express. En vrai projet, on utilise dotenv.

Ce que ça fait :

Lit chaque ligne du .env.

Ignore les commentaires (#) et vides.

Découpe sur le premier =.

Ajoute à process.env si pas déjà défini.

🔹 5.5 — Le tri des articles
javascript
return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
💡 b.date - a.date : tri décroissant (du plus récent au plus ancien).

Test :

new Date("2024-08-03") - new Date("2024-08-01") → positif (3 août après 1er août).

Le callback renvoie un nombre positif → b avant a.

🔹 5.6 — Le escapeHtml (SÉCURITÉ)
javascript
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
Attaque sans escapeHtml : titre = <script>alert('XSS')</script> → s'exécute.

Avec : <script> → &lt;script&gt; → affiché tel quel.

💡 Règle absolue SSR : TOUT contenu utilisateur doit être échappé.

🔹 5.7 — Le confirm() avant suppression
html
<form method="POST" action="/delete/${a.id}" onsubmit="return confirm('Delete this article?');">
    <button type="submit">Delete</button>
</form>
💡 onsubmit="return confirm()" :

Si l'utilisateur clique OK → return true → submit.

Sinon → return false → annulation.

Bon UX : pas de suppression accidentelle.

🔹 5.8 — Le POST-Redirect-GET (PRG)
javascript
app.post('/new', requireAuth, (req, res) => {
    createArticle({ ... });
    res.redirect('/admin');   // ← Redirect après POST
});
💡 Sans le redirect :

L'utilisateur voit la page OK.

Il appuie sur F5 → le navigateur redemande POST → article dupliqué.

Avec : F5 = GET = affiche la liste mise à jour. ✅

🔹 5.9 — Le path.join pour les chemins
javascript
const ARTICLES_DIR = path.join(__dirname, '..', 'data', 'articles');
💡 .. : remonte d'un dossier.

Structure :

text
35-personal-blog/
├── utils/
│   └── storage.js          ← __dirname est ici
└── data/
    └── articles/           ← chemin cible
path.join(__dirname, '..', 'data', 'articles') :

__dirname = /.../35-personal-blog/utils

.. → /.../35-personal-blog

data/articles → /.../35-personal-blog/data/articles

🔹 5.10 — Le next() dans les middlewares
javascript
app.get('/admin', requireAuth, (req, res) => { ... });
Déroulement :

Requête arrive sur /admin.

requireAuth s'exécute.

Si connecté → next() → la fonction de route s'exécute.

Si pas connecté → res.redirect('/login') → pas de next() → la route ne s'exécute pas.

💡 Règle : soit tu appelles next(), soit tu envoies une réponse. Pas les deux.

💡 Astuce de prof
Ce projet est LE classique de l'entretien backend. Pourquoi ?

Il teste 6 compétences en même temps :

Routing Express (GET, POST, params dynamiques).

SSR (rendu HTML côté serveur).

Filesystem (CRUD sur fichiers JSON).

Auth & sessions (cookie signé, middleware).

Sécurité (XSS, sessions httpOnly).

UX (POST-Redirect-GET, confirm avant delete).

Les 3 règles à graver :
1. requireAuth sur TOUTES les routes admin. Sinon faille de sécurité.

2. POST-Redirect-GET après chaque modification. Sinon doublons au refresh.

3. escapeHtml sur TOUTE donnée utilisateur. Sinon XSS.

Le test mental ultime :
Ferme ton navigateur, ouvre un autre (Firefox), va sur /admin.

Si tu es redirigé vers /login → sessions OK. ✅

Si tu vois le dashboard → faille de session.

Pour aller plus loin :
Express security : expressjs.com/en/advanced/best-practice-security.html

OWASP Top 10 : owasp.org/Top10

express-session : github.com/expressjs/session

SQLite : sqlite.org

bcrypt : github.com/kelektiv/node.bcrypt.js

