export function createAdminRepository(db) {
  return {
    log(adminId, action, entityType, entityId, metadata = {}) {
      db.run('INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)', [adminId, action, entityType, entityId, JSON.stringify(metadata), new Date().toISOString()]);
    },
    listActivity(limit = 10) {
      return db.all('SELECT id, admin_id AS adminId, action, entity_type AS entityType, entity_id AS entityId, metadata, created_at AS createdAt FROM admin_activity_logs ORDER BY created_at DESC, id DESC LIMIT ?', [limit]);
    },
    createSupportTicket({ userId = null, name, email, topic, message }) {
      const id = db.insert('INSERT INTO support_tickets (user_id, name, email, topic, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, name, email, topic, message, 'open', new Date().toISOString()]);
      return db.get('SELECT id, user_id AS userId, name, email, topic, message, status, created_at AS createdAt FROM support_tickets WHERE id = ?', [id]);
    },
    listSupportTickets() {
      return db.all('SELECT id, user_id AS userId, name, email, topic, message, status, created_at AS createdAt FROM support_tickets ORDER BY created_at DESC, id DESC');
    }
  };
}
