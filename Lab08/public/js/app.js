const state = {
  user: JSON.parse(localStorage.getItem('aether_user') || 'null'),
  token: localStorage.getItem('aether_token'),
  lastGames: [],
  adminGames: [],
  filters: {},
  profileTab: 'purchases'
};

const routes = {
  home: '/',
  auth: '/auth',
  catalog: '/catalog',
  cart: '/cart',
  profile: '/profile',
  admin: '/admin',
  maintenance: '/maintenance',
  library: '/library',
  settings: '/settings',
  support: '/support',
  checkout: '/checkout',
  upgrade: '/upgrade'
};

function saveSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('aether_user', JSON.stringify(user));
  localStorage.setItem('aether_token', token);
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('aether_user');
  localStorage.removeItem('aether_token');
}

function toast(message, type = 'info') {
  const box = document.getElementById('toast');
  box.textContent = message;
  box.className = `toast ${type}`;
  setTimeout(() => box.classList.add('hidden'), 3200);
}

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? { ...(options.headers || {}) } : { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.errors?.[0]?.message || data.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function navTo(path) {
  window.location.hash = path;
}

function currentPath() {
  return window.location.hash.replace('#', '') || '/';
}

function appShell(content) {
  const path = currentPath();
  const isAdmin = state.user?.role === 'admin';
  const isLogged = Boolean(state.user);

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#/">
          <span class="brand-mark material-symbols-outlined">stadia_controller</span>
          <span>Aether<br/>Gaming</span>
        </a>

        <div class="nav-title">Marketplace</div>
        <nav class="nav-group">
          ${navItem('/', 'home', 'Browse', path)}
          ${navItem('/catalog', 'sports_esports', 'Store', path)}
          ${navItem('/library', 'inventory_2', 'Library', path, !isLogged)}
          ${navItem('/cart', 'shopping_cart', 'Cart', path, !isLogged)}
        </nav>

        <div class="nav-title">Account</div>
        <nav class="nav-group">
          ${isLogged ? navItem('/profile', 'person', 'Profile', path) : navItem('/auth', 'login', 'Login / Register', path)}
          ${isAdmin ? navItem('/admin', 'admin_panel_settings', 'Admin', path) : ''}
          ${isLogged ? navItem('/settings', 'settings', 'Settings', path) : ''}
          ${navItem('/maintenance', 'settings_alert', 'System Status', path)}
          ${navItem('/support', 'support_agent', 'Support', path)}
        </nav>

        <div class="pro-card">
          <span class="badge green">${state.user?.membership === 'pro' ? 'PRO ACTIVE' : 'UPGRADE'}</span>
          <h3 style="margin:12px 0 8px">Aether Pro</h3>
          <p class="muted">Deals, cloud saves and early access.</p>
          <a class="primary-btn" style="width:100%" href="#/upgrade">Upgrade to Pro</a>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input id="globalSearch" placeholder="Search games, genres, studios..." onkeydown="handleGlobalSearch(event)" />
          </div>
          <a class="ghost-btn" href="#/catalog">Store</a>
          <a class="ghost-btn" href="#/library">Library</a>
          <button class="icon-btn" onclick="loadNotifications()"><span class="material-symbols-outlined">notifications</span></button>
          ${isLogged ? `<button class="ghost-btn" onclick="logout()">Logout</button><img class="avatar" src="${state.user.avatarUrl}" alt="avatar"/>` : `<a class="primary-btn" href="#/auth">Login</a>`}
        </header>
        <section class="content">${content}</section>
        <footer class="footer">
          <div class="footer-links">
            <a href="#/catalog">Store</a>
            <a href="#/maintenance">System status</a>
            <a class="nav-link" href="#/legal/privacy">Privacy Policy</a>
            <a class="nav-link" href="#/legal/terms">Terms</a>
            <a class="nav-link" href="#/payments">Payment Methods</a>
          </div>
        </footer>
      </main>
    </div>
  `;
}

function navItem(path, icon, label, current, disabled = false) {
  if (disabled) {
    return `<button class="nav-link" onclick="requireLogin()"><span class="material-symbols-outlined">${icon}</span>${label}</button>`;
  }
  return `<a class="nav-link ${current === path ? 'active' : ''}" href="#${path}"><span class="material-symbols-outlined">${icon}</span>${label}</a>`;
}

function skeletonPage() {
  return appShell(`
    <div class="grid">
      <div class="skeleton" style="height:430px"></div>
      <div class="grid grid-4">
        <div class="skeleton" style="height:260px"></div>
        <div class="skeleton" style="height:260px"></div>
        <div class="skeleton" style="height:260px"></div>
        <div class="skeleton" style="height:260px"></div>
      </div>
    </div>
  `);
}

async function render() {
  const app = document.getElementById('app');
  app.innerHTML = skeletonPage();

  const path = currentPath();

  try {
    if (path === '/') return renderHome();
    if (path === '/auth') return renderAuth();
    if (path.startsWith('/catalog')) return renderCatalog();
    if (path.startsWith('/games/')) return renderDetails(Number(path.split('/')[2]));
    if (path === '/cart') return requireAuth(renderCart);
    if (path === '/checkout') return requireAuth(renderCheckout);
    if (path === '/profile') return requireAuth(renderProfile);
    if (path === '/library') return requireAuth(renderLibrary);
    if (path === '/settings') return requireAuth(renderSettings);
    if (path === '/support') return renderSupport();
    if (path === '/upgrade') return requireAuth(renderUpgrade);
    if (path === '/legal/privacy') return renderLegal('privacy');
    if (path === '/legal/terms') return renderLegal('terms');
    if (path === '/payments') return renderPayments();
    if (path === '/admin') return requireAdmin(renderAdmin);
    if (path === '/admin/users') return requireAdmin(renderAdminUsers);
    if (path === '/admin/categories') return requireAdmin(renderAdminCategories);
    if (path === '/admin/activity') return requireAdmin(renderAdminActivity);
    if (path === '/maintenance') return renderMaintenance();
    return render404();
  } catch (error) {
    app.innerHTML = appShell(`<div class="error-state"><span class="material-symbols-outlined">error</span><h2>Flow error</h2><p class="muted">${error.message}</p></div>`);
  }
}

async function requireAuth(handler) {
  if (!state.user || !state.token) {
    toast('Debes iniciar sesión para continuar.');
    navTo('/auth');
    return;
  }
  return handler();
}

async function requireAdmin(handler) {
  if (!state.user || !state.token) {
    toast('Debes iniciar sesión como administrador.');
    navTo('/auth');
    return;
  }
  if (state.user.role !== 'admin') {
    document.getElementById('app').innerHTML = appShell(`<div class="error-state"><span class="material-symbols-outlined">lock</span><h2>Access denied</h2><p class="muted">Esta pantalla requiere rol administrador.</p><a class="primary-btn" href="#/">Return to Home</a></div>`);
    return;
  }
  return handler();
}

async function renderHome() {
  const { hero, featured, stats } = await api('/api/home');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <article class="card hero">
        <img src="${hero.coverImageUrl}" alt="${hero.title}">
        <div style="max-width:700px">
          <div class="kicker">Premium Marketplace</div>
          <h1>${hero.title}</h1>
          <p class="muted" style="font-size:18px; max-width:620px">${hero.shortDescription}</p>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:24px">
            <button class="primary-btn" onclick="addToCart(${hero.id})"><span class="material-symbols-outlined">shopping_cart</span>Buy Now ${money(hero.finalPrice)}</button>
            <button class="ghost-btn" onclick="toggleWishlist(${hero.id}, ${hero.isWishlisted})"><span class="material-symbols-outlined">favorite</span>${hero.isWishlisted ? 'Wishlisted' : 'Wishlist'}</button>
            <a class="ghost-btn" href="#/games/${hero.id}">View Details</a>
          </div>
        </div>
      </article>

      <div class="grid grid-3">
        <div class="card pad"><span class="badge green">LIVE</span><h2>${stats.activeGames}</h2><p class="muted">Active games</p></div>
        <div class="card pad"><span class="badge">ONLINE</span><h2>${stats.playersOnline.toLocaleString()}</h2><p class="muted">Players online</p></div>
        <div class="card pad"><span class="badge yellow">DEALS</span><h2>${stats.deals}</h2><p class="muted">Discounted titles</p></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap">
        <div><div class="kicker">Featured Games</div><h2>Hot releases</h2></div>
        <a class="ghost-btn" href="#/catalog">Browse All</a>
      </div>
      <div class="grid grid-4">${featured.map(gameCard).join('')}</div>
    </div>
  `);
}

function gameCard(game) {
  const price = game.discountPrice
    ? `<span class="muted" style="text-decoration:line-through">${money(game.price)}</span> <span class="price">${money(game.discountPrice)}</span>`
    : `<span class="price">${money(game.price)}</span>`;

  return `
    <article class="card game-card">
      <a href="#/games/${game.id}"><img src="${game.coverImageUrl}" alt="${game.title}"></a>
      <div class="game-card-body">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:start">
          <div>
            <span class="badge">${game.commercialBadge?.replace('_', ' ') || 'game'}</span>
            <h3 style="margin:10px 0 6px">${game.title}</h3>
            <p class="muted">${game.shortDescription}</p>
          </div>
          <button class="icon-btn" onclick="toggleWishlist(${game.id}, ${Boolean(game.isWishlisted)})"><span class="material-symbols-outlined">${game.isWishlisted ? 'heart_check' : 'favorite'}</span></button>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center">
          <span>⭐ ${game.rating}</span>
          <span>${price}</span>
        </div>
        <div class="game-card-actions">
          <button class="primary-btn" style="flex:1" onclick="addToCart(${game.id})">Add to Cart</button>
          <a class="ghost-btn" href="#/games/${game.id}">Details</a>
        </div>
      </div>
    </article>
  `;
}

async function renderCatalog() {
  const params = new URLSearchParams(sessionStorage.getItem('catalogQuery') || '');
  const data = await api(`/api/games?${params.toString()}`);
  state.lastGames = data.data;

  document.getElementById('app').innerHTML = appShell(`
    <div class="grid" style="grid-template-columns:300px 1fr">
      <aside class="card pad filters">
        <div class="kicker">Filters</div>
        <h2>Catalog</h2>
        <div class="form-control">
          <label>Keyword</label>
          <input class="input" id="filterSearch" value="${params.get('search') || ''}" placeholder="Neon, RPG, studio...">
        </div>
        <div class="form-control">
          <label>Genre</label>
          <select id="filterGenre">
            <option value="">All genres</option>
            ${data.filters.genres.map(g => `<option ${params.get('genre') === g.name ? 'selected' : ''}>${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-control">
          <label>Platform</label>
          <select id="filterPlatform">
            <option value="">All platforms</option>
            ${data.filters.platforms.map(p => `<option ${params.get('platform') === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-control">
          <label>Max Price</label>
          <input class="input" id="filterMaxPrice" type="number" min="0" value="${params.get('maxPrice') || ''}" placeholder="60">
        </div>
        <div class="form-control">
          <label>Sort</label>
          <select id="filterSort">
            ${sortOption('relevance', 'Relevance', params)}
            ${sortOption('release_desc', 'Release Date Newest', params)}
            ${sortOption('price_asc', 'Price Low to High', params)}
            ${sortOption('price_desc', 'Price High to Low', params)}
            ${sortOption('rating_desc', 'User Rating', params)}
          </select>
        </div>
        <div style="display:grid; gap:10px">
          <button class="primary-btn" onclick="applyCatalogFilters()">Apply Filters</button>
          <button class="ghost-btn" onclick="resetCatalogFilters()">Reset Filters</button>
        </div>
      </aside>

      <section class="grid">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap">
          <div><div class="kicker">${data.pagination.total} results</div><h2>Browse Marketplace</h2></div>
          <span class="muted">Page ${data.pagination.page} of ${Math.max(data.pagination.totalPages, 1)}</span>
        </div>
        ${data.data.length ? `<div class="grid grid-3">${data.data.map(gameCard).join('')}</div>` : emptyState('search_off', 'No games found', 'Try another keyword or reset filters.')}
        <div style="display:flex; justify-content:center; gap:10px">
          <button class="ghost-btn" onclick="changePage(${Math.max(data.pagination.page - 1, 1)})">Previous</button>
          <button class="ghost-btn" onclick="changePage(${data.pagination.page + 1})">Next</button>
        </div>
      </section>
    </div>
  `);
}

function sortOption(value, label, params) {
  return `<option value="${value}" ${params.get('sort') === value ? 'selected' : ''}>${label}</option>`;
}

async function renderDetails(id) {
  const { data: game } = await api(`/api/games/${id}`);
  const { data: related } = await api(`/api/games/${id}/related`);

  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <section class="details-hero">
        <img src="${game.coverImageUrl}" alt="${game.title}">
        <div class="card pad">
          <span class="badge">${game.commercialBadge?.replace('_', ' ')}</span>
          <h1 style="font-size:54px">${game.title}</h1>
          <p class="muted">${game.description}</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin:18px 0">
            ${game.genres.map(g => `<span class="badge green">${g.name}</span>`).join('')}
            ${game.platforms.map(p => `<span class="badge">${p.name}</span>`).join('')}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin:22px 0">
            <span>⭐ ${game.rating} (${game.reviewsCount.toLocaleString()} reviews)</span>
            <span class="price">${money(game.finalPrice)}</span>
          </div>
          <div style="display:flex; gap:12px; flex-wrap:wrap">
            <button class="primary-btn" onclick="addToCart(${game.id})">Add to Cart</button>
            <button class="ghost-btn" onclick="toggleWishlist(${game.id}, ${game.isWishlisted})">${game.isWishlisted ? 'Remove Wishlist' : 'Wishlist'}</button>
          </div>
        </div>
      </section>

      <div class="grid grid-2">
        <div class="card pad">
          <div class="kicker">Game Info</div>
          <h2>Details</h2>
          <div class="info-list">
            ${infoRow('Developer', game.developer)}
            ${infoRow('Publisher', game.publisher)}
            ${infoRow('Release Date', game.releaseDate)}
            ${infoRow('ESRB', game.esrbRating)}
            ${infoRow('Stock', game.stock > 0 ? `${game.stock} available` : 'Out of stock')}
          </div>
        </div>
        <div class="card pad">
          <div class="kicker">System Requirements</div>
          <h2>Recommended</h2>
          <div class="info-list">
            ${Object.entries(game.systemRequirements || {}).map(([key, value]) => infoRow(key, value)).join('')}
          </div>
        </div>
      </div>

      <div class="card pad">
        <div class="kicker">Key Features</div>
        <h2>Why play it?</h2>
        <div class="grid grid-3">${game.features.map(f => `<div class="card pad"><span class="material-symbols-outlined">bolt</span><h3>${f}</h3></div>`).join('')}</div>
      </div>

      <div>
        <div class="kicker">More Like This</div>
        <h2>Related games</h2>
        <div class="grid grid-3">${related.map(gameCard).join('')}</div>
      </div>
    </div>
  `);
}

function infoRow(label, value) {
  return `<div class="info-row"><span class="muted">${label}</span><strong>${value || '-'}</strong></div>`;
}

function renderAuth() {
  document.getElementById('app').innerHTML = `
    <main style="min-height:100vh; display:grid; place-items:center; padding:28px">
      <section class="card pad" style="width:min(980px, 100%); display:grid; grid-template-columns:1fr 1fr; gap:28px">
        <div style="padding:24px; display:flex; flex-direction:column; justify-content:space-between; min-height:560px; background:linear-gradient(135deg, rgba(255,79,119,.24), rgba(107,220,150,.09)); border-radius:22px">
          <a class="brand" href="#/"><span class="brand-mark material-symbols-outlined">stadia_controller</span><span>Aether Gaming</span></a>
          <div>
            <div class="kicker">Secure Gateway</div>
            <h1 style="font-size:52px">Initiate Link</h1>
            <p class="muted">Login como cliente o admin para probar rutas protegidas, carrito, perfil y dashboard.</p>
          </div>
          <div class="grid">
            <button class="ghost-btn" onclick="quickLogin('alex@aether.dev','Player1234')">Cliente demo</button>
            <button class="ghost-btn" onclick="quickLogin('admin@aether.dev','Admin1234')">Admin demo</button>
          </div>
        </div>

        <div>
          <div class="tabs">
            <button class="tab active" id="loginTab" onclick="setAuthMode('login')">Login</button>
            <button class="tab" id="registerTab" onclick="setAuthMode('register')">Register</button>
          </div>
          <form id="loginForm" onsubmit="submitLogin(event)">
            <div class="form-control"><label>Email</label><input class="input" name="email" value="alex@aether.dev" placeholder="commander@aether.net"></div>
            <div class="form-control"><label>Password</label><input class="input" name="password" type="password" value="Player1234"></div>
            <label class="checkbox-row"><input type="checkbox" name="rememberMe"> Remember me</label>
            <button class="primary-btn" style="width:100%">Initiate Link</button>
            <button type="button" class="ghost-btn" style="width:100%; margin-top:10px" onclick="forgotPassword()">Forgot password</button>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px">
              <button type="button" class="ghost-btn" onclick="toast('OAuth Google requiere credenciales externas; para la evaluación usa login JWT demo.')">Google</button>
              <button type="button" class="ghost-btn" onclick="toast('OAuth GitHub requiere credenciales externas; para la evaluación usa login JWT demo.')">GitHub</button>
            </div>
          </form>
          <form id="registerForm" class="hidden" onsubmit="submitRegister(event)">
            <div class="form-control"><label>Username</label><input class="input" name="username" placeholder="PlayerOne"></div>
            <div class="form-control"><label>Email</label><input class="input" name="email" placeholder="player@aether.net"></div>
            <div class="form-control"><label>Password</label><input class="input" name="password" type="password" placeholder="Min 8 characters"></div>
            <button class="primary-btn" style="width:100%">Create Account</button>
          </form>
        </div>
      </section>
    </main>
  `;
}

async function renderCart() {
  const { data: cart } = await api('/api/cart');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid" style="grid-template-columns:1fr 360px">
      <section class="grid">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap">
          <div><div class="kicker">Shopping Cart</div><h2>Ready for checkout?</h2></div>
          <a class="ghost-btn" href="#/catalog">Return to Store</a>
        </div>
        ${cart.items.length ? cart.items.map(cartItem).join('') : emptyState('shopping_cart_off', 'Your cart is empty', 'Add some games from the catalog.')}
      </section>
      <aside class="card pad filters">
        <div class="kicker">Order Summary</div>
        <h2>Total</h2>
        <div class="form-control">
          <label>Promo Code</label>
          <div style="display:flex; gap:8px"><input class="input" id="promoCode" placeholder="AETHER20"><button class="ghost-btn" onclick="applyPromo()">Apply</button></div>
        </div>
        <div class="info-list">
          ${infoRow('Subtotal', money(cart.summary.subtotal))}
          ${infoRow('Discounts', `-${money(cart.summary.discountTotal)}`)}
          ${infoRow('Estimated Tax', money(cart.summary.estimatedTax))}
          ${infoRow('Total', money(cart.summary.total))}
        </div>
        <a class="primary-btn" style="width:100%; margin-top:20px" href="#/checkout">Proceed to Checkout</a>
        <p class="muted" style="margin-top:14px">Secure SSL Transaction · Visa · Mastercard · PayPal</p>
      </aside>
    </div>
  `);
}

function cartItem(item) {
  return `
    <article class="card cart-item">
      <a href="#/games/${item.game.id}"><img src="${item.game.coverImageUrl}" alt="${item.game.title}"></a>
      <div>
        <span class="badge">${item.game.platforms?.[0]?.name || 'Digital Download'}</span>
        <h3>${item.game.title}</h3>
        <p class="muted">Qty: ${item.quantity} · ${item.game.shortDescription}</p>
      </div>
      <div style="text-align:right">
        <div class="price">${money(item.subtotal)}</div>
        <button class="danger-btn" style="margin-top:10px" onclick="removeCartItem(${item.id})"><span class="material-symbols-outlined">delete</span></button>
      </div>
    </article>
  `;
}

async function renderProfile() {
  const { data: profile } = await api('/api/users/me');
  const purchases = await api('/api/users/me/purchases');
  const wishlistItems = await api('/api/users/me/wishlist');
  const reviews = await api('/api/users/me/reviews');

  const tabContent = state.profileTab === 'wishlist'
    ? `<div class="grid grid-3">${wishlistItems.data.map(gameCard).join('') || emptyState('favorite', 'No wishlist yet', 'Save your favorite games.')}</div>`
    : state.profileTab === 'reviews'
      ? `<div class="grid">${reviews.data.map(reviewCard).join('') || emptyState('rate_review', 'No reviews yet', 'Your game reviews will appear here.')}</div>`
      : `<div class="grid">${purchases.data.map(purchaseCard).join('') || emptyState('receipt_long', 'No purchases yet', 'Your purchase history will appear here.')}</div>`;

  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <section class="card pad" style="display:flex; align-items:center; gap:22px; flex-wrap:wrap">
        <img class="avatar" style="width:96px;height:96px" src="${profile.avatarUrl}" alt="avatar">
        <div style="flex:1">
          <div class="kicker">Profile</div>
          <h1 style="font-size:46px">${profile.displayName}</h1>
          <p class="muted">${profile.bio || 'No bio yet.'}</p>
          <span class="badge green">${profile.membership.toUpperCase()}</span>
        </div>
        <button class="primary-btn" onclick="openEditProfile()">Edit Profile</button>
        <button class="danger-btn" onclick="openDeleteModal()">Request Account Deletion</button>
      </section>

      <div class="grid grid-3">
        <div class="card pad"><span class="badge">Account Value</span><h2>${money(profile.accountValue)}</h2></div>
        <div class="card pad"><span class="badge">Purchases</span><h2>${profile.purchasesCount}</h2></div>
        <div class="card pad"><span class="badge">Reviews</span><h2>0</h2></div>
      </div>

      <section class="card pad">
        <div class="tabs">
          <button class="tab ${state.profileTab === 'purchases' ? 'active' : ''}" onclick="setProfileTab('purchases')">Purchase History</button>
          <button class="tab ${state.profileTab === 'wishlist' ? 'active' : ''}" onclick="setProfileTab('wishlist')">Wishlist</button>
          <button class="tab ${state.profileTab === 'reviews' ? 'active' : ''}" onclick="setProfileTab('reviews')">Reviews</button>
        </div>
        ${tabContent}
      </section>
    </div>
  `);
}

function purchaseCard(purchase) {
  return `
    <article class="card pad">
      <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap">
        <div><span class="badge green">${purchase.status}</span><h3>Purchase #${purchase.id}</h3><p class="muted">${new Date(purchase.purchasedAt).toLocaleString()}</p></div>
        <div style="text-align:right"><div class="price">${money(purchase.total)}</div><button class="ghost-btn" onclick="downloadReceipt(${purchase.id})">Download receipt</button></div>
      </div>
    </article>
  `;
}

async function renderLibrary() {
  const { data } = await api('/api/library');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div><div class="kicker">Library</div><h2>Your digital games</h2></div>
      ${data.length ? `<div class="grid grid-3">${data.map(item => `
        <article class="card game-card">
          <img src="${item.game.coverImageUrl}" alt="${item.game.title}">
          <div class="game-card-body"><span class="badge green">${item.status}</span><h3>${item.game.title}</h3><button class="primary-btn" onclick="downloadGame(${item.game.id})">Download</button></div>
        </article>
      `).join('')}</div>` : emptyState('inventory_2', 'Your library is empty', 'Purchased games will appear here.')}
    </div>
  `);
}

async function renderAdmin() {
  const stats = await api('/api/admin/stats');
  const gamesResponse = await api('/api/admin/games');
  state.adminGames = gamesResponse.data;
  const activity = await api('/api/admin/activity');

  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap">
        <div><div class="kicker">Admin Dashboard</div><h2>Operations Control</h2></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="ghost-btn" onclick="exportReport()">Export Report</button>
          <button class="primary-btn" onclick="openGameModal()">Add New Game</button>
        </div>
      </div>
      <div class="grid grid-4">
        ${statCard('Total Users', stats.data.totalUsers, 'group')}
        ${statCard('Total Sales', money(stats.data.totalSales), 'payments')}
        ${statCard('Active Games', stats.data.activeGames, 'sports_esports')}
        ${statCard('Low Stock', stats.data.lowStockGames, 'warning')}
      </div>
      <div class="grid grid-4">
        <a class="card pad action-card" href="#/admin/users"><span class="material-symbols-outlined">group</span><h3>Manage Users</h3><p class="muted">Roles and account status.</p></a>
        <a class="card pad action-card" href="#/admin/categories"><span class="material-symbols-outlined">category</span><h3>Categories</h3><p class="muted">Catalog classification.</p></a>
        <a class="card pad action-card" href="#/admin/activity"><span class="material-symbols-outlined">history</span><h3>Activity</h3><p class="muted">Audit trail.</p></a>
        <button class="card pad action-card" onclick="openGameModal()"><span class="material-symbols-outlined">add_circle</span><h3>New Game</h3><p class="muted">Create inventory item.</p></button>
      </div>
      <section class="card pad">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:18px">
          <div><span class="badge">Inventory</span><h3>Game Inventory</h3></div>
          <input class="input" id="adminSearch" style="max-width:360px" placeholder="Search games..." onkeydown="adminSearch(event)">
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Game</th><th>Status</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>${gamesResponse.data.map(adminGameRow).join('')}</tbody>
          </table>
        </div>
      </section>
      <section class="card pad">
        <div style="display:flex; justify-content:space-between"><div><span class="badge yellow">Server Alert</span><h3>Recent Activity</h3></div><a class="ghost-btn" href="#/admin/activity">View All</a></div>
        ${activity.data.map(row => `<p class="muted">${row.action} · ${row.entityType} #${row.entityId} · ${new Date(row.createdAt).toLocaleString()}</p>`).join('')}
      </section>
    </div>
  `);
}

function statCard(label, value, icon) {
  return `<div class="card pad"><span class="material-symbols-outlined">${icon}</span><p class="muted">${label}</p><h2>${value}</h2></div>`;
}

function adminGameRow(game) {
  return `
    <tr>
      <td><div class="table-game"><img src="${game.coverImageUrl}" alt="${game.title}"><div><strong>${game.title}</strong><br><span class="muted">${game.developer}</span></div></div></td>
      <td><span class="badge ${game.status === 'active' ? 'green' : 'yellow'}">${game.status}</span></td>
      <td>${money(game.finalPrice)}</td>
      <td>${game.stock}</td>
      <td>⭐ ${game.rating}</td>
      <td><button class="ghost-btn" onclick="openGameModal(${game.id})">Edit</button> <button class="danger-btn" onclick="archiveGame(${game.id})">Delete</button></td>
    </tr>
  `;
}


function reviewCard(review) {
  return `
    <article class="card pad" style="display:flex; gap:16px; align-items:center; flex-wrap:wrap">
      <img class="avatar" style="border-radius:16px; width:86px; height:86px" src="${review.coverImageUrl}" alt="${review.gameTitle}">
      <div style="flex:1"><span class="badge green">${review.rating}/5</span><h3>${review.gameTitle}</h3><p class="muted">${review.comment}</p></div>
      <span class="muted">${new Date(review.createdAt).toLocaleDateString()}</span>
    </article>
  `;
}

async function renderCheckout() {
  const { data: cart } = await api('/api/cart');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid" style="grid-template-columns:1fr 420px">
      <section class="card pad">
        <div class="kicker">Checkout</div>
        <h2>Confirm your order</h2>
        ${cart.items.length ? `<div class="grid">${cart.items.map(cartItem).join('')}</div>` : emptyState('shopping_cart_off', 'Your cart is empty', 'Return to the store and add a game first.')}
      </section>
      <aside class="card pad filters">
        <div class="kicker">Secure Payment</div>
        <h2>Order Summary</h2>
        <div class="info-list">
          ${infoRow('Subtotal', money(cart.summary.subtotal))}
          ${infoRow('Discounts', `-${money(cart.summary.discountTotal)}`)}
          ${infoRow('Estimated Tax', money(cart.summary.estimatedTax))}
          ${infoRow('Total', money(cart.summary.total))}
        </div>
        <div class="card pad" style="margin:18px 0; background:rgba(57,37,39,.5)">
          <span class="badge green">SSL</span>
          <p class="muted" style="margin:10px 0 0">Demo checkout: the order is paid immediately and added to your Library.</p>
        </div>
        <button class="primary-btn" style="width:100%" ${cart.items.length ? '' : 'disabled'} onclick="checkout()">Confirm Purchase</button>
        <a class="ghost-btn" style="width:100%; margin-top:10px" href="#/cart">Back to cart</a>
      </aside>
    </div>
  `);
}

async function renderSettings() {
  const { data: profile } = await api('/api/users/me');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div><div class="kicker">Settings</div><h2>Account preferences</h2></div>
      <section class="grid grid-2">
        <article class="card pad">
          <h3>Profile Data</h3>
          <p class="muted">Update the same information used in the Profile modal.</p>
          <form onsubmit="saveProfile(event)">
            <div class="form-control"><label>Display Name</label><input class="input" name="displayName" value="${profile.displayName || ''}"></div>
            <div class="form-control"><label>Email</label><input class="input" name="email" value="${profile.email || ''}"></div>
            <div class="form-control"><label>Bio</label><textarea class="input" name="bio" rows="4">${profile.bio || ''}</textarea></div>
            <button class="primary-btn">Save Settings</button>
          </form>
        </article>
        <article class="card pad">
          <h3>Security & Membership</h3>
          <div class="info-list">
            ${infoRow('Role', profile.role)}
            ${infoRow('Status', profile.status)}
            ${infoRow('Membership', profile.membership)}
            ${infoRow('Joined', new Date(profile.joinedAt).toLocaleDateString())}
          </div>
          <a class="primary-btn" style="margin-top:18px" href="#/upgrade">Manage Pro Upgrade</a>
        </article>
      </section>
    </div>
  `);
}

function renderSupport() {
  const user = state.user || {};
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid" style="grid-template-columns:1fr 360px">
      <section class="card pad">
        <div class="kicker">Support</div>
        <h2>Create a ticket</h2>
        <p class="muted">Use this for purchase problems, download access, catalog issues or account requests.</p>
        <form onsubmit="submitSupportTicket(event)">
          <div class="grid grid-2">
            <div class="form-control"><label>Name</label><input class="input" name="name" value="${user.displayName || ''}" required></div>
            <div class="form-control"><label>Email</label><input class="input" name="email" value="${user.email || ''}" required></div>
          </div>
          <div class="form-control"><label>Topic</label><input class="input" name="topic" placeholder="Purchase, download, account..." required></div>
          <div class="form-control"><label>Message</label><textarea class="input" name="message" rows="6" placeholder="Describe the issue with enough detail." required minlength="10"></textarea></div>
          <button class="primary-btn">Send Ticket</button>
        </form>
      </section>
      <aside class="card pad">
        <span class="badge green">QA Ready</span>
        <h3>Automatable flow</h3>
        <p class="muted">This page sends a real POST request to /api/support/tickets, so it can be tested in Postman and Supertest.</p>
        <div class="info-list">${infoRow('SLA', '24h demo response')}${infoRow('Status', 'Tickets are stored in DB')}${infoRow('Admin', 'Visible in admin activity/support API')}</div>
      </aside>
    </div>
  `);
}

async function submitSupportTicket(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await api('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), email: form.get('email'), topic: form.get('topic'), message: form.get('message') })
    });
    toast(`Ticket #${response.data.id} created.`);
    event.target.reset();
  } catch (error) { toast(error.message, 'error'); }
}

async function renderUpgrade() {
  document.getElementById('app').innerHTML = appShell(`
    <section class="card hero">
      <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop" alt="Aether Pro">
      <div>
        <div class="kicker">Aether Pro</div>
        <h1>Unlock Pro Access</h1>
        <p class="muted" style="font-size:18px; max-width:660px">Early access, special deals, priority support and cloud-save benefits for premium marketplace users.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:22px">
          <button class="primary-btn" onclick="upgradeMembership()">Activate Pro</button>
          <a class="ghost-btn" href="#/settings">Back to Settings</a>
        </div>
      </div>
    </section>
  `);
}

async function upgradeMembership() {
  try {
    const response = await api('/api/users/me/upgrade', { method: 'POST' });
    state.user = response.data;
    localStorage.setItem('aether_user', JSON.stringify(response.data));
    toast('Aether Pro activated.');
    renderUpgrade();
  } catch (error) { toast(error.message, 'error'); }
}

function renderLegal(type) {
  const isPrivacy = type === 'privacy';
  document.getElementById('app').innerHTML = appShell(`
    <article class="card pad">
      <div class="kicker">Legal</div>
      <h2>${isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h2>
      <p class="muted">Demo legal page included to complete the navigation flow. It documents how the marketplace handles accounts, purchases, wishlist, support tickets and admin operations.</p>
      <div class="grid grid-3">
        <div class="card pad"><h3>${isPrivacy ? 'Data collected' : 'User obligations'}</h3><p class="muted">Account data, purchase records, support requests and interaction history are stored only for marketplace functionality.</p></div>
        <div class="card pad"><h3>${isPrivacy ? 'Security' : 'Purchases'}</h3><p class="muted">JWT, bcrypt, validation and role-based access protect private and administrative resources.</p></div>
        <div class="card pad"><h3>${isPrivacy ? 'Control' : 'Limitations'}</h3><p class="muted">Users can update profile data and request account deletion from their profile page.</p></div>
      </div>
    </article>
  `);
}

function renderPayments() {
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div><div class="kicker">Payment Methods</div><h2>Accepted payment options</h2></div>
      <div class="grid grid-4">
        ${['Visa', 'Mastercard', 'PayPal', 'Aether Wallet'].map(name => `<article class="card pad"><span class="material-symbols-outlined">credit_card</span><h3>${name}</h3><p class="muted">Available for checkout demo flow.</p></article>`).join('')}
      </div>
      <section class="card pad"><h3>Checkout behavior</h3><p class="muted">For this academic version, checkout validates cart, stock and transaction consistency, then registers a paid purchase and adds the games to the Library.</p></section>
    </div>
  `);
}

async function renderAdminUsers() {
  const { data } = await api('/api/admin/users');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div style="display:flex; justify-content:space-between; align-items:center"><div><div class="kicker">Admin</div><h2>Manage Users</h2></div><a class="ghost-btn" href="#/admin">Back Dashboard</a></div>
      <section class="card pad table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.map(userRow).join('')}</tbody></table></section>
    </div>
  `);
}

function userRow(user) {
  return `<tr><td><strong>${user.displayName}</strong><br><span class="muted">@${user.username}</span></td><td>${user.email}</td><td><span class="badge">${user.role}</span></td><td><span class="badge ${user.status === 'active' ? 'green' : 'yellow'}">${user.status}</span></td><td><button class="ghost-btn" onclick="toggleUserRole(${user.id}, '${user.role}', '${user.displayName}', '${user.status}')">Toggle Role</button> <button class="danger-btn" onclick="toggleUserStatus(${user.id}, '${user.role}', '${user.displayName}', '${user.status}')">Toggle Status</button></td></tr>`;
}

async function toggleUserRole(id, role, displayName, status) {
  const nextRole = role === 'admin' ? 'customer' : 'admin';
  try { await api(`/api/admin/users/${id}`, { method:'PUT', body: JSON.stringify({ displayName, role: nextRole, status }) }); toast('User role updated.'); renderAdminUsers(); } catch(error) { toast(error.message, 'error'); }
}

async function toggleUserStatus(id, role, displayName, status) {
  const nextStatus = status === 'active' ? 'disabled' : 'active';
  try { await api(`/api/admin/users/${id}`, { method:'PUT', body: JSON.stringify({ displayName, role, status: nextStatus }) }); toast('User status updated.'); renderAdminUsers(); } catch(error) { toast(error.message, 'error'); }
}

async function renderAdminCategories() {
  const { data } = await api('/api/admin/categories');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div style="display:flex; justify-content:space-between; align-items:center"><div><div class="kicker">Admin</div><h2>Manage Categories</h2></div><a class="ghost-btn" href="#/admin">Back Dashboard</a></div>
      <section class="card pad"><form onsubmit="createCategory(event)" style="display:grid; grid-template-columns:1fr 1fr auto; gap:10px"><input class="input" name="name" placeholder="Category name" required><input class="input" name="description" placeholder="Description"><button class="primary-btn">Create</button></form></section>
      <section class="card pad table-wrap"><table><thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.map(categoryRow).join('')}</tbody></table></section>
    </div>
  `);
}

function categoryRow(category) {
  return `<tr><td><strong>${category.name}</strong></td><td>${category.description || '-'}</td><td><span class="badge ${category.status === 'active' ? 'green' : 'yellow'}">${category.status}</span></td><td><button class="danger-btn" onclick="archiveCategory(${category.id})">Deactivate</button></td></tr>`;
}

async function createCategory(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try { await api('/api/admin/categories', { method:'POST', body: JSON.stringify({ name: form.get('name'), description: form.get('description'), status:'active' }) }); toast('Category created.'); renderAdminCategories(); } catch(error) { toast(error.message, 'error'); }
}

async function archiveCategory(id) {
  if (!confirm('Deactivate this category?')) return;
  try { await api(`/api/admin/categories/${id}`, { method:'DELETE' }); toast('Category deactivated.'); renderAdminCategories(); } catch(error) { toast(error.message, 'error'); }
}

async function renderAdminActivity() {
  const activity = await api('/api/admin/activity');
  const tickets = await api('/api/admin/support-tickets');
  document.getElementById('app').innerHTML = appShell(`
    <div class="grid">
      <div style="display:flex; justify-content:space-between; align-items:center"><div><div class="kicker">Admin</div><h2>Activity & Support</h2></div><a class="ghost-btn" href="#/admin">Back Dashboard</a></div>
      <section class="grid grid-2">
        <article class="card pad"><h3>Recent Activity</h3>${activity.data.map(row => `<p class="muted">${row.action} · ${row.entityType} #${row.entityId || '-'} · ${new Date(row.createdAt).toLocaleString()}</p>`).join('') || emptyState('history', 'No activity', 'Admin actions appear here.')}</article>
        <article class="card pad"><h3>Support Tickets</h3>${tickets.data.map(ticket => `<div class="card pad" style="margin-bottom:10px"><span class="badge yellow">${ticket.status}</span><h3>${ticket.topic}</h3><p class="muted">${ticket.message}</p><small>${ticket.email}</small></div>`).join('') || emptyState('support_agent', 'No tickets', 'Support tickets appear here.')}</article>
      </section>
    </div>
  `);
}

async function renderMaintenance() {
  const status = await api('/api/system/status');
  document.getElementById('app').innerHTML = appShell(`
    <section class="card pad empty-state">
      <span class="material-symbols-outlined">settings_alert</span>
      <div class="kicker">System ${status.status}</div>
      <h1 style="font-size:58px">${status.status === 'online' ? 'System Online' : 'System Offline'}</h1>
      <p class="muted">${status.message}</p>
      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap">
        <button class="primary-btn" onclick="renderMaintenance()">Check Status</button>
        <a class="ghost-btn" href="#/">Back to Home</a>
      </div>
    </section>
  `);
}

function render404() {
  document.getElementById('app').innerHTML = appShell(`
    <section class="card pad empty-state">
      <span class="material-symbols-outlined">travel_explore</span>
      <div class="kicker">404 · Signal Lost</div>
      <h1 style="font-size:72px">Route not found</h1>
      <p class="muted">The requested signal does not exist in the Aether network.</p>
      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap">
        <a class="primary-btn" href="#/">Return to Home</a>
        <a class="ghost-btn" href="#/catalog">Search Catalog</a>
      </div>
    </section>
  `);
}

function emptyState(icon, title, description) {
  return `<div class="empty-state"><span class="material-symbols-outlined">${icon}</span><h2>${title}</h2><p class="muted">${description}</p></div>`;
}

function setAuthMode(mode) {
  document.getElementById('loginForm').classList.toggle('hidden', mode !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', mode !== 'register');
  document.getElementById('loginTab').classList.toggle('active', mode === 'login');
  document.getElementById('registerTab').classList.toggle('active', mode === 'register');
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password'), rememberMe: Boolean(form.get('rememberMe')) })
    });
    saveSession(response.user, response.token);
    toast(`Bienvenido, ${response.user.displayName}`);
    navTo(response.user.role === 'admin' ? '/admin' : '/');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: form.get('username'), email: form.get('email'), password: form.get('password') })
    });
    saveSession(response.user, response.token);
    toast('Cuenta creada correctamente');
    navTo('/');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function quickLogin(email, password) {
  try {
    const response = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    saveSession(response.user, response.token);
    toast(`Sesión iniciada como ${response.user.role}`);
    navTo(response.user.role === 'admin' ? '/admin' : '/');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function forgotPassword() {
  try {
    const email = document.querySelector('#loginForm [name="email"]').value;
    const response = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    toast(response.message);
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function logout() {
  try {
    if (state.token) await api('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  clearSession();
  toast('Sesión cerrada');
  navTo('/');
  render();
}

function requireLogin() {
  toast('Primero inicia sesión.');
  navTo('/auth');
}

function handleGlobalSearch(event) {
  if (event.key !== 'Enter') return;
  const value = event.target.value.trim();
  const params = new URLSearchParams();
  if (value) params.set('search', value);
  sessionStorage.setItem('catalogQuery', params.toString());
  navTo('/catalog');
}

function applyCatalogFilters() {
  const params = new URLSearchParams();
  const search = document.getElementById('filterSearch').value.trim();
  const genre = document.getElementById('filterGenre').value;
  const platform = document.getElementById('filterPlatform').value;
  const maxPrice = document.getElementById('filterMaxPrice').value;
  const sort = document.getElementById('filterSort').value;
  if (search) params.set('search', search);
  if (genre) params.set('genre', genre);
  if (platform) params.set('platform', platform);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (sort) params.set('sort', sort);
  params.set('page', '1');
  sessionStorage.setItem('catalogQuery', params.toString());
  renderCatalog();
}

function resetCatalogFilters() {
  sessionStorage.removeItem('catalogQuery');
  renderCatalog();
}

function changePage(page) {
  const params = new URLSearchParams(sessionStorage.getItem('catalogQuery') || '');
  params.set('page', String(Math.max(page, 1)));
  sessionStorage.setItem('catalogQuery', params.toString());
  renderCatalog();
}

async function addToCart(gameId) {
  if (!state.user) return requireLogin();
  try {
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ gameId, quantity: 1 }) });
    toast('Game added to cart.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function toggleWishlist(gameId, isWishlisted) {
  if (!state.user) return requireLogin();
  try {
    if (isWishlisted) await api(`/api/wishlist/${gameId}`, { method: 'DELETE' });
    else await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ gameId }) });
    toast(isWishlisted ? 'Removed from wishlist.' : 'Added to wishlist.');
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function removeCartItem(itemId) {
  try {
    await api(`/api/cart/items/${itemId}`, { method: 'DELETE' });
    toast('Item removed.');
    renderCart();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function applyPromo() {
  try {
    const code = document.getElementById('promoCode').value.trim();
    await api('/api/cart/apply-promo', { method: 'POST', body: JSON.stringify({ code }) });
    toast('Promo code applied.');
    renderCart();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function checkout() {
  try {
    const response = await api('/api/checkout', { method: 'POST' });
    toast(`Purchase completed: #${response.data.id}`);
    navTo('/profile');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function setProfileTab(tab) {
  state.profileTab = tab;
  renderProfile();
}

async function downloadReceipt(id) {
  try {
    const response = await api(`/api/purchases/${id}/receipt`);
    toast(`Receipt generated: ${response.data.receiptId}`);
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function downloadGame(gameId) {
  try {
    const response = await api(`/api/library/${gameId}/download`);
    toast(`Download link: ${response.data.url}`);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openEditProfile() {
  const modal = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="card pad modal">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div><span class="badge">Profile</span><h2>Edit Profile</h2></div>
          <button class="icon-btn" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="saveProfile(event)">
          <div class="form-control"><label>Display Name</label><input class="input" name="displayName" value="${state.user.displayName || ''}"></div>
          <div class="form-control"><label>Email Address</label><input class="input" name="email" value="${state.user.email || ''}"></div>
          <div class="form-control"><label>Bio</label><textarea class="input" name="bio" rows="4">${state.user.bio || ''}</textarea></div>
          <div style="display:flex; gap:10px; justify-content:flex-end"><button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn">Save Changes</button></div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modal);
}

async function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await api('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ displayName: form.get('displayName'), email: form.get('email'), bio: form.get('bio') })
    });
    state.user = response.data;
    localStorage.setItem('aether_user', JSON.stringify(response.data));
    closeModal();
    toast('Profile updated.');
    renderProfile();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openDeleteModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="card pad modal">
        <span class="badge yellow">Danger Zone</span>
        <h2>Delete account request</h2>
        <p class="muted">This registers a deletion request. In a real system, purchases and legal records must be reviewed before final deletion.</p>
        <div style="display:flex; gap:10px; justify-content:flex-end"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="danger-btn" onclick="requestDeleteAccount()">Yes, Delete My Account</button></div>
      </div>
    </div>
  `);
}

async function requestDeleteAccount() {
  try {
    await api('/api/users/me/delete-request', { method: 'POST' });
    closeModal();
    clearSession();
    toast('Deletion request registered. Session closed.');
    navTo('/auth');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function closeModal() {
  document.getElementById('modalBackdrop')?.remove();
}

function optionSelected(currentValue, optionValue) {
  return currentValue === optionValue ? 'selected' : '';
}

function openGameModal(gameId = null) {
  const game = state.adminGames.find(item => item.id === gameId) || null;
  const coverPreview = game?.coverImageUrl || 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=1200&auto=format&fit=crop';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="card pad modal">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div><span class="badge">Admin</span><h2>${game ? 'Edit Game' : 'Add New Game'}</h2></div>
          <button class="icon-btn" onclick="closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="saveGame(event, ${gameId || 'null'})" enctype="multipart/form-data">
          <div class="cover-upload">
            <img id="coverPreview" src="${coverPreview}" alt="Game cover preview">
            <div>
              <label class="cover-picker">
                <span class="material-symbols-outlined">upload</span>
                Choose cover image
                <input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewCover(event)">
              </label>
              <p class="muted" style="margin:10px 0 0">JPG, PNG o WEBP. Máximo 5MB. Si editas y no eliges archivo, se conserva la portada actual.</p>
            </div>
          </div>

          <div class="form-control"><label>Title</label><input class="input" name="title" value="${game?.title || ''}" required minlength="2" maxlength="150"></div>
          <div class="form-control"><label>Short Description</label><input class="input" name="shortDescription" value="${game?.shortDescription || ''}" required minlength="10" maxlength="300"></div>
          <div class="form-control"><label>Description</label><textarea class="input" name="description" rows="3" required minlength="10" maxlength="5000">${game?.description || ''}</textarea></div>
          <div class="grid grid-2">
            <div class="form-control"><label>Price</label><input class="input" name="price" type="number" step="0.01" min="0" value="${game?.price || 49.99}" required></div>
            <div class="form-control"><label>Stock</label><input class="input" name="stock" type="number" min="0" step="1" value="${game?.stock ?? 10}" required></div>
          </div>
          <div class="grid grid-2">
            <div class="form-control"><label>Developer</label><input class="input" name="developer" value="${game?.developer || 'Demo Studio'}" required minlength="2" maxlength="120"></div>
            <div class="form-control"><label>Publisher</label><input class="input" name="publisher" value="${game?.publisher || 'Aether Interactive'}" required minlength="2" maxlength="120"></div>
          </div>
          <div class="grid grid-2">
            <div class="form-control"><label>Release Date</label><input class="input" name="releaseDate" type="date" value="${game?.releaseDate || '2026-07-01'}" required></div>
            <div class="form-control"><label>Status</label><select name="status">
              <option value="active" ${optionSelected(game?.status || 'active', 'active')}>active</option>
              <option value="beta" ${optionSelected(game?.status, 'beta')}>beta</option>
              <option value="draft" ${optionSelected(game?.status, 'draft')}>draft</option>
              <option value="inactive" ${optionSelected(game?.status, 'inactive')}>inactive</option>
            </select></div>
          </div>
          <input type="hidden" name="esrbRating" value="${game?.esrbRating || 'T'}">
          <input type="hidden" name="genreIds" value="${game?.genreIds?.join(',') || '1,2'}">
          <input type="hidden" name="platformIds" value="${game?.platformIds?.join(',') || '1'}">
          <div style="display:flex; gap:10px; justify-content:flex-end"><button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn">Save Game</button></div>
        </form>
      </div>
    </div>
  `);
}

function previewCover(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    event.target.value = '';
    return toast('La portada debe ser JPG, PNG o WEBP.', 'error');
  }

  if (file.size > 5 * 1024 * 1024) {
    event.target.value = '';
    return toast('La portada no debe superar los 5MB.', 'error');
  }

  document.getElementById('coverPreview').src = URL.createObjectURL(file);
}

async function saveGame(event, gameId) {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    if (gameId) await api(`/api/admin/games/${gameId}`, { method: 'PUT', body: formData });
    else await api('/api/admin/games', { method: 'POST', body: formData });
    closeModal();
    toast(gameId ? 'Game updated with cover.' : 'Game created with cover.');
    renderAdmin();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function archiveGame(id) {
  if (!confirm('Archive this game?')) return;
  try {
    await api(`/api/admin/games/${id}`, { method: 'DELETE' });
    toast('Game archived.');
    renderAdmin();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function adminSearch(event) {
  if (event.key !== 'Enter') return;
  try {
    const search = event.target.value.trim();
    const gamesResponse = await api(`/api/admin/games?search=${encodeURIComponent(search)}`);
    state.adminGames = gamesResponse.data;
    document.querySelector('tbody').innerHTML = gamesResponse.data.map(adminGameRow).join('');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function exportReport() {
  try {
    const response = await api('/api/admin/reports/sales');
    toast(`Report ready with ${response.data.length} purchases.`);
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadNotifications() {
  if (!state.user) return requireLogin();
  try {
    const response = await api('/api/notifications');
    if (!response.data.length) return toast('No notifications.');
    toast(response.data.map(n => `${n.title}: ${n.message}`).join(' | '));
  } catch (error) {
    toast(error.message, 'error');
  }
}

function showSupport() {
  navTo('/support');
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

Object.assign(window, {
  toast,
  navTo,
  logout,
  requireLogin,
  handleGlobalSearch,
  setAuthMode,
  submitLogin,
  submitRegister,
  quickLogin,
  forgotPassword,
  applyCatalogFilters,
  resetCatalogFilters,
  changePage,
  addToCart,
  toggleWishlist,
  removeCartItem,
  applyPromo,
  checkout,
  setProfileTab,
  downloadReceipt,
  downloadGame,
  openEditProfile,
  saveProfile,
  openDeleteModal,
  requestDeleteAccount,
  closeModal,
  openGameModal,
  previewCover,
  saveGame,
  archiveGame,
  adminSearch,
  exportReport,
  loadNotifications,
  showSupport,
  renderCheckout,
  renderSettings,
  renderSupport,
  submitSupportTicket,
  renderUpgrade,
  upgradeMembership,
  renderLegal,
  renderPayments,
  renderAdminUsers,
  toggleUserRole,
  toggleUserStatus,
  renderAdminCategories,
  createCategory,
  archiveCategory,
  renderAdminActivity
});
