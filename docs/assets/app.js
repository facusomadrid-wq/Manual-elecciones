/* Manual de Elecciones Sindicales · FAC-USO — aplicación */
(() => {
'use strict';
const M = window.MANUAL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('memf.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('memf.' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
};
const plano = s => { let o = ''; for (let i = 0; i < s.length; i++) { const d = s[i].normalize('NFD'); o += (d[0] || s[i]).toLowerCase(); } return o; };

const caps = {}; M.capitulos.forEach(c => { caps[c.n] = c; });
const parteDe = n => M.partes.find(p => p.caps.includes(n));
const hrefSec = ref => { // "8.1" -> #/cap/8/s-8-1 ; "18" -> #/cap/18
  const m = String(ref).match(/^(\d+)(?:\.(\d+))?/);
  return m[2] ? `#/cap/${m[1]}/s-${m[1]}-${m[2]}` : `#/cap/${m[1]}`;
};

/* ---------- utilidades de UI ---------- */
let tToast;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, 2400); }
function sheet(html, onOpen) {
  $('#sheet-c').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
  if (onOpen) onOpen($('#sheet-c'));
}
function cerrarSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet' || e.target.closest('.sheet-x')) cerrarSheet(); });
function descargar(nombre, texto, tipo = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo + ';charset=utf-8' })); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function copiar(t) { try { await navigator.clipboard.writeText(t); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); } }
async function compartir(titulo, url) {
  if (navigator.share) { try { await navigator.share({ title: titulo, url }); return; } catch (e) { return; } }
  copiar(url);
}
window.APP = { store, esc, toast, sheet, descargar, copiar, hrefSec, caps, plano, ir: r => { location.hash = r; } };

/* ---------- ajustes ---------- */
const root = document.documentElement;
function aplicarAjustes() {
  const tema = store.get('tema', 'auto'); root.setAttribute('data-tema', tema);
  const tam = store.get('tam', 0); root.style.fontSize = (100 + tam * 8) + '%';
  const col = store.get('col', 'todos'); document.body.dataset.colectivo = col;
  $$('#ajustes [data-tema]').forEach(b => b.classList.toggle('on', b.dataset.tema === tema));
  $$('#ajustes [data-col]').forEach(b => b.classList.toggle('on', b.dataset.col === col));
  const av = $('#aviso-filtro');
  const enCap = !!$('#v-capitulos > .cap:not([hidden])');
  if (col !== 'todos' && enCap) {
    av.hidden = false;
    av.innerHTML = `<span>Filtro: <strong>${col === 'priv' ? 'empresa y personal laboral' : 'funcionariado y estatutario'}</strong>. Se ocultan los apartados exclusivos del otro colectivo.</span><button type="button" id="quitar-filtro">Ver todo</button>`;
  } else av.hidden = true;
}
$('#b-ajustes').addEventListener('click', () => { const p = $('#ajustes'); p.hidden = !p.hidden; $('#b-ajustes').setAttribute('aria-expanded', String(!p.hidden)); });
$('#ajustes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'a-mas') store.set('tam', Math.min(4, store.get('tam', 0) + 1));
  else if (b.id === 'a-menos') store.set('tam', Math.max(-2, store.get('tam', 0) - 1));
  else if (b.dataset.tema) store.set('tema', b.dataset.tema);
  else if (b.dataset.col) store.set('col', b.dataset.col);
  aplicarAjustes();
});
document.addEventListener('click', e => {
  if (e.target.id === 'quitar-filtro') { store.set('col', 'todos'); aplicarAjustes(); }
  if (!e.target.closest('#ajustes') && !e.target.closest('#b-ajustes')) $('#ajustes').hidden = true;
});

/* ---------- menú lateral ---------- */
function construirMenu() {
  let h = `<div class="mn-enlaces"><a href="#/">🏠 Inicio</a><a href="#/buscar">🔍 Buscar</a><a href="#/herramientas">🧰 Herramientas</a><a href="#/glosario">📚 Glosario</a><a href="#/favoritos">⭐ Favoritos</a><a href="#/acerca">ℹ️ Acerca</a></div>`;
  h += `<a class="mn-cap" data-c="0" href="#/cap/0"><b>${caps[0].icono}</b><span>Introducción</span></a>`;
  M.partes.forEach(p => {
    h += `<div class="mn-parte">Parte ${p.id} · ${esc(p.titulo)}</div>`;
    p.caps.forEach(n => { h += `<a class="mn-cap" data-c="${n}" href="#/cap/${n}"><b>${n}</b><span>${esc(caps[n].titulo.replace(/^ANEXO I\.- /, 'Anexo I · '))}</span></a>`; });
  });
  $('#menu-int').innerHTML = h;
}
function menu(abrir) {
  const m = $('#menu'); m.classList.toggle('abierto', abrir); $('#velo').hidden = !abrir; $('#b-menu').setAttribute('aria-expanded', String(abrir));
  document.body.style.overflow = abrir && innerWidth < 1024 ? 'hidden' : '';
}
$('#b-menu').addEventListener('click', () => menu(!$('#menu').classList.contains('abierto')));
$('#velo').addEventListener('click', () => menu(false));
$('#menu').addEventListener('click', e => { if (e.target.closest('a') && innerWidth < 1024) menu(false); });
$('#b-buscar').addEventListener('click', () => { location.hash = '#/buscar'; });

/* ---------- vistas ---------- */
const titulosCap = n => (n === 0 ? 'Introducción' : `${n}. ${caps[n].titulo}`);
const PLAZOS = [
  { v: '1 – 3 meses', t: 'Antelación del preaviso respecto al inicio del proceso', r: '8.1' },
  { v: '72 horas', t: 'Mínimo de exposición del censo laboral en el tablón', r: '9.2' },
  { v: '9 días', t: 'Para presentar candidaturas tras la lista definitiva de electores (comités y juntas)', r: '13.9' },
  { v: '5 días', t: 'Mínimo entre la proclamación y la votación (comités y juntas)', r: '17.2' },
  { v: '30 – 34 días', t: 'Duración del proceso entre la mesa y la votación (comités y juntas)', r: '17.6' },
  { v: '3 días', t: 'Plazo para presentar el acta de escrutinio en la Oficina Pública', r: '21.3' },
  { v: '10 días hábiles', t: 'Registro o denegación del acta por la Oficina Pública', r: '21.5' },
  { v: '3 días hábiles', t: 'Escrito de iniciación del procedimiento arbitral', r: '25.3' }
];
const FASES = [
  ['Preparar y promover', 'Quién puede convocar, censos, preaviso', [4, 5, 6, 7, 8]],
  ['Censo y electorado', 'Censo electoral y quién vota / es elegible', [9, 10]],
  ['Mesas y candidaturas', 'Mesas, interventores, candidaturas, campaña, colegios y papeletas', [11, 12, 13, 14, 15, 16]],
  ['Votación y escrutinio', 'Votar, voto por correo, contar y atribuir resultados', [17, 18, 19, 20]],
  ['Actas y registro', 'Actas, oficina pública y seguimiento', [21, 22, 24]],
  ['Reclamar y garantías', 'Impugnaciones, representatividad y plazos', [25, 26, 27, 28]]
];

function vistaInicio() {
  const ult = store.get('ult', null);
  let h = `<div class="hero"><small>FAC-USO · edición marzo 2023</small>
    <h1>Manual de Elecciones Sindicales</h1>
    <p>Sectores privados, personal laboral y funcionario de las Administraciones Públicas. Todo el manual, con buscador, calculadoras y listas de comprobación.</p>
    <form class="hero-busca" id="hb" role="search"><input id="hb-q" type="search" placeholder="Buscar en el manual…" aria-label="Buscar en el manual" enterkeyhint="search"><button type="submit">Buscar</button></form></div>`;
  if (ult && caps[ult.cap]) h += `<a class="continuar" href="#/cap/${ult.cap}${ult.sid ? '/' + ult.sid : ''}"><span style="font-size:1.6rem">📖</span><span><b>Continuar leyendo</b>${esc(titulosCap(ult.cap))}</span></a>`;
  h += `<div class="rapidos">
    <a class="rapido" href="#/herramientas/plazos"><span class="ico">📅</span><b>Plazos</b><span>Calcula fechas límite</span></a>
    <a class="rapido" href="#/herramientas/organo"><span class="ico">👥</span><b>¿Qué órgano?</b><span>Delegados, comité o junta</span></a>
    <a class="rapido" href="#/herramientas/resultados"><span class="ico">🧮</span><b>Resultados</b><span>Reparto de puestos</span></a>
    <a class="rapido" href="#/glosario"><span class="ico">📚</span><b>Glosario</b><span>Siglas y términos</span></a></div>`;
  h += `<h2 class="sec-t">Plazos clave</h2><div class="plazos">${PLAZOS.map(p => `<a class="plazo" href="${hrefSec(p.r)}"><strong>${esc(p.v)}</strong><span>${esc(p.t)}</span></a>`).join('')}</div>`;
  h += `<h2 class="sec-t">Ruta del proceso electoral</h2><div class="ruta">`;
  FASES.forEach((f, i) => { h += `<div class="fase" data-n="${i + 1}"><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p><div class="chips">${f[2].map(n => `<a class="chip" href="#/cap/${n}"><b>${n}</b>${esc(shortTitle(n))}</a>`).join('')}</div></div>`; });
  h += `</div><h2 class="sec-t">Empieza por aquí</h2><div class="chips"><a class="chip" href="#/cap/0"><b>📖</b>Introducción</a><a class="chip" href="#/cap/1"><b>1</b>Normativa</a><a class="chip" href="#/cap/3"><b>3</b>Órganos de representación</a><a class="chip" href="#/herramientas/linea"><b>⏱</b>Línea de tiempo</a><a class="chip" href="#/herramientas/listas"><b>✔</b>Listas de comprobación</a></div>`;
  $('#v-inicio').innerHTML = h;
  $('#hb').addEventListener('submit', e => { e.preventDefault(); const q = $('#hb-q').value.trim(); location.hash = '#/buscar/' + encodeURIComponent(q); });
}
function shortTitle(n) {
  const t = caps[n].titulo.replace(/^ANEXO I\.- /, 'Anexo I · ').replace(/\(.*\)/, '').trim();
  return t.length > 34 ? t.slice(0, 32).replace(/\s+\S*$/, '') + '…' : t;
}
function vistaIndice() {
  let h = `<div class="vista-cab"><h1>Índice</h1><p>${M.capitulos.length} apartados · toca para leer</p></div>`;
  h += tarjetaCap(0);
  M.partes.forEach(p => { h += `<div class="parte-bloque"><h2>Parte ${p.id} · ${esc(p.titulo)}</h2>${p.caps.map(tarjetaCap).join('')}</div>`; });
  $('#v-indice').innerHTML = h;
}
function tarjetaCap(n) {
  const c = caps[n];
  return `<a class="tarjeta-cap" href="#/cap/${n}"><span class="num" aria-hidden="true">${c.icono}</span><span><h3>${n ? `<small>${n}</small>` : ''}${esc(n ? c.titulo.replace(/^ANEXO I\.- /, 'Anexo I · ') : 'Introducción')}</h3><p>${esc(c.resumen)}</p></span></a>`;
}

/* ---------- capítulo ---------- */
let tickBloq = false;
function prepararCapitulo(art) {
  if (art.dataset.ok) return; art.dataset.ok = '1';
  const n = +art.dataset.cap, p = parteDe(n);
  $('[data-parte]', art).textContent = n === 0 ? 'Introducción' : p ? `Parte ${p.id} · ${p.titulo}` : '';
  const secs = $$('h2[id]', art);
  if (secs.length) {
    const nav = document.createElement('nav'); nav.className = 'cap-secciones'; nav.setAttribute('aria-label', 'Apartados del capítulo');
    nav.innerHTML = secs.map(h => `<a href="#/cap/${n}/${h.id}" data-s="${h.id}">${esc(h.textContent.match(/^\d+\.\d+/)?.[0] || '')} ${esc(shorten(h.textContent.replace(/^\d+\.\d+\.?-?\s*/, '')))}</a>`).join('');
    $('.cap-cuerpo', art).before(nav);
  }
  const favs = store.get('fav', {});
  secs.forEach(h => {
    const t = h.textContent;
    h.innerHTML = `<span class="txt">${esc(t)}</span><span class="acc"><button type="button" class="b-fav ${favs[h.id] ? 'on' : ''}" data-id="${h.id}" aria-label="Guardar en favoritos" aria-pressed="${!!favs[h.id]}">${favs[h.id] ? '★' : '☆'}</button><button type="button" class="b-nota ${favs[h.id]?.nota ? 'on' : ''}" data-id="${h.id}" aria-label="Nota personal">📝</button><button type="button" class="b-enl" data-id="${h.id}" aria-label="Compartir enlace">🔗</button></span>`;
  });
  const prev = caps[n - 1], next = caps[n + 1];
  const nv = document.createElement('div'); nv.className = 'cap-nav';
  nv.innerHTML = (prev ? `<a href="#/cap/${n - 1}"><small>← Anterior</small>${esc(titulosCap(n - 1))}</a>` : '') + (next ? `<a href="#/cap/${n + 1}"><small>Siguiente →</small>${esc(titulosCap(n + 1))}</a>` : '');
  $('.cap-cuerpo', art).after(nv);
  enlazarGlosario($('.cap-cuerpo', art), n);
}
function shorten(t) { t = t.replace(/\(.*?\)/g, '').trim(); return t.length > 30 ? t.slice(0, 28).replace(/\s+\S*$/, '') + '…' : t; }
document.addEventListener('click', e => {
  const f = e.target.closest('.b-fav'), nt = e.target.closest('.b-nota'), en = e.target.closest('.b-enl');
  if (f) {
    const id = f.dataset.id, favs = store.get('fav', {}), cap = +id.split('-')[1];
    if (favs[id]) { delete favs[id]; } else { favs[id] = { cap, t: f.closest('h2').querySelector('.txt').textContent, nota: '' }; }
    store.set('fav', favs); f.classList.toggle('on', !!favs[id]); f.textContent = favs[id] ? '★' : '☆'; f.setAttribute('aria-pressed', String(!!favs[id]));
    toast(favs[id] ? 'Guardado en favoritos' : 'Quitado de favoritos');
  } else if (nt) editarNota(nt.dataset.id, nt.closest('h2').querySelector('.txt').textContent, nt);
  else if (en) { const url = location.href.split('#')[0] + '#/cap/' + en.dataset.id.split('-')[1] + '/' + en.dataset.id; compartir($('.txt', en.closest('h2')).textContent, url); }
  const z = e.target.closest('.zoom'); if (z) abrirLightbox(z.querySelector('img'));
  const g = e.target.closest('abbr.gl'); if (g) abrirTermino(+g.dataset.g);
});
function editarNota(id, titulo, btn) {
  const favs = store.get('fav', {}); const cap = +id.split('-')[1];
  sheet(`<h3>Nota personal</h3><p style="margin:.2rem 0 .6rem;font-size:.85rem;color:var(--txt2)">${esc(titulo)}</p><textarea id="nota-t" placeholder="Escribe tu nota (solo se guarda en este dispositivo)">${esc(favs[id]?.nota || '')}</textarea><div class="botones"><button class="btn" id="nota-g" type="button">Guardar</button></div>`, c => {
    $('#nota-t', c).focus();
    $('#nota-g', c).onclick = () => {
      const f = store.get('fav', {}); const v = $('#nota-t', c).value.trim();
      if (!f[id]) f[id] = { cap, t: titulo, nota: '' };
      f[id].nota = v;
      store.set('fav', f); cerrarSheet(); toast('Nota guardada');
      if (btn) { btn.classList.toggle('on', !!v); const fb = btn.parentElement.querySelector('.b-fav'); fb.classList.add('on'); fb.textContent = '★'; }
      if (location.hash.startsWith('#/favoritos')) vistaFavoritos();
    };
  });
}

/* ---------- glosario ---------- */
let reGl = null, mapGl = {};
function prepararGlosario() {
  const terms = [];
  M.glosario.forEach((g, i) => [g.t, ...(g.alt || [])].forEach(a => { terms.push(a); mapGl[plano(a)] = i; }));
  terms.sort((a, b) => b.length - a.length);
  const esc2 = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { reGl = new RegExp('(?<![\\p{L}\\p{N}.])(' + terms.map(esc2).join('|') + ')(?![\\p{L}\\p{N}])', 'giu'); } catch (e) { reGl = null; }
}
function enlazarGlosario(cuerpo, n) {
  if (!reGl) return;
  const vistos = new Set();
  const w = document.createTreeWalker(cuerpo, NodeFilter.SHOW_TEXT, { acceptNode(nd) {
    const p = nd.parentElement; if (!p || p.closest('h1,h2,h3,h4,.ref,.ref-bloque,a,button,abbr,details,summary,textarea,.callout-head,th')) return NodeFilter.FILTER_REJECT;
    return /\S/.test(nd.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
  nodos.forEach(nd => {
    const txt = nd.nodeValue; reGl.lastIndex = 0; let m, ult = 0, frag = null;
    while ((m = reGl.exec(txt))) {
      const idx = mapGl[plano(m[1])]; if (idx === undefined || vistos.has(idx)) continue;
      vistos.add(idx); frag = frag || document.createDocumentFragment();
      frag.append(txt.slice(ult, m.index));
      const ab = document.createElement('abbr'); ab.className = 'gl'; ab.tabIndex = 0; ab.dataset.g = idx; ab.title = 'Ver definición'; ab.textContent = m[1]; frag.append(ab);
      ult = m.index + m[1].length;
    }
    if (frag) { frag.append(txt.slice(ult)); nd.replaceWith(frag); }
  });
}
function abrirTermino(i) {
  const g = M.glosario[i];
  sheet(`<h3>${esc(g.t)}</h3><p>${esc(g.d)}</p><p><a href="#/cap/${g.cap}" id="gl-v">Ver capítulo ${g.cap} →</a> · <a href="#/glosario/${encodeURIComponent(g.t)}" id="gl-t">Todo el glosario</a></p>`, c => { c.querySelectorAll('a').forEach(a => a.addEventListener('click', cerrarSheet)); });
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('abbr.gl')) abrirTermino(+e.target.dataset.g); });
function vistaGlosario(foco) {
  const lista = M.glosario.map((g, i) => ({ g, i })).sort((a, b) => a.g.t.localeCompare(b.g.t, 'es'));
  $('#v-glosario').innerHTML = `<div class="vista-cab"><h1>Glosario</h1><p>${lista.length} términos y siglas usados en el manual.</p></div><input class="gl-filtro" id="gl-f" type="search" placeholder="Filtrar términos…" aria-label="Filtrar glosario"><div id="gl-l">${lista.map(({ g }) => `<div class="gl-item" id="g-${plano(g.t).replace(/\W+/g, '-')}" data-k="${esc(plano(g.t + ' ' + (g.alt || []).join(' ') + ' ' + g.d))}"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p><a href="#/cap/${g.cap}">Ver capítulo ${g.cap} →</a></div>`).join('')}</div>`;
  $('#gl-f').addEventListener('input', e => { const q = plano(e.target.value.trim()); $$('.gl-item').forEach(it => { it.hidden = q && !it.dataset.k.includes(q); }); });
  if (foco) { const el = $('#g-' + plano(foco).replace(/\W+/g, '-')); if (el) { el.scrollIntoView({ block: 'center' }); el.style.background = 'var(--rosa-bg)'; } }
}

/* ---------- búsqueda ---------- */
let indice = null;
function prepararIndice() { indice = M.indice.map(d => ({ ...d, nt: plano(d.t), nx: plano(d.x) })); }
function buscar(q) {
  const toks = plano(q).split(/[^a-z0-9ñ./]+/).filter(t => t.length >= 2);
  if (!toks.length) return [];
  const calc = (d, all) => {
    let s = 0, ok = 0;
    for (const t of toks) {
      let c = 0, p = -1; while ((p = d.nx.indexOf(t, p + 1)) !== -1 && c < 12) c++;
      const ti = d.nt.includes(t);
      if (c || ti) { ok++; s += c + (ti ? 10 : 0); }
    }
    return all ? (ok === toks.length ? s : 0) : s;
  };
  let res = indice.map(d => ({ d, s: calc(d, true) })).filter(r => r.s > 0);
  if (!res.length && toks.length > 1) res = indice.map(d => ({ d, s: calc(d, false) })).filter(r => r.s > 0);
  res.sort((a, b) => b.s - a.s);
  return { toks, res: res.slice(0, 40) };
}
function resaltar(txt, toks) {
  const pl = plano(txt); let pos = -1;
  for (const t of toks) { const p = pl.indexOf(t); if (p !== -1 && (pos === -1 || p < pos)) pos = p; }
  const ini = Math.max(0, pos - 70), fin = Math.min(txt.length, ini + 230);
  let frag = txt.slice(ini, fin), pf = pl.slice(ini, fin), out = '', i = 0;
  while (i < frag.length) {
    let hit = null; for (const t of toks) if (pf.startsWith(t, i) && (!hit || t.length > hit.length)) hit = t;
    if (hit) { out += '<mark>' + esc(frag.slice(i, i + hit.length)) + '</mark>'; i += hit.length; } else { out += esc(frag[i]); i++; }
  }
  return (ini > 0 ? '… ' : '') + out + (fin < txt.length ? ' …' : '');
}
function vistaBuscar(q) {
  const v = $('#v-buscar');
  if (!v.dataset.ok) {
    v.dataset.ok = '1';
    v.innerHTML = `<div class="busca-in"><input id="bq" type="search" placeholder="Buscar en todo el manual…" aria-label="Buscar" autocomplete="off" enterkeyhint="search"></div><div class="sugerencias" id="bsug"></div><div id="bres"></div>`;
    $('#bsug').innerHTML = ['preaviso', 'mesa electoral', 'voto por correo', 'candidaturas', 'interventor', 'impugnación', 'censo', 'plazo'].map(s => `<a class="chip" href="#/buscar/${encodeURIComponent(s)}">${s}</a>`).join('');
    let t; $('#bq').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => pintar(e.target.value), 130); });
  }
  $('#bq').value = q || ''; pintar(q || '');
  if (!q) setTimeout(() => $('#bq').focus(), 60);
  function pintar(txt) {
    const cont = $('#bres'); txt = (txt || '').trim();
    if (!txt) { cont.innerHTML = '<p class="vacio">Escribe una palabra o un artículo (por ejemplo «preaviso», «67.1» o «interventor»).</p>'; return; }
    const r = buscar(txt);
    if (!r.res || !r.res.length) { cont.innerHTML = `<p class="vacio">Sin resultados para «${esc(txt)}». Prueba con otra palabra o con menos letras.</p>`; return; }
    cont.innerHTML = `<p style="font-size:.8rem;color:var(--txt2);margin:.2rem 0">${r.res.length} resultado${r.res.length > 1 ? 's' : ''}</p>` + r.res.map(({ d }) =>
      `<a class="res" href="#/cap/${d.c}${d.s ? '/' + d.s : ''}"><small>${d.c ? 'Capítulo ' + d.c : 'Introducción'}</small><h3>${esc(d.t)}</h3><p>${resaltar(d.x, r.toks)}</p></a>`).join('');
  }
}

/* ---------- favoritos ---------- */
function vistaFavoritos() {
  const favs = store.get('fav', {}); const ids = Object.keys(favs).sort((a, b) => { const x = a.split('-'), y = b.split('-'); return (+x[1] - +y[1]) || (+x[2] - +y[2]); });
  let h = `<div class="vista-cab"><h1>Favoritos y notas</h1><p>Se guardan solo en este dispositivo.</p></div>`;
  if (!ids.length) h += `<p class="vacio">Aún no has guardado nada.<br>Toca ☆ junto al título de cualquier apartado para añadirlo, o 📝 para escribir una nota.</p>`;
  else {
    h += ids.map(id => `<div class="fav"><a href="${hrefSec(id.replace(/^s-(\d+)-(\d+)$/, '$1.$2'))}">${esc(favs[id].t)}</a><textarea data-id="${id}" placeholder="Nota personal…" aria-label="Nota">${esc(favs[id].nota || '')}</textarea><div class="botones"><button class="btn sec peq" data-q="${id}" type="button">Quitar</button></div></div>`).join('');
    h += `<div class="botones"><button class="btn sec" id="f-exp" type="button">⬇ Exportar (.md)</button><button class="btn sec" id="f-cop" type="button">Copiar</button></div>`;
  }
  const v = $('#v-favoritos'); v.innerHTML = h;
  v.onchange = e => { if (e.target.matches('textarea')) { const f = store.get('fav', {}); f[e.target.dataset.id].nota = e.target.value.trim(); store.set('fav', f); toast('Nota guardada'); } };
  v.onclick = e => {
    const q = e.target.closest('[data-q]'); if (q) { const f = store.get('fav', {}); delete f[q.dataset.q]; store.set('fav', f); vistaFavoritos(); return; }
    const md = () => '# Mis favoritos y notas · Manual de Elecciones Sindicales\n\n' + ids.map(id => `## ${favs[id].t}\n${location.href.split('#')[0]}${hrefSec(id.replace(/^s-(\d+)-(\d+)$/, '$1.$2'))}\n\n${favs[id].nota || '_Sin nota_'}\n`).join('\n');
    if (e.target.id === 'f-exp') descargar('mis-notas-elecciones.md', md(), 'text/markdown');
    if (e.target.id === 'f-cop') copiar(md());
  };
}

/* ---------- herramientas ---------- */
function vistaHerramientas(id) {
  const v = $('#v-herramientas');
  if (!id || !window.HERR.mapa[id]) {
    v.innerHTML = `<div class="vista-cab"><h1>Herramientas</h1><p>Calculadoras y ayudas basadas en el contenido del manual. Son orientativas: ante dudas, consulta con la Oficina Electoral.</p></div><div class="herr-grid">${window.HERR.lista.map(t => `<a class="herr" href="#/herramientas/${t.id}"><span class="ico">${t.icono}</span><span><h3>${esc(t.titulo)}</h3><p>${esc(t.desc)}</p></span></a>`).join('')}</div>`;
    return;
  }
  const t = window.HERR.mapa[id];
  v.innerHTML = `<a class="volver" href="#/herramientas">← Herramientas</a><div class="vista-cab"><h1>${t.icono} ${esc(t.titulo)}</h1><p>${esc(t.desc)}</p></div><div id="herr-c"></div>`;
  t.render($('#herr-c'));
}

/* ---------- acerca ---------- */
let instalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalar = e; });
function vistaAcerca() {
  const web = /^https?:/.test(location.protocol);
  $('#acerca-extra').innerHTML = `<h2 class="sec-t">Esta versión interactiva</h2><div class="caja"><p>Reproduce íntegramente el contenido del manual impreso, con navegación, buscador, filtro por colectivo, glosario, favoritos y herramientas de cálculo. Las calculadoras son una ayuda orientativa y <strong>no sustituyen</strong> al texto legal ni al asesoramiento de la Oficina Electoral.</p>
  <p style="font-size:.85rem;color:var(--txt2)">Versión ${esc(M.version)}. Los favoritos y notas se guardan únicamente en tu dispositivo.</p>
  <div class="botones">${instalar ? '<button class="btn" id="ac-inst" type="button">📲 Instalar como app</button>' : ''}<button class="btn sec" id="ac-comp" type="button">Compartir</button><a class="btn sec" href="#/herramientas/qr">Código QR</a>${web ? '<a class="btn sec" href="manual-original.pdf" target="_blank" rel="noopener">PDF original</a>' : ''}</div></div>`;
  const i = $('#ac-inst'); if (i) i.onclick = async () => { instalar.prompt(); await instalar.userChoice; instalar = null; };
  $('#ac-comp').onclick = () => compartir('Manual de Elecciones Sindicales · FAC-USO', location.href.split('#')[0]);
}

/* ---------- lightbox ---------- */
let zoom = 1;
function abrirLightbox(img) { const lb = $('#lightbox'); const im = $('img', lb); im.src = img.src; im.alt = img.alt; zoom = 1; im.style.width = '100%'; lb.hidden = false; document.body.style.overflow = 'hidden'; }
function cerrarLb() { $('#lightbox').hidden = true; document.body.style.overflow = ''; }
$('#lb-x').onclick = cerrarLb;
$('#lb-mas').onclick = () => { zoom = Math.min(4, zoom + .5); $('#lightbox img').style.width = zoom * 100 + '%'; };
$('#lb-menos').onclick = () => { zoom = Math.max(1, zoom - .5); $('#lightbox img').style.width = zoom * 100 + '%'; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrarLb(); cerrarSheet(); menu(false); $('#ajustes').hidden = true; } });

/* ---------- router ---------- */
function activarTab(t) { $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t)); }
let ultimaSecAct = '';
function mostrar() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const sec = p[0] || 'inicio';
  $$('.vista').forEach(v => { v.hidden = true; });
  $$('#v-capitulos > .cap').forEach(c => { c.hidden = true; });
  $('#progreso').style.width = '0';
  let titulo = 'Manual de Elecciones Sindicales · FAC-USO', tab = sec, irA = null;
  if (sec === 'cap' && caps[+p[1]]) {
    const n = +p[1]; const art = $('#c-' + n); prepararCapitulo(art); art.hidden = false; tab = 'indice';
    titulo = titulosCap(n) + ' · Manual de Elecciones'; irA = p[2] || null;
    $$('.mn-cap').forEach(a => a.classList.toggle('act', +a.dataset.c === n));
    const cont = irA ? document.getElementById(irA) : null;
    if (cont) setTimeout(() => cont.scrollIntoView({ block: 'start' }), 30); else { window.scrollTo(0, 0); }
    store.set('ult', { cap: n, sid: irA || '' });
  } else {
    const vistas = { inicio: vistaInicio, indice: vistaIndice, herramientas: () => vistaHerramientas(p[1]), buscar: () => vistaBuscar(p[1]), favoritos: vistaFavoritos, glosario: () => vistaGlosario(p[1]), acerca: vistaAcerca };
    const nombre = vistas[sec] ? sec : 'inicio'; (vistas[nombre])(); $('#v-' + nombre).hidden = false; tab = nombre; window.scrollTo(0, 0);
    $$('.mn-cap').forEach(a => a.classList.remove('act'));
    if (nombre === 'herramientas' && p[1] && window.HERR.mapa[p[1]]) titulo = window.HERR.mapa[p[1]].titulo + ' · Manual de Elecciones';
  }
  document.title = titulo; activarTab(tab); aplicarAjustes();
}
function alScroll() {
  if (tickBloq) return; tickBloq = true;
  requestAnimationFrame(() => {
    tickBloq = false;
    const art = $('#v-capitulos > .cap:not([hidden])');
    const alto = document.documentElement.scrollHeight - innerHeight;
    $('#progreso').style.width = art && alto > 0 ? Math.min(100, scrollY / alto * 100) + '%' : '0';
    if (!art) return;
    const hs = $$('h2[id]', art); let act = '';
    for (const h of hs) { if (h.getBoundingClientRect().top < 140) act = h.id; else break; }
    if (act !== ultimaSecAct) {
      ultimaSecAct = act;
      $$('.cap-secciones a', art).forEach(a => { const on = a.dataset.s === act; a.classList.toggle('act', on); if (on) { const n = a.parentElement; n.scrollTo({ left: a.offsetLeft - 20, behavior: 'smooth' }); } });
      const u = store.get('ult', null); if (u) { u.sid = act; store.set('ult', u); }
    }
  });
}
addEventListener('scroll', alScroll, { passive: true });
addEventListener('hashchange', () => { ultimaSecAct = ''; mostrar(); });

/* ---------- arranque ---------- */
aplicarAjustes(); construirMenu(); prepararGlosario(); prepararIndice();
mostrar();
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
