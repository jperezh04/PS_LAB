document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, api, toast, money, number, date, badge, escapeHtml, setButtonLoading, emptyBlock, qrPattern } = LivePass;
  const page = document.body.dataset.page;
  const ticket = document.querySelector('#digital-ticket');
  if (page === 'venta-formulario') initSaleForm();
  if (page === 'ventas') initSalesHistory();
  if (ticket) initTicket(ticket);

  async function initSaleForm() {
    let concerts = [];
    try {
      concerts = (await api('/conciertos')).filter(c => !['agotado','finalizado'].includes(c.estado));
      const select = $('#concierto_id');
      select.innerHTML = `<option value="">Selecciona un concierto</option>${concerts.map(c=>`<option value="${c.id}">${escapeHtml(c.artista)} — ${escapeHtml(c.tour)} (${number(c.stock_disponible)} disp.)</option>`).join('')}`;
      const preset = new URLSearchParams(location.search).get('concierto');
      if (preset && concerts.some(c=>String(c.id)===preset)) select.value=preset;
      updateSummary();
      select.addEventListener('change', updateSummary);
      $('#cantidad').addEventListener('input', updateTotals);
      $('#sale-form').addEventListener('submit', submitSale);
      $('#another-sale').addEventListener('click', () => { $('#sale-success-dialog').close(); $('#sale-form').reset(); updateSummary(); });
    } catch (error) { toast(error.message,'error'); $('#concierto_id').innerHTML='<option value="">No se pudieron cargar los conciertos</option>'; }

    function selected() { return concerts.find(c=>c.id===Number($('#concierto_id').value)); }
    function updateSummary() {
      const c=selected();
      $('#selected-concert').innerHTML = c ? `<div class="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"><img class="h-20 w-24 rounded-lg object-cover" src="${c.portada_url}" alt=""><div class="min-w-0"><strong class="block truncate">${escapeHtml(c.artista)}</strong><span class="block truncate text-sm text-muted">${escapeHtml(c.tour)}</span><span class="mt-1 block text-xs text-tertiary">${date(c.fecha)} · ${number(c.stock_disponible)} disponibles</span></div></div>` : '';
      updateTotals();
    }
    function updateTotals() {
      const c=selected(); const qty=Math.max(1,Number($('#cantidad').value||1)); const warning=$('#stock-warning');
      $('#unit-price').textContent=money(c?.precio||0); $('#sale-quantity').textContent=number(qty); $('#sale-total').textContent=money((c?.precio||0)*qty);
      const invalid=!c || qty>c.stock_disponible; warning.classList.toggle('hidden',!invalid);
      warning.textContent=!c?'Selecciona un concierto para continuar.':qty>c.stock_disponible?`Solo quedan ${number(c.stock_disponible)} entradas disponibles.`:'';
      $('#submit-sale').disabled=invalid;
    }
    async function submitSale(event) {
      event.preventDefault(); if(!event.currentTarget.reportValidity())return; const c=selected(); if(!c)return;
      const payload={concierto_id:c.id,comprador:$('#comprador').value.trim(),correo:$('#correo').value.trim(),cantidad:Number($('#cantidad').value),metodo_pago:$('#metodo_pago').value,observaciones:$('#observaciones').value.trim()};
      const button=$('#submit-sale'); setButtonLoading(button,true,'Registrando...');
      try { const sale=await api('/ventas',{method:'POST',body:payload}); $('#sale-success-content').innerHTML=`<div class="grid grid-cols-2 gap-3"><span class="text-muted">Código</span><strong>${escapeHtml(sale.codigo)}</strong><span class="text-muted">Comprador</span><strong>${escapeHtml(sale.comprador)}</strong><span class="text-muted">Cantidad</span><strong>${number(sale.cantidad)}</strong><span class="text-muted">Total</span><strong class="text-tertiary">${money(sale.total)}</strong></div>`; $('#view-ticket').href=`/admin/ventas/${sale.id}/entrada`; $('#sale-success-dialog').showModal(); toast('Venta registrada correctamente.'); concerts=concerts.map(x=>x.id===c.id?{...x,stock_disponible:x.stock_disponible-sale.cantidad}:x); updateSummary(); }
      catch(error){toast(error.message,'error');} finally{setButtonLoading(button,false);updateTotals();}
    }
  }

  async function initSalesHistory() {
    let sales=[];
    try { sales=await api('/ventas'); const concertNames=[...new Map(sales.map(s=>[s.concierto_id,`${s.artista} — ${s.tour}`])).entries()]; $('#sales-concert-filter').insertAdjacentHTML('beforeend',concertNames.map(([id,name])=>`<option value="${id}">${escapeHtml(name)}</option>`).join('')); const render=()=>{const q=$('#sales-search').value.toLowerCase().trim(),concert=$('#sales-concert-filter').value,payment=$('#sales-payment-filter').value,status=$('#sales-status-filter').value; const filtered=sales.filter(s=>(!q||`${s.codigo} ${s.comprador} ${s.correo}`.toLowerCase().includes(q))&&(!concert||String(s.concierto_id)===concert)&&(!payment||s.metodo_pago===payment)&&(!status||s.estado===status)); $('#sales-count').textContent=`${number(filtered.length)} venta${filtered.length===1?'':'s'}`; $('#sales-empty').classList.toggle('hidden',filtered.length>0); $('.table-wrap').classList.toggle('hidden',filtered.length===0); $('#sales-table').innerHTML=filtered.map(s=>`<tr><td><strong class="text-primary">${escapeHtml(s.codigo)}</strong></td><td><strong class="block">${escapeHtml(s.comprador)}</strong><span class="text-xs text-muted">${escapeHtml(s.correo)}</span></td><td>${escapeHtml(s.artista)}<span class="block text-xs text-muted">${escapeHtml(s.tour)}</span></td><td>${number(s.cantidad)}</td><td><strong>${money(s.total)}</strong></td><td>${escapeHtml(s.metodo_pago)}</td><td>${date(s.fecha_venta)}</td><td>${badge(s.estado)}</td><td><a class="btn btn-ghost btn-sm" href="/admin/ventas/${s.id}/entrada" aria-label="Ver entrada ${escapeHtml(s.codigo)}"><span class="material-symbols-outlined">qr_code</span></a></td></tr>`).join('');}; ['sales-search','sales-concert-filter','sales-payment-filter','sales-status-filter'].forEach(id=>$("#"+id).addEventListener(id==='sales-search'?'input':'change',render)); render(); $('#export-sales').addEventListener('click',()=>exportCsv(sales)); }
    catch(error){toast(error.message,'error');$('#sales-table').innerHTML=`<tr><td colspan="9">${emptyBlock('cloud_off','No se pudieron cargar las ventas',error.message)}</td></tr>`;}
  }

  function exportCsv(sales) { if(!sales.length)return toast('No hay ventas para exportar.','error'); const rows=[['Código','Comprador','Correo','Concierto','Cantidad','Precio unitario','Total','Método','Fecha','Estado'],...sales.map(s=>[s.codigo,s.comprador,s.correo,`${s.artista} - ${s.tour}`,s.cantidad,s.precio_unitario,s.total,s.metodo_pago,s.fecha_venta,s.estado])]; const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`ventas_livepass_${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href); toast('Archivo CSV generado.'); }

  async function initTicket(container) {
    const id=Number(container.dataset.saleId);
    try { const s=await api(`/ventas/${id}`); container.innerHTML=`<div class="ticket-grid"><section class="ticket-main"><img src="${s.portada_url}" alt="Portada del concierto"><div class="ticket-main-content"><div class="brand"><span class="brand-icon material-symbols-outlined">bolt</span><span><strong>Live</strong>Pass</span></div><div class="mt-16"><p class="eyebrow">${escapeHtml(s.artista)}</p><h1 class="mt-2 font-display text-4xl font-extrabold sm:text-5xl">${escapeHtml(s.tour)}</h1><p class="mt-5 max-w-xl text-muted">${date(s.fecha_concierto)} · ${escapeHtml(s.recinto)}, ${escapeHtml(s.ciudad)}</p></div><div class="mt-12 grid gap-5 sm:grid-cols-3"><div><span class="text-xs uppercase tracking-widest text-muted">Comprador</span><strong class="mt-1 block">${escapeHtml(s.comprador)}</strong></div><div><span class="text-xs uppercase tracking-widest text-muted">Cantidad</span><strong class="mt-1 block">${number(s.cantidad)} entrada(s)</strong></div><div><span class="text-xs uppercase tracking-widest text-muted">Total</span><strong class="mt-1 block text-tertiary">${money(s.total)}</strong></div></div></div></section><aside class="ticket-stub"><p class="eyebrow">Entrada digital</p><h2 class="mt-2 font-display text-2xl font-bold">${escapeHtml(s.codigo)}</h2><div class="qr-placeholder mx-auto mt-10" aria-label="Código QR visual">${qrPattern(s.codigo)}</div><div class="mt-10 space-y-4 text-sm"><div class="flex justify-between gap-4"><span class="text-muted">Pago</span><strong>${escapeHtml(s.metodo_pago)}</strong></div><div class="flex justify-between gap-4"><span class="text-muted">Estado</span>${badge(s.estado)}</div><div class="flex justify-between gap-4"><span class="text-muted">Venta</span><strong>${date(s.fecha_venta)}</strong></div></div><img class="mt-8 w-full rounded-xl bg-black/20" src="${s.imagen_entrada_url}" alt="Diseño de entrada"></aside></div>`; }
    catch(error){container.innerHTML=emptyBlock('qr_code_2','Entrada no encontrada',error.message);}
  }
});
