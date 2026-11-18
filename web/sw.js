/* Service worker: la web completa funciona sin conexión tras la primera visita.
   %HUELLA% lo sustituye scripts/construir.py por una huella del contenido publicado: si cambia cualquier archivo,
   cambia este archivo, el navegador instala el service worker nuevo, descarga todo otra vez y borra la caché anterior. */
const CACHE = 'manual-elecciones-%VERSION%-%HUELLA%';
const ARCHIVOS = ['./', 'index.html', 'assets/estilos.css', 'assets/datos.js', 'assets/qrcode.js', 'assets/herramientas.js', 'assets/app.js',
  'fonts/poppins-400.woff2', 'fonts/poppins-500.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2', 'img/logo-uso-ffc.webp', 'manifest.webmanifest', 'icons/icono-192.png', 'icons/icono-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
