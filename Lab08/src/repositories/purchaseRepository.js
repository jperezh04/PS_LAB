export function createPurchaseRepository(db) {
  return {
    create(userId, summary, items) {
      const now = new Date().toISOString();
      const purchaseId = db.insert('INSERT INTO purchases (user_id, subtotal, discount_total, tax_total, total, status, purchased_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        userId, summary.subtotal, summary.discountTotal, summary.estimatedTax, summary.total, 'paid', now
      ], { persist: false });
      for (const item of items) {
        db.run('INSERT INTO purchase_items (purchase_id, game_id, title_snapshot, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)', [
          purchaseId, item.game.id, item.game.title, item.quantity, item.discountPrice ?? item.unitPrice, item.subtotal
        ], { persist: false });
        db.run('INSERT OR IGNORE INTO library_items (user_id, game_id, purchase_id, download_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
          userId, item.game.id, purchaseId, `/downloads/${item.game.slug}`, 'available', now
        ], { persist: false });
      }
      return this.findById(purchaseId);
    },
    findById(id) {
      const purchase = db.get('SELECT id, user_id AS userId, subtotal, discount_total AS discountTotal, tax_total AS taxTotal, total, status, purchased_at AS purchasedAt FROM purchases WHERE id = ?', [id]);
      if (!purchase) return null;
      purchase.items = db.all('SELECT game_id AS gameId, title_snapshot AS titleSnapshot, quantity, unit_price AS unitPrice, subtotal FROM purchase_items WHERE purchase_id = ?', [id]);
      return purchase;
    },
    listByUser(userId) {
      return db.all('SELECT id, user_id AS userId, subtotal, discount_total AS discountTotal, tax_total AS taxTotal, total, status, purchased_at AS purchasedAt FROM purchases WHERE user_id = ? ORDER BY purchased_at DESC', [userId]);
    },
    listAll() {
      return db.all('SELECT id, user_id AS userId, subtotal, discount_total AS discountTotal, tax_total AS taxTotal, total, status, purchased_at AS purchasedAt FROM purchases ORDER BY purchased_at DESC');
    },
    totalSales() {
      return Number(db.get("SELECT COALESCE(SUM(total), 0) AS total FROM purchases WHERE status = 'paid'").total || 0);
    },
    library(userId) {
      return db.all('SELECT id, user_id AS userId, game_id AS gameId, purchase_id AS purchaseId, download_url AS downloadUrl, status, created_at AS createdAt FROM library_items WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    },
    hasLibraryItem(userId, gameId) {
      return db.get('SELECT id, download_url AS downloadUrl FROM library_items WHERE user_id = ? AND game_id = ? AND status = ?', [userId, gameId, 'available']);
    }
  };
}