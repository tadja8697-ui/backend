#!/usr/bin/env node

import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const MIN_NUMBER = 1;
const MAX_NUMBER = 100;

const DIFFICULTIES = {
    easy:   { name: 'Easy',   chances: 10 },
    medium: { name: 'Medium', chances: 5 },
    hard:   { name: 'Hard',   chances: 3 },
};

const HIGHSCORES_FILE = path.join(process.cwd(), 'highscores.json');

// Couleurs ANSI
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
};

// ============================================================
// 2. INTERFACE READLINE (avec wrapper Promise)
// ============================================================

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

/**
 * Pose une question et renvoie la réponse (version Promise).
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => resolve(answer));
    });
}

// ============================================================
// 3. UTILITAIRES
// ============================================================

/**
 * Génère un entier aléatoire entre min et max (inclus).
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Formate une durée en ms → "12.3s".
 */
function formatDuration(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Charge les meilleurs scores depuis le fichier.
 * @returns {Object} Ex: { easy: 3, medium: 2, hard: 1 }
 */
function loadHighScores() {
    try {
        if (!fs.existsSync(HIGHSCORES_FILE)) return {};
        const raw = fs.readFileSync(HIGHSCORES_FILE, 'utf-8');
        if (!raw.trim()) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/**
 * Sauvegarde les meilleurs scores.
 */
function saveHighScores(scores) {
    try {
        fs.writeFileSync(HIGHSCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
    } catch (err) {
        console.error(`${c.red}⚠️  Impossible de sauvegarder les scores.${c.reset}`);
    }
}

/**
 * Vérifie si un nouveau score est un record.
 * @returns {boolean}
 */
function isNewRecord(difficulty, attempts) {
    const scores = loadHighScores();
    const current = scores[difficulty];

    if (current === undefined || attempts < current) {
        scores[difficulty] = attempts;
        saveHighScores(scores);
        return true;
    }
    return false;
}

// ============================================================
// 4. AFFICHAGES
// ============================================================

function printWelcome() {
    console.log(`
${c.bold}${c.cyan}╔════════════════════════════════════════════╗
║  🎲  Welcome to the Number Guessing Game!  ║
╚════════════════════════════════════════════╝${c.reset}

${c.dim}I'm thinking of a number between ${MIN_NUMBER} and ${MAX_NUMBER}.
Try to guess it in the fewest attempts possible!${c.reset}
`);
}

async function askDifficulty() {
    console.log(`${c.bold}Please select the difficulty level:${c.reset}`);
    console.log(`  ${c.green}1.${c.reset} Easy   ${c.dim}(10 chances)${c.reset}`);
    console.log(`  ${c.yellow}2.${c.reset} Medium ${c.dim}(5 chances)${c.reset}`);
    console.log(`  ${c.red}3.${c.reset} Hard   ${c.dim}(3 chances)${c.reset}`);
    console.log();

    while (true) {
        const answer = await question('Enter your choice: ');

        const map = {
            '1': 'easy',
            '2': 'medium',
            '3': 'hard',
            'easy': 'easy',
            'medium': 'medium',
            'hard': 'hard',
        };

        const key = map[answer.trim().toLowerCase()];
        if (key) return key;

        console.log(`${c.red}❌ Invalid choice. Enter 1, 2 or 3.${c.reset}\n`);
    }
}

function printHighScores() {
    const scores = loadHighScores();
    const entries = Object.entries(scores);

    if (entries.length === 0) return;

    console.log(`${c.magenta}🏆 Best scores:${c.reset}`);
    entries.forEach(([diff, attempts]) => {
        const label = DIFFICULTIES[diff]?.name || diff;
        console.log(`  ${c.dim}•${c.reset} ${label.padEnd(8)} ${attempts} attempts`);
    });
    console.log();
}

// ============================================================
// 5. LE JEU
// ============================================================

/**
 * Joue une partie.
 * @returns {Promise<Object>} Le résultat de la partie
 */
async function playRound(difficultyKey) {
    const difficulty = DIFFICULTIES[difficultyKey];
    const targetNumber = randomInt(MIN_NUMBER, MAX_NUMBER);
    const startTime = Date.now();

    console.log(
        `\n${c.green}Great! You have selected the ${c.bold}${difficulty.name}${c.reset}${c.green} difficulty level.${c.reset}`
    );
    console.log(`${c.dim}You have ${difficulty.chances} chances to guess the correct number.${c.reset}`);
    console.log(`${c.cyan}Let's start the game!${c.reset}\n`);

    let attempts = 0;
    const guesses = [];

    while (attempts < difficulty.chances) {
        const remaining = difficulty.chances - attempts;
        const remainingLabel = remaining === 1
            ? `${c.red}last chance!${c.reset}`
            : `${c.dim}${remaining} chances left${c.reset}`;

        const rawInput = await question(`Enter your guess ${c.dim}(${remainingLabel}${c.dim})${c.reset}: `);
        const input = rawInput.trim();

        // ---------- Validation ----------
        const num = parseInt(input, 10);

        if (Number.isNaN(num)) {
            console.log(`${c.red}❌ "${input}" is not a number. Try again.${c.reset}\n`);
            continue;   // ⚠️ On ne compte PAS cet essai
        }

        if (num < MIN_NUMBER || num > MAX_NUMBER) {
            console.log(`${c.red}❌ Please enter a number between ${MIN_NUMBER} and ${MAX_NUMBER}.${c.reset}\n`);
            continue;
        }

        // ---------- Tentative valide ----------
        attempts++;
        guesses.push(num);

        // ---------- Gagné ? ----------
        if (num === targetNumber) {
            const duration = Date.now() - startTime;
            const durationLabel = formatDuration(duration);

            console.log(`\n${c.green}${c.bold}🎉 Congratulations!${c.reset}`);
            console.log(`${c.green}You guessed the correct number in ${c.bold}${attempts}${c.reset}${c.green} attempts (${durationLabel}).${c.reset}`);

            const record = isNewRecord(difficultyKey, attempts);
            if (record) {
                console.log(`${c.magenta}${c.bold}🏆 New high score for ${difficulty.name}!${c.reset}`);
            }

            return { won: true, attempts, duration, guesses, targetNumber };
        }

        // ---------- Raté : feedback ----------
        const hint = num < targetNumber
            ? `greater than ${c.bold}${num}${c.reset}`
            : `less than ${c.bold}${num}${c.reset}`;

        console.log(`${c.yellow}Incorrect!${c.reset} The number is ${hint}.\n`);
    }

    // ---------- Perdu ----------
    const duration = Date.now() - startTime;

    console.log(`\n${c.red}${c.bold}💥 Game over!${c.reset}`);
    console.log(`${c.red}You ran out of chances.${c.reset}`);
    console.log(`${c.dim}The number was: ${c.bold}${c.cyan}${targetNumber}${c.reset}\n`);

    return { won: false, attempts, duration, guesses, targetNumber };
}

/**
 * Demande si l'utilisateur veut rejouer.
 * @returns {Promise<boolean>}
 */
async function askPlayAgain() {
    const answer = await question(`\n${c.bold}Play again? (y/n): ${c.reset}`);
    return ['y', 'yes', 'o', 'oui'].includes(answer.trim().toLowerCase());
}

/**
 * Boucle principale : enchaîne les parties.
 */
async function mainLoop() {
    printWelcome();
    printHighScores();

    while (true) {
        const difficultyKey = await askDifficulty();
        const result = await playRound(difficultyKey);

        // Résumé de la partie
        if (result.won) {
            const stats = [
                `Attempts: ${result.attempts}`,
                `Time: ${formatDuration(result.duration)}`,
                `Guesses: ${result.guesses.join(', ')}`,
            ];
            console.log(`${c.gray}${stats.join('  •  ')}${c.reset}`);
        }

        if (!(await askPlayAgain())) {
            break;
        }

        console.log('\n' + '─'.repeat(50) + '\n');
        printHighScores();
    }

    console.log(`\n${c.cyan}Thanks for playing! See you next time. 👋${cREAD.reset}\n`);
    rl.close();
}

// ============================================================
// 6. POINT D'ENTRÉE
// ============================================================

mainLoop().catch((err) => {
    console.error(`\n${c.red}❌ Unexpected error: ${err.message}${c.reset}\n`);
    rl.close();
    process.exit(1);
});