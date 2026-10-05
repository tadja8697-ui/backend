Le pattern "API avec auth JWT" :

1. USER MODEL
   users (id, name, email UNIQUE, password_hash, created_at)
   → bcrypt.hash(password, 10) avant INSERT

2. JWT
   jwt.sign({ userId, email }, SECRET, { expiresIn: '7d' })
   jwt.verify(token, SECRET) → payload ou throw

3. MIDDLEWARE authenticate
   Authorization: Bearer <token>
   → req.user = { id, email }
   → 401 si manquant/invalide

4. AUTORISATION
   findTodoOrFail(id, userId)
     - 404 si todo n'existe pas
     - 403 si user_id !== todo.user_id

5. ROUTES
   POST   /register          → 201 + token
   POST   /login             → 200 + token
   POST   /todos             → 201 (auth)
   GET    /todos?page&limit  → 200 (auth, paginé)
   GET    /todos/:id         → 200 (auth)
   PUT    /todos/:id         → 200 (auth + propriétaire)
   DELETE /todos/:id         → 204 (auth + propriétaire)

RÈGLES D'OR :
   - JAMAIS de password en clair → bcrypt
   - TOUJOURS "Invalid email or password" (pas de fuite)
   - JWT_SECRET ≥ 32 chars, dans .env
   - expiresIn TOUJOURS (7d)
   - Vérifier propriété sur TOUTES les routes /:id
   - Ne jamais renvoyer password_hash