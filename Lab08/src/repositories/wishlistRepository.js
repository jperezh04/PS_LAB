export function createWishlistRepository(db) {
  return {
    list(userId) {
      return db.all('SELECT game_id AS gameId FROM wishlist WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    },
    exists(userId, gameId) {
      return Boolean(db.get('SELECT id FROM wishlist WHERE user_id = ? AND game_id = ?', [userId, gameId]));
    },
    add(userId, gameId) {
      return db.insert('INSERT INTO wishlist (user_id, game_id, created_at) VALUES (?, ?, ?)', [userId, gameId, new Date().toISOString()]);
    },
    remove(userId, gameId) {
      return db.run('DELETE FROM wishlist WHERE user_id = ? AND game_id = ?', [userId, gameId]).changes;
    }
  };
}
