import bcrypt from 'bcryptjs';

export const users = [
  {
    id: 1,
    username: 'admin',
    displayName: 'Aether Admin',
    email: 'admin@aether.dev',
    passwordHash: bcrypt.hashSync('Admin1234', 10),
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=admin',
    bio: 'System operator for Aether Gaming.',
    membership: 'pro',
    joinedAt: '2025-11-20T10:00:00.000Z'
  },
  {
    id: 2,
    username: 'alexvance',
    displayName: 'Alex Vance',
    email: 'alex@aether.dev',
    passwordHash: bcrypt.hashSync('Player1234', 10),
    role: 'customer',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=alex',
    bio: 'Cyberpunk RPG enjoyer. Collector of neon worlds.',
    membership: 'free',
    joinedAt: '2026-01-12T14:30:00.000Z'
  }
];

export const genres = [
  { id: 1, name: 'Action RPG', status: 'active' },
  { id: 2, name: 'Sci-Fi', status: 'active' },
  { id: 3, name: 'Cyberpunk', status: 'active' },
  { id: 4, name: 'Strategy', status: 'active' },
  { id: 5, name: 'Indie', status: 'active' },
  { id: 6, name: 'Racing', status: 'active' }
];

export const platforms = [
  { id: 1, name: 'PC', status: 'active' },
  { id: 2, name: 'PS5', status: 'active' },
  { id: 3, name: 'Xbox', status: 'active' },
  { id: 4, name: 'Next-Gen', status: 'active' }
];

export const categories = [
  { id: 1, name: 'Premium', description: 'Top marketplace games.', status: 'active' },
  { id: 2, name: 'New Releases', description: 'Recently launched games.', status: 'active' },
  { id: 3, name: 'Deals', description: 'Discounted games.', status: 'active' }
];

export const games = [
  {
    id: 1,
    title: 'Neon Syndicate',
    slug: 'neon-syndicate',
    shortDescription: 'Rule the underground in a neon-drenched cyberpunk city.',
    description: 'Assemble your crew, upgrade your cybernetic abilities and dominate the criminal networks of a city that never sleeps.',
    price: 59.99,
    discountPrice: 47.99,
    stock: 25,
    developer: 'NeonCore Studios',
    publisher: 'Aether Interactive',
    releaseDate: '2026-02-20',
    esrbRating: 'M',
    status: 'active',
    commercialBadge: 'sale',
    rating: 4.9,
    reviewsCount: 12840,
    categoryId: 1,
    genreIds: [1, 2, 3],
    platformIds: [1, 2],
    coverImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop' }
    ],
    features: [
      'Branching faction system',
      'Upgradeable cybernetic loadouts',
      'Co-op missions and PvP arenas'
    ],
    systemRequirements: {
      os: 'Windows 11 64-bit',
      processor: 'Intel Core i7 / Ryzen 7',
      memory: '16 GB RAM',
      graphics: 'RTX 3060 / RX 6700 XT',
      storage: '85 GB SSD'
    }
  },
  {
    id: 2,
    title: 'Cyber Protocol',
    slug: 'cyber-protocol',
    shortDescription: 'Hack, fight and survive inside a collapsing megacity network.',
    description: 'Cyber Protocol blends fast combat, stealth hacking and RPG progression inside a reactive open world.',
    price: 59.99,
    discountPrice: null,
    stock: 40,
    developer: 'Quantum Forge',
    publisher: 'Aether Interactive',
    releaseDate: '2024-10-24',
    esrbRating: 'T',
    status: 'active',
    commercialBadge: 'new_release',
    rating: 4.8,
    reviewsCount: 12000,
    categoryId: 2,
    genreIds: [1, 2, 3],
    platformIds: [1, 4],
    coverImageUrl: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=1200&auto=format&fit=crop',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=1200&auto=format&fit=crop' }
    ],
    features: ['Dynamic combat system', 'Living city simulation', 'Deep skill customization'],
    systemRequirements: {
      os: 'Windows 11 64-bit',
      processor: 'Intel Core i7-12700K / AMD Ryzen 7 5800X',
      memory: '32 GB RAM',
      graphics: 'NVIDIA RTX 4070 / AMD RX 7800 XT',
      storage: '150 GB SSD'
    }
  },
  {
    id: 3,
    title: 'Stellar Drift',
    slug: 'stellar-drift',
    shortDescription: 'Anti-gravity racing across orbital megastructures.',
    description: 'Master high-speed tracks, unlock ships and compete in seasonal tournaments across deep-space stations.',
    price: 39.99,
    discountPrice: null,
    stock: 18,
    developer: 'ArcLight Labs',
    publisher: 'Vanguard Media',
    releaseDate: '2025-08-14',
    esrbRating: 'E10+',
    status: 'active',
    commercialBadge: 'exclusive',
    rating: 4.6,
    reviewsCount: 4982,
    categoryId: 1,
    genreIds: [2, 6],
    platformIds: [1, 2, 3],
    coverImageUrl: 'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=1200&auto=format&fit=crop',
    media: [],
    features: ['Anti-gravity vehicles', 'Online leaderboards', 'Track editor'],
    systemRequirements: {
      os: 'Windows 10 64-bit',
      processor: 'Intel Core i5 / Ryzen 5',
      memory: '8 GB RAM',
      graphics: 'GTX 1660 / RX 580',
      storage: '45 GB SSD'
    }
  },
  {
    id: 4,
    title: 'Aether Tactics',
    slug: 'aether-tactics',
    shortDescription: 'Turn-based strategy in a fractured sci-fi empire.',
    description: 'Command elite squads, negotiate alliances and control territory through tactical missions.',
    price: 29.99,
    discountPrice: 19.99,
    stock: 0,
    developer: 'HexGrid Works',
    publisher: 'Aether Interactive',
    releaseDate: '2023-12-02',
    esrbRating: 'T',
    status: 'active',
    commercialBadge: 'sale',
    rating: 4.4,
    reviewsCount: 2310,
    categoryId: 3,
    genreIds: [2, 4, 5],
    platformIds: [1],
    coverImageUrl: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?q=80&w=1200&auto=format&fit=crop',
    media: [],
    features: ['Campaign choices', 'Squad permadeath option', 'Faction diplomacy'],
    systemRequirements: {
      os: 'Windows 10 64-bit',
      processor: 'Intel Core i5',
      memory: '8 GB RAM',
      graphics: 'GTX 1050',
      storage: '25 GB SSD'
    }
  }
];

export const carts = [
  {
    id: 1,
    userId: 2,
    status: 'active',
    promoCode: null,
    items: [
      { id: 1, gameId: 1, quantity: 1, unitPrice: 59.99, discountPrice: 47.99 },
      { id: 2, gameId: 3, quantity: 1, unitPrice: 39.99, discountPrice: null }
    ]
  }
];

export const wishlist = [
  { id: 1, userId: 2, gameId: 2, createdAt: '2026-06-25T09:00:00.000Z' }
];

export const purchases = [
  {
    id: 1,
    userId: 2,
    subtotal: 59.99,
    discountTotal: 0,
    taxTotal: 4.20,
    total: 64.19,
    status: 'paid',
    purchasedAt: '2026-06-30T18:30:00.000Z',
    items: [{ gameId: 2, titleSnapshot: 'Cyber Protocol', quantity: 1, unitPrice: 59.99, subtotal: 59.99 }]
  }
];

export const promoCodes = [
  { id: 1, code: 'AETHER20', type: 'percentage', value: 20, status: 'active', maxUses: 100, currentUses: 0 },
  { id: 2, code: 'NEON10', type: 'fixed', value: 10, status: 'active', maxUses: 50, currentUses: 0 }
];

export const notifications = [
  { id: 1, userId: 2, title: 'Wishlist deal', message: 'Cyber Protocol is trending this week.', type: 'promo', isRead: false, createdAt: '2026-07-01T10:00:00.000Z' },
  { id: 2, userId: 1, title: 'Server Alert', message: 'High traffic detected in marketplace API.', type: 'alert', isRead: false, createdAt: '2026-07-01T11:00:00.000Z' }
];

export const adminActivity = [
  { id: 1, adminId: 1, action: 'Created game', entityType: 'game', entityId: 2, createdAt: '2026-06-29T13:00:00.000Z' },
  { id: 2, adminId: 1, action: 'Updated stock', entityType: 'game', entityId: 1, createdAt: '2026-06-30T08:15:00.000Z' }
];

export function nextId(collection) {
  return collection.length ? Math.max(...collection.map(item => item.id)) + 1 : 1;
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function gameView(game, userId = null) {
  if (!game) return null;
  const category = categories.find(item => item.id === game.categoryId);
  const gameGenres = genres.filter(item => game.genreIds.includes(item.id));
  const gamePlatforms = platforms.filter(item => game.platformIds.includes(item.id));
  const isWishlisted = userId ? wishlist.some(item => item.userId === userId && item.gameId === game.id) : false;

  return {
    ...game,
    category,
    genres: gameGenres,
    platforms: gamePlatforms,
    finalPrice: game.discountPrice ?? game.price,
    isWishlisted
  };
}

export function getActiveCart(userId) {
  let cart = carts.find(item => item.userId === userId && item.status === 'active');
  if (!cart) {
    cart = { id: nextId(carts), userId, status: 'active', promoCode: null, items: [] };
    carts.push(cart);
  }
  return cart;
}

export function cartView(cart) {
  const items = cart.items.map(item => {
    const game = games.find(row => row.id === item.gameId);
    const price = item.discountPrice ?? item.unitPrice;
    return {
      ...item,
      game: gameView(game),
      subtotal: Number((price * item.quantity).toFixed(2))
    };
  });

  const subtotal = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  let promoDiscount = 0;

  if (cart.promoCode) {
    const promo = promoCodes.find(item => item.code === cart.promoCode);
    if (promo?.type === 'percentage') promoDiscount = Number((subtotal * (promo.value / 100)).toFixed(2));
    if (promo?.type === 'fixed') promoDiscount = Math.min(promo.value, subtotal);
  }

  const estimatedTax = Number(((subtotal - promoDiscount) * 0.07).toFixed(2));
  const total = Number((subtotal - promoDiscount + estimatedTax).toFixed(2));

  return {
    id: cart.id,
    status: cart.status,
    promoCode: cart.promoCode,
    items,
    summary: { subtotal, discountTotal: promoDiscount, estimatedTax, total }
  };
}
