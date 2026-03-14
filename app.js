
let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.add('show');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('Si no aparece la instalación automática, usa el menú de tu navegador y toca "Agregar a pantalla de inicio".');
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.classList.remove('show');
  });
}

window.addEventListener('appinstalled', () => {
  installBanner.classList.remove('show');
});

const form = document.getElementById('pickupForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const nombre = data.get('nombre') || '';
    const telefono = data.get('telefono') || '';
    const direccion = data.get('direccion') || '';
    const servicio = data.get('servicio') || '';
    const fecha = data.get('fecha') || '';
    const hora = data.get('hora') || '';
    const notas = data.get('notas') || '';

    const msg = [
      'Hola, me gustaría solicitar su servicio de lavado.',
      '',
      `Nombre: ${nombre}`,
      `Teléfono: ${telefono}`,
      `Dirección: ${direccion}`,
      `Servicio: ${servicio}`,
      fecha ? `Fecha: ${fecha}` : '',
      hora ? `Hora: ${hora}` : '',
      notas ? `Notas: ${notas}` : ''
    ].filter(Boolean).join('\n');

    const url = 'https://wa.me/527223652560?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}
