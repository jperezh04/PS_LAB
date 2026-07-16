document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (!['conciertos', 'concierto-detalle', 'concierto-formulario'].includes(page)) return;
  const { $, $$, api, toast, money, number, date, badge, escapeHtml, confirmAction, setButtonLoading, emptyBlock } = LivePass;

  if (page === 'conciertos') initCatalog();
  if (page === 'concierto-detalle') initDetail();
  if (page === 'concierto-formulario') initForm();

  async function initCatalog() {
    let concerts = [];
    try {
      concerts = await api('/conciertos');
      const cities = [...new Set(concerts.map(c => c.ciudad))].sort();
      $('#city-filter').insertAdjacentHTML('beforeend', cities.map(city => `<option>${escapeHtml(city)}</option>`).join(''));
      const query = new URLSearchParams(location.search).get('q') || '';
      $('#concert-search').value = query;
      const render = () => {
        const q = $('#concert-search').value.trim().toLowerCase();
        const city = $('#city-filter').value;
        const status = $('#status-filter').value;
        const sort = $('#sort-filter').value;
        let filtered = concerts.filter(c => {
          const haystack = `${c.artista} ${c.tour} ${c.recinto} ${c.ciudad}`.toLowerCase();
          return (!q || haystack.includes(q)) && (!city || c.ciudad === city) && (!status || c.estado === status);
        });
        filtered.sort((a,b) => sort === 'precio_asc' ? a.precio-b.precio : sort === 'precio_desc' ? b.precio-a.precio : sort === 'artista' ? a.artista.localeCompare(b.artista) : new Date(a.fecha)-new Date(b.fecha));
        $('#concert-result-count').textContent = `${number(filtered.length)} concierto${filtered.length === 1 ? '' : 's'} encontrado${filtered.length === 1 ? '' : 's'}`;
        $('#concert-empty').classList.toggle('hidden', filtered.length > 0);
        $('#concert-grid').classList.toggle('hidden', filtered.length === 0);
        $('#concert-grid').innerHTML = filtered.map(c => concertCard(c)).join('');
        $$('.delete-concert').forEach(button => button.addEventListener('click', () => removeConcert(Number(button.dataset.id))));
      };
      ['concert-search','city-filter','status-filter','sort-filter'].forEach(id => $(`#${id}`).addEventListener(id === 'concert-search' ? 'input' : 'change', render));
      render();
    } catch (error) {
      toast(error.message, 'error');
      $('#concert-grid').innerHTML = emptyBlock('cloud_off','No se pudo cargar el catálogo','Comprueba que la API esté disponible.');
    }
  }

  function concertCard(c) {
    return `<article class="panel concert-card"><div class="concert-cover"><img src="${c.portada_url}" alt="Portada de ${escapeHtml(c.artista)}"><div class="absolute left-4 top-4 z-10">${badge(c.estado)}</div></div><div class="concert-content"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-xs font-bold uppercase tracking-wider text-tertiary">${escapeHtml(c.artista)}</p><h3 class="mt-1 truncate font-display text-xl font-bold">${escapeHtml(c.tour)}</h3></div><strong class="shrink-0 text-primary">${money(c.precio)}</strong></div><div class="mt-4 space-y-2 text-sm text-muted"><p class="flex items-center gap-2"><span class="material-symbols-outlined text-base">calendar_month</span>${date(c.fecha)}</p><p class="flex items-center gap-2"><span class="material-symbols-outlined text-base">location_on</span>${escapeHtml(c.recinto)}, ${escapeHtml(c.ciudad)}</p></div><div class="mt-4"><div class="flex justify-between text-xs text-muted"><span>${number(c.stock_disponible)} disponibles</span><span>${c.porcentaje_vendido}% vendido</span></div><div class="progress-track mt-2"><div class="progress-bar" style="width:${c.porcentaje_vendido}%"></div></div></div><div class="mt-5 flex flex-wrap gap-2"><a href="/admin/conciertos/${c.id}" class="btn btn-primary btn-sm flex-1">Ver detalles</a><a href="/admin/conciertos/${c.id}/editar" class="btn btn-ghost btn-sm" aria-label="Editar ${escapeHtml(c.artista)}"><span class="material-symbols-outlined">edit</span></a><button class="delete-concert btn btn-ghost btn-sm" data-id="${c.id}" aria-label="Eliminar ${escapeHtml(c.artista)}"><span class="material-symbols-outlined text-danger">delete</span></button></div></div></article>`;
  }

  async function removeConcert(id) {
    const accepted = await confirmAction('El concierto se eliminará de forma permanente. Solo es posible si aún no tiene ventas.', 'Eliminar concierto');
    if (!accepted) return;
    try { await api(`/conciertos/${id}`, { method:'DELETE' }); toast('Concierto eliminado correctamente.'); location.reload(); }
    catch (error) { toast(error.message, 'error'); }
  }

  async function initDetail() {
    const container = $('#concert-detail');
    const id = Number(container.dataset.concertId);
    try {
      const [c, sales] = await Promise.all([api(`/conciertos/${id}`), api('/ventas')]);
      const related = sales.filter(s => s.concierto_id === id);
      container.innerHTML = `<section class="hero-cover panel"><img src="${c.portada_url}" alt="Portada de ${escapeHtml(c.artista)}"><div class="hero-content"><div class="mb-4">${badge(c.estado)}</div><p class="eyebrow">${escapeHtml(c.artista)}</p><h2 class="page-title max-w-3xl">${escapeHtml(c.tour)}</h2><p class="mt-4 max-w-2xl text-muted">${date(c.fecha)} · ${escapeHtml(c.recinto)}, ${escapeHtml(c.ciudad)}</p><div class="mt-6 flex flex-wrap gap-3"><a class="btn btn-primary ${c.estado === 'agotado' || c.estado === 'finalizado' ? 'pointer-events-none opacity-50' : ''}" href="/admin/ventas/nueva?concierto=${c.id}"><span class="material-symbols-outlined">confirmation_number</span>Registrar venta</a><a class="btn btn-ghost" href="/admin/conciertos/${c.id}/editar"><span class="material-symbols-outlined">edit</span>Editar</a><button id="delete-current" class="btn btn-ghost"><span class="material-symbols-outlined text-danger">delete</span>Eliminar</button></div></div></section><section class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article class="panel stat-card"><div class="stat-value">${money(c.precio)}</div><div class="stat-label">Precio por entrada</div></article><article class="panel stat-card"><div class="stat-value">${number(c.stock_inicial)}</div><div class="stat-label">Stock inicial</div></article><article class="panel stat-card"><div class="stat-value">${number(c.stock_disponible)}</div><div class="stat-label">Entradas disponibles</div></article><article class="panel stat-card"><div class="stat-value">${c.porcentaje_vendido}%</div><div class="stat-label">Porcentaje vendido</div><div class="progress-track mt-4"><div class="progress-bar" style="width:${c.porcentaje_vendido}%"></div></div></article></section>`;
      $('#delete-current').addEventListener('click', () => removeConcert(id));
      $('#concert-sales').innerHTML = related.length ? related.slice(0,6).map(s => `<a href="/admin/ventas/${s.id}/entrada" class="flex items-center gap-3 border-b border-white/10 py-3 last:border-0"><div class="avatar"><span class="material-symbols-outlined text-base">person</span></div><div class="min-w-0 flex-1"><strong class="block truncate text-sm">${escapeHtml(s.comprador)}</strong><span class="block truncate text-xs text-muted">${escapeHtml(s.codigo)} · ${number(s.cantidad)} entrada(s)</span></div><strong class="text-sm text-tertiary">${money(s.total)}</strong></a>`).join('') : emptyBlock('receipt_long','Sin ventas registradas','Las ventas de este concierto aparecerán aquí.');
      $('#ticket-preview').innerHTML = `<img class="w-full rounded-xl bg-black/20 object-cover" src="${c.imagen_entrada_url}" alt="Diseño de entrada de ${escapeHtml(c.artista)}"><div class="mt-4 flex gap-2"><a class="btn btn-ghost btn-sm flex-1" href="/admin/conciertos/${c.id}/editar">Cambiar imagen</a><button id="delete-ticket-image" class="btn btn-ghost btn-sm"><span class="material-symbols-outlined text-danger">delete</span></button></div>`;
      $('#delete-ticket-image').addEventListener('click', async () => {
        if (!await confirmAction('Se restaurará el diseño de entrada predeterminado.', 'Eliminar diseño de entrada')) return;
        try { await api(`/conciertos/${id}/imagenes/entrada`, {method:'DELETE'}); toast('Diseño de entrada eliminado.'); location.reload(); } catch(error) { toast(error.message,'error'); }
      });
    } catch (error) {
      container.innerHTML = emptyBlock('event_busy','Concierto no encontrado',error.message);
      toast(error.message,'error');
    }
  }

  async function initForm() {
    const form = $('#concert-form');
    const id = Number(form.dataset.concertId || 0);
    const fileInputs = [
      { input: $('#portada'), preview: $('#portada-preview'), name: $('#portada-name'), zone: $('#portada-zone') },
      { input: $('#entrada'), preview: $('#entrada-preview'), name: $('#entrada-name'), zone: $('#entrada-zone') },
    ];
    fileInputs.forEach(item => setupUpload(item));

    if (id) {
      try {
        const c = await api(`/conciertos/${id}`);
        ['artista','tour','recinto','ciudad','precio','stock_inicial','stock_disponible'].forEach(field => form.elements[field].value = c[field]);
        form.elements.fecha.value = String(c.fecha).slice(0,16);
        showExistingPreview(fileInputs[0], c.portada_url, 'Portada actual');
        showExistingPreview(fileInputs[1], c.imagen_entrada_url, 'Diseño actual');
      } catch (error) { toast(error.message,'error'); }
    }

    $('#stock_inicial').addEventListener('input', () => { if (!id && !$('#stock_disponible').value) $('#stock_disponible').placeholder = $('#stock_inicial').value || 'Se igualará al stock inicial'; });
    $('#clear-form').addEventListener('click', () => { form.reset(); fileInputs.forEach(item => { item.preview.classList.add('hidden'); item.preview.removeAttribute('src'); item.name.textContent = 'Arrastra o selecciona una imagen'; }); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      $('#form-errors').classList.add('hidden');
      if (!form.reportValidity()) return;
      const initial = Number(form.elements.stock_inicial.value);
      const availableRaw = form.elements.stock_disponible.value;
      const available = availableRaw === '' ? initial : Number(availableRaw);
      if (available > initial) return showErrors(['El stock disponible no puede superar el stock inicial.']);
      const payload = {
        artista: form.elements.artista.value.trim(), tour: form.elements.tour.value.trim(), fecha: form.elements.fecha.value,
        recinto: form.elements.recinto.value.trim(), ciudad: form.elements.ciudad.value.trim(), precio: Number(form.elements.precio.value),
        stock_inicial: initial, stock_disponible: available
      };
      const button = $('#save-concert');
      setButtonLoading(button, true, 'Guardando...');
      try {
        const concert = await api(id ? `/conciertos/${id}` : '/conciertos', { method: id ? 'PUT' : 'POST', body: payload });
        const imageData = new FormData();
        if ($('#portada').files[0]) imageData.append('portada', $('#portada').files[0]);
        if ($('#entrada').files[0]) imageData.append('entrada', $('#entrada').files[0]);
        if ([...imageData.keys()].length) await api(`/conciertos/${concert.id}/imagenes`, { method:'POST', body:imageData });
        toast(id ? 'Concierto actualizado correctamente.' : 'Concierto creado correctamente.');
        location.href = `/admin/conciertos/${concert.id}`;
      } catch (error) {
        showErrors(error.payload?.errores || [error.message]);
        toast(error.message,'error');
      } finally { setButtonLoading(button,false); }
    });

    function showErrors(errors) { const box=$('#form-errors'); box.innerHTML=`<strong>Revisa los siguientes datos:</strong><ul class="mt-2 list-disc pl-5">${errors.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul>`; box.classList.remove('hidden'); box.scrollIntoView({behavior:'smooth',block:'center'}); }
    function setupUpload(item) {
      item.input.addEventListener('change', () => previewSelected(item));
      ['dragenter','dragover'].forEach(type => item.zone.addEventListener(type,e=>{e.preventDefault();item.zone.classList.add('dragover');}));
      ['dragleave','drop'].forEach(type => item.zone.addEventListener(type,e=>{e.preventDefault();item.zone.classList.remove('dragover');}));
      item.zone.addEventListener('drop', e => { if (e.dataTransfer.files[0]) { const dt=new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); item.input.files=dt.files; previewSelected(item); } });
    }
    function previewSelected(item) { const file=item.input.files[0]; if(!file)return; const allowed=['image/jpeg','image/png','image/webp']; if(!allowed.includes(file.type) || file.size>5*1024*1024){ toast(file.size>5*1024*1024?'La imagen supera 5 MB.':'Formato no permitido.','error'); item.input.value=''; return;} item.preview.src=URL.createObjectURL(file); item.preview.classList.remove('hidden'); item.name.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`; }
    function showExistingPreview(item,url,label){ item.preview.src=url; item.preview.classList.remove('hidden'); item.name.textContent=label; }
  }
});
