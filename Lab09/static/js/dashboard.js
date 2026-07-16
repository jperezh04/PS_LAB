document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'dashboard') return;
  const { $, api, money, number, date, badge, escapeHtml, emptyBlock, toast } = LivePass;
  try {
    const data = await api('/api/dashboard');
    const r = data.resumen;
    const stats = [
      ['event', number(r.conciertos_activos), 'Conciertos activos', 'Programación vigente'],
      ['confirmation_number', number(r.entradas_disponibles), 'Entradas disponibles', `${r.ocupacion_general}% de ocupación`],
      ['local_activity', number(r.entradas_vendidas), 'Entradas vendidas', `${number(r.ventas_del_dia)} ventas hoy`],
      ['payments', money(r.ingresos_totales), 'Ingresos totales', `Promedio ${money(r.venta_promedio)}`],
    ];
    $('#stats-grid').innerHTML = stats.map(([icon,value,label,change]) => `<article class="panel stat-card"><div class="stat-icon"><span class="material-symbols-outlined">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-label">${label}</div><div class="stat-change"><span class="material-symbols-outlined text-base">trending_up</span>${change}</div></article>`).join('');

    const chart = Object.entries(data.ventas_por_concierto);
    const max = Math.max(1, ...chart.map(([,v]) => v));
    $('#sales-chart').innerHTML = chart.length ? `<div class="space-y-5">${chart.map(([name,value]) => `<div><div class="mb-2 flex justify-between gap-4 text-sm"><span class="truncate text-muted">${escapeHtml(name)}</span><strong>${number(value)}</strong></div><div class="progress-track h-3"><div class="progress-bar" style="width:${value/max*100}%"></div></div></div>`).join('')}</div><div class="mt-6 rounded-xl bg-white/5 p-4 text-sm"><span class="text-muted">Concierto más vendido:</span> <strong>${escapeHtml(r.concierto_mas_vendido)}</strong></div>` : emptyBlock('bar_chart','Aún no hay ventas','Registra la primera venta para visualizar el rendimiento.');

    $('#low-stock-list').innerHTML = data.stock_bajo.length ? data.stock_bajo.map(c => `<a href="/admin/conciertos/${c.id}" class="block rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><strong class="block truncate text-sm">${escapeHtml(c.artista)}</strong><span class="block truncate text-xs text-muted">${escapeHtml(c.tour)}</span></div>${badge(c.estado)}</div><div class="mt-3 flex justify-between text-xs text-muted"><span>${number(c.stock_disponible)} disponibles</span><span>${c.porcentaje_vendido}% vendido</span></div><div class="progress-track mt-2"><div class="progress-bar" style="width:${c.porcentaje_vendido}%"></div></div></a>`).join('') : emptyBlock('inventory_2','Stock saludable','No hay conciertos con stock crítico.');

    $('#upcoming-list').innerHTML = data.proximos_conciertos.length ? data.proximos_conciertos.map(c => `<a href="/admin/conciertos/${c.id}" class="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40"><img class="h-16 w-20 rounded-lg object-cover" src="${c.portada_url}" alt=""><div class="min-w-0 flex-1"><strong class="block truncate">${escapeHtml(c.artista)}</strong><span class="block truncate text-xs text-muted">${escapeHtml(c.tour)} · ${date(c.fecha)}</span></div><span class="text-sm font-bold text-primary">${money(c.precio)}</span></a>`).join('') : emptyBlock('event_busy','Sin conciertos','Crea el primer concierto de la programación.');

    $('#recent-sales').innerHTML = data.ventas_recientes.length ? data.ventas_recientes.map(s => `<a href="/admin/ventas/${s.id}/entrada" class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-primary/40"><div class="avatar"><span class="material-symbols-outlined text-base">receipt</span></div><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(s.comprador)}</strong><span class="block truncate text-xs text-muted">${escapeHtml(s.codigo || 'Venta')} · ${escapeHtml(s.artista)}</span></div><strong class="text-sm text-tertiary">${money(s.total)}</strong></a>`).join('') : emptyBlock('receipt_long','Sin ventas recientes','Las nuevas ventas aparecerán aquí.');
  } catch (error) {
    toast(error.message, 'error');
    $('#stats-grid').innerHTML = emptyBlock('cloud_off','No se pudo cargar el dashboard','Comprueba que la API esté disponible.');
  }
});
