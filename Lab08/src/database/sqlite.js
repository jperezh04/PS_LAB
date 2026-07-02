import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
let sqlModulePromise;

async function loadSqlModule() {
  if (!sqlModulePromise) {
    const sqlJsMain = require.resolve('sql.js');
    const sqlJsDir = path.dirname(sqlJsMain);
    sqlModulePromise = initSqlJs({ locateFile: file => path.join(sqlJsDir, file) });
  }
  return sqlModulePromise;
}

function mapRows(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(row.map((value, index) => [columns[index], value])));
}

export class SqlDatabase {
  constructor(db, filePath = null) {
    this.db = db;
    this.filePath = filePath;
  }

  exec(sql) {
    this.db.exec(sql);
    return this;
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  get(sql, params = []) {
    return this.all(sql, params)[0] || null;
  }

  run(sql, params = [], { persist = true } = {}) {
    this.db.run(sql, params);
    const changes = this.db.getRowsModified();
    if (persist) this.persist();
    return { changes };
  }

  insert(sql, params = []) {
    this.run(sql, params, { persist: false });
    const row = this.get('SELECT last_insert_rowid() AS id');
    this.persist();
    return Number(row.id);
  }

  transaction(callback) {
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = callback();
      this.db.run('COMMIT');
      this.persist();
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  persist() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, Buffer.from(this.db.export()));
  }
}

export async function createDatabase({ filePath = env.databaseFile, reset = false, seed = true } = {}) {
  const SQL = await loadSqlModule();
  let db;

  if (filePath && fs.existsSync(filePath) && !reset) {
    db = new SQL.Database(fs.readFileSync(filePath));
  } else {
    db = new SQL.Database();
  }

  const database = new SqlDatabase(db, filePath);
  createSchema(database);
  if (seed) seedDatabase(database);
  database.persist();
  return database;
}

function createSchema(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'customer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled', 'pending_deletion')),
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      membership TEXT NOT NULL DEFAULT 'free' CHECK(membership IN ('free', 'pro')),
      joined_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      discount_price REAL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      developer TEXT NOT NULL,
      publisher TEXT NOT NULL,
      release_date TEXT NOT NULL,
      esrb_rating TEXT NOT NULL,
      status TEXT NOT NULL,
      commercial_badge TEXT,
      rating REAL NOT NULL DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
      reviews_count INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id),
      cover_image_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_genres (
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      genre_id INTEGER NOT NULL REFERENCES genres(id),
      PRIMARY KEY (game_id, genre_id)
    );

    CREATE TABLE IF NOT EXISTS game_platforms (
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      platform_id INTEGER NOT NULL REFERENCES platforms(id),
      PRIMARY KEY (game_id, platform_id)
    );

    CREATE TABLE IF NOT EXISTS game_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('image', 'video')),
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS game_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS system_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,
      os TEXT,
      processor TEXT,
      memory TEXT,
      graphics TEXT,
      storage TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      promo_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      discount_price REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cart_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
      value REAL NOT NULL CHECK(value >= 0),
      status TEXT NOT NULL DEFAULT 'active',
      max_uses INTEGER NOT NULL DEFAULT 1,
      current_uses INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subtotal REAL NOT NULL,
      discount_total REAL NOT NULL,
      tax_total REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      purchased_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      game_id INTEGER NOT NULL REFERENCES games(id),
      title_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      game_id INTEGER NOT NULL REFERENCES games(id),
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      download_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      game_id INTEGER NOT NULL REFERENCES games(id),
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      status TEXT NOT NULL DEFAULT 'visible',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      topic TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_price ON games(price);
    CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_carts_user_status ON carts(user_id, status);
  `);
}

function seedDatabase(database) {
  const usersCount = database.get('SELECT COUNT(*) AS count FROM users').count;
  if (usersCount > 0) return;

  const now = new Date().toISOString();
  database.transaction(() => {
    database.run('INSERT INTO users (username, display_name, email, password_hash, role, status, avatar_url, bio, membership, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      'admin', 'Aether Admin', 'admin@aether.dev', bcrypt.hashSync('Admin1234', 10), 'admin', 'active', 'https://api.dicebear.com/7.x/shapes/svg?seed=admin', 'System operator for Aether Gaming.', 'pro', '2025-11-20T10:00:00.000Z'
    ], { persist: false });
    database.run('INSERT INTO users (username, display_name, email, password_hash, role, status, avatar_url, bio, membership, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      'alexvance', 'Alex Vance', 'alex@aether.dev', bcrypt.hashSync('Player1234', 10), 'customer', 'active', 'https://api.dicebear.com/7.x/shapes/svg?seed=alex', 'Cyberpunk RPG enjoyer. Collector of neon worlds.', 'free', '2026-01-12T14:30:00.000Z'
    ], { persist: false });

    [
      ['Premium', 'Top marketplace games.'],
      ['New Releases', 'Recently launched games.'],
      ['Deals', 'Discounted games.']
    ].forEach(row => database.run('INSERT INTO categories (name, description, status) VALUES (?, ?, ?)', [row[0], row[1], 'active'], { persist: false }));

    ['Action RPG', 'Sci-Fi', 'Cyberpunk', 'Strategy', 'Indie', 'Racing'].forEach(name => database.run('INSERT INTO genres (name, status) VALUES (?, ?)', [name, 'active'], { persist: false }));
    ['PC', 'PS5', 'Xbox', 'Next-Gen'].forEach(name => database.run('INSERT INTO platforms (name, status) VALUES (?, ?)', [name, 'active'], { persist: false }));

    const gamesPath = path.join(env.projectRoot, 'src', 'data', 'seed-games.json');
    const seedGames = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
    for (const game of seedGames) {
      database.run(`INSERT INTO games (id, title, slug, short_description, description, price, discount_price, stock, developer, publisher, release_date, esrb_rating, status, commercial_badge, rating, reviews_count, category_id, cover_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        game.id, game.title, game.slug, game.shortDescription, game.description, game.price, game.discountPrice, game.stock, game.developer, game.publisher, game.releaseDate, game.esrbRating, game.status, game.commercialBadge, game.rating, game.reviewsCount, game.categoryId, game.coverImageUrl
      ], { persist: false });
      for (const genreId of game.genreIds) database.run('INSERT INTO game_genres (game_id, genre_id) VALUES (?, ?)', [game.id, genreId], { persist: false });
      for (const platformId of game.platformIds) database.run('INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)', [game.id, platformId], { persist: false });
      for (const [index, media] of (game.media || []).entries()) database.run('INSERT INTO game_media (game_id, type, url, sort_order) VALUES (?, ?, ?, ?)', [game.id, media.type, media.url, index], { persist: false });
      for (const feature of (game.features || [])) database.run('INSERT INTO game_features (game_id, title, description) VALUES (?, ?, ?)', [game.id, feature, null], { persist: false });
      const req = game.systemRequirements || {};
      database.run('INSERT INTO system_requirements (game_id, os, processor, memory, graphics, storage) VALUES (?, ?, ?, ?, ?, ?)', [game.id, req.os, req.processor, req.memory, req.graphics, req.storage], { persist: false });
    }

    database.run('INSERT INTO wishlist (user_id, game_id, created_at) VALUES (?, ?, ?)', [2, 2, '2026-06-25T09:00:00.000Z'], { persist: false });
    database.run('INSERT INTO carts (id, user_id, status, promo_code) VALUES (?, ?, ?, ?)', [1, 2, 'active', null], { persist: false });
    database.run('INSERT INTO cart_items (cart_id, game_id, quantity, unit_price, discount_price) VALUES (?, ?, ?, ?, ?)', [1, 1, 1, 59.99, 47.99], { persist: false });
    database.run('INSERT INTO cart_items (cart_id, game_id, quantity, unit_price, discount_price) VALUES (?, ?, ?, ?, ?)', [1, 3, 1, 39.99, null], { persist: false });

    database.run('INSERT INTO promo_codes (code, type, value, status, max_uses, current_uses) VALUES (?, ?, ?, ?, ?, ?)', ['AETHER20', 'percentage', 20, 'active', 100, 0], { persist: false });
    database.run('INSERT INTO promo_codes (code, type, value, status, max_uses, current_uses) VALUES (?, ?, ?, ?, ?, ?)', ['NEON10', 'fixed', 10, 'active', 50, 0], { persist: false });

    database.run('INSERT INTO purchases (id, user_id, subtotal, discount_total, tax_total, total, status, purchased_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [1, 2, 59.99, 0, 4.20, 64.19, 'paid', '2026-06-30T18:30:00.000Z'], { persist: false });
    database.run('INSERT INTO purchase_items (purchase_id, game_id, title_snapshot, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)', [1, 2, 'Cyber Protocol', 1, 59.99, 59.99], { persist: false });
    database.run('INSERT INTO library_items (user_id, game_id, purchase_id, download_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [2, 2, 1, '/downloads/cyber-protocol', 'available', now], { persist: false });

    database.run('INSERT INTO reviews (user_id, game_id, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [2, 2, 5, 'Brutal visualmente, buena ambientación y combate rápido.', 'visible', '2026-06-30T19:00:00.000Z'], { persist: false });
    database.run('INSERT INTO support_tickets (user_id, name, email, topic, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [2, 'Alex Vance', 'alex@aether.dev', 'Purchase support', 'Necesito ayuda con mi recibo digital.', 'open', '2026-07-01T09:10:00.000Z'], { persist: false });

    database.run('INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [2, 'Wishlist deal', 'Cyber Protocol is trending this week.', 'promo', 0, '2026-07-01T10:00:00.000Z'], { persist: false });
    database.run('INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)', [1, 'Server Alert', 'High traffic detected in marketplace API.', 'alert', 0, '2026-07-01T11:00:00.000Z'], { persist: false });
    database.run('INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)', [1, 'Seeded initial catalog', 'game', 1, '{}', now], { persist: false });
  });
}
