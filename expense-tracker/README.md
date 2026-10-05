🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le parser d'arguments nommés
javascript
function parseArgs(args) {
    const result = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];

            if (next !== undefined && !next.startsWith('--')) {
                result[key] = next;
                i++;
            } else {
                result[key] = true;
            }
        }
    }

    return result;
}
Décomposons avec ['--description', 'Lunch', '--amount', '20'] :

i	arg	key	next	Action
0	--description	description	Lunch	result.description = 'Lunch', i → 1
2	--amount	amount	20	result.amount = '20', i → 3
Résultat : { description: 'Lunch', amount: '20' }

💡 Pourquoi i++ ? Pour sauter la valeur qu'on vient de lire. Sinon, on la relirait comme un flag.

Cas spécial : --verbose tout seul → next est undefined ou commence par -- → result.verbose = true.

🔹 5.2 — Le parseAmount (validation stricte)
javascript
function parseAmount(value) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) throw new Error(`"${value}" n'est pas un nombre.`);
    if (num < 0) throw new Error('Le montant doit être positif.');
    if (num === 0) throw new Error('Le montant doit être supérieur à 0.');
    return num;
}
💡 3 validations :

Est-ce un nombre ? Sinon → erreur.

Est-il négatif ? Sinon → erreur.

Est-il nul ? Sinon → erreur.

Résultat : impossible d'ajouter -50 ou abc. ✅

🔹 5.3 — Le filtrage par mois
javascript
const filtered = expenses.filter((e) => {
    const expenseMonth = new Date(e.date).getMonth() + 1;
    return expenseMonth === month;
});
⚠️ Piège classique : getMonth() renvoie 0-11 :

Janvier → 0

Décembre → 11

Il faut + 1 pour comparer avec --month 10 (utilisateur = 10 = Octobre).

🔹 5.4 — Le tableau aligné avec padEnd
javascript
console.log(
    'ID'.padEnd(6) +
    'Date'.padEnd(13) +
    'Description'.padEnd(20) +
    'Amount'
);
Résultat :

text
ID    Date         Description         Amount
1     2026-10-02   Lunch               $20
2     2026-10-02   Dinner              $10
💡 padEnd(n) : ajoute des espaces jusqu'à n caractères.

Piège : si une colonne est plus longue que n, elle déborde. On tronque avant :

javascript
e.description.slice(0, colDesc - 3) + '…'
🔹 5.5 — Le résumé avec groupby par catégorie
javascript
const byCategory = filtered.reduce((acc, e) => {
    const cat = e.category || 'Sans catégorie';
    acc[cat] = (acc[cat] || 0) + e.amount;
    return acc;
}, {});
Décomposons avec [{cat: 'Food', amount: 20}, {cat: 'Food', amount: 10}, {cat: 'Transport', amount: 5}] :

Iter	cat	acc avant	acc après
1	Food	{}	{ Food: 20 }
2	Food	{ Food: 20 }	{ Food: 30 }
3	Transport	{ Food: 30 }	{ Food: 30, Transport: 5 }
💡 reduce : parfait pour agréger des données en un objet.

🔹 5.6 — L'export CSV
javascript
const headers = ['id', 'date', 'description', 'category', 'amount'];
const lines = [headers.join(',')];

function csvEscape(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
⚠️ Piège du CSV : si une description contient une virgule ("Lunch, with friends"), le CSV casse.

Solution : entourer de "..." et doubler les guillemets internes.

Résultat :

text
id,date,description,category,amount
1,2026-10-02,"Lunch, with friends",Food,20
🔹 5.7 — Le spread conditionnel
javascript
const newExpense = {
    id: getNextId(expenses),
    date: todayISO(),
    description: description.trim(),
    amount: parsedAmount,
    ...(category && { category: category.trim() }),   // ← Astuce
};
💡 ...(condition && { key: value }) :

Si category est truthy → { category: '...' } → ajouté.

Si category est falsy → false → ignoré par le spread.

Résultat : category n'apparaît que si fourni. Plus propre que category: category || null.

🔹 5.8 — Le (id, description, ...) split
javascript
const command = args[0];
const options = parseArgs(args.slice(1));
Exemple : ['add', '--description', 'Lunch', '--amount', '20']

command → 'add'

args.slice(1) → ['--description', 'Lunch', '--amount', '20']

parseArgs(...) → { description: 'Lunch', amount: '20' }

🔹 5.9 — Le --month accepté par list ET summary
javascript
function listExpenses(args) {
    if (args.month !== undefined) { /* filtrer par mois */ }
}

function showSummary(args) {
    if (args.month !== undefined) { /* filtrer par mois */ }
}
💡 Même logique partagée entre les 2 commandes. On pourrait extraire une fonction filterByMonth(expenses, month).

Refactor possible :

javascript
function filterByMonth(expenses, monthStr) {
    const month = parseInt(monthStr, 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
        throw new Error('Le mois doit être entre 1 et 12.');
    }
    return expenses.filter((e) => new Date(e.date).getMonth() + 1 === month);
}
💡 DRY (Don't Repeat Yourself) : si tu répètes 2 fois le même code, factorise.

🔹 5.10 — Le #! et npm link
javascript
#!/usr/bin/env node
bash
chmod +x index.js
npm link
Résultat : expense-tracker add --description "Lunch" --amount 20 fonctionne partout. ✅