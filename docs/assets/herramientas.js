/* Herramientas interactivas — Manual de Elecciones Sindicales · FAC-USO
   Toda la lógica de cálculo está en `Calc` (funciones puras, probadas con los ejemplos del manual). */
(function (root) {
'use strict';

/* =====================  LÓGICA DE CÁLCULO (pura)  ===================== */
const Calc = {
  /** Miembros del comité de empresa / junta de personal según plantilla (cap. 3.2 y 3.4) */
  miembros(n) {
    if (n < 50) return 0;
    if (n <= 100) return 5;
    if (n <= 250) return 9;
    if (n <= 500) return 13;
    if (n <= 750) return 17;
    if (n <= 1000) return 21;
    return Math.min(75, 21 + 2 * Math.ceil((n - 1000) / 1000));
  },
  /** Órgano que corresponde. colectivo: 'empresa' | 'aapp' */
  organo(colectivo, n) {
    const aapp = colectivo === 'aapp';
    const r = { n, aapp, tipo: '', miembros: 0, lista: '', mesas: 0, notas: [], ref: [] };
    if (n < 6) { r.tipo = 'ninguno'; r.notas.push('Por debajo de 6 personas el manual no prevé órgano de representación unitaria.'); return r; }
    if (n < 50) {
      r.tipo = 'delegados'; r.lista = 'abiertas'; r.mesas = 1; r.ref = ['3.1', '13.2', '17.4', '17.5'];
      if (n <= 30) {
        r.miembros = 1;
        if (!aapp && n <= 10) r.notas.push('Entre 6 y 10 personas, el delegado o delegada solo se elige si así se decide por mayoría.');
      } else r.miembros = 3;
      r.notas.push(n <= 30 ? 'Proceso de 24 horas como mínimo entre la constitución de la mesa y la votación.' : 'Entre la constitución de la mesa y la votación no pueden pasar más de 10 días ni menos de 24 horas.');
      r.notas.push('Se presentan tantos candidatos y candidatas como puestos a cubrir (lista abierta).');
    } else {
      r.tipo = aapp ? 'junta' : 'comite'; r.lista = 'cerradas'; r.miembros = Calc.miembros(n); r.ref = aapp ? ['3.4', '13.3', '11.2'] : ['3.2', '13.3', '15.1'];
      r.mesas = Math.ceil(n / 250);
      r.notas.push(aapp ? 'En las unidades electorales de 50 o más funcionarios y funcionarias: junta de personal (listas cerradas).' : 'Con 50 o más personas: comité de empresa (listas cerradas) y dos colegios electorales (técnicos y administrativos / especialistas y no cualificados).');
      r.notas.push(`Cada candidatura debe presentar al menos tantos nombres como puestos (${r.miembros}); si hay renuncias, debe conservar como mínimo el 60 % (${Math.ceil(r.miembros * 0.6)}).`);
      r.notas.push(aapp ? 'Una mesa por cada 250 funcionarios o fracción, salvo que los sindicatos acuerden otra distribución.' : 'Una mesa por cada colegio de 250 personas o fracción.');
      if (n > 1000) r.notas.push('A partir de 1.001 personas: 2 miembros más por cada 1.000 o fracción, con un máximo de 75.');
      if (n >= 50 && n < 60) r.notas.push('Cuenta también al personal eventual (ver «Plantilla con eventuales»).');
    }
    return r;
  },
  /** Plantilla con personal eventual (cap. 15.4). */
  plantilla(fijos, mayor1anio, diasMenos1anio, presentesMenos1anio) {
    const equiv = diasMenos1anio / 200;
    const tope = presentesMenos1anio > 0 ? Math.min(equiv, presentesMenos1anio) : equiv;
    return { equiv, aplicadoTope: presentesMenos1anio > 0 && equiv > presentesMenos1anio, computados: tope, total: fijos + mayor1anio + tope };
  },
  /** Reparto de puestos entre dos colegios (cap. 15.3): cociente + mayor fracción. */
  colegios(nEsp, nTec) {
    const N = nEsp + nTec, M = Calc.miembros(N);
    const r = { N, M, filas: [], unico: false, empate: false };
    if (N < 50) return r;
    const col = [{ k: 'Especialistas y no cualificados', n: nEsp }, { k: 'Técnicos y administrativos', n: nTec }];
    col.forEach(c => { c.num = c.n * M; c.cociente = c.num / N; c.ent = Math.floor(c.num / N); c.resto = c.num % N; });
    r.unico = col.some(c => c.num * 2 < N); // cociente < 0,5
    if (r.unico) { r.filas = [{ k: 'Colegio único', n: N, cociente: M, escanos: M }]; return r; }
    let sobran = M - col[0].ent - col[1].ent;
    const orden = col.slice().sort((a, b) => b.resto - a.resto);
    col.forEach(c => { c.escanos = c.ent; });
    if (sobran > 0) {
      if (sobran === 1 && orden[0].resto === orden[1].resto) { r.empate = true; }
      else orden.slice(0, sobran).forEach(c => { c.escanos += 1; });
    }
    r.filas = col; r.mesas = col.map(c => Math.ceil(c.n / 250));
    return r;
  },
  /** Atribución en listas cerradas (cap. 20.1 y 20.4). */
  atribuir(puestos, blancos, listas) {
    const votosListas = listas.reduce((s, l) => s + l.votos, 0);
    const validosUmbral = votosListas + blancos; // los votos en blanco cuentan para el 5 %
    const filas = listas.map(l => ({ ...l, pct: validosUmbral ? l.votos * 100 / validosUmbral : 0, pasa: l.votos > 0 && l.votos * 100 >= 5 * validosUmbral }));
    const S = filas.filter(f => f.pasa).reduce((s, f) => s + f.votos, 0);
    const out = { validosUmbral, S, puestos, cociente: S && puestos ? S / puestos : 0, filas, sobrantes: 0, empate: false };
    if (!S || !puestos) { filas.forEach(f => { f.escanos = 0; }); return out; }
    filas.forEach(f => { if (f.pasa) { const num = f.votos * puestos; f.ent = Math.floor(num / S); f.resto = num % S; f.fraccion = f.resto / S; f.escanos = f.ent; } else { f.escanos = 0; } });
    let sobran = puestos - filas.reduce((s, f) => s + (f.ent || 0), 0);
    out.sobrantes = sobran;
    const cand = filas.filter(f => f.pasa).sort((a, b) => b.resto - a.resto);
    if (sobran > 0) {
      const corte = cand[sobran - 1].resto;
      const iguales = cand.filter(f => f.resto === corte);
      const dentro = cand.slice(0, sobran).filter(f => f.resto === corte).length;
      if (iguales.length > dentro) { out.empate = true; cand.slice(0, sobran).forEach(f => { if (f.resto > corte) { f.escanos += 1; f.porResto = true; } }); iguales.forEach(f => { f.empate = true; }); }
      else cand.slice(0, sobran).forEach(f => { f.escanos += 1; f.porResto = true; });
    }
    return out;
  },
  /** Listas abiertas (cap. 20.3): resultan elegidos los más votados. */
  abierta(puestos, cands) {
    const orden = cands.map((c, i) => ({ ...c, i })).sort((a, b) => b.votos - a.votos);
    orden.forEach((c, k) => { c.elegido = k < puestos; });
    const corte = orden[puestos - 1] ? orden[puestos - 1].votos : null;
    const empate = corte !== null && orden[puestos] && orden[puestos].votos === corte && puestos > 0;
    if (empate) orden.forEach(c => { if (c.votos === corte) c.empate = true; });
    return { orden: orden.sort((a, b) => a.i - b.i), empate };
  },
  /* ---- fechas ---- */
  addMeses(d, m) { const r = new Date(d.getFullYear(), d.getMonth() + m, 1); const ult = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(d.getDate(), ult)); return r; },
  addDias(d, n) { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return r; },
  iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  esHabil(d, cfg) { const w = d.getDay(); if (w === 0) return false; if (w === 6 && !cfg.sabado) return false; return !cfg.festivos.has(Calc.iso(d)); },
  addHabiles(d, n, cfg) { let r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); let k = 0; while (k < n) { r = Calc.addDias(r, 1); if (Calc.esHabil(r, cfg)) k++; } return r; },
  parseFecha(v) { if (!v) return null; let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); if (m) return new Date(+m[3], +m[2] - 1, +m[1]); return null; },
  fmt(d) { return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); },
  /** Cadenas de plazos del Anexo I (días hábiles 'h' o naturales 'n'). */
  cadena(ruta, inicio, cfg, extra) {
    const pasos = [];
    let f = inicio;
    const add = (txt, tipo, n, ref, nota) => { f = tipo === 'h' ? Calc.addHabiles(f, n, cfg) : Calc.addDias(f, n); pasos.push({ txt, fecha: f, ref, nota }); };
    if (ruta === 'mesa') {
      add('Reclamación ante la mesa (como máximo)', 'h', 1, '25.1', 'Dentro del día laborable siguiente al acto.');
      add('Resolución de la reclamación por la mesa', 'h', 1, '25.1', '1 día hábil. Si no resuelve, se entiende desestimada.');
    } else if (ruta === 'arbitraje') {
      add('Escrito de iniciación del arbitraje', 'h', 3, '25.3', '3 días hábiles desde el hecho o desde la resolución de la reclamación por la mesa.');
      if (extra && extra.actas) pasos.push({ txt: 'Escrito de iniciación (si impugnas actos del día de la votación o posteriores)', fecha: Calc.addHabiles(extra.actas, 10, cfg), ref: '25.3', nota: '10 días hábiles desde la entrada de las actas en la Oficina Pública.' });
      add('Traslado del escrito y expediente al árbitro', 'h', 1, '25.3', '1 día hábil desde la recepción del escrito.');
      add('Celebración de la comparecencia', 'h', 3, '25.3', 'El árbitro convoca en 24 horas y se celebra en los 3 días hábiles siguientes.');
      add('Laudo arbitral', 'h', 3, '25.3', 'Dentro de los 3 días hábiles siguientes a la comparecencia.');
      add('Impugnación del laudo ante el Juzgado de lo Social', 'h', 3, '25.3', '3 días hábiles desde que se tiene conocimiento del laudo.');
      add('Acto de juicio', 'h', 5, '25.3', 'Dentro de los 5 días hábiles siguientes a la admisión de la demanda (se supone admitida el mismo día).');
      add('Sentencia', 'h', 3, '25.3', '3 días hábiles desde la celebración del juicio. No cabe recurso.');
    } else if (ruta === 'registro') {
      add('Publicación del acta en el tablón de la Oficina Pública', 'h', 1, '21.4', '1 día hábil desde su presentación.');
      add('Registro del acta o denegación del registro', 'h', 10, '21.5', '10 días hábiles desde la publicación.');
      add('Impugnación de la resolución denegatoria del registro', 'h', 10, '25.2', '10 días hábiles desde que se reciba la notificación (se supone recibida ese día).');
      add('Petición del expediente administrativo por el juez', 'n', 2, '25.2', '48 horas desde la admisión de la demanda.');
      add('Remisión del expediente por la Oficina Pública', 'n', 2, '25.2', '2 días.');
      add('Acto de juicio', 'h', 5, '25.2', 'Dentro de los 5 días hábiles siguientes a la recepción del expediente.');
      add('Sentencia', 'h', 3, '25.2', '3 días hábiles desde el juicio. No cabe recurso; si estima, ordena registrar el acta.');
    }
    return pasos;
  }
};
root.Calc = Calc;

/* =====================  INTERFAZ  ===================== */
if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = { Calc }; return; }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const A = () => root.APP;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = el => Math.max(0, parseInt(el && el.value, 10) || 0);
const enlaces = refs => refs.map(r => `<a href="${A().hrefSec(r)}">${r}</a>`).join(' · ');
const AVISO = '<div class="aviso"><strong>Herramienta orientativa.</strong> Se basa en el contenido del manual (edición 2023) y no sustituye al texto legal ni al asesoramiento de la Oficina Electoral. Revisa convenios y normas autonómicas aplicables.</div>';

const T = [];
function def(id, icono, titulo, desc, render) { T.push({ id, icono, titulo, desc, render }); }

/* ---- 1. Órgano ---- */
def('organo', '👥', '¿Qué órgano me corresponde?', 'Delegados, comité de empresa o junta de personal, y cuántos miembros.', el => {
  el.innerHTML = `<div class="form"><div class="campo"><label for="o-col">Colectivo</label><select id="o-col"><option value="empresa">Empresa privada / personal laboral</option><option value="aapp">Administración pública (personal funcionario y estatutario)</option></select></div>
  <div class="campo"><label for="o-n">Plantilla o censo (personas)</label><input id="o-n" type="number" inputmode="numeric" min="0" placeholder="Ej.: 120"><small>Cuenta a las personas fijas y a las eventuales (ver «Plantilla con eventuales»).</small></div></div><div id="o-r"></div>${AVISO}`;
  const calc = () => {
    const n = num($('#o-n', el)); const out = $('#o-r', el);
    if (!$('#o-n', el).value) { out.innerHTML = ''; return; }
    const r = Calc.organo($('#o-col', el).value, n);
    const nombre = { ninguno: 'Sin órgano unitario', delegados: r.miembros === 1 ? '1 delegado o delegada de personal' : '3 delegados o delegadas de personal', comite: `Comité de empresa de ${r.miembros} miembros`, junta: `Junta de personal de ${r.miembros} miembros` }[r.tipo];
    out.innerHTML = `<div class="resultado"><h3>${esc(nombre)}</h3>${r.tipo !== 'ninguno' ? `<div class="grande">${r.miembros}</div><p style="margin:.2rem 0">${r.miembros === 1 ? 'persona a elegir' : 'personas a elegir'} · sistema de listas ${r.lista}${r.mesas ? ` · ${r.mesas} mesa${r.mesas > 1 ? 's' : ''}` : ''}</p>` : ''}<ul>${r.notas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${r.ref.length ? `<p style="font-size:.8rem;margin:.4rem 0 0">Ver en el manual: ${enlaces(r.ref)}</p>` : ''}</div>`;
  };
  el.addEventListener('input', calc);
});

/* ---- 2. Plantilla con eventuales ---- */
def('plantilla', '🧾', 'Plantilla con eventuales', 'Calcula el censo a efectos de determinar el número de representantes.', el => {
  el.innerHTML = `<div class="form"><div class="campo"><label for="p-a">Personas trabajadoras fijas</label><input id="p-a" type="number" inputmode="numeric" min="0" placeholder="0"></div>
  <div class="campo"><label for="p-b">Fijas discontinuas o con contrato superior a un año</label><input id="p-b" type="number" inputmode="numeric" min="0" placeholder="0"></div>
  <div class="campo"><label for="p-c">Días trabajados en el último año por quienes tienen contrato inferior a un año</label><input id="p-c" type="number" inputmode="numeric" min="0" placeholder="0"><small>Se suman los días efectivamente trabajados y los de descanso (semanal, festivos y vacaciones), de personas que a la votación lleven al menos 1 mes trabajando.</small></div>
  <div class="campo"><label for="p-d">Personas con contrato inferior a un año que prestan servicio en la fecha de inicio del proceso (opcional)</label><input id="p-d" type="number" inputmode="numeric" min="0" placeholder="0"><small>Si el cociente de días ÷ 200 supera este número, se toma como máximo este número.</small></div></div><div id="p-r"></div>
  <p style="font-size:.85rem">Regla del manual: contratos fijos 1 × 1; fijos discontinuos o de más de un año 1 × 1; contratos de menos de un año: 1 por cada 200 días trabajados. Ver ${enlaces(['15.4'])}.</p>${AVISO}`;
  el.addEventListener('input', () => {
    const r = Calc.plantilla(num($('#p-a', el)), num($('#p-b', el)), num($('#p-c', el)), num($('#p-d', el)));
    $('#p-r', el).innerHTML = `<div class="resultado"><h3>Plantilla a efectos de representantes</h3><div class="grande">${(Math.round(r.total * 100) / 100).toLocaleString('es-ES')}</div><ul><li>Personas por contratos de menos de un año: ${(Math.round(r.computados * 100) / 100).toLocaleString('es-ES')} (${num($('#p-c', el)).toLocaleString('es-ES')} días ÷ 200${r.aplicadoTope ? '; aplicado el tope de personas presentes' : ''}).</li><li>El manual no fija un criterio de redondeo: aplica el que acuerde la mesa o establezca la normativa.</li><li>Ejemplo del manual: 100 + 40 + 24.000 ÷ 200 = 260.</li></ul></div>`;
  });
});

/* ---- 3. Colegios ---- */
def('colegios', '🏛️', 'Reparto de puestos por colegios', 'Cuántos representantes corresponden a cada colegio electoral.', el => {
  el.innerHTML = `<div class="form"><div class="fila2"><div class="campo"><label for="c-e">Especialistas y no cualificados</label><input id="c-e" type="number" inputmode="numeric" min="0" placeholder="450"></div><div class="campo"><label for="c-t">Técnicos y administrativos</label><input id="c-t" type="number" inputmode="numeric" min="0" placeholder="100"></div></div></div><div id="c-r"></div>
  <p style="font-size:.85rem">Puestos de cada colegio = personas del colegio × miembros del comité ÷ plantilla total. Las fracciones se adjudican al colegio con la fracción más alta (si empatan, sorteo). Si a un colegio le corresponde menos de 0,5, se constituye colegio único. Ver ${enlaces(['15.1', '15.3'])}.</p>${AVISO}`;
  el.addEventListener('input', () => {
    const e = num($('#c-e', el)), t = num($('#c-t', el)), out = $('#c-r', el); if (!e && !t) { out.innerHTML = ''; return; }
    const r = Calc.colegios(e, t);
    if (r.N < 50) { out.innerHTML = '<div class="resultado"><h3>Menos de 50 personas</h3><p>No se constituye comité de empresa: ver «¿Qué órgano me corresponde?».</p></div>'; return; }
    if (r.unico) { out.innerHTML = `<div class="resultado"><h3>Colegio único</h3><p>A uno de los colegios le corresponde menos de 0,5: se constituye un solo colegio electoral con ${r.M} miembros.</p></div>`; return; }
    out.innerHTML = `<div class="resultado"><h3>Comité de ${r.M} miembros · plantilla ${r.N}</h3><div class="res-scroll"><table class="tabla-res"><thead><tr><th>Colegio</th><th>Cociente</th><th>Puestos</th><th>Mesas</th></tr></thead><tbody>${r.filas.map((c, i) => `<tr><td>${esc(c.k)} (${c.n})</td><td>${(c.num / r.N).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td class="ok">${r.empate ? c.ent + (c.resto === r.filas[1 - i].resto ? ' (+1 por sorteo)' : '') : c.escanos}</td><td>${r.mesas[i]}</td></tr>`).join('')}</tbody></table></div>${r.empate ? '<p class="aviso">Las fracciones son iguales: la unidad restante se adjudica por sorteo.</p>' : ''}</div>`;
  });
});

/* ---- 4. Resultados ---- */
def('resultados', '🧮', 'Atribución de resultados', 'Reparto de puestos por cociente y restos (listas cerradas) o por votos (listas abiertas).', el => {
  let modo = 'cerradas';
  let filas = [{ n: 'Lista 1', v: '' }, { n: 'Lista 2', v: '' }, { n: 'Lista 3', v: '' }];
  const pinta = () => {
    el.innerHTML = `<div class="pestanas" role="tablist"><button data-m="cerradas" class="${modo === 'cerradas' ? 'on' : ''}">Listas cerradas (comité / junta)</button><button data-m="abiertas" class="${modo === 'abiertas' ? 'on' : ''}">Listas abiertas (delegados)</button></div>
    <div class="form"><div class="fila2"><div class="campo"><label for="r-p">Puestos a cubrir ${modo === 'cerradas' ? 'en el colegio' : ''}</label><input id="r-p" type="number" inputmode="numeric" min="1" placeholder="${modo === 'cerradas' ? '14' : '3'}" value="${store('p')}"></div>
    ${modo === 'cerradas' ? `<div class="campo"><label for="r-b">Votos en blanco</label><input id="r-b" type="number" inputmode="numeric" min="0" placeholder="0" value="${store('b')}"></div>` : ''}</div>
    <div class="filas-listas" id="r-f">${filas.map((f, i) => `<div class="fl"><input aria-label="Nombre ${i + 1}" data-i="${i}" data-c="n" value="${esc(f.n)}"><input aria-label="Votos ${i + 1}" data-i="${i}" data-c="v" type="number" inputmode="numeric" min="0" placeholder="Votos" value="${f.v}"><button type="button" data-x="${i}" aria-label="Quitar">×</button></div>`).join('')}</div>
    <div class="botones"><button class="btn sec peq" id="r-add" type="button">+ Añadir ${modo === 'cerradas' ? 'lista' : 'candidato'}</button><button class="btn sec peq" id="r-ej" type="button">Cargar ejemplo del manual</button></div></div><div id="r-r"></div>
    <p style="font-size:.85rem">${modo === 'cerradas' ? 'Solo reciben puestos las listas con al menos el 5 % de los votos válidos del colegio (los votos en blanco cuentan para ese 5 %, pero no para el reparto). Cociente = votos de las listas que superan el 5 % ÷ puestos; el resto de puestos va a los mayores restos.' : 'Resultan elegidos quienes obtengan más votos entre todos los candidatos y candidatas de la lista única.'} Ver ${enlaces(['20.1', modo === 'cerradas' ? '20.4' : '20.3'])}.</p>${AVISO}`;
    calcula();
  };
  const mem = {}; const store = k => (mem[k] === undefined ? '' : mem[k]);
  const calcula = () => {
    const P = num($('#r-p', el)); mem.p = $('#r-p', el).value; if ($('#r-b', el)) mem.b = $('#r-b', el).value;
    const ls = filas.map(f => ({ n: f.n || 'Sin nombre', votos: parseInt(f.v, 10) || 0 }));
    const out = $('#r-r', el);
    if (!P || !ls.some(l => l.votos)) { out.innerHTML = ''; return; }
    if (modo === 'cerradas') {
      const r = Calc.atribuir(P, num($('#r-b', el)), ls);
      out.innerHTML = `<div class="resultado"><h3>Resultado</h3><p style="margin:.1rem 0;font-size:.85rem">Votos válidos a efectos del 5 %: <strong>${r.validosUmbral}</strong> (umbral ${(r.validosUmbral * 0.05).toLocaleString('es-ES', { maximumFractionDigits: 2 })}) · Votos que se reparten: <strong>${r.S}</strong> · Cociente: <strong>${r.cociente.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</strong></p>
      <div class="res-scroll"><table class="tabla-res"><thead><tr><th>Lista</th><th>Votos</th><th>%</th><th>Ent.</th><th>Resto</th><th>Pto.</th></tr></thead><tbody>${r.filas.map(f => `<tr class="${f.pasa ? '' : 'elim'}"><td>${esc(f.n)}${f.pasa ? '' : ' (&lt;5 %)'}</td><td>${f.votos}</td><td>${f.pct.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</td><td>${f.pasa ? f.ent : '–'}</td><td>${f.pasa ? f.fraccion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'}</td><td class="ok">${f.escanos}${f.porResto ? ' *' : ''}${f.empate ? ' ⚠' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p style="font-size:.78rem;margin:.2rem 0">* puesto obtenido por mayor resto.</p>${r.empate ? '<p class="aviso">Empate de restos para el último puesto: resulta elegido el candidato o candidata de mayor antigüedad en la empresa o función pública (apartado 20.1.d). Marcadas con ⚠ las listas implicadas.</p>' : ''}
      ${r.S && r.filas.reduce((s, f) => s + f.escanos, 0) !== P && !r.empate ? '<p class="aviso">Revisa los datos: no se reparten todos los puestos.</p>' : ''}</div>`;
    } else {
      const r = Calc.abierta(P, ls);
      out.innerHTML = `<div class="resultado"><h3>Resultado</h3><div class="res-scroll"><table class="tabla-res"><thead><tr><th>Candidato/a</th><th>Votos</th><th>Elegido/a</th></tr></thead><tbody>${r.orden.map(c => `<tr><td>${esc(c.n)}</td><td>${c.votos}</td><td class="ok">${c.elegido ? 'Sí' : ''}${c.empate ? ' ⚠' : ''}</td></tr>`).join('')}</tbody></table></div>${r.empate ? '<p class="aviso">Hay empate de votos en el último puesto: resulta elegido el candidato o candidata de mayor antigüedad en la empresa o función pública (apartado 20.1.d).</p>' : ''}</div>`;
    }
  };
  pinta();
  el.addEventListener('click', e => {
    const m = e.target.closest('[data-m]'); if (m) { modo = m.dataset.m; filas = modo === 'cerradas' ? [{ n: 'Lista 1', v: '' }, { n: 'Lista 2', v: '' }, { n: 'Lista 3', v: '' }] : [{ n: 'Candidato 1', v: '' }, { n: 'Candidato 2', v: '' }, { n: 'Candidato 3', v: '' }, { n: 'Candidato 4', v: '' }]; pinta(); return; }
    const x = e.target.closest('[data-x]'); if (x) { filas.splice(+x.dataset.x, 1); pinta(); return; }
    if (e.target.id === 'r-add') { filas.push({ n: (modo === 'cerradas' ? 'Lista ' : 'Candidato ') + (filas.length + 1), v: '' }); pinta(); }
    if (e.target.id === 'r-ej') {
      if (modo === 'cerradas') { filas = [{ n: 'USO', v: 235 }, { n: 'CGT', v: 110 }, { n: 'CCOO', v: 61 }, { n: 'Solidaridad Obrera', v: 17 }]; mem.p = 14; mem.b = 10; }
      else { filas = [{ n: 'Artilla Ruiz, Consuelo (USO)', v: 31 }, { n: 'Jiménez Rol, Luis (CC.OO.)', v: 27 }, { n: 'Martínez Sánchez, Soledad (USO)', v: 24 }, { n: 'Ramos Tirado, Juan Emilio (UGT)', v: 11 }, { n: 'Rodríguez Campo, Úrsula (USO)', v: 29 }, { n: 'Torrico Mínguez, Encarna (CC.OO.)', v: 6 }]; mem.p = 3; }
      pinta();
    }
  });
  el.addEventListener('input', e => { const i = e.target.dataset.i; if (i !== undefined) filas[i][e.target.dataset.c] = e.target.value; calcula(); });
});

/* ---- 5. Plazos ---- */
def('plazos', '📅', 'Plazos y calendario', 'Preaviso, calendario de votación y plazos de impugnación (Anexo I), con exportación a tu calendario.', el => {
  let tab = 'preaviso';
  const festSet = txt => { const s = new Set(); (txt || '').split(/[\s,;]+/).forEach(x => { const d = Calc.parseFecha(x); if (d) s.add(Calc.iso(d)); }); return s; };
  const ics = (titulo, items) => {
    const f = d => Calc.iso(d).replace(/-/g, '');
    let s = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FAC-USO//Manual Elecciones//ES\r\n';
    items.forEach((it, i) => { s += `BEGIN:VEVENT\r\nUID:memf-${Date.now()}-${i}@facuso\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\nDTSTART;VALUE=DATE:${f(it.fecha)}\r\nDTEND;VALUE=DATE:${f(Calc.addDias(it.fecha, 1))}\r\nSUMMARY:${it.txt.replace(/[,;]/g, ' ')}\r\nDESCRIPTION:${(it.nota || '').replace(/[,;]/g, ' ')} (Manual de Elecciones Sindicales - FAC-USO)\r\nEND:VEVENT\r\n`; });
    return s + 'END:VCALENDAR\r\n';
  };
  const gcal = it => `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(it.txt)}&dates=${Calc.iso(it.fecha).replace(/-/g, '')}/${Calc.iso(Calc.addDias(it.fecha, 1)).replace(/-/g, '')}&details=${encodeURIComponent((it.nota || '') + ' — Manual de Elecciones Sindicales (FAC-USO)')}`;
  const lista = (items, titulo) => items.length ? `<div class="resultado"><h3>${esc(titulo)}</h3><div class="linea">${items.map(it => `<div class="paso-l"><h4>${esc(it.txt)}</h4><span class="cuando">${Calc.fmt(it.fecha)}</span><p>${esc(it.nota || '')}${it.ref ? ` <a href="${A().hrefSec(it.ref)}">Ver ${it.ref}</a>` : ''} · <a href="${gcal(it)}" target="_blank" rel="noopener">＋ Google Calendar</a></p></div>`).join('')}</div><div class="botones"><button class="btn verde peq" id="pl-ics" type="button">⬇ Descargar .ics (Outlook, Apple, Google)</button></div></div>` : '';
  const pinta = () => {
    el.innerHTML = `<div class="pestanas"><button data-t="preaviso" class="${tab === 'preaviso' ? 'on' : ''}">Preaviso</button><button data-t="calendario" class="${tab === 'calendario' ? 'on' : ''}">Calendario de votación</button><button data-t="recursos" class="${tab === 'recursos' ? 'on' : ''}">Impugnaciones y registro</button></div><div id="pl-c"></div><div id="pl-r"></div>${AVISO}`;
    const c = $('#pl-c', el);
    if (tab === 'preaviso') c.innerHTML = `<div class="form"><div class="campo"><label for="pa-v">Fecha de vencimiento del mandato</label><input id="pa-v" type="date"></div><div class="campo"><label for="pa-p">Fecha en que presentarás el preaviso (opcional)</label><input id="pa-p" type="date"></div></div><p style="font-size:.85rem">El preaviso se presenta con al menos 1 mes y como máximo 3 meses de antelación al inicio del proceso (constitución de la mesa). Para renovar la representación solo puede presentarse desde 3 meses antes del vencimiento. Ver ${enlaces(['6.5', '8.1'])}.</p>`;
    if (tab === 'calendario') c.innerHTML = `<div class="form"><div class="campo"><label for="ca-f">Fecha de constitución de la mesa electoral</label><input id="ca-f" type="date"></div><div class="campo"><label for="ca-t">Tipo de proceso</label><select id="ca-t"><option value="comite">Comité de empresa o junta de personal (50 o más)</option><option value="d3">Delegados de personal (31 a 49)</option><option value="d1">Delegados de personal (6 a 30)</option></select></div></div>`;
    if (tab === 'recursos') c.innerHTML = `<div class="form"><div class="campo"><label for="re-t">¿Qué plazo quieres calcular?</label><select id="re-t"><option value="mesa">Reclamación contra un acto de la mesa</option><option value="arbitraje">Procedimiento arbitral y recurso contra el laudo</option><option value="registro">Registro del acta y denegación</option></select></div><div class="campo"><label for="re-f" id="re-fl">Fecha del acto de la mesa</label><input id="re-f" type="date"></div><div class="campo" id="re-a-w" hidden><label for="re-a">Fecha de entrada de las actas en la Oficina (si impugnas actos del día de la votación o posteriores)</label><input id="re-a" type="date"></div>
    <div class="campo"><label><input type="checkbox" id="re-s"> Contar los sábados como días hábiles</label></div><div class="campo"><label for="re-h">Festivos (fechas separadas por comas o espacios)</label><textarea id="re-h" rows="2" placeholder="25/12/2025, 01/01/2026"></textarea><small>Por defecto no se cuentan domingos ni los festivos que indiques. Los sábados se consideran inhábiles salvo que lo marques. Comprueba el cómputo aplicable a tu caso.</small></div></div>`;
    calcula();
  };
  let ultimo = [];
  const calcula = () => {
    const out = $('#pl-r', el); out.innerHTML = ''; ultimo = [];
    if (tab === 'preaviso') {
      const v = Calc.parseFecha($('#pa-v', el)?.value); const p = Calc.parseFecha($('#pa-p', el)?.value);
      let h = '';
      if (v) {
        const ini = Calc.addMeses(v, -3), a = Calc.addMeses(ini, 1), b = Calc.addMeses(ini, 3);
        ultimo = [{ txt: 'Primer día para presentar el preaviso', fecha: ini, ref: '6.5', nota: 'Faltan 3 meses para el vencimiento del mandato.' }, { txt: 'Primer día posible de inicio del proceso (si preavisas el primer día)', fecha: a, ref: '8.1', nota: '1 mes desde el registro del preaviso.' }, { txt: 'Último día posible de inicio del proceso (si preavisas el primer día)', fecha: b, ref: '8.1', nota: 'Máximo de 3 meses desde el registro. La votación nunca podrá ser antes del vencimiento del mandato.' }];
        h += lista(ultimo, 'Ventana de promoción');
      }
      if (p) {
        const a = Calc.addMeses(p, 1), b = Calc.addMeses(p, 3); let aviso = '';
        if (v && p < Calc.addMeses(v, -3)) aviso = '<p class="aviso"><strong>Atención:</strong> esa fecha es anterior a los 3 meses previos al vencimiento: la promoción por conclusión de mandato todavía no es posible.</p>';
        h += `<div class="resultado"><h3>Si presentas el preaviso el ${Calc.fmt(p)}</h3><ul><li>La mesa debe constituirse entre el <strong>${Calc.fmt(a)}</strong> y el <strong>${Calc.fmt(b)}</strong>.</li></ul>${aviso}</div>`;
        if (!ultimo.length) ultimo = [{ txt: 'Inicio más temprano del proceso', fecha: a, ref: '8.1', nota: '1 mes desde el registro del preaviso.' }, { txt: 'Inicio más tardío del proceso', fecha: b, ref: '8.1', nota: '3 meses desde el registro del preaviso.' }];
      }
      out.innerHTML = h;
    } else if (tab === 'calendario') {
      const f = Calc.parseFecha($('#ca-f', el)?.value); const t = $('#ca-t', el)?.value;
      if (f) {
        if (t === 'comite') ultimo = [{ txt: 'Constitución de la mesa electoral', fecha: f, ref: '11.1', nota: 'Fecha del preaviso: inicio del proceso.' }, { txt: 'Votación: fecha más temprana', fecha: Calc.addDias(f, 30), ref: '17.6', nota: 'El proceso se desarrolla en un plazo de entre 30 y 34 días.' }, { txt: 'Votación: fecha más tardía', fecha: Calc.addDias(f, 34), ref: '17.6', nota: 'Entre proclamación y votación deben mediar al menos 5 días.' }];
        else ultimo = [{ txt: 'Constitución de la mesa electoral', fecha: f, ref: '11.1', nota: 'Inicio del proceso.' }, { txt: 'Votación: no antes de 24 horas', fecha: Calc.addDias(f, 1), ref: t === 'd3' ? '17.5' : '17.4', nota: 'Entre la constitución de la mesa y la votación no pueden pasar menos de 24 horas.' }, { txt: 'Votación: como máximo', fecha: Calc.addDias(f, 10), ref: t === 'd3' ? '17.5' : '17.4', nota: 'No pueden mediar más de 10 días.' }];
        out.innerHTML = lista(ultimo, 'Fechas orientativas') + (t === 'comite' ? `<div class="resultado"><h3>Otros plazos de comités y juntas</h3><ul><li>Candidaturas: dentro de los 9 días siguientes a la publicación de la lista definitiva de electores.</li><li>Proclamación: en los 2 días laborables siguientes.</li><li>Reclamación contra la proclamación: el día laborable siguiente; la mesa resuelve el posterior día hábil.</li></ul><p style="font-size:.8rem">Ver ${enlaces(['13.9', '17.2'])}.</p></div>` : '');
      }
    } else {
      const f = Calc.parseFecha($('#re-f', el)?.value); const ruta = $('#re-t', el).value;
      $('#re-a-w', el).hidden = ruta !== 'arbitraje';
      $('#re-fl', el).textContent = { mesa: 'Fecha del acto de la mesa', arbitraje: 'Fecha del hecho (o de la resolución de la reclamación por la mesa)', registro: 'Fecha de presentación del acta en la Oficina Pública' }[ruta];
      if (f) {
        const cfg = { sabado: $('#re-s', el).checked, festivos: festSet($('#re-h', el).value) };
        ultimo = Calc.cadena(ruta, f, cfg, { actas: Calc.parseFecha($('#re-a', el)?.value) });
        out.innerHTML = lista(ultimo, 'Fechas límite (si cada trámite agota su plazo)');
      }
    }
    const b = $('#pl-ics', el); if (b) b.onclick = () => A().descargar('plazos-elecciones.ics', ics('Plazos', ultimo), 'text/calendar');
  };
  pinta();
  el.addEventListener('click', e => { const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; pinta(); } });
  el.addEventListener('input', e => { if (e.target.closest('#pl-c')) calcula(); });
  el.addEventListener('change', e => { if (e.target.closest('#pl-c')) calcula(); });
});

/* ---- 6. Línea de tiempo ---- */
const LINEA = [
  ['Promoción y preaviso', 'Con 1 a 3 meses de antelación', 'Quien tiene legitimación registra el preaviso en la Oficina Pública y lo comunica a la empresa o al órgano de personal. Si es renovación, solo desde 3 meses antes del vencimiento.', ['6', '8']],
  ['Constitución de la mesa', 'Día del inicio del proceso', 'La mesa se constituye en la fecha del preaviso y levanta acta. Se nombran los interventores.', ['11', '12']],
  ['Censo y electorado', 'Primeros días', 'La empresa o la Administración entrega el censo en 7 días (sector privado) o 12 días hábiles (funcionariado). La mesa lo expone al menos 72 horas y fija el número de representantes.', ['9', '10']],
  ['Candidaturas', '9 días desde la lista definitiva', 'Presentación en los impresos oficiales, con la firma de cada persona candidata. Proclamación en 2 días laborables.', ['13']],
  ['Campaña', 'Desde la proclamación', 'Hasta las 0:00 horas del día anterior a la votación; sin alterar la normal prestación del trabajo.', ['14']],
  ['Votación', 'Entre 30 y 34 días de la mesa (comités y juntas)', 'Mínimo de 5 días desde la proclamación. Voto presencial o por correo certificado.', ['17', '18']],
  ['Escrutinio y acta', 'Al terminar la votación', 'Recuento público, atribución de puestos y acta firmada por la mesa e interventores.', ['19', '20', '21']],
  ['Registro del acta', '3 días desde el acta', 'La presidencia de la mesa registra el acta con las papeletas nulas o impugnadas. La mesa publica el resultado en 24 horas.', ['21', '22']],
  ['Registro o denegación', '10 días hábiles', 'La Oficina Pública publica el acta y, transcurridos 10 días hábiles, la registra o deniega (con posible subsanación).', ['21']],
  ['Impugnaciones', '3 o 10 días hábiles', 'Reclamación ante la mesa, arbitraje y, en su caso, recurso ante el Juzgado de lo Social.', ['25', '28']]
];
def('linea', '⏱️', 'Línea de tiempo del proceso', 'Las 10 etapas del proceso electoral, con los plazos principales.', el => {
  el.innerHTML = `<div class="linea">${LINEA.map((s, i) => `<div class="paso-l"><h4>${i + 1}. ${esc(s[0])}</h4><span class="cuando">${esc(s[1])}</span><p>${esc(s[2])}</p><p>${s[3].map(n => `<a class="chip" href="#/cap/${n}">Cap. ${n}</a>`).join(' ')}</p></div>`).join('')}</div><p style="font-size:.85rem">Para fechas concretas usa <a href="#/herramientas/plazos">Plazos y calendario</a>.</p>`;
});

/* ---- 7. Listas de comprobación ---- */
def('listas', '✅', 'Listas de comprobación', 'Una por rol: promotor, mesa, interventor y responsable de candidatura.', el => {
  const checks = A().store.get('chk', {});
  const cks = root.MANUAL.checklists; let rol = cks[0].id;
  const pinta = () => {
    const L = cks.find(c => c.id === rol), est = checks[rol] || {};
    const hechos = L.items.filter((_, i) => est[i]).length;
    el.innerHTML = `<div class="pestanas">${cks.map(c => `<button data-r="${c.id}" class="${c.id === rol ? 'on' : ''}">${c.icono} ${esc(c.titulo)}</button>`).join('')}</div><p style="margin:.2rem 0;font-size:.88rem;color:var(--txt2)">${esc(L.desc)} · <strong>${hechos}/${L.items.length}</strong></p><div class="barra-prog"><i style="width:${hechos * 100 / L.items.length}%"></i></div>
    <ul class="check-lista">${L.items.map((it, i) => `<li><input type="checkbox" id="k${i}" data-i="${i}" ${est[i] ? 'checked' : ''}><label for="k${i}" class="${est[i] ? 'hecho' : ''}">${esc(it.t)} <a href="${A().hrefSec(it.ref)}">Ver ${it.ref}</a></label></li>`).join('')}</ul>
    <div class="botones"><button class="btn sec peq" id="k-rst" type="button">Reiniciar lista</button><button class="btn sec peq" id="k-prt" type="button">Imprimir</button></div>`;
  };
  pinta();
  el.addEventListener('click', e => {
    const r = e.target.closest('[data-r]'); if (r) { rol = r.dataset.r; pinta(); return; }
    if (e.target.id === 'k-rst') { delete checks[rol]; A().store.set('chk', checks); pinta(); }
    if (e.target.id === 'k-prt') window.print();
  });
  el.addEventListener('change', e => { const i = e.target.dataset.i; if (i === undefined) return; checks[rol] = checks[rol] || {}; checks[rol][i] = e.target.checked; A().store.set('chk', checks); pinta(); });
});

/* ---- 8. Guía de votos ---- */
def('votos', '🔢', 'Guía rápida de votos', 'Válidos, nulos, en blanco e impugnados de un vistazo.', el => {
  el.innerHTML = `<div class="tarjetas-voto">
  <div class="tv"><h3>✅ Voto válido</h3><p style="margin:0;font-size:.88rem">Todos los emitidos, una vez rechazados los nulos y aquellos cuya impugnación haya sido admitida por la mesa. Si hay más de una papeleta de la misma candidatura en un sobre, cuenta como un solo voto válido.</p><p style="font-size:.78rem;margin:.4rem 0 0">Ver ${enlaces(['19.1', '19.2'])}</p></div>
  <div class="tv nulo"><h3>🚫 Voto nulo</h3><ul><li>Papeletas ilegibles, con tachaduras o expresiones ajenas a la votación.</li><li>Con candidatos no proclamados oficialmente.</li><li>No depositadas dentro de su sobre.</li><li>Con adiciones o supresiones a la candidatura proclamada.</li><li>Sobres con papeletas de dos o más candidaturas distintas.</li><li>Papeletas o sobres que no se ajusten a los modelos oficiales.</li><li>Delegados de personal: más cruces que representantes a elegir.</li></ul><p style="font-size:.78rem;margin:.2rem 0 0">Lista del personal funcionario; en el sector privado los declara nulos la mesa. Ver ${enlaces(['19.2'])}</p></div>
  <div class="tv blanco"><h3>⚪ Voto en blanco</h3><p style="margin:0;font-size:.88rem">No expresa ninguna preferencia. Cuenta como válido para calcular el 5 % mínimo de cada lista, pero no se tiene en cuenta para repartir los puestos.</p><p style="font-size:.78rem;margin:.4rem 0 0">Ver ${enlaces(['19.3', '20.1'])}</p></div>
  <div class="tv imp"><h3>✋ Voto impugnado</h3><p style="margin:0;font-size:.88rem">Lo impugna una parte interesada (sobre todo los interventores) cuando la mesa no lo ha anulado antes. Las papeletas nulas e impugnadas se adjuntan al acta de escrutinio que se registra en la Oficina Pública.</p><p style="font-size:.78rem;margin:.4rem 0 0">Ver ${enlaces(['19.4'])}</p></div></div>`;
});

/* ---- 9. QR ---- */
def('qr', '🔳', 'Código QR de la web', 'Genera un QR para carteles, asambleas o mensajes.', el => {
  const base = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  el.innerHTML = `<div class="form"><div class="campo"><label for="q-u">Dirección web</label><input id="q-u" type="url" inputmode="url" placeholder="https://…" value="${esc(base)}"><small>${base ? 'Por defecto, la dirección de esta página.' : 'Escribe la dirección pública donde publiques el manual (en un archivo local no hay dirección propia).'}</small></div></div><div id="q-r"></div>`;
  const gen = () => {
    const u = $('#q-u', el).value.trim(); const out = $('#q-r', el); if (!u || typeof root.qrcode !== 'function') { out.innerHTML = ''; return; }
    const q = root.qrcode(0, 'M'); q.addData(u); q.make(); const svg = q.createSvgTag({ cellSize: 8, margin: 3, scalable: true });
    out.innerHTML = `<div class="qr-caja">${svg}</div><div class="botones"><button class="btn peq" id="q-svg" type="button">⬇ SVG</button><button class="btn peq" id="q-png" type="button">⬇ PNG</button></div>`;
    $('#q-svg', el).onclick = () => A().descargar('qr-manual-elecciones.svg', svg, 'image/svg+xml');
    $('#q-png', el).onclick = () => { const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 1024); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 1024, 1024); c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qr-manual-elecciones.png'; a.click(); }); URL.revokeObjectURL(url); }; img.src = url; };
  };
  el.addEventListener('input', gen); gen();
});

root.HERR = { lista: T, mapa: Object.fromEntries(T.map(t => [t.id, t])) };
})(typeof window !== 'undefined' ? window : globalThis);
