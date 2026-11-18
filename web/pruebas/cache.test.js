// Pruebas de la caché de la app instalada (PWA). Ejecutar DESPUÉS de `python3 scripts/construir.py`:
//   node --test web/pruebas/cache.test.js
// Comprueban que docs/ está al día: si fallan, vuelve a construir antes de publicar.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.join(__dirname, '..', '..');
const DOCS = path.join(RAIZ, 'docs');
const plantilla = fs.readFileSync(path.join(RAIZ, 'web', 'sw.js'), 'utf8');
const publicado = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');

function rutas(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? rutas(path.join(dir, e.name), base + e.name + '/') : [base + e.name]);
}
/** Mismo cálculo que huella_publicada() de scripts/construir.py. */
function huella() {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from(plantilla, 'utf8'));
  const lista = rutas(DOCS).filter(r => path.basename(r) !== 'sw.js').sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const r of lista) {
    h.update(Buffer.concat([Buffer.from(r, 'utf8'), Buffer.from([0])]));
    h.update(crypto.createHash('sha256').update(fs.readFileSync(path.join(DOCS, r))).digest());
  }
  return h.digest('hex').slice(0, 12);
}

test('la plantilla del service worker deriva la caché del contenido y descarga sin caché HTTP', () => {
  assert.match(plantilla, /const CACHE = 'manual-elecciones-%VERSION%-%HUELLA%';/);
  assert.match(plantilla, /cache: 'reload'/);
  assert.match(plantilla, /skipWaiting\(\)/);
  assert.match(plantilla, /x !== CACHE/); // borra las cachés anteriores
});
test('docs/sw.js lleva la huella de lo publicado (si cambia un archivo, cambia la caché)', () => {
  const m = publicado.match(/const CACHE = 'manual-elecciones-(\d+\.\d+\.\d+)-([0-9a-f]{12})';/);
  assert.ok(m, 'docs/sw.js sin huella: ejecuta python3 scripts/construir.py');
  assert.ok(!publicado.includes('%'), 'quedan marcadores sin sustituir');
  assert.equal(m[2], huella(), 'docs/ ha cambiado sin reconstruir: ejecuta python3 scripts/construir.py');
});
test('todo lo que el service worker guarda para usar sin conexión existe en docs/', () => {
  const lista = JSON.parse(publicado.match(/const ARCHIVOS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  for (const a of lista) if (a !== './') assert.ok(fs.existsSync(path.join(DOCS, a)), a);
});
test('docs/assets es copia fiel de web/ y la app avisa de la versión nueva', () => {
  for (const f of ['herramientas.js', 'app.js']) assert.equal(fs.readFileSync(path.join(DOCS, 'assets', f), 'utf8'), fs.readFileSync(path.join(RAIZ, 'web', f), 'utf8'), f);
  const app = fs.readFileSync(path.join(RAIZ, 'web', 'app.js'), 'utf8');
  assert.match(app, /controllerchange/);
  assert.match(app, /Hay una versión nueva\. Toca para actualizar/);
});
