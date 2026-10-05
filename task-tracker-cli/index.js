#!/usr/bin/env node

// ============================================================
// Le shebang ci-dessus dit au système "exécute ce fichier avec node"
// C'est OBLIGATOIRE pour que `task-cli` fonctionne.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// 1. CONFIGURATION
// ============================================================

// Chemin du fichier JSON (dans le dossier courant)
const TASKS_FILE = path.join(process.cwd(), 'tasks.json');

// Statuts possibles
const STATUS = {
    TODO: 'todo',
    IN_PROGRESS: 'in-progress',
    DONE: 'done',
};

// ============================================================
// 2. UTILITAIRES FICHIER
// ============================================================

/**
 * Charge les tâches depuis le fichier JSON.
 * Crée le fichier s'il n'existe pas.
 * @returns {Array}
 */
function loadTasks() {
    try {
        // Fichier inexistant → on crée un tableau vide
        if (!fs.existsSync(TASKS_FILE)) {
            fs.writeFileSync(TASKS_FILE, '[]', 'utf-8');
            return [];
        }

        // Lire le contenu
        const raw = fs.readFileSync(TASKS_FILE, 'utf-8');

        // Cas du fichier vide
        if (!raw.trim()) return [];

        // Parser le JSON
        const parsed = JSON.parse(raw);

        // Vérifier que c'est bien un tableau
        if (!Array.isArray(parsed)) {
            throw new Error('Le fichier tasks.json ne contient pas un tableau.');
        }

        return parsed;
    } catch (err) {
        console.error(`❌ Erreur lors de la lecture : ${err.message}`);
        process.exit(1);
    }
}

/**
 * Sauvegarde les tâches dans le fichier JSON.
 * @param {Array} tasks
 */
function saveTasks(tasks) {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
    } catch (err) {
        console.error(`❌ Erreur lors de la sauvegarde : ${err.message}`);
        process.exit(1);
    }
}

// ============================================================
// 3. UTILITAIRES DIVERS
// ============================================================

/**
 * Génère un nouvel ID unique.
 * @param {Array} tasks
 * @returns {number}
 */
function getNextId(tasks) {
    if (tasks.length === 0) return 1;
    const maxId = Math.max(...tasks.map((t) => t.id));
    return maxId + 1;
}

/**
 * Renvoie un timestamp ISO (format standard).
 * @returns {string}
 */
function now() {
    return new Date().toISOString();
}

/**
 * Trouve une tâche par son ID.
 * @param {Array} tasks
 * @param {number} id
 * @returns {Object|null}
 */
function findTaskById(tasks, id) {
    return tasks.find((t) => t.id === id) || null;
}

/**
 * Affiche une tâche joliment dans la console.
 * @param {Object} task
 */
function printTask(task) {
    const statusEmoji = {
        [STATUS.TODO]: '📝',
        [STATUS.IN_PROGRESS]: '⏳',
        [STATUS.DONE]: '✅',
    };

    console.log(
        `  ${statusEmoji[task.status]} [${task.id}] ${task.description}`
    );
}

// ============================================================
// 4. COMMANDES
// ============================================================

/**
 * Ajoute une nouvelle tâche.
 * @param {string} description
 */
function addTask(description) {
    if (!description || !description.trim()) {
        console.error('❌ La description ne peut pas être vide.');
        process.exit(1);
    }

    const tasks = loadTasks();
    const timestamp = now();

    const newTask = {
        id: getNextId(tasks),
        description: description.trim(),
        status: STATUS.TODO,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    tasks.push(newTask);
    saveTasks(tasks);

    console.log(`✅ Task added successfully (ID: ${newTask.id})`);
}

/**
 * Met à jour la description d'une tâche.
 * @param {number} id
 * @param {string} description
 */
function updateTask(id, description) {
    if (!description || !description.trim()) {
        console.error('❌ La nouvelle description ne peut pas être vide.');
        process.exit(1);
    }

    const tasks = loadTasks();
    const task = findTaskById(tasks, id);

    if (!task) {
        console.error(`❌ Aucune tâche trouvée avec l'ID ${id}.`);
        process.exit(1);
    }

    task.description = description.trim();
    task.updatedAt = now();

    saveTasks(tasks);

    console.log(`✅ Task ${id} updated successfully.`);
}

/**
 * Supprime une tâche.
 * @param {number} id
 */
function deleteTask(id) {
    const tasks = loadTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
        console.error(`❌ Aucune tâche trouvée avec l'ID ${id}.`);
        process.exit(1);
    }

    tasks.splice(index, 1);
    saveTasks(tasks);

    console.log(`✅ Task ${id} deleted successfully.`);
}

/**
 * Change le statut d'une tâche.
 * @param {number} id
 * @param {string} status
 */
function markTask(id, status) {
    const tasks = loadTasks();
    const task = findTaskById(tasks, id);

    if (!task) {
        console.error(`❌ Aucune tâche trouvée avec l'ID ${id}.`);
        process.exit(1);
    }

    task.status = status;
    task.updatedAt = now();

    saveTasks(tasks);

    console.log(`✅ Task ${id} marked as ${status}.`);
}

/**
 * Liste les tâches (avec filtre optionnel par statut).
 * @param {string} [filter] - 'todo' | 'in-progress' | 'done'
 */
function listTasks(filter) {
    const tasks = loadTasks();

    // Filtre par statut si demandé
    const filtered = filter
        ? tasks.filter((t) => t.status === filter)
        : tasks;

    // Aucune tâche
    if (filtered.length === 0) {
        if (filter) {
            console.log(`📭 Aucune tâche avec le statut "${filter}".`);
        } else {
            console.log('📭 Aucune tâche. Utilisez `task-cli add "..."` pour en créer.');
        }
        return;
    }

    // Titre
    const title = filter
        ? `📋 Tâches (${filter})`
        : '📋 Toutes les tâches';
    console.log(`\n${title}\n${'─'.repeat(title.length)}\n`);

    // Afficher chaque tâche
    filtered.forEach(printTask);

    console.log(`\n Total : ${filtered.length} tâche(s)\n`);
}

// ============================================================
// 5. AIDE
// ============================================================

function printHelp() {
    console.log(`
📋 Task Tracker CLI

Usage :
  task-cli add "description"          Ajouter une tâche
  task-cli update <id> "description"  Modifier une tâche
  task-cli delete <id>                Supprimer une tâche
  task-cli mark-in-progress <id>      Marquer en cours
  task-cli mark-done <id>             Marquer terminée
  task-cli list                       Lister toutes les tâches
  task-cli list done                  Lister les tâches terminées
  task-cli list todo                  Lister les tâches à faire
  task-cli list in-progress           Lister les tâches en cours
  task-cli help                       Afficher cette aide
    `);
}

// ============================================================
// 6. POINT D'ENTRÉE : parse les arguments
// ============================================================

function main() {
    // process.argv = [node, script.js, commande, ...args]
    // On garde uniquement ce qui suit script.js
    const args = process.argv.slice(2);

    const command = args[0];
    const rest = args.slice(1);

    // Aucune commande → aide
    if (!command) {
        printHelp();
        return;
    }

    // Dispatch vers la bonne fonction
    switch (command) {
        case 'add': {
            addTask(rest[0]);
            break;
        }

        case 'update': {
            const id = parseInt(rest[0], 10);
            if (Number.isNaN(id)) {
                console.error('❌ L\'ID doit être un nombre.');
                process.exit(1);
            }
            updateTask(id, rest[1]);
            break;
        }

        case 'delete': {
            const id = parseInt(rest[0], 10);
            if (Number.isNaN(id)) {
                console.error('❌ L\'ID doit être un nombre.');
                process.exit(1);
            }
            deleteTask(id);
            break;
        }

        case 'mark-in-progress': {
            const id = parseInt(rest[0], 10);
            if (Number.isNaN(id)) {
                console.error('❌ L\'ID doit être un nombre.');
                process.exit(1);
            }
            markTask(id, STATUS.IN_PROGRESS);
            break;
        }

        case 'mark-done': {
            const id = parseInt(rest[0], 10);
            if (Number.isNaN(id)) {
                console.error('❌ L\'ID doit être un nombre.');
                process.exit(1);
            }
            markTask(id, STATUS.DONE);
            break;
        }

        case 'list': {
            const filter = rest[0];
            const validStatuses = Object.values(STATUS);

            if (filter && !validStatuses.includes(filter)) {
                console.error(`❌ Statut invalide : "${filter}".`);
                console.error(`   Statuts valides : ${validStatuses.join(', ')}`);
                process.exit(1);
            }

            listTasks(filter);
            break;
        }

        case 'help':
        case '--help':
        case '-h': {
            printHelp();
            break;
        }

        default: {
            console.error(`❌ Commande inconnue : "${command}".`);
            console.error('   Tapez `task-cli help` pour voir les commandes.');
            process.exit(1);
        }
    }
}

// Lance l'application
main();