export function createUserRepository(db) {
  const publicSelect = `id, username, display_name AS displayName, email, role, status, avatar_url AS avatarUrl, bio, membership, joined_at AS joinedAt`;

  function mapUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.displayName ?? row.display_name,
      email: row.email,
      passwordHash: row.passwordHash ?? row.password_hash,
      role: row.role,
      status: row.status,
      avatarUrl: row.avatarUrl ?? row.avatar_url,
      bio: row.bio || '',
      membership: row.membership,
      joinedAt: row.joinedAt ?? row.joined_at
    };
  }

  return {
    findById(id) {
      return mapUser(db.get(`SELECT ${publicSelect}, password_hash AS passwordHash FROM users WHERE id = ?`, [id]));
    },
    findPublicById(id) {
      return mapUser(db.get(`SELECT ${publicSelect} FROM users WHERE id = ?`, [id]));
    },
    findByEmail(email) {
      return mapUser(db.get(`SELECT ${publicSelect}, password_hash AS passwordHash FROM users WHERE lower(email) = lower(?)`, [email]));
    },
    findByUsername(username) {
      return mapUser(db.get(`SELECT ${publicSelect} FROM users WHERE lower(username) = lower(?)`, [username]));
    },
    create(data) {
      const id = db.insert(`INSERT INTO users (username, display_name, email, password_hash, role, status, avatar_url, bio, membership, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.username, data.displayName, data.email, data.passwordHash, data.role, data.status, data.avatarUrl, data.bio || '', data.membership || 'free', data.joinedAt
      ]);
      return this.findPublicById(id);
    },
    updateMe(id, data) {
      db.run('UPDATE users SET display_name = ?, email = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.displayName, data.email, data.bio || '', id]);
      return this.findPublicById(id);
    },
    updateAvatar(id, avatarUrl) {
      db.run('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, id]);
      return this.findPublicById(id);
    },
    updateMembership(id, membership) {
      db.run('UPDATE users SET membership = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [membership, id]);
      return this.findPublicById(id);
    },
    markPendingDeletion(id) {
      db.transaction(() => {
        db.run('UPDATE users SET status = ? WHERE id = ?', ['pending_deletion', id], { persist: false });
        db.run('INSERT INTO account_deletion_requests (user_id, status, requested_at) VALUES (?, ?, ?)', [id, 'pending', new Date().toISOString()], { persist: false });
      });
    },
    list({ search = '', role = '', status = '' } = {}) {
      const params = [];
      const where = [];
      if (search) {
        where.push('(lower(username) LIKE ? OR lower(email) LIKE ? OR lower(display_name) LIKE ?)');
        params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      }
      if (role) { where.push('role = ?'); params.push(role); }
      if (status) { where.push('status = ?'); params.push(status); }
      const rows = db.all(`SELECT ${publicSelect} FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`, params);
      return rows.map(mapUser);
    },
    updateAdmin(id, data) {
      db.run('UPDATE users SET display_name = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.displayName, data.role, data.status, id]);
      return this.findPublicById(id);
    },
    count() {
      return Number(db.get('SELECT COUNT(*) AS total FROM users').total);
    }
  };
}
