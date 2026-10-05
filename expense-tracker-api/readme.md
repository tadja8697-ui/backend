Le pattern "Expense Tracker API" :

1. MODÈLE
   users    (id, name, email UNIQUE, password_hash)
   expenses (id, user_id, amount, category, description, date)
   → CHECK (amount > 0)
   → CHECK (category IN (...))
   → FOREIGN KEY (user_id) ON DELETE CASCADE

2. ROUTES
   POST   /register       → 201 + token
   POST   /login          → 200 + token
   POST   /expenses       → 201 (auth)
   GET    /expenses       → 200 (auth, filtres + pagination)
   GET    /expenses/summary → 200 (auth, agrégat)
   GET    /expenses/:id   → 200 (auth + propriétaire)
   PUT    /expenses/:id   → 200 (auth + propriétaire)
   DELETE /expenses/:id   → 204 (auth + propriétaire)

3. FILTRES (construction dynamique du WHERE)
   ?period=week|month|3months
   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   ?category=groceries
   ?minAmount=10&maxAmount=100
   ?term=search
   ?sort=date|amount&order=asc|desc
   ?page=1&limit=20

4. RÉSUMÉ PAR CATÉGORIE
   SELECT category, COUNT(*), SUM(amount)
   FROM expenses
   WHERE user_id = ?
   GROUP BY category

RÈGLES D'OR :
   - Routes spécifiques AVANT routes paramétrées (/summary avant /:id)
   - TOUJOURS WHERE user_id = ? (isolation)
   - Paramètres préparés (?, pas de concaténation)
   - Whitelist pour sort/order
   - Math.min(100, limit) pour éviter les abus
   - Montants : REAL en dev, INTEGER centimes en prod

💡 Astuce de prof
C'est ton dernier projet "beginner" ! 🎉 Tu as maintenant toutes les bases d'un dev backend junior :

✅ Express + REST

✅ SQLite + SQL

✅ JWT + bcrypt

✅ Autorisation + isolation

✅ Filtres + pagination

✅ Validation + gestion d'erreurs

Les 3 règles à graver :
1. Routes spécifiques AVANT routes paramétrées. Sinon /summary sera avalé par /:id.

2. TOUJOURS WHERE user_id = ?. Sinon fuite de données entre users.

3. Whitelist pour sort et order. Sinon injection SQL par tri.

Le test mental ultime :
Crée 2 users. User A crée 5 dépenses. User B fait GET /expenses.

Si User B voit 5 dépenses → Faille d'isolation. 🚨

Si User B voit 0 dépense → tu as compris l'isolation. ✅

Pour aller plus loin (projets intermediate) :
PostgreSQL au lieu de SQLite.

Prisma ou Drizzle (ORM moderne).

Docker pour packager l'app.

Tests (Vitest, Jest, supertest).

CI/CD (GitHub Actions).

Rate limiting distribué (Redis).

Refresh tokens + rotation.

Documentation OpenAPI/Swagger.