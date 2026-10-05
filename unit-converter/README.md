🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le cycle Requête/Réponse SSR
1er appel — GET /length :

text
Navigateur → GET /length → Serveur
                          ↓
                    renderPage({ type: 'length' })
                          ↓
Serveur → HTML complet (formulaire) → Navigateur
2e appel — POST /convert :

text
Navigateur → POST /convert (value=20&from=ft&to=cm&type=length) → Serveur
                          ↓
                    convert('length', '20', 'ft', 'cm')
                          ↓
                    { value: 609.6 }
                          ↓
                    renderPage({ type: 'length', result, formData })
                          ↓
Serveur → HTML complet (résultat) → Navigateur
💡 Point clé : le même renderPage() gère les 2 cas. La présence de result change le rendu.

🔹 5.2 — express.urlencoded() (CRUCIAL)
javascript
app.use(express.urlencoded({ extended: true }));
Sans ce middleware : req.body est undefined → tu ne peux pas lire value, from, to.

💡 C'est LE piège n°1 du SSR avec Express. Un formulaire HTML envoie les données en application/x-www-form-urlencoded, pas en JSON.

Alternative pour JSON (API) :

javascript
app.use(express.json());
🔹 5.3 — Les conversions multiplicateurs
javascript
const baseValue = num * factors[from];
const result = baseValue / factors[to];
Exemple : 20 ft → cm

20 × 0.3048 = 6.096 (en mètres = unité de base).

6.096 / 0.01 = 609.6 (en cm).

💡 Analogie : c'est comme convertir en euros puis en dollars. On passe toujours par une unité pivot.

Avantage : au lieu de 8×7 = 56 formules pour length, on a 8 facteurs.

🔹 5.4 — La température (formules spéciales)
javascript
// Fahrenheit → Celsius : (F - 32) × 5/9
// Celsius → Kelvin     : C + 273.15
⚠️ Pourquoi différent ? Les températures ont un offset (point zéro décalé). 0°C = 32°F = 273.15K.

Solution : passer par Celsius comme pivot.

Exemple : 100°F → K

(100 - 32) × 5/9 = 37.78°C.

37.78 + 273.15 = 310.93K.

🔹 5.5 — escapeHtml (SÉCURITÉ)
javascript
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
Attaque : utilisateur entre <script>alert('XSS')</script> dans l'input.

Sans escapeHtml : le HTML est interprété, le script s'exécute. 😱

Avec escapeHtml : affiché comme texte brut. ✅

💡 Règle absolue SSR : TOUTE donnée utilisateur doit être échappée avant d'être insérée dans du HTML.

🔹 5.6 — Le pattern de redirection
javascript
app.get('/', (req, res) => {
    res.redirect('/length');
});
💡 Pourquoi ? / n'est pas un type valide. On redirige vers /length par défaut. UX propre.

🔹 5.7 — Le <a> vs <form> pour le Reset
html
<a href="/length" class="btn">Reset</a>
💡 Astuce : le Reset est un lien (GET), pas un formulaire. On retourne à l'état initial.

Analogie : c'est comme "annuler" → on revient à la page vierge.

🔹 5.8 — Le novalidate sur le form
html
<form method="POST" action="/convert" novalidate>
💡 Pourquoi ? Le navigateur a une validation native. Mais on veut contrôler l'affichage des erreurs côté serveur. novalidate désactive la validation navigateur.

⚠️ À noter : on garde quand même required sur les champs pour l'accessibilité (les lecteurs d'écran savent que c'est requis).

🔹 5.9 — La route :type dynamique
javascript
app.get('/:type', (req, res, next) => {
    const { type } = req.params;
    if (!TYPES.includes(type)) return next();
    res.send(renderPage({ type }));
});
💡 Pattern : une seule route gère /length, /weight, /temperature. DRY.

next() : si le type est invalide, on passe au middleware suivant (404).

🔹 5.10 — Le formatage des nombres
javascript
const rounded = Math.round(num * 100) / 100;
return rounded.toString();
Exemples :

609.6 → "609.6" ✅

609.60 → "609.6" ✅

609.00 → "609" ✅

0.0001 → "0.0001" ✅

💡 Math.round(x * 100) / 100 : arrondit à 2 décimales.
.toString() : enlève les zéros inutiles.

Le pattern "SSR avec Express" :

1. SETUP
   npm install express
   "type": "module" dans package.json

2. MIDDLEWARES
   app.use(express.urlencoded({ extended: true }));  ← CRUCIAL
   app.use(express.static('public'));

3. ROUTES
   app.get('/',              → redirect
   app.get('/:type',         → render form
   app.post('/convert',      → compute + render
   app.use(404)              → fallback

4. RENDER (template literals)
   renderPage({ type, result, formData })
     → renderTabs
     → renderForm OU renderResult

5. CONVERSION
   - Length/Weight : facteurs multiplicatifs (pivot)
   - Temperature   : formules spéciales (offset)

6. SÉCURITÉ
   escapeHtml sur TOUTE donnée utilisateur

RÈGLES D'OR :
   - express.urlencoded TOUJOURS pour les forms
   - escapeHtml pour éviter XSS
   - fileURLToPath pour __dirname en ESM
   - POST pour les modifications
   - Toujours un 404 propre

💡 Astuce de prof
Le SSR, c'est LE concept fondamental du web. Avant React, Vue, Angular... tout le web était du SSR.

Aujourd'hui, c'est de retour en force avec Next.js, Remix, SvelteKit... Pourquoi ?

Avantage SSR	Pourquoi c'est important
SEO	Google voit le HTML complet
Rapide	Premier rendu instantané
Simple	Pas de state management complexe
Accessible	Fonctionne sans JS
Robuste	Pas de crash côté client
Les 3 règles à graver :
1. express.urlencoded() est OBLIGATOIRE. Sinon req.body est undefined.

2. escapeHtml sur TOUTE donnée utilisateur. Sinon XSS.

3. Le serveur REND le HTML, il ne renvoie pas de JSON. C'est ça, le SSR.

Le test mental ultime :
Désactive JavaScript dans ton navigateur (F12 → Settings → Debugger).

Si ton app marche toujours → tu maîtrises le SSR. ✅

Si tu vois un écran vide → c'est du CSR (React, Vue...).

Pour aller plus loin :
Express docs : expressjs.com

MDN SSR : developer.mozilla.org/fr/docs/Learn/Server-side

EJS (template engine) : ejs.co

Pug (alternative) : pugjs.org

Next.js (SSR moderne) : nextjs.org

