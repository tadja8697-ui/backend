🎯 ÉTAPE 5 : Explication détaillée
🔹 5.1 — Le wrapper question() en Promise
javascript
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => resolve(answer));
    });
}
Le problème : rl.question utilise un callback.

La solution : on encapsule le callback dans une Promise.

Résultat : on peut utiliser await question(...) partout.

💡 C'est LE pattern pour moderniser des APIs callback-based. On le retrouve partout : fetch, fs.promises, etc.

🔹 5.2 — La boucle principale while (true)
javascript
while (true) {
    const difficultyKey = await askDifficulty();
    const result = await playRound(difficultyKey);

    if (!(await askPlayAgain())) break;
}
💡 Boucle infinie qui s'arrête uniquement quand l'utilisateur répond "non" à "Play again?".

Analogie : imagine un restaurant. Tu manges (playRound), on te demande "Encore un dessert ?" (askPlayAgain), tu dis non → tu sors (break).

🔹 5.3 — La boucle de jeu while (attempts < chances)
javascript
while (attempts < difficulty.chances) {
    const input = await question('Enter your guess: ');
    // ...
    attempts++;
}
Logique :

Boucle tant que l'utilisateur a des chances.

À chaque tour : on demande, on valide, on compare.

On incrémente attempts uniquement si le guess est valide.

⚠️ Piège important : si l'utilisateur tape "abc", on fait continue sans incrémenter attempts. Sinon il perdrait une chance pour une faute de frappe. UX pro.

🔹 5.4 — La validation en 2 temps
javascript
const num = parseInt(input, 10);

if (Number.isNaN(num)) {
    console.log(`❌ "${input}" is not a number.`);
    continue;
}

if (num < MIN_NUMBER || num > MAX_NUMBER) {
    console.log(`❌ Please enter a number between ${MIN_NUMBER} and ${MAX_NUMBER}.`);
    continue;
}
💡 2 validations séparées :

Est-ce un nombre ? → sinon, message clair.

Est-il dans la plage ? → sinon, message clair.

Résultat : messages spécifiques au lieu d'un "Erreur" générique. UX pro.

🔹 5.5 — Le feedback conditionnel
javascript
const hint = num < targetNumber
    ? `greater than ${num}`
    : `less than ${num}`;

console.log(`Incorrect! The number is ${hint}.`);
💡 Astuce logique :

Si num < target → la cible est plus grande que le guess.

Si num > target → la cible est plus petite que le guess.

Message : "The number is greater than 25" (sous-entendu : la cible est plus grande que 25).

🔹 5.6 — Le tracking du temps
javascript
const startTime = Date.now();
// ...
const duration = Date.now() - startTime;
💡 Date.now() = timestamp en millisecondes depuis 1970.

duration = différence = temps écoulé en ms.

Formatage : (ms / 1000).toFixed(1) + 's' → "12.3s".

🔹 5.7 — Les high scores
javascript
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
💡 Logique :

Si aucun score pour cette difficulté → record.

Si attempts < current → record (moins d'essais = mieux).

Sinon → pas record.

Fichier highscores.json :

json
{
    "easy": 3,
    "medium": 2,
    "hard": 1
}
🔹 5.8 — Le parseInt(input, 10) (rappel)
javascript
const num = parseInt(input, 10);
⚠️ Toujours préciser la base 10 :

parseInt("08") sans base → peut être interprété en octal → 0.

parseInt("08", 10) → 8.

🔹 5.9 — Le rl.close() final
javascript
console.log('Thanks for playing!');
rl.close();
⚠️ Sans rl.close() : le programme ne se termine jamais. readline maintient le process en vie.

Règle d'or : toujours rl.close() à la fin.

🔹 5.10 — Les couleurs ANSI (rappel)
javascript
const c = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    // ...
    reset: '\x1b[0m',
};
💡 Encapsulation : chaque message coloré commence par une couleur et finit par reset :

javascript
console.log(`${c.red}Erreur${c.reset}`);
⚠️ Piège : si tu oublies reset, TOUT le reste de la console est coloré.

Le pattern "jeu CLI interactif" :

1. READLINE (avec wrapper Promise)
   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
   function question(prompt) {
       return new Promise((resolve) => rl.question(prompt, resolve));
   }
   // À la fin : rl.close()

2. NOMBRE ALÉATOIRE
   Math.floor(Math.random() * (max - min + 1)) + min

3. BOUCLE DE JEU
   while (attempts < maxAttempts) {
       const input = await question('Guess: ');
       const num = parseInt(input, 10);
       if (Number.isNaN(num)) continue;   // Ne pas incrémenter
       attempts++;
       if (num === target) { win(); break; }
       else { feedback(); }
   }

4. BOUCLE PRINCIPALE (rejouer)
   while (true) {
       await playRound();
       if (!(await askPlayAgain())) break;
   }

5. HIGH SCORES (fichier JSON)
   const scores = loadHighScores();
   if (!scores[difficulty] || attempts < scores[difficulty]) { ... }

RÈGLES D'OR :
   - Wrapper rl.question en Promise pour async/await
   - rl.close() TOUJOURS à la fin
   - continue sans incrémenter sur input invalide
   - Math.floor(Math.random() * (max - min + 1)) + min
   - parseInt(x, 10) toujours
   - Message d'erreur spécifique (pas "Erreur" générique)