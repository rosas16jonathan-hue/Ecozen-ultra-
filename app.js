const WHATSAPP_PRIMARY = '527223652560';
const PRICE_PER_KG = 17;
const FORM_DRAFT_KEY = 'ecozen_form_draft_v3';
const ORDERS_KEY = 'ecozen_orders_v1';
const CATALOG_VISIBILITY_KEY = 'ecozen_catalog_visible';
const DEFAULT_STATUS = 'nuevo';

const CATALOG = [
  { id: 'det-1', name: 'Detergente Ecozen Floral 1L', category: 'Detergente líquido', price: 45, stock: 12, description: 'Aroma floral, uso diario, recomendado para ropa de casa.' },
  { id: 'det-2', name: 'Detergente Ecozen Neutro 5L', category: 'Detergente concentrado', price: 165, stock: 7, description: 'Ideal para negocio pequeño o lavado frecuente.' },
  { id: 'det-3', name: 'Suavizante Brisa Azul 1L', category: 'Suavizante', price: 38, stock: 10, description: 'Deja aroma fresco y tacto suave en prendas de uso diario.' },
  { id: 'det-4', name: 'Quitamanchas Oxi Plus 500ml', category: 'Quitamanchas', price: 52, stock: 5, description: 'Apoyo para manchas difíciles en ropa blanca o uniforme.' }
];

const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const installHelp = document.getElementById('installHelp');
const form = document.getElementById('pickupForm');
const statusBox = document.getElementById('formStatus');
const clearFormBtn = document.getElementById('clearFormBtn');
const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
const loadDemoBtn = document.getElementById('loadDemoBtn');
const estimatedTotal = document.getElementById('estimatedTotal');
const kilosInput = document.getElementById('kilos');
const ordersList = document.getElementById('ordersList');
const driverList = document.getElementById('driverList');
const summaryGrid = document.getElementById('summaryGrid');
const statusFilter = document.getElementById('statusFilter');
const businessFilter = document.getElementById('businessFilter');
const toggleCatalogBtn = document.getElementById('toggleCatalogBtn');
const catalogSection = document.getElementById('catalogSection');
const navLinks = [...document.querySelectorAll('.nav a')];
const sections = [...document.querySelectorAll('section[id]')];
const tabButtons = [...document.querySelectorAll('.tab-btn')];
const tabPanels = [...document.querySelectorAll('.tab-panel')];
const driverChips = [...document.querySelectorAll('[data-driver-filter]')];

let deferredPrompt = null;
let driverFilter = 'activos';

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function slugStatusLabel(status) {
  return {
    nuevo: 'Nuevo',
    recoleccion: 'Recolección',
    proceso: 'En proceso',
    ruta: 'En ruta',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
  }[status] || 'Nuevo';
}

function showStatus(message, type = 'warn') {
  statusBox.textContent = message;
  statusBox.className = `status show ${type}`;
}

function clearStatus() {
  statusBox.textContent = '';
  statusBox.className = 'status';
}

function updateEstimate() {
  const kilos = parseFloat(kilosInput?.value || '0');
  const total = Number.isFinite(kilos) && kilos > 0 ? kilos * PRICE_PER_KG : 0;
  estimatedTotal.textContent = money(total);
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function saveDraft() {
  const data = Object.fromEntries(new FormData(form).entries());
  localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(data));
}

function loadDraft() {
  try {
    const data = JSON.parse(localStorage.getItem(FORM_DRAFT_KEY) || 'null');
    if (!data) return;
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field && typeof value === 'string') field.value = value;
    });
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(FORM_DRAFT_KEY);
}

function validateForm(formData) {
  const nombre = String(formData.get('nombre') || '').trim();
  const telefono = normalizePhone(formData.get('telefono'));
  const direccion = String(formData.get('direccion') || '').trim();
  const servicio = String(formData.get('servicio') || '').trim();

  if (nombre.length < 3) return 'Escribe un nombre de cliente más completo.';
  if (telefono.replace(/\D/g, '').length < 10) return 'El teléfono debe tener al menos 10 dígitos.';
  if (direccion.length < 8) return 'Agrega una dirección más completa.';
  if (!servicio) return 'Selecciona el tipo de servicio.';
  return '';
}

function createOrderFromForm(formData) {
  const kilos = parseFloat(formData.get('kilos') || '0') || 0;
  const detergent = String(formData.get('detergente') || '').trim();
  const order = {
    id: `EZ-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: DEFAULT_STATUS,
    customerName: String(formData.get('nombre') || '').trim(),
    businessName: String(formData.get('negocio') || '').trim() || 'Cliente particular',
    phone: normalizePhone(formData.get('telefono')),
    service: String(formData.get('servicio') || '').trim(),
    address: String(formData.get('direccion') || '').trim(),
    kilos,
    baseEstimate: kilos * PRICE_PER_KG,
    detergent,
    date: String(formData.get('fecha') || '').trim(),
    time: String(formData.get('hora') || '').trim(),
    notes: String(formData.get('notas') || '').trim(),
    history: [{ at: new Date().toISOString(), status: DEFAULT_STATUS, note: 'Pedido registrado' }]
  };
  return order;
}

function persistNewOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
}

function buildWhatsAppMessage(order) {
  return [
    'Hola, comparto un pedido registrado en Ecozen.',
    '',
    `Folio: ${order.id}`,
    `Cliente: ${order.customerName}`,
    `Negocio: ${order.businessName}`,
    `Teléfono: ${order.phone}`,
    `Servicio: ${order.service}`,
    `Dirección: ${order.address}`,
    order.kilos ? `Kilos aproximados: ${order.kilos}` : '',
    order.baseEstimate ? `Estimado base: ${money(order.baseEstimate)}` : '',
    order.detergent ? `Detergente: ${order.detergent}` : '',
    order.date ? `Fecha: ${order.date}` : '',
    order.time ? `Hora: ${order.time}` : '',
    order.notes ? `Notas: ${order.notes}` : ''
  ].filter(Boolean).join('\n');
}

function openWhatsAppForOrder(order) {
  const message = buildWhatsAppMessage(order);
  const url = `https://wa.me/${WHATSAPP_PRIMARY}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function formatCreatedAt(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function updateOrderStatus(id, nextStatus) {
  const orders = getOrders();
  const found = orders.find((order) => order.id === id);
  if (!found) return;
  found.status = nextStatus;
  found.updatedAt = new Date().toISOString();
  found.history.unshift({ at: found.updatedAt, status: nextStatus, note: 'Estatus actualizado' });
  saveOrders(orders);
  renderAll();
}

function deleteOrder(id) {
  const orders = getOrders().filter((order) => order.id !== id);
  saveOrders(orders);
  renderAll();
}

function nextStatusButton(order) {
  const map = {
    nuevo: 'recoleccion',
    recoleccion: 'proceso',
    proceso: 'ruta',
    ruta: 'entregado',
    entregado: 'entregado',
    cancelado: 'nuevo'
  };
  return map[order.status] || 'recoleccion';
}

function filteredOrders() {
  const query = String(businessFilter?.value || '').trim().toLowerCase();
  const statusValue = statusFilter?.value || 'todos';
  return getOrders().filter((order) => {
    const businessMatch = !query || [order.customerName, order.businessName, order.service, order.address].join(' ').toLowerCase().includes(query);
    const statusMatch = statusValue === 'todos' || order.status === statusValue;
    return businessMatch && statusMatch;
  });
}

function driverOrders() {
  const orders = getOrders();
  if (driverFilter === 'activos') return orders.filter((o) => ['nuevo', 'recoleccion', 'ruta'].includes(o.status));
  return orders.filter((o) => o.status === driverFilter);
}

function orderCard(order, mode = 'general') {
  const next = nextStatusButton(order);
  const businessLine = order.businessName && order.businessName !== 'Cliente particular' ? order.businessName : 'Cliente particular';
  return `
    <article class="order-card">
      <div class="order-top">
        <div>
          <div class="order-title">${order.customerName}</div>
          <div class="helper">${businessLine} · ${order.id}</div>
        </div>
        <span class="badge ${order.status}">${slugStatusLabel(order.status)}</span>
      </div>
      <div class="order-meta">
        <div><strong>Servicio</strong><br>${order.service}</div>
        <div><strong>Estimado</strong><br>${order.baseEstimate ? money(order.baseEstimate) : 'Pendiente'}</div>
        <div><strong>Fecha</strong><br>${formatDate(order.date)} ${order.time || ''}</div>
        <div><strong>Registro</strong><br>${formatCreatedAt(order.createdAt)}</div>
      </div>
      <div class="card" style="padding:12px;border-radius:18px;background:#f8fafc;box-shadow:none">
        <div class="helper">Dirección</div>
        <div style="margin-top:4px;line-height:1.5">${order.address}</div>
        <div class="helper" style="margin-top:8px">Tel. ${order.phone || 'Sin teléfono'}${order.detergent ? ` · ${order.detergent}` : ''}</div>
        ${order.notes ? `<div class="helper" style="margin-top:8px">Notas: ${order.notes}</div>` : ''}
      </div>
      <div class="order-actions">
        <button class="btn-soft" type="button" data-action="advance" data-id="${order.id}">${mode === 'driver' ? 'Actualizar ruta' : `Mover a ${slugStatusLabel(next)}`}</button>
        <button class="btn-outline" type="button" data-action="wa" data-id="${order.id}">WhatsApp</button>
        ${order.status !== 'cancelado' && order.status !== 'entregado' ? `<button class="btn-outline" type="button" data-action="cancel" data-id="${order.id}">Cancelar</button>` : `<button class="btn-outline" type="button" data-action="restore" data-id="${order.id}">Reactivar</button>`}
        <button class="btn-outline" type="button" data-action="delete" data-id="${order.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderSummary() {
  const orders = getOrders();
  const counts = {
    total: orders.length,
    nuevos: orders.filter((o) => o.status === 'nuevo').length,
    activos: orders.filter((o) => ['nuevo', 'recoleccion', 'proceso', 'ruta'].includes(o.status)).length,
    entregados: orders.filter((o) => o.status === 'entregado').length
  };
  summaryGrid.innerHTML = `
    <div class="summary-item"><div class="helper">Total</div><strong>${counts.total}</strong></div>
    <div class="summary-item"><div class="helper">Nuevos</div><strong>${counts.nuevos}</strong></div>
    <div class="summary-item"><div class="helper">Activos</div><strong>${counts.activos}</strong></div>
    <div class="summary-item"><div class="helper">Entregados</div><strong>${counts.entregados}</strong></div>
  `;
}

function renderOrders() {
  const list = filteredOrders();
  ordersList.innerHTML = list.length
    ? list.map((order) => orderCard(order)).join('')
    : '<div class="card"><strong>No hay pedidos con ese filtro.</strong><div class="helper" style="margin-top:8px">Prueba con otro estado o captura un nuevo pedido.</div></div>';
}

function renderDriver() {
  const list = driverOrders();
  driverList.innerHTML = list.length
    ? list.map((order) => orderCard(order, 'driver')).join('')
    : '<div class="card"><strong>No hay pedidos para esta vista del repartidor.</strong><div class="helper" style="margin-top:8px">Cuando registres pedidos nuevos o en ruta aparecerán aquí.</div></div>';
}

function renderCatalog() {
  catalogSection.innerHTML = CATALOG.map((item) => `
    <article class="catalog-card">
      <div class="helper">${item.category}</div>
      <h4 style="margin-top:6px">${item.name}</h4>
      <p>${item.description}</p>
      <div class="price-line"><span>${money(item.price)}</span><span class="stock">Stock ${item.stock}</span></div>
    </article>
  `).join('');
}

function syncCatalogVisibility() {
  const visible = localStorage.getItem(CATALOG_VISIBILITY_KEY) === '1';
  catalogSection.hidden = !visible;
  toggleCatalogBtn.textContent = visible ? '🧴 Ocultar detergentes disponibles' : '🧴 Mostrar detergentes disponibles';
}

function renderAll() {
  renderSummary();
  renderOrders();
  renderDriver();
}

function updateActiveNav() {
  const scrollY = window.scrollY + 120;
  let currentId = sections[0]?.id || 'inicio';
  sections.forEach((section) => {
    if (section.offsetTop <= scrollY) currentId = section.id;
  });
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${currentId}`;
    link.classList.toggle('active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function setTab(tab) {
  tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tab}`));
}

function maybeSeedDemoOrders() {
  if (getOrders().length) {
    showStatus('Ya existen pedidos guardados. No se cargó demo para no sobrescribir datos.', 'info');
    return;
  }
  const base = new Date();
  const demos = [
    {
      id: `EZ-${Date.now().toString().slice(-6)}`,
      createdAt: base.toISOString(),
      updatedAt: base.toISOString(),
      status: 'nuevo',
      customerName: 'Mariana Reyes',
      businessName: 'Casa Reyes',
      phone: '7221112233',
      service: 'Lavado por kilo',
      address: 'Barrio Centro, Ixtlahuaca, frente a la farmacia',
      kilos: 6,
      baseEstimate: 102,
      detergent: 'Detergente Ecozen Floral 1L',
      date: '2026-03-31',
      time: '10:30',
      notes: 'Separar blancos',
      history: [{ at: base.toISOString(), status: 'nuevo', note: 'Pedido demo' }]
    },
    {
      id: `EZ-${(Date.now()+1).toString().slice(-6)}`,
      createdAt: base.toISOString(),
      updatedAt: base.toISOString(),
      status: 'recoleccion',
      customerName: 'Hotel Plaza',
      businessName: 'Hotel Plaza Ixtlahuaca',
      phone: '7229998877',
      service: 'Servicio mixto',
      address: 'Av. Principal 45, recepción',
      kilos: 18,
      baseEstimate: 306,
      detergent: 'Detergente Ecozen Neutro 5L',
      date: '2026-03-31',
      time: '12:00',
      notes: 'Recoger sábanas y toallas',
      history: [{ at: base.toISOString(), status: 'recoleccion', note: 'Pedido demo' }]
    },
    {
      id: `EZ-${(Date.now()+2).toString().slice(-6)}`,
      createdAt: base.toISOString(),
      updatedAt: base.toISOString(),
      status: 'ruta',
      customerName: 'Café Madero',
      businessName: 'Café Madero',
      phone: '7224441100',
      service: 'Pedido de detergentes',
      address: 'Portal Madero 8, local 3',
      kilos: 0,
      baseEstimate: 0,
      detergent: 'Suavizante Brisa Azul 1L',
      date: '2026-03-31',
      time: '16:00',
      notes: 'Entregar dos botellas',
      history: [{ at: base.toISOString(), status: 'ruta', note: 'Pedido demo' }]
    }
  ];
  saveOrders(demos);
  renderAll();
  showStatus('Se cargaron pedidos demo para que pruebes la operación.', 'ok');
  setTab('pedidos');
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBanner?.classList.add('show');
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) {
    showStatus('Usa el menú del navegador y elige “Agregar a pantalla de inicio”.', 'info');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBanner?.classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  installBanner?.classList.remove('show');
  showStatus('La app quedó instalada correctamente.', 'ok');
});

if (/iphone|ipad|ipod/i.test(navigator.userAgent) && installHelp) {
  installHelp.textContent = 'En iPhone o iPad: usa Compartir y luego “Agregar a pantalla de inicio”.';
}

form?.addEventListener('input', () => {
  saveDraft();
  updateEstimate();
  clearStatus();
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const error = validateForm(formData);
  if (error) {
    showStatus(error, 'warn');
    return;
  }
  const order = createOrderFromForm(formData);
  persistNewOrder(order);
  saveDraft();
  renderAll();
  showStatus(`Pedido ${order.id} guardado correctamente.`, 'ok');
  setTab('pedidos');
});

sendWhatsAppBtn?.addEventListener('click', () => {
  const formData = new FormData(form);
  const error = validateForm(formData);
  if (error) {
    showStatus(error, 'warn');
    return;
  }
  const order = createOrderFromForm(formData);
  openWhatsAppForOrder(order);
  showStatus('Se abrió WhatsApp con el pedido actual.', 'ok');
});

clearFormBtn?.addEventListener('click', () => {
  form.reset();
  clearDraft();
  updateEstimate();
  clearStatus();
  showStatus('Formulario limpiado y borrador eliminado.', 'ok');
});

loadDemoBtn?.addEventListener('click', maybeSeedDemoOrders);
statusFilter?.addEventListener('change', renderOrders);
businessFilter?.addEventListener('input', renderOrders);

tabButtons.forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
driverChips.forEach((chip) => chip.addEventListener('click', () => {
  driverFilter = chip.dataset.driverFilter;
  driverChips.forEach((node) => node.classList.toggle('active', node === chip));
  renderDriver();
}));

toggleCatalogBtn?.addEventListener('click', () => {
  const visible = catalogSection.hidden;
  localStorage.setItem(CATALOG_VISIBILITY_KEY, visible ? '1' : '0');
  syncCatalogVisibility();
});

function attachOrderActions(container) {
  container?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    const order = getOrders().find((entry) => entry.id === id);
    if (!order) return;
    if (action === 'advance') updateOrderStatus(id, nextStatusButton(order));
    if (action === 'wa') openWhatsAppForOrder(order);
    if (action === 'cancel') updateOrderStatus(id, 'cancelado');
    if (action === 'restore') updateOrderStatus(id, 'nuevo');
    if (action === 'delete') deleteOrder(id);
  });
}

attachOrderActions(ordersList);
attachOrderActions(driverList);
window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('load', () => {
  loadDraft();
  updateEstimate();
  updateActiveNav();
  renderCatalog();
  syncCatalogVisibility();
  renderAll();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
});
