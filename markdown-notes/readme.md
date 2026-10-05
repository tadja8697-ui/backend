🔹 5.1 — Le flux d'un upload
text
1. Client envoie : POST /notes avec -F "file=@note.md"
2. Multer parse le multipart → req.file rempli
3. req.file.buffer = Buffer du fichier
4. .toString('utf-8') → string Markdown
5. extractTitle() → premier # Titre
6. createNote() → sauvegarde dans notes.json
7. Renvoie 201 avec l'ID et les stats
💡 multipart/form-data : format HTTP pour les uploads. Express ne le parse PAS nativement. multer comble ce manque.

🔹 5.2 — Le double mode (fichier OU JSON)
javascript
if (req.file) {
    // Upload
} else if (req.body?.content) {
    // JSON
} else {
    // Erreur
}
💡 Pourquoi les deux ?

Fichier : pratique pour des notes existantes.

JSON : pratique pour une app web (formulaire inline).

Résultat : API flexible.

🔹 5.3 — Le fileFilter de multer
javascript
fileFilter: (req, file, cb) => {
    const ok = /\.(md|markdown|txt)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only .md files allowed.'));
    cb(null, true);
}
💡 Sécurité : on n'accepte que les fichiers .md, .markdown, .txt. Un utilisateur ne peut pas uploader un .exe ou une image lourde.

⚠️ Important : fileFilter est appelé AVANT que le fichier ne soit chargé → économie de bande passante.

🔹 5.4 — La limite de taille
javascript
limits: { fileSize: 1 * 1024 * 1024 }   // 1 MB
💡 Sécurité : empêche un DoS en uploadant un fichier de 10 GB.

Combiné avec memoryStorage : le fichier reste en RAM. 1 MB max = OK.

🔹 5.5 — Le marked.setOptions
javascript
marked.setOptions({
    gfm: true,           // GitHub Flavored Markdown (tableaux, task lists)
    breaks: true,        // \n → <br>
    headerIds: false,    // Pas d'id auto
    mangle: false,       // Pas d'encodage d'emails
});
Option	Effet
gfm	Active les tableaux, ~~strike~~, - [ ] etc.
breaks	Un \n devient un <br> (comme GitHub)
headerIds	Désactive l'ajout d'id sur les <h1>
🔹 5.6 — Le stripMarkdown (astuce importante)
javascript
function stripMarkdown(md) {
    return md
        .replace(/```[\s\S]*?```/g, '')          // Code blocks
        .replace(/`[^`]+`/g, '')                 // Code inline
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images → alt text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links → text
        .replace(/^#{1,6}\s+/gm, '')             // Titres
        // ...
}
💡 Pourquoi ? write-good analyse du texte anglais. Si on lui donne # Titre, il signale "Titre" comme une phrase sans verbe. On nettoie d'abord.

Résultat : des suggestions pertinentes sur le contenu uniquement.

🔹 5.7 — Le calcul du score
javascript
const wordCount = plainText.split(/\s+/).filter(Boolean).length || 1;
const issueRate = suggestions.length / wordCount;
const score = Math.max(0, Math.round(100 - issueRate * 500));
Logique :

0 suggestion → score 100.

1 suggestion pour 100 mots → 1/100 * 500 = 5 → score 95.

1 suggestion pour 10 mots → 1/10 * 500 = 50 → score 50.

💡 Le facteur 500 est arbitraire. À ajuster selon tes préférences.

🔹 5.8 — L'ordre des routes
javascript
router.get('/:id/render', ...);   // ← AVANT
router.get('/:id', ...);           // ← APRÈS
⚠️ CRITIQUE : Express matche dans l'ordre. Si /:id est déclaré en premier, /abc/render sera matché comme id = "abc" et /render sera ignoré.

Règle : routes spécifiques > routes génériques.

🔹 5.9 — Le format ?format=html
javascript
if (req.query.format === 'html') {
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>...`);
}
💡 Utilité : permet d'afficher la note directement dans le navigateur.

Test :

bash
# Va sur : http://localhost:3000/notes/{id}/render?format=html
→ Tu vois la note rendue en HTML dans le navigateur. 🎨

🔹 5.10 — La sécurité XSS
javascript
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
💡 Pourquoi ? Le title est du contenu utilisateur. Sans escape, il pourrait injecter du HTML dans le <title> de la page.

⚠️ Note : marked n'échappe PAS le HTML dans le markdown par défaut. Si un utilisateur écrit <script>alert('XSS')</script>, ça s'exécute.

Pour bloquer :

javascript
marked.setOptions({
    sanitize: true,   // Déprécié
});
Mieux : utiliser une lib comme DOMPurify côté serveur :

bash
npm install isomorphic-dompurify
javascript
import DOMPurify from 'isomorphic-dompurify';
const safeHtml = DOMPurify.sanitize(marked.parse(md));

Le pattern "Markdown Notes API" :

1. UPLOAD DE FICHIER
   npm install multer
   const upload = multer({ storage: memoryStorage(), limits, fileFilter });
   router.post('/', upload.single('file'), handler)
   → req.file.buffer.toString('utf-8')

2. RENDU MARKDOWN
   npm install marked
   marked.setOptions({ gfm: true, breaks: true });
   const html = marked.parse(markdown);

3. GRAMMAIRE
   npm install write-good
   const suggestions = writeGood(plainText, { passive: true, ... })
   → NE PAS analyser le Markdown brut → stripMarkdown() d'abord

4. ENDPOINTS
   POST /notes/check-grammar   → analyse
   POST /notes                 → créer (file OU json)
   GET  /notes                 → lister
   GET  /notes/:id             → récupérer
   GET  /notes/:id/render      → HTML (?format=html pour page complète)
   DELETE /notes/:id           → supprimer

5. STOCKAGE
   data/notes.json
   { id, title, content, source, createdAt, updatedAt }

RÈGLES D'OR :
   - multer.fileFilter OBLIGATOIRE (sécurité)
   - limits.fileSize OBLIGATOIRE (DoS)
   - Routes spécifiques AVANT génériques
   - sanitize le HTML rendu (XSS)
   - stripMarkdown avant grammar check
   - Double entrée : file OU json
   - ID unique : Date.now().toString(36)

💡 Astuce de prof
Ce projet est un mini-Notion/Obsidian. Les compétences que tu y apprends :

Upload de fichiers : toute app moderne en a besoin (avatars, documents, images).

Parsing de format : Markdown, JSON, YAML, CSV... c'est partout.

Intégration de libs : tu combines 3 packages (multer, marked, write-good) pour créer une fonctionnalité complexe.

Sécurité : filtrage, limites, sanitization.

Les 3 règles à graver :
1. multer + fileFilter + limits = upload safe. Les 3 ensemble.

2. stripMarkdown avant grammar check. Sinon fausses erreurs.

3. sanitize le HTML rendu. Sinon XSS.

Le test mental ultime :
Uploade un .md contenant <script>alert('XSS')</script> et rends-le.

Si une alerte s'affiche → faille XSS. 🚨

Si le script s'affiche en texte → tu es protégé. ✅

Pour aller plus loin :
multer docs : github.com/expressjs/multer

marked docs : marked.js.org

write-good : github.com/btford/write-good

DOMPurify : github.com/cure53/DOMPurify

gray-matter (front-matter YAML) : github.com/jonschlinkert/gray-matter

marked-terminal : github.com/mikaelbr/marked-terminal