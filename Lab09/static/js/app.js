(() => {
  const state = {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
  const number = value => new Intl.NumberFormat('es-PE').format(Number(value || 0));
  const date = (value, options = {}) => {
    if (!value) return '—';
    const normalized = String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z';
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: options.withTime === false ? undefined : 'short' }).format(parsed);
  };
  const statusLabel = status => ({
    disponible: 'Disponible', disponibilidad_media: 'Disponibilidad media', pocas_entradas: 'Pocas entradas',
    agotado: 'Agotado', finalizado: 'Finalizado', completada: 'Completada', pendiente: 'Pendiente', cancelada: 'Cancelada'
  }[status] || status || 'Sin estado');
  const badge = status => `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;

  async function api(url, options = {}) {
    const config = { ...options, headers: { ...(options.headers || {}) } };
    if (config.body && !(config.body instanceof FormData) && typeof config.body !== 'string') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }
    const response = await fetch(url, config);
    let payload = null;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) {
      const error = new Error(payload.error || (payload.errores || []).join(' ') || `Error HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function toast(message, type = 'success') {
    const region = $('#toast-region');
    if (!region) return;
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.innerHTML = `<span class="material-symbols-outlined ${type === 'error' ? 'text-danger' : 'text-tertiary'}">${type === 'error' ? 'error' : 'check_circle'}</span><div class="min-w-0 flex-1"><strong class="block text-sm">${type === 'error' ? 'Algo salió mal' : 'Listo'}</strong><p class="mt-1 text-sm text-muted">${escapeHtml(message)}</p></div><button class="text-muted" aria-label="Cerrar"><span class="material-symbols-outlined">close</span></button>`;
    $('button', item).addEventListener('click', () => item.remove());
    region.append(item);
    setTimeout(() => item.remove(), 5200);
  }

  function confirmAction(message, title = 'Confirmar acción') {
    const dialog = $('#confirm-dialog');
    if (!dialog) return Promise.resolve(window.confirm(message));
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    dialog.showModal();
    return new Promise(resolve => {
      const done = () => {
        dialog.removeEventListener('close', done);
        resolve(dialog.returnValue === 'default');
      };
      dialog.addEventListener('close', done);
    });
  }

  function setButtonLoading(button, loading, label = 'Procesando...') {
    if (!button) return;
    if (loading) {
      button.dataset.original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span>${label}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) button.innerHTML = button.dataset.original;
    }
  }

  function emptyBlock(icon, title, message) {
    return `<div class="empty-state !min-h-48"><div><span class="empty-icon material-symbols-outlined mx-auto">${icon}</span><h3 class="mt-4 font-display text-lg font-bold">${escapeHtml(title)}</h3><p class="mt-2 text-sm text-muted">${escapeHtml(message)}</p></div></div>`;
  }

  const iconMap = {
    bolt: '⚡', space_dashboard: '▦', event: '◫', add_box: '⊞', receipt_long: '≣',
    confirmation_number: '🎟', photo_library: '▧', menu: '☰', search: '⌕', notifications: '●',
    light_mode: '☀', warning: '!', close: '×', progress_activity: '◌', check_circle: '✓',
    trending_up: '↗', payments: 'S/', history: '↺', arrow_back: '←', save: '✓',
    add_photo_alternate: '+', delete: '×', edit: '✎', calendar_month: '▣', location_on: '●',
    person: '●', qr_code: '▦', qr_code_2: '▦', print: '⎙', download: '↓', add: '+',
    folder: '▰', hide_image: '□', event_busy: '×', cloud_off: '!', inventory_2: '▤',
    bar_chart: '▥', local_activity: '◇', error: '!', receipt: '≣', dark_mode: '◐'
  };

  function hydrateIcons(root = document) {
    $$('.material-symbols-outlined', root).forEach(icon => {
      const name = icon.dataset.iconName || icon.textContent.trim();
      if (!name) return;
      icon.dataset.iconName = name;
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = iconMap[name] || '•';
    });
  }

  function initNavigation() {
    const menu = $('#menu-toggle');
    const backdrop = $('#sidebar-backdrop');
    const close = () => { document.body.classList.remove('sidebar-open'); menu?.setAttribute('aria-expanded', 'false'); };
    menu?.addEventListener('click', () => {
      const open = document.body.classList.toggle('sidebar-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    backdrop?.addEventListener('click', close);
    $$('.sidebar a').forEach(link => link.addEventListener('click', close));

    const storedTheme = localStorage.getItem('livepass-theme');
    if (storedTheme === 'light') document.documentElement.classList.add('light');
    $('#theme-toggle')?.addEventListener('click', () => {
      const light = document.documentElement.classList.toggle('light');
      localStorage.setItem('livepass-theme', light ? 'light' : 'dark');
      toast(light ? 'Modo claro activado.' : 'Modo oscuro activado.');
    });
    $('#notification-button')?.addEventListener('click', () => toast('No tienes notificaciones pendientes.'));
    hydrateIcons(document);
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) hydrateIcons(node);
    })));
    observer.observe(document.body, { childList: true, subtree: true });

    $('#global-search')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.currentTarget.value.trim()) {
        location.href = `/admin/conciertos?q=${encodeURIComponent(event.currentTarget.value.trim())}`;
      }
    });
  }

  function qrPattern(seed = 'LivePass') {
    let hash = 0;
    for (const char of seed) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    let html = '';
    for (let i = 0; i < 81; i++) {
      hash = Math.imul(hash ^ (i + 1), 2654435761);
      html += `<i style="opacity:${(hash >>> 0) % 3 ? 1 : 0}"></i>`;
    }
    return html;
  }

  window.LivePass = { $, $$, state, api, toast, money, number, date, statusLabel, badge, escapeHtml, confirmAction, setButtonLoading, emptyBlock, qrPattern, hydrateIcons };
  document.addEventListener('DOMContentLoaded', initNavigation);
})();
