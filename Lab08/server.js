import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  users,
  games,
  genres,
  platforms,
  categories,
  carts,
  wishlist,
  purchases,
  promoCodes,
  notifications,
  adminActivity,
  nextId,
  publicUser,
  gameView,
  getActiveCart,
  cartView
} from './src/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 });
app.use('/api/auth', authLimiter);

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(item => item.id === Number(payload.sub));
    if (user && user.status === 'active') req.user = user;
  } catch (_) {}

  next();
}

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(item => item.id === Number(payload.sub));

    if (!user) return res.status(401).json({ message: 'Invalid token user.' });
    if (user.status !== 'active') return res.status(403).json({ message: 'Account disabled.' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin permission required.' });
  }
  next();
}

function assertRequired(body, fields) {
  const errors = [];
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push({ field, message: `${field} is required.` });
    }
  }
  return errors;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalize(text) {
  return String(text ?? '').trim().toLowerCase();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Aether Gaming Flow Starter' });
});

app.post('/api/auth/register', (req, res) => {
  const errors = assertRequired(req.body, ['username', 'email', 'password']);
  const { username, email, password } = req.body;

  if (username && (username.trim().length < 3 || username.trim().length > 30)) {
    errors.push({ field: 'username', message: 'Username must be between 3 and 30 characters.' });
  }
  if (email && !validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }
  if (password && (password.length < 8 || password.length > 100)) {
    errors.push({ field: 'password', message: 'Password must be between 8 and 100 characters.' });
  }
  if (users.some(user => normalize(user.email) === normalize(email))) {
    errors.push({ field: 'email', message: 'Email already exists.' });
  }
  if (users.some(user => normalize(user.username) === normalize(username))) {
    errors.push({ field: 'username', message: 'Username already exists.' });
  }
  if (errors.length) return res.status(422).json({ message: 'Validation error', errors });

  const user = {
    id: nextId(users),
    username: username.trim(),
    displayName: username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'customer',
    status: 'active',
    avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(username.trim())}`,
    bio: '',
    membership: 'free',
    joinedAt: new Date().toISOString()
  };

  users.push(user);
  res.status(201).json({ message: 'Account created successfully.', user: publicUser(user), token: signToken(user) });
});

app.post('/api/auth/login', (req, res) => {
  const errors = assertRequired(req.body, ['email', 'password']);
  const { email, password } = req.body;

  if (email && !validateEmail(email)) errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  if (errors.length) return res.status(422).json({ message: 'Validation error', errors });

  const user = users.find(item => normalize(item.email) === normalize(email));
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  if (user.status !== 'active') return res.status(403).json({ message: 'Account disabled.' });

  res.json({ message: 'Login successful.', user: publicUser(user), token: signToken(user) });
});

app.post('/api/auth/logout', authRequired, (_req, res) => {
  res.json({ message: 'Session closed successfully.' });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/forgot-password', (req, res) => {
  if (!validateEmail(req.body.email || '')) {
    return res.status(422).json({ message: 'Validation error', errors: [{ field: 'email', message: 'Please enter a valid email address.' }] });
  }
  res.json({ message: 'If the email exists, recovery instructions were sent.' });
});

app.get('/api/home', authOptional, (req, res) => {
  const featured = games.filter(game => game.status === 'active').slice(0, 4).map(game => gameView(game, req.user?.id));
  res.json({
    hero: gameView(games[0], req.user?.id),
    featured,
    stats: { activeGames: games.filter(game => game.status === 'active').length, playersOnline: 12480, deals: games.filter(game => game.discountPrice).length }
  });
});

app.get('/api/games', authOptional, (req, res) => {
  const {
    search = '',
    genre,
    platform,
    maxPrice,
    sort = 'relevance',
    page = 1,
    limit = 12
  } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 12, 1), 100);

  let filtered = games.filter(game => ['active', 'beta', 'preorder'].includes(game.status));

  if (String(search).trim()) {
    const term = normalize(search);
    filtered = filtered.filter(game =>
      normalize(game.title).includes(term) ||
      normalize(game.shortDescription).includes(term) ||
      normalize(game.developer).includes(term) ||
      normalize(game.publisher).includes(term)
    );
  }

  if (genre) {
    const foundGenre = genres.find(item => normalize(item.name) === normalize(genre));
    filtered = foundGenre ? filtered.filter(game => game.genreIds.includes(foundGenre.id)) : [];
  }

  if (platform) {
    const foundPlatform = platforms.find(item => normalize(item.name) === normalize(platform));
    filtered = foundPlatform ? filtered.filter(game => game.platformIds.includes(foundPlatform.id)) : [];
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) filtered = filtered.filter(game => (game.discountPrice ?? game.price) <= max);
  }

  const sorters = {
    price_asc: (a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price),
    price_desc: (a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price),
    release_desc: (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate),
    release_asc: (a, b) => new Date(a.releaseDate) - new Date(b.releaseDate),
    rating_desc: (a, b) => b.rating - a.rating,
    relevance: (a, b) => b.rating - a.rating
  };

  filtered = [...filtered].sort(sorters[sort] || sorters.relevance);

  const total = filtered.length;
  const start = (pageNumber - 1) * limitNumber;
  const data = filtered.slice(start, start + limitNumber).map(game => gameView(game, req.user?.id));

  res.json({
    data,
    filters: { genres, platforms },
    pagination: { page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) }
  });
});

app.get('/api/games/search/suggestions', (req, res) => {
  const term = normalize(req.query.search || '');
  const suggestions = games
    .filter(game => normalize(game.title).includes(term))
    .slice(0, 5)
    .map(game => ({ id: game.id, title: game.title }));
  res.json({ data: suggestions });
});

app.get('/api/games/:id', authOptional, (req, res) => {
  const game = games.find(item => item.id === Number(req.params.id));
  if (!game) return res.status(404).json({ message: 'Game not found.' });
  res.json({ data: gameView(game, req.user?.id) });
});

app.get('/api/games/:id/related', authOptional, (req, res) => {
  const game = games.find(item => item.id === Number(req.params.id));
  if (!game) return res.status(404).json({ message: 'Game not found.' });

  const related = games
    .filter(item => item.id !== game.id && item.genreIds.some(id => game.genreIds.includes(id)))
    .slice(0, 3)
    .map(item => gameView(item, req.user?.id));

  res.json({ data: related });
});

app.get('/api/wishlist', authRequired, (req, res) => {
  const data = wishlist
    .filter(item => item.userId === req.user.id)
    .map(item => gameView(games.find(game => game.id === item.gameId), req.user.id));
  res.json({ data });
});

app.post('/api/wishlist', authRequired, (req, res) => {
  const gameId = Number(req.body.gameId);
  const game = games.find(item => item.id === gameId);
  if (!game) return res.status(404).json({ message: 'Game not found.' });
  if (wishlist.some(item => item.userId === req.user.id && item.gameId === gameId)) {
    return res.status(409).json({ message: 'Game already exists in wishlist.' });
  }
  wishlist.push({ id: nextId(wishlist), userId: req.user.id, gameId, createdAt: new Date().toISOString() });
  res.status(201).json({ message: 'Game added to wishlist.', data: gameView(game, req.user.id) });
});

app.delete('/api/wishlist/:gameId', authRequired, (req, res) => {
  const index = wishlist.findIndex(item => item.userId === req.user.id && item.gameId === Number(req.params.gameId));
  if (index === -1) return res.status(404).json({ message: 'Wishlist item not found.' });
  wishlist.splice(index, 1);
  res.json({ message: 'Game removed from wishlist.' });
});

app.get('/api/cart', authRequired, (req, res) => {
  res.json({ data: cartView(getActiveCart(req.user.id)) });
});

app.post('/api/cart/items', authRequired, (req, res) => {
  const gameId = Number(req.body.gameId);
  const quantity = Number(req.body.quantity || 1);
  const game = games.find(item => item.id === gameId);

  if (!game) return res.status(404).json({ message: 'Game not found.' });
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(422).json({ message: 'Quantity must be greater than zero.' });
  if (game.stock <= 0 || quantity > game.stock) return res.status(409).json({ message: 'Insufficient stock.' });
  if (!['active', 'preorder', 'beta'].includes(game.status)) return res.status(409).json({ message: 'Game is not available.' });

  const cart = getActiveCart(req.user.id);
  const existing = cart.items.find(item => item.gameId === gameId);
  if (existing) {
    if (existing.quantity + quantity > game.stock) return res.status(409).json({ message: 'Insufficient stock.' });
    existing.quantity += quantity;
  } else {
    cart.items.push({ id: nextId(cart.items), gameId, quantity, unitPrice: game.price, discountPrice: game.discountPrice });
  }

  res.status(201).json({ message: 'Game added to cart.', data: cartView(cart) });
});

app.put('/api/cart/items/:itemId', authRequired, (req, res) => {
  const cart = getActiveCart(req.user.id);
  const item = cart.items.find(row => row.id === Number(req.params.itemId));
  const quantity = Number(req.body.quantity);
  if (!item) return res.status(404).json({ message: 'Cart item not found.' });
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(422).json({ message: 'Quantity must be greater than zero.' });

  const game = games.find(row => row.id === item.gameId);
  if (quantity > game.stock) return res.status(409).json({ message: 'Insufficient stock.' });
  item.quantity = quantity;
  res.json({ message: 'Cart item updated.', data: cartView(cart) });
});

app.delete('/api/cart/items/:itemId', authRequired, (req, res) => {
  const cart = getActiveCart(req.user.id);
  const index = cart.items.findIndex(row => row.id === Number(req.params.itemId));
  if (index === -1) return res.status(404).json({ message: 'Cart item not found.' });
  cart.items.splice(index, 1);
  res.json({ message: 'Cart item removed.', data: cartView(cart) });
});

app.delete('/api/cart', authRequired, (req, res) => {
  const cart = getActiveCart(req.user.id);
  cart.items = [];
  cart.promoCode = null;
  res.json({ message: 'Cart emptied.', data: cartView(cart) });
});

app.post('/api/cart/apply-promo', authRequired, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const promo = promoCodes.find(item => item.code === code);
  if (!promo || promo.status !== 'active') return res.status(404).json({ message: 'Invalid promo code.' });
  if (promo.currentUses >= promo.maxUses) return res.status(409).json({ message: 'Promo code usage limit reached.' });

  const cart = getActiveCart(req.user.id);
  if (!cart.items.length) return res.status(400).json({ message: 'Your cart is empty.' });
  cart.promoCode = promo.code;
  res.json({ message: 'Promo code applied.', data: cartView(cart) });
});

app.post('/api/checkout', authRequired, (req, res) => {
  const cart = getActiveCart(req.user.id);
  if (!cart.items.length) return res.status(400).json({ message: 'Your cart is empty.' });

  for (const item of cart.items) {
    const game = games.find(row => row.id === item.gameId);
    if (!game || game.stock < item.quantity) return res.status(409).json({ message: `Insufficient stock for ${game?.title || 'selected game'}.` });
  }

  const view = cartView(cart);
  for (const item of cart.items) {
    const game = games.find(row => row.id === item.gameId);
    game.stock -= item.quantity;
  }

  const purchase = {
    id: nextId(purchases),
    userId: req.user.id,
    subtotal: view.summary.subtotal,
    discountTotal: view.summary.discountTotal,
    taxTotal: view.summary.estimatedTax,
    total: view.summary.total,
    status: 'paid',
    purchasedAt: new Date().toISOString(),
    items: view.items.map(item => ({
      gameId: item.game.id,
      titleSnapshot: item.game.title,
      quantity: item.quantity,
      unitPrice: item.discountPrice ?? item.unitPrice,
      subtotal: item.subtotal
    }))
  };

  purchases.push(purchase);
  cart.status = 'checked_out';
  carts.push({ id: nextId(carts), userId: req.user.id, status: 'active', promoCode: null, items: [] });

  res.status(201).json({ message: 'Purchase completed successfully.', data: purchase });
});

app.get('/api/purchases', authRequired, (req, res) => {
  const data = purchases.filter(item => item.userId === req.user.id || req.user.role === 'admin');
  res.json({ data });
});

app.get('/api/purchases/:id', authRequired, (req, res) => {
  const purchase = purchases.find(item => item.id === Number(req.params.id));
  if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });
  if (purchase.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden.' });
  res.json({ data: purchase });
});

app.get('/api/purchases/:id/receipt', authRequired, (req, res) => {
  const purchase = purchases.find(item => item.id === Number(req.params.id));
  if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });
  if (purchase.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden.' });
  res.json({ message: 'Receipt generated.', data: { receiptId: `AETHER-${purchase.id}`, purchase } });
});

app.get('/api/library', authRequired, (req, res) => {
  const ownedGameIds = purchases
    .filter(item => item.userId === req.user.id && item.status === 'paid')
    .flatMap(item => item.items.map(row => row.gameId));
  const data = [...new Set(ownedGameIds)].map(gameId => ({
    game: gameView(games.find(game => game.id === gameId), req.user.id),
    status: 'available',
    downloadUrl: `/api/library/${gameId}/download`
  }));
  res.json({ data });
});

app.get('/api/library/:gameId/download', authRequired, (req, res) => {
  const ownsGame = purchases.some(item => item.userId === req.user.id && item.items.some(row => row.gameId === Number(req.params.gameId)));
  if (!ownsGame) return res.status(403).json({ message: 'You do not own this game.' });
  res.json({ message: 'Download link generated.', data: { url: `https://downloads.aether.local/games/${req.params.gameId}` } });
});

app.get('/api/users/me', authRequired, (req, res) => {
  const userPurchases = purchases.filter(item => item.userId === req.user.id);
  const accountValue = Number(userPurchases.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  res.json({ data: { ...publicUser(req.user), accountValue, purchasesCount: userPurchases.length } });
});

app.put('/api/users/me', authRequired, (req, res) => {
  const { displayName, bio, email } = req.body;
  const errors = [];

  if (displayName !== undefined && (String(displayName).trim().length < 2 || String(displayName).trim().length > 80)) {
    errors.push({ field: 'displayName', message: 'Display name must be between 2 and 80 characters.' });
  }
  if (bio !== undefined && String(bio).length > 300) {
    errors.push({ field: 'bio', message: 'Bio must be 300 characters or less.' });
  }
  if (email !== undefined) {
    if (!validateEmail(email)) errors.push({ field: 'email', message: 'Please enter a valid email address.' });
    if (users.some(user => user.id !== req.user.id && normalize(user.email) === normalize(email))) {
      errors.push({ field: 'email', message: 'Email already exists.' });
    }
  }

  if (errors.length) return res.status(422).json({ message: 'Validation error', errors });

  if (displayName !== undefined) req.user.displayName = String(displayName).trim();
  if (bio !== undefined) req.user.bio = String(bio).trim();
  if (email !== undefined) req.user.email = String(email).trim().toLowerCase();

  res.json({ message: 'Profile updated.', data: publicUser(req.user) });
});

app.put('/api/users/me/avatar', authRequired, (req, res) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl || String(avatarUrl).trim().length > 255) {
    return res.status(422).json({ message: 'A valid avatar URL is required for this starter.' });
  }
  req.user.avatarUrl = String(avatarUrl).trim();
  res.json({ message: 'Avatar updated.', data: publicUser(req.user) });
});

app.get('/api/users/me/purchases', authRequired, (req, res) => {
  res.json({ data: purchases.filter(item => item.userId === req.user.id) });
});

app.get('/api/users/me/wishlist', authRequired, (req, res) => {
  const data = wishlist.filter(item => item.userId === req.user.id).map(item => gameView(games.find(game => game.id === item.gameId), req.user.id));
  res.json({ data });
});

app.get('/api/users/me/reviews', authRequired, (_req, res) => {
  res.json({ data: [] });
});

app.get('/api/users/me/transactions', authRequired, (req, res) => {
  res.json({ data: purchases.filter(item => item.userId === req.user.id) });
});

app.post('/api/users/me/delete-request', authRequired, (req, res) => {
  req.user.status = 'pending_deletion';
  res.json({ message: 'Account deletion request registered.' });
});

app.get('/api/notifications', authRequired, (req, res) => {
  res.json({ data: notifications.filter(item => item.userId === req.user.id) });
});

app.put('/api/notifications/:id/read', authRequired, (req, res) => {
  const notification = notifications.find(item => item.id === Number(req.params.id) && item.userId === req.user.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  notification.isRead = true;
  res.json({ message: 'Notification marked as read.', data: notification });
});

app.get('/api/admin/stats', authRequired, adminOnly, (_req, res) => {
  const totalRevenue = Number(purchases.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  res.json({
    data: {
      totalUsers: users.length,
      totalSales: totalRevenue,
      activeGames: games.filter(game => game.status === 'active').length,
      lowStockGames: games.filter(game => game.stock <= 5).length,
      totalPurchases: purchases.length
    }
  });
});

app.get('/api/admin/games', authRequired, adminOnly, (req, res) => {
  const search = normalize(req.query.search || '');
  const status = req.query.status;
  let filtered = games;
  if (search) filtered = filtered.filter(game => normalize(game.title).includes(search));
  if (status) filtered = filtered.filter(game => game.status === status);
  res.json({ data: filtered.map(game => gameView(game, req.user.id)) });
});

app.post('/api/admin/games', authRequired, adminOnly, (req, res) => {
  const errors = assertRequired(req.body, ['title', 'shortDescription', 'description', 'price', 'stock', 'developer', 'publisher', 'releaseDate', 'esrbRating', 'status']);
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);

  if (games.some(game => normalize(game.title) === normalize(req.body.title))) {
    errors.push({ field: 'title', message: 'Game title already exists.' });
  }
  if (Number.isNaN(price) || price < 0) errors.push({ field: 'price', message: 'Price must be zero or greater.' });
  if (!Number.isInteger(stock) || stock < 0) errors.push({ field: 'stock', message: 'Stock must be an integer zero or greater.' });
  if (errors.length) return res.status(422).json({ message: 'Validation error', errors });

  const game = {
    id: nextId(games),
    title: req.body.title.trim(),
    slug: normalize(req.body.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    shortDescription: req.body.shortDescription.trim(),
    description: req.body.description.trim(),
    price,
    discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : null,
    stock,
    developer: req.body.developer.trim(),
    publisher: req.body.publisher.trim(),
    releaseDate: req.body.releaseDate,
    esrbRating: req.body.esrbRating,
    status: req.body.status,
    commercialBadge: req.body.commercialBadge || 'new',
    rating: Number(req.body.rating || 0),
    reviewsCount: 0,
    categoryId: Number(req.body.categoryId || 1),
    genreIds: req.body.genreIds?.length ? req.body.genreIds.map(Number) : [1],
    platformIds: req.body.platformIds?.length ? req.body.platformIds.map(Number) : [1],
    coverImageUrl: req.body.coverImageUrl || 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=1200&auto=format&fit=crop',
    media: [],
    features: [],
    systemRequirements: {}
  };

  games.push(game);
  adminActivity.unshift({ id: nextId(adminActivity), adminId: req.user.id, action: 'Created game', entityType: 'game', entityId: game.id, createdAt: new Date().toISOString() });
  res.status(201).json({ message: 'Game created.', data: gameView(game, req.user.id) });
});

app.put('/api/admin/games/:id', authRequired, adminOnly, (req, res) => {
  const game = games.find(item => item.id === Number(req.params.id));
  if (!game) return res.status(404).json({ message: 'Game not found.' });

  const editable = ['title', 'shortDescription', 'description', 'price', 'discountPrice', 'stock', 'developer', 'publisher', 'releaseDate', 'esrbRating', 'status', 'commercialBadge', 'rating', 'coverImageUrl'];
  for (const key of editable) {
    if (req.body[key] !== undefined) game[key] = ['price', 'discountPrice', 'rating'].includes(key) ? Number(req.body[key]) : req.body[key];
  }
  if (req.body.genreIds) game.genreIds = req.body.genreIds.map(Number);
  if (req.body.platformIds) game.platformIds = req.body.platformIds.map(Number);

  adminActivity.unshift({ id: nextId(adminActivity), adminId: req.user.id, action: 'Updated game', entityType: 'game', entityId: game.id, createdAt: new Date().toISOString() });
  res.json({ message: 'Game updated.', data: gameView(game, req.user.id) });
});

app.delete('/api/admin/games/:id', authRequired, adminOnly, (req, res) => {
  const game = games.find(item => item.id === Number(req.params.id));
  if (!game) return res.status(404).json({ message: 'Game not found.' });
  game.status = 'archived';
  adminActivity.unshift({ id: nextId(adminActivity), adminId: req.user.id, action: 'Archived game', entityType: 'game', entityId: game.id, createdAt: new Date().toISOString() });
  res.json({ message: 'Game archived.', data: gameView(game, req.user.id) });
});

app.get('/api/admin/users', authRequired, adminOnly, (_req, res) => {
  res.json({ data: users.map(publicUser) });
});

app.put('/api/admin/users/:id', authRequired, adminOnly, (req, res) => {
  const user = users.find(item => item.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (req.body.role) user.role = req.body.role;
  if (req.body.status) user.status = req.body.status;
  if (req.body.displayName) user.displayName = req.body.displayName;
  res.json({ message: 'User updated.', data: publicUser(user) });
});

app.delete('/api/admin/users/:id', authRequired, adminOnly, (req, res) => {
  const user = users.find(item => item.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.id === req.user.id) return res.status(409).json({ message: 'You cannot disable your own admin account.' });
  user.status = 'disabled';
  res.json({ message: 'User disabled.', data: publicUser(user) });
});

app.get('/api/admin/categories', authRequired, adminOnly, (_req, res) => {
  res.json({ data: categories });
});

app.get('/api/admin/activity', authRequired, adminOnly, (_req, res) => {
  res.json({ data: adminActivity.slice(0, 20) });
});

app.get('/api/admin/reports/sales', authRequired, adminOnly, (_req, res) => {
  res.json({ message: 'Sales report generated.', data: purchases });
});

app.get('/api/system/status', (_req, res) => {
  res.json({ status: 'online', message: 'All systems operational.', estimatedUptime: null });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aether Gaming Flow Starter running at http://localhost:${PORT}`);
});
