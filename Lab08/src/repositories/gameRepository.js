import { slugify } from '../utils/formatters.js';

export function createGameRepository(db) {
  function mapGame(row, { includeRelations = true, userId = null } = {}) {
    if (!row) return null;
    const game = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      shortDescription: row.shortDescription ?? row.short_description,
      description: row.description,
      price: Number(row.price),
      discountPrice: row.discountPrice ?? row.discount_price,
      stock: Number(row.stock),
      developer: row.developer,
      publisher: row.publisher,
      releaseDate: row.releaseDate ?? row.release_date,
      esrbRating: row.esrbRating ?? row.esrb_rating,
      status: row.status,
      commercialBadge: row.commercialBadge ?? row.commercial_badge,
      rating: Number(row.rating),
      reviewsCount: Number(row.reviewsCount ?? row.reviews_count ?? 0),
      categoryId: row.categoryId ?? row.category_id,
      coverImageUrl: row.coverImageUrl ?? row.cover_image_url,
      finalPrice: Number(row.discountPrice ?? row.discount_price ?? row.price)
    };
    if (!includeRelations) return game;
    game.category = db.get('SELECT id, name, description, status FROM categories WHERE id = ?', [game.categoryId]);
    game.genres = db.all('SELECT g.id, g.name, g.status FROM genres g INNER JOIN game_genres gg ON gg.genre_id = g.id WHERE gg.game_id = ? ORDER BY g.id', [game.id]);
    game.platforms = db.all('SELECT p.id, p.name, p.status FROM platforms p INNER JOIN game_platforms gp ON gp.platform_id = p.id WHERE gp.game_id = ? ORDER BY p.id', [game.id]);
    game.genreIds = game.genres.map(item => item.id);
    game.platformIds = game.platforms.map(item => item.id);
    game.media = db.all('SELECT type, url FROM game_media WHERE game_id = ? ORDER BY sort_order, id', [game.id]);
    game.features = db.all('SELECT title FROM game_features WHERE game_id = ? ORDER BY id', [game.id]).map(item => item.title);
    game.systemRequirements = db.get('SELECT os, processor, memory, graphics, storage FROM system_requirements WHERE game_id = ?', [game.id]) || {};
    game.isWishlisted = userId ? Boolean(db.get('SELECT id FROM wishlist WHERE user_id = ? AND game_id = ?', [userId, game.id])) : false;
    return game;
  }

  function baseSelect() {
    return `SELECT id, title, slug, short_description AS shortDescription, description, price, discount_price AS discountPrice, stock, developer, publisher, release_date AS releaseDate, esrb_rating AS esrbRating, status, commercial_badge AS commercialBadge, rating, reviews_count AS reviewsCount, category_id AS categoryId, cover_image_url AS coverImageUrl FROM games`;
  }

  function attachRelations(gameId, data) {
    if (data.genreIds) {
      db.run('DELETE FROM game_genres WHERE game_id = ?', [gameId], { persist: false });
      for (const genreId of data.genreIds) db.run('INSERT INTO game_genres (game_id, genre_id) VALUES (?, ?)', [gameId, genreId], { persist: false });
    }
    if (data.platformIds) {
      db.run('DELETE FROM game_platforms WHERE game_id = ?', [gameId], { persist: false });
      for (const platformId of data.platformIds) db.run('INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)', [gameId, platformId], { persist: false });
    }
  }

  return {
    mapGame,
    listCatalog({ search = '', genre = '', platform = '', maxPrice = '', sort = 'relevance', page = 1, limit = 12, includeDrafts = false, userId = null } = {}) {
      const params = [];
      const where = [];
      if (!includeDrafts) where.push("status IN ('active', 'beta', 'preorder')");
      if (search) {
        where.push('(lower(title) LIKE ? OR lower(short_description) LIKE ? OR lower(developer) LIKE ? OR lower(publisher) LIKE ?)');
        const term = `%${search.toLowerCase()}%`;
        params.push(term, term, term, term);
      }
      if (genre) {
        where.push('id IN (SELECT gg.game_id FROM game_genres gg INNER JOIN genres g ON g.id = gg.genre_id WHERE lower(g.name) = lower(?))');
        params.push(genre);
      }
      if (platform) {
        where.push('id IN (SELECT gp.game_id FROM game_platforms gp INNER JOIN platforms p ON p.id = gp.platform_id WHERE lower(p.name) = lower(?))');
        params.push(platform);
      }
      if (maxPrice !== '' && maxPrice !== undefined && maxPrice !== null) {
        where.push('COALESCE(discount_price, price) <= ?');
        params.push(Number(maxPrice));
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const sortSql = {
        price_asc: 'COALESCE(discount_price, price) ASC',
        price_desc: 'COALESCE(discount_price, price) DESC',
        release_desc: 'release_date DESC',
        release_asc: 'release_date ASC',
        rating_desc: 'rating DESC',
        relevance: 'rating DESC, reviews_count DESC'
      }[sort] || 'rating DESC, reviews_count DESC';
      const total = Number(db.get(`SELECT COUNT(*) AS total FROM games ${whereSql}`, params).total);
      const offset = (page - 1) * limit;
      const rows = db.all(`${baseSelect()} ${whereSql} ORDER BY ${sortSql} LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return { data: rows.map(row => mapGame(row, { userId })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },
    findById(id, userId = null) {
      return mapGame(db.get(`${baseSelect()} WHERE id = ?`, [id]), { userId });
    },
    findBySlug(slug) {
      return mapGame(db.get(`${baseSelect()} WHERE slug = ?`, [slug]));
    },
    existsByTitle(title, excludeId = null) {
      const row = excludeId
        ? db.get('SELECT id FROM games WHERE lower(title) = lower(?) AND id != ?', [title, excludeId])
        : db.get('SELECT id FROM games WHERE lower(title) = lower(?)', [title]);
      return Boolean(row);
    },
    create(data) {
      const slug = slugify(data.title);
      const id = db.transaction(() => {
        const gameId = db.insert(`INSERT INTO games (title, slug, short_description, description, price, discount_price, stock, developer, publisher, release_date, esrb_rating, status, commercial_badge, rating, reviews_count, category_id, cover_image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          data.title, slug, data.shortDescription, data.description, data.price, data.discountPrice ?? null, data.stock, data.developer, data.publisher, data.releaseDate, data.esrbRating || 'T', data.status || 'active', data.commercialBadge || 'new', data.rating ?? 4.5, data.reviewsCount ?? 0, data.categoryId || 1, data.coverImageUrl
        ]);
        attachRelations(gameId, data);
        db.run('INSERT OR REPLACE INTO system_requirements (game_id, os, processor, memory, graphics, storage) VALUES (?, ?, ?, ?, ?, ?)', [gameId, 'Windows 10 64-bit', 'Intel Core i5 / Ryzen 5', '8 GB RAM', 'GTX 1660 / RX 580', '45 GB SSD'], { persist: false });
        return gameId;
      });
      return this.findById(id);
    },
    update(id, data) {
      const current = this.findById(id);
      if (!current) return null;
      const merged = { ...current, ...data };
      const slug = slugify(merged.title);
      db.transaction(() => {
        db.run(`UPDATE games SET title = ?, slug = ?, short_description = ?, description = ?, price = ?, discount_price = ?, stock = ?, developer = ?, publisher = ?, release_date = ?, esrb_rating = ?, status = ?, commercial_badge = ?, rating = ?, category_id = ?, cover_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
          merged.title, slug, merged.shortDescription, merged.description, merged.price, merged.discountPrice ?? null, merged.stock, merged.developer, merged.publisher, merged.releaseDate, merged.esrbRating, merged.status, merged.commercialBadge, merged.rating, merged.categoryId || 1, merged.coverImageUrl, id
        ], { persist: false });
        attachRelations(id, data);
      });
      return this.findById(id);
    },
    archive(id) {
      db.run('UPDATE games SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['archived', id]);
      return this.findById(id);
    },
    decrementStock(gameId, quantity) {
      db.run('UPDATE games SET stock = stock - ? WHERE id = ? AND stock >= ?', [quantity, gameId, quantity], { persist: false });
      return db.db.getRowsModified();
    },
    related(gameId, userId = null) {
      const game = this.findById(gameId);
      if (!game) return null;
      const rows = db.all(`${baseSelect()} WHERE id != ? AND id IN (SELECT game_id FROM game_genres WHERE genre_id IN (${game.genreIds.map(() => '?').join(',')})) AND status IN ('active','beta','preorder') LIMIT 3`, [gameId, ...game.genreIds]);
      return rows.map(row => mapGame(row, { userId }));
    },
    suggestions(search = '') {
      return db.all('SELECT id, title FROM games WHERE lower(title) LIKE ? ORDER BY rating DESC LIMIT 5', [`%${search.toLowerCase()}%`]);
    },
    dbReviews(userId) {
      return db.all(`SELECT r.id, r.rating, r.comment, r.status, r.created_at AS createdAt, g.id AS gameId, g.title AS gameTitle, g.cover_image_url AS coverImageUrl
        FROM reviews r INNER JOIN games g ON g.id = r.game_id
        WHERE r.user_id = ? ORDER BY r.created_at DESC`, [userId]);
    },
    genres() { return db.all('SELECT id, name, status FROM genres ORDER BY id'); },
    platforms() { return db.all('SELECT id, name, status FROM platforms ORDER BY id'); },
    categories() { return db.all('SELECT id, name, description, status FROM categories ORDER BY id'); },
    createCategory(data) {
      const id = db.insert('INSERT INTO categories (name, description, status) VALUES (?, ?, ?)', [data.name, data.description || '', data.status || 'active']);
      return db.get('SELECT id, name, description, status FROM categories WHERE id = ?', [id]);
    },
    updateCategory(id, data) {
      db.run('UPDATE categories SET name = ?, description = ?, status = ? WHERE id = ?', [data.name, data.description || '', data.status || 'active', id]);
      return db.get('SELECT id, name, description, status FROM categories WHERE id = ?', [id]);
    },
    archiveCategory(id) {
      db.run('UPDATE categories SET status = ? WHERE id = ?', ['inactive', id]);
      return db.get('SELECT id, name, description, status FROM categories WHERE id = ?', [id]);
    },
    countActive() { return Number(db.get("SELECT COUNT(*) AS total FROM games WHERE status IN ('active','beta','preorder')").total); },
    countLowStock() { return Number(db.get("SELECT COUNT(*) AS total FROM games WHERE stock <= 5 AND status IN ('active','beta','preorder')").total); }
  };
}
