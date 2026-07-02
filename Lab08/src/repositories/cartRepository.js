export function createCartRepository(db) {
  return {
    getActiveCart(userId) {
      let cart = db.get("SELECT id, user_id AS userId, status, promo_code AS promoCode FROM carts WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1", [userId]);
      if (!cart) {
        const id = db.insert('INSERT INTO carts (user_id, status, promo_code) VALUES (?, ?, ?)', [userId, 'active', null]);
        cart = db.get('SELECT id, user_id AS userId, status, promo_code AS promoCode FROM carts WHERE id = ?', [id]);
      }
      return cart;
    },
    getItems(cartId) {
      return db.all('SELECT id, cart_id AS cartId, game_id AS gameId, quantity, unit_price AS unitPrice, discount_price AS discountPrice FROM cart_items WHERE cart_id = ? ORDER BY id', [cartId]);
    },
    getItem(cartId, itemId) {
      return db.get('SELECT id, cart_id AS cartId, game_id AS gameId, quantity, unit_price AS unitPrice, discount_price AS discountPrice FROM cart_items WHERE cart_id = ? AND id = ?', [cartId, itemId]);
    },
    getItemByGame(cartId, gameId) {
      return db.get('SELECT id, cart_id AS cartId, game_id AS gameId, quantity, unit_price AS unitPrice, discount_price AS discountPrice FROM cart_items WHERE cart_id = ? AND game_id = ?', [cartId, gameId]);
    },
    addItem(cartId, game, quantity) {
      const existing = this.getItemByGame(cartId, game.id);
      if (existing) {
        db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
        return this.getItem(cartId, existing.id);
      }
      const id = db.insert('INSERT INTO cart_items (cart_id, game_id, quantity, unit_price, discount_price) VALUES (?, ?, ?, ?, ?)', [cartId, game.id, quantity, game.price, game.discountPrice ?? null]);
      return this.getItem(cartId, id);
    },
    updateQuantity(itemId, quantity) {
      db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    },
    removeItem(cartId, itemId) {
      return db.run('DELETE FROM cart_items WHERE cart_id = ? AND id = ?', [cartId, itemId]).changes;
    },
    clear(cartId) {
      db.transaction(() => {
        db.run('DELETE FROM cart_items WHERE cart_id = ?', [cartId], { persist: false });
        db.run('UPDATE carts SET promo_code = NULL WHERE id = ?', [cartId], { persist: false });
      });
    },
    applyPromo(cartId, code) {
      db.run('UPDATE carts SET promo_code = ? WHERE id = ?', [code, cartId]);
    },
    checkout(cartId) {
      db.run('UPDATE carts SET status = ? WHERE id = ?', ['checked_out', cartId], { persist: false });
    },
    createActiveCart(userId) {
      return db.insert('INSERT INTO carts (user_id, status, promo_code) VALUES (?, ?, ?)', [userId, 'active', null], { persist: false });
    },
    findPromo(code) {
      return db.get('SELECT id, code, type, value, status, max_uses AS maxUses, current_uses AS currentUses, starts_at AS startsAt, expires_at AS expiresAt FROM promo_codes WHERE upper(code) = upper(?)', [code]);
    },
    incrementPromoUse(code) {
      db.run('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = ?', [code], { persist: false });
    }
  };
}