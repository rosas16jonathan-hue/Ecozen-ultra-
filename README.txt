# Ecozen PWA

Este paquete ya viene listo para publicar como página web instalable tipo app.

## Archivos
- `index.html` -> la página principal
- `app.js` -> lógica del formulario y botón de instalación
- `manifest.json` -> configuración PWA
- `sw.js` -> service worker para instalación y caché
- `icon-192.png` y `icon-512.png` -> íconos de la app

## Cómo publicarla
Sube todos los archivos juntos a cualquiera de estas opciones:
- Netlify
- Vercel
- GitHub Pages
- tu hosting tradicional con cPanel

## Importante
La instalación como app funciona mejor cuando el sitio se publica con HTTPS.

## Cómo usarla
1. Publica los archivos
2. Abre la URL en Chrome o Safari
3. Toca "Agregar a pantalla de inicio"

## Personalización rápida
- Números de WhatsApp dentro de `index.html` y `app.js`
- Precio por kilo en `index.html`
- Textos y servicios en `index.html`
