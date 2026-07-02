export function createSystemService({ database }) {
  return {
    status() {
      const dbOk = Boolean(database.get('SELECT 1 AS ok')?.ok);
      return {
        status: dbOk ? 'online' : 'offline',
        message: dbOk ? 'All marketplace services are operational.' : 'Database is unavailable.',
        estimatedUptime: dbOk ? null : 'Unknown'
      };
    },
    notifications(userId) {
      return database.all('SELECT id, title, message, type, is_read AS isRead, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
    }
  };
}
