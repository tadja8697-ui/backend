Le pattern "CLI Node.js" :

1. SHEBANG
   #!/usr/bin/env node    ← 1ère ligne obligatoire

2. ARGUMENTS
   const args = process.argv.slice(2);
   const command = args[0];
   const rest = args.slice(1);

3. DISPATCH
   switch (command) {
       case 'add':    addTask(rest[0]); break;
       case 'list':   listTasks(rest[0]); break;
       ...
       default: console.error('Commande inconnue');
   }

4. FICHIER JSON
   const raw = fs.readFileSync(FILE, 'utf-8');     ← TOUJOURS 'utf-8'
   const tasks = JSON.parse(raw);
   tasks.push(newTask);
   fs.writeFileSync(FILE, JSON.stringify(tasks, null, 2), 'utf-8');

5. CRÉATION SI INEXISTANT
   if (!fs.existsSync(FILE)) {
       fs.writeFileSync(FILE, '[]', 'utf-8');
   }

6. COMMANDE GLOBALE
   package.json : "bin": { "task-cli": "./index.js" }
   chmod +x index.js
   npm link

RÈGLES D'OR :
   - Shebang en 1ère ligne
   - 'utf-8' sur readFileSync ET writeFileSync
   - parseInt(x, 10) toujours
   - try/catch sur JSON.parse
   - TOUJOURS loadTasks() avant de modifier
   - TOUJOURS saveTasks() après avoir modifié

🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le shebang #!/usr/bin/env node
javascript
#!/usr/bin/env node
💡 La 1ère ligne est spéciale :

Elle commence par #! (shebang).

Elle dit au système : "exécute ce fichier avec node".

Sans elle, task-cli add "..." ne fonctionne pas.

Obligatoire pour un CLI Node.js.

⚠️ Elle doit être à la ligne 1, rien avant (même pas un commentaire).

🔹 5.2 — process.argv.slice(2)
javascript
const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1);
Décomposons avec task-cli add "Buy groceries" :

text
process.argv = [
    '/usr/bin/node',             // argv[0]
    '/chemin/index.js',          // argv[1]
    'add',                       // argv[2]
    'Buy groceries'              // argv[3]
]

process.argv.slice(2)   →  ['add', 'Buy groceries']
command                 →  'add'
rest                    →  ['Buy groceries']
💡 slice(2) = "enlève les 2 premiers éléments".

🔹 5.3 — fs.readFileSync / writeFileSync
javascript
// Lire
const raw = fs.readFileSync(TASKS_FILE, 'utf-8');

// Écrire
fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
⚠️ 'utf-8' est ESSENTIEL :

Sans → readFileSync renvoie un Buffer (binaire).

Avec → readFileSync renvoie une chaîne de caractères.

💡 JSON.stringify(tasks, null, 2) :

null : pas de fonction de remplacement.

2 : indentation de 2 espaces → JSON lisible par l'humain.

🔹 5.4 — path.join vs concaténation
javascript
// ✅ BON
const TASKS_FILE = path.join(process.cwd(), 'tasks.json');

// ❌ MAUVAIS
const TASKS_FILE = process.cwd() + '/tasks.json';
💡 path.join() gère automatiquement :

Les / sur Linux/Mac.

Les \ sur Windows.

Les doubles slashes.

process.cwd() = Current Working Directory = dossier où tu lances la commande.

🔹 5.5 — fs.existsSync pour créer le fichier
javascript
if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, '[]', 'utf-8');
    return [];
}
💡 Résultat : la 1ère fois que tu lances task-cli add "...", le fichier tasks.json est créé automatiquement.

Test mental :

Tu lances task-cli add "Acheter du pain".

Le fichier n'existe pas → on le crée vide.

On ajoute la tâche.

On sauvegarde.

tasks.json contient maintenant [{"id": 1, ...}]. ✅

🔹 5.6 — getNextId (génération d'ID)
javascript
function getNextId(tasks) {
    if (tasks.length === 0) return 1;
    const maxId = Math.max(...tasks.map((t) => t.id));
    return maxId + 1;
}
Décomposons :

tasks.map(t => t.id) → [1, 2, 5, 7].

Math.max(...) → 7 (spread pour passer un tableau en arguments).

+ 1 → 8.

💡 Avantage : même si tu supprimes la tâche 5, les IDs restent uniques. Le prochain sera 8, pas 5.

🔹 5.7 — Le switch pour dispatcher
javascript
switch (command) {
    case 'add':    addTask(rest[0]); break;
    case 'update': updateTask(id, rest[1]); break;
    // ...
    default: console.error('Commande inconnue');
}
💡 Pattern très classique pour un CLI : on lit command, on dispatch.

Alternative avec un objet :

javascript
const commands = {
    add: () => addTask(rest[0]),
    update: () => updateTask(rest[0], rest[1]),
    // ...
};

if (commands[command]) commands[command]();
else console.error('Commande inconnue');
💡 Aussi valable, mais le switch est plus explicite pour des cas avec validation.

🔹 5.8 — parseInt(x, 10) (le base 10)
javascript
const id = parseInt(rest[0], 10);
⚠️ Toujours préciser 10 :

Sans → parseInt("08") peut être interprété en octal (0).

Avec → parseInt("08", 10) = 8 (décimal).

🔹 5.9 — Les emojis et la lisibilité
javascript
const statusEmoji = {
    [STATUS.TODO]: '📝',
    [STATUS.IN_PROGRESS]: '⏳',
    [STATUS.DONE]: '✅',
};
💡 Pourquoi des emojis ? Un CLI lisible est un CLI agréable. Le cerveau traite les couleurs et formes plus vite que le texte.

Résultat dans le terminal :

text
📋 Toutes les tâches
──────────────────────

  📝 [1] Acheter du pain
  ⏳ [2] Écrire un article
  ✅ [3] Faire la vaisselle

 Total : 3 tâche(s)
🔹 5.10 — npm link (rendre global)
bash
npm link
💡 Ce que ça fait :

Crée un symlink dans /usr/local/bin/task-cli (ou équivalent).

Ce symlink pointe vers ton index.js.

Résultat : task-cli est exécutable partout.

⚠️ Prérequis :

Le fichier doit avoir un shebang.

Le package.json doit avoir un "bin".

Le fichier doit être exécutable (chmod +x index.js sur Linux/Mac).

🎯 ÉTAPE 6 : Comment tester
1. Installer globalement
bash
cd ~/Musique/roadmap/frontend/30-task-tracker-cli
chmod +x index.js   # Sur Linux/Mac
npm link
2. Tester chaque commande
Va dans un dossier temporaire pour ne pas polluer ton projet :

bash
mkdir /tmp/test-cli
cd /tmp/test-cli
Puis :

bash
# 1. Ajouter
task-cli add "Acheter du pain"
# ✅ Task added successfully (ID: 1)

task-cli add "Écrire un article"
# ✅ Task added successfully (ID: 2)

# 2. Lister
task-cli list
# 📋 Toutes les tâches
# ──────────────────────
#   📝 [1] Acheter du pain
#   📝 [2] Écrire un article
# Total : 2 tâche(s)

# 3. Marquer en cours
task-cli mark-in-progress 1
# ✅ Task 1 marked as in-progress.

# 4. Lister par statut
task-cli list in-progress
# 📋 Tâches (in-progress)
#   ⏳ [1] Acheter du pain

# 5. Marquer terminée
task-cli mark-done 2
# ✅ Task 2 marked as done.

# 6. Mettre à jour
task-cli update 1 "Acheter du pain et du lait"
# ✅ Task 1 updated successfully.

# 7. Supprimer
task-cli delete 2
# ✅ Task 2 deleted successfully.

# 8. Vérifier le JSON
cat tasks.json
3. Tester les erreurs
bash
task-cli add            # ❌ La description ne peut pas être vide.
task-cli delete 999     # ❌ Aucune tâche trouvée avec l'ID 999.
task-cli list banana    # ❌ Statut invalide : "banana".
task-cli banane         # ❌ Commande inconnue : "banane".


💡 Astuce de prof
Le CLI, c'est la base de tout développeur. Pourquoi ?

Git, npm, Docker, kubectl... tout est un CLI.

Tu apprends à lire les arguments, à gérer des fichiers, à structurer une app.

Pas d'interface graphique → tu te concentres sur la logique pure.

Les 3 règles à graver :
1. #!/usr/bin/env node en 1ère ligne. Sans ça, ton CLI ne marche pas.

2. 'utf-8' sur readFileSync. Sinon tu récupères un Buffer.

3. loadTasks() → modifier → saveTasks(). Dans cet ordre.

Le test mental ultime :
Lance task-cli add "test", puis cat tasks.json.

Le fichier doit contenir un JSON lisible (indenté).

La tâche doit avoir tous les champs : id, description, status, createdAt, updatedAt.

Le status doit être "todo".

Si un champ manque → bug dans addTask.

Pour aller plus loin :
Node.js fs docs : nodejs.org/api/fs.html

Node.js process docs : nodejs.org/api/process.html

Commander.js (lib pour CLI pro) : commander.js

Chalk (couleurs terminal) : github.com/chalk/chalk