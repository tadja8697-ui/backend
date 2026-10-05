#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// 1. CONFIGURATION
// ============================================================

const EXPENSES_FILE = path.join(process.cwd(), 'expenses.json');
const CSV_FILE = path.join(process.cwd(), 'expenses.csv');

// Mois en français (index 0 = Janvier)
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

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
    gray: '\x1b[90m',
};

// ============================================================
// 2. UTILITAIRES FICHIER
// ============================================================

function loadExpenses() {
    try {
        if (!fs.existsSync(EXPENSES_FILE)) {
            fs.writeFileSync(EXPENSES_FILE, '[]', 'utf-8');
            return [];
        }
        const raw = fs.readFileSync(EXPENSES_FILE, 'utf-8');
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Format invalide.');
        return parsed;
    } catch (err) {
        console.error(`${c.red}❌ Erreur lecture : ${err.message}${c.reset}`);
        process.exit(1);
    }
}

function saveExpenses(expenses) {
    try {
        fs.writeFileSync(
            EXPENSES_FILE,
            JSON.stringify(expenses, null, 2),
            'utf-8'
        );
    } catch (err) {
        console.error(`${c.red}❌ Erreur sauvegarde : ${err.message}${c.reset}`);
        process.exit(1);
    }
}

// ============================================================
// 3. PARSEUR D'ARGUMENTS NOM MÉS (--key value)
// ============================================================

/**
 * Transforme ['--description', 'Lunch', '--amount', '20']
 * en { description: 'Lunch', amount: '20' }
 */
function parseArgs(args) {
    const result = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);          // '--description' → 'description'
            const next = args[i + 1];

            // Si le prochain existe et n'est pas un flag → c'est la valeur
            if (next !== undefined && !next.startsWith('--')) {
                result[key] = next;
                i++;                            // Sauter la valeur
            } else {
                // Flag booléen (ex: --verbose)
                result[key] = true;
            }
        }
    }

    return result;
}

// ============================================================
// 4. UTILITAIRES DIVERS
// ============================================================

function getNextId(expenses) {
    if (expenses.length === 0) return 1;
    return Math.max(...expenses.map((e) => e.id)) + 1;
}

function findExpenseById(expenses, id) {
    return expenses.find((e) => e.id === id) || null;
}

function todayISO() {
    // Format YYYY-MM-DD
    return new Date().toISOString().slice(0, 10);
}

function formatAmount(amount) {
    return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

function parseAmount(value) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) {
        throw new Error(`"${value}" n'est pas un nombre valide.`);
    }
    if (num < 0) {
        throw new Error('Le montant doit être positif.');
    }
    if (num === 0) {
        throw new Error('Le montant doit être supérieur à 0.');
    }
    return num;
}

function parseId(value) {
    if (value === undefined) {
        throw new Error('L\'option --id est requise.');
    }
    const id = parseInt(value, 10);
    if (Number.isNaN(id) || id <= 0) {
        throw new Error(`"${value}" n'est pas un ID valide.`);
    }
    return id;
}

// ============================================================
// 5. COMMANDES
// ============================================================

/**
 * Ajoute une dépense.
 * Usage : expense-tracker add --description "Lunch" --amount 20 [--category Food]
 */
function addExpense(args) {
    const { description, amount, category } = args;

    if (!description || !description.trim()) {
        console.error(`${c.red}❌ L'option --description est requise.${c.reset}`);
        process.exit(1);
    }

    if (amount === undefined) {
        console.error(`${c.red}❌ L'option --amount est requise.${c.reset}`);
        process.exit(1);
    }

    let parsedAmount;
    try {
        parsedAmount = parseAmount(amount);
    } catch (err) {
        console.error(`${c.red}❌ ${err.message}${c.reset}`);
        process.exit(1);
    }

    const expenses = loadExpenses();

    const newExpense = {
        id: getNextId(expenses),
        date: todayISO(),
        description: description.trim(),
        amount: parsedAmount,
        ...(category && { category: category.trim() }),
    };

    expenses.push(newExpense);
    saveExpenses(expenses);

    console.log(`${c.green}✅ Expense added successfully (ID: ${newExpense.id})${c.reset}`);
}

/**
 * Modifie une dépense existante.
 * Usage : expense-tracker update --id 1 [--description "..."] [--amount N] [--category X]
 */
function updateExpense(args) {
    let id;
    try {
        id = parseId(args.id);
    } catch (err) {
        console.error(`${c.red}❌ ${err.message}${c.reset}`);
        process.exit(1);
    }

    const expenses = loadExpenses();
    const expense = findExpenseById(expenses, id);

    if (!expense) {
        console.error(`${c.red}❌ Aucune dépense avec l'ID ${id}.${c.reset}`);
        process.exit(1);
    }

    // Mise à jour des champs fournis
    if (args.description !== undefined) {
        if (!args.description.trim()) {
            console.error(`${c.red}❌ La description ne peut pas être vide.${c.reset}`);
            process.exit(1);
        }
        expense.description = args.description.trim();
    }

    if (args.amount !== undefined) {
        try {
            expense.amount = parseAmount(args.amount);
        } catch (err) {
            console.error(`${c.red}❌ ${err.message}${c.reset}`);
            process.exit(1);
        }
    }

    if (args.category !== undefined) {
        expense.category = args.category.trim() || undefined;
    }

    saveExpenses(expenses);
    console.log(`${c.green}✅ Expense ${id} updated successfully.${c.reset}`);
}

/**
 * Supprime une dépense.
 * Usage : expense-tracker delete --id 1
 */
function deleteExpense(args) {
    let id;
    try {
        id = parseId(args.id);
    } catch (err) {
        console.error(`${c.red}❌ ${err.message}${c.reset}`);
        process.exit(1);
    }

    const expenses = loadExpenses();
    const index = expenses.findIndex((e) => e.id === id);

    if (index === -1) {
        console.error(`${c.red}❌ Aucune dépense avec l'ID ${id}.${c.reset}`);
        process.exit(1);
    }

    expenses.splice(index, 1);
    saveExpenses(expenses);

    console.log(`${c.green}✅ Expense deleted successfully.${c.reset}`);
}

/**
 * Affiche la liste des dépenses.
 * Usage : expense-tracker list [--category Food] [--month 10]
 */
function listExpenses(args) {
    let expenses = loadExpenses();

    // Filtres optionnels
    if (args.category) {
        expenses = expenses.filter(
            (e) => e.category?.toLowerCase() === args.category.toLowerCase()
        );
    }

    if (args.month !== undefined) {
        const month = parseInt(args.month, 10);
        if (Number.isNaN(month) || month < 1 || month > 12) {
            console.error(`${c.red}❌ Le mois doit être entre 1 et 12.${c.reset}`);
            process.exit(1);
        }
        expenses = expenses.filter(
            (e) => new Date(e.date).getMonth() + 1 === month
        );
    }

    if (expenses.length === 0) {
        console.log(`${c.yellow}📭 Aucune dépense trouvée.${c.reset}`);
        return;
    }

    // ---- Affichage tabulaire ----
    const colId = 6;
    const colDate = 13;
    const colDesc = 20;
    const colCat = 15;
    const colAmount = 10;

    console.log(
        `\n${c.bold}` +
        'ID'.padEnd(colId) +
        'Date'.padEnd(colDate) +
        'Description'.padEnd(colDesc) +
        'Category'.padEnd(colCat) +
        'Amount'.padEnd(colAmount) +
        `${c.reset}`
    );
    console.log(`${c.gray}${'─'.repeat(colId + colDate + colDesc + colCat + colAmount)}${c.reset}`);

    expenses.forEach((e) => {
        console.log(
            String(e.id).padEnd(colId) +
            e.date.padEnd(colDate) +
            (e.description.length > colDesc - 2
                ? e.description.slice(0, colDesc - 3) + '…'
                : e.description
            ).padEnd(colDesc) +
            (e.category || '—').padEnd(colCat) +
            formatAmount(e.amount).padEnd(colAmount)
        );
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`${c.gray}${'─'.repeat(colId + colDate + colDesc + colCat + colAmount)}${c.reset}`);
    console.log(`${c.bold}Total : ${formatAmount(total)} (${expenses.length} dépense(s))${c.reset}\n`);
}

/**
 * Affiche un résumé.
 * Usage : expense-tracker summary [--month 10]
 */
function showSummary(args) {
    const expenses = loadExpenses();

    // Filtrer par mois si demandé
    let filtered = expenses;
    let title = 'Total expenses';

    if (args.month !== undefined) {
        const month = parseInt(args.month, 10);

        if (Number.isNaN(month) || month < 1 || month > 12) {
            console.error(`${c.red}❌ Le mois doit être entre 1 et 12.${c.reset}`);
            process.exit(1);
        }

        filtered = expenses.filter(
            (e) => new Date(e.date).getMonth() + 1 === month
        );

        title = `Total expenses for ${MONTH_NAMES[month - 1]}`;
    }

    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    console.log(`\n${c.cyan}${c.bold}${title}: ${formatAmount(total)}${c.reset}`);

    // Détail par catégorie (si au moins une catégorie)
    const hasCategories = filtered.some((e) => e.category);
    if (hasCategories && filtered.length > 0) {
        console.log(`${c.gray}Par catégorie :${c.reset}`);

        const byCategory = filtered.reduce((acc, e) => {
            const cat = e.category || 'Sans catégorie';
            acc[cat] = (acc[cat] || 0) + e.amount;
            return acc;
        }, {});

        Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, sum]) => {
                console.log(`  ${c.dim}•${c.reset} ${cat.padEnd(20)} ${formatAmount(sum)}`);
            });
    }

    console.log();
}

/**
 * Exporte les dépenses en CSV.
 * Usage : expense-tracker export [--output chemin.csv]
 */
function exportCSV(args) {
    const expenses = loadExpenses();

    if (expenses.length === 0) {
        console.error(`${c.yellow}⚠️  Aucune dépense à exporter.${c.reset}`);
        return;
    }

    const outputPath = args.output
        ? path.resolve(args.output)
        : CSV_FILE;

    // En-têtes CSV
    const headers = ['id', 'date', 'description', 'category', 'amount'];
    const lines = [headers.join(',')];

    // Échapper les guillemets et virgules
    function csvEscape(value) {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    expenses.forEach((e) => {
        lines.push([
            e.id,
            e.date,
            csvEscape(e.description),
            csvEscape(e.category || ''),
            e.amount,
        ].join(','));
    });

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(`${c.green}✅ ${expenses.length} dépense(s) exportée(s) vers ${outputPath}${c.reset}`);
}

// ============================================================
// 6. AIDE
// ============================================================

function printHelp() {
    console.log(`
${c.bold}Expense Tracker CLI${c.reset}

${c.cyan}Usage :${c.reset}
  expense-tracker add --description "X" --amount N [--category Y]
  expense-tracker update --id N [--description "X"] [--amount M] [--category Y]
  expense-tracker delete --id N
  expense-tracker list [--category Y] [--month M]
  expense-tracker summary [--month M]
  expense-tracker export [--output file.csv]
  expense-tracker help

${c.cyan}Exemples :${c.reset}
  expense-tracker add --description "Lunch" --amount 20
  expense-tracker add --description "Lunch" --amount 20 --category Food
  expense-tracker summary --month 10
  expense-tracker export --output mes-depenses.csv
`);
}

// ============================================================
// 7. POINT D'ENTRÉE
// ============================================================

function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = parseArgs(args.slice(1));

    if (!command || command === 'help' || command === '-h' || command === '--help') {
        printHelp();
        return;
    }

    switch (command) {
        case 'add':     addExpense(options);    break;
        case 'update':  updateExpense(options); break;
        case 'delete':  deleteExpense(options); break;
        case 'list':    listExpenses(options);  break;
        case 'summary': showSummary(options);   break;
        case 'export':  exportCSV(options);     break;
        default:
            console.error(`${c.red}❌ Commande inconnue : "${command}".${c.reset}`);
            console.error(`${c.gray}   Tapez \`expense-tracker help\` pour voir les commandes.${c.reset}`);
            process.exit(1);
    }
}

main();