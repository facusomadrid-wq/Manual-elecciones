// Pruebas de las calculadoras con los ejemplos resueltos del propio manual.  Ejecutar: node --test web/pruebas/
const test = require('node:test');
const assert = require('node:assert/strict');
const { Calc } = require('../herramientas.js');

test('escala de miembros (cap. 3.2 / 3.4)', () => {
  const casos = [[49, 0], [50, 5], [100, 5], [101, 9], [250, 9], [251, 13], [500, 13], [501, 17], [750, 17], [751, 21], [1000, 21], [1001, 23], [2000, 23], [2001, 25], [100000, 75]];
  for (const [n, m] of casos) assert.equal(Calc.miembros(n), m, `plantilla ${n}`);
});
test('órgano según plantilla', () => {
  assert.equal(Calc.organo('empresa', 5).tipo, 'ninguno');
  assert.equal(Calc.organo('empresa', 30).miembros, 1);
  assert.equal(Calc.organo('empresa', 31).miembros, 3);
  assert.equal(Calc.organo('empresa', 49).tipo, 'delegados');
  assert.equal(Calc.organo('empresa', 50).tipo, 'comite');
  assert.equal(Calc.organo('aapp', 50).tipo, 'junta');
  assert.equal(Calc.organo('aapp', 340).mesas, 2); // juntas: una mesa por cada 250 o fracción
});
test('escala completa: delegados, comité o junta y tramos altos (art. 66 ET y art. 39 TREBEP)', () => {
  assert.equal(Calc.organo('empresa', 49).tipo, 'delegados');
  assert.equal(Calc.organo('empresa', 49).miembros, 3);
  assert.equal(Calc.organo('aapp', 49).miembros, 3);
  const casos = [[50, 5], [100, 5], [101, 9], [1000, 21], [1001, 23], [5000, 29], [5001, 31], [7000, 33], [100000, 75]];
  for (const [n, m] of casos) {
    assert.equal(Calc.miembros(n), m, `escala ${n}`);
    assert.equal(Calc.organo('empresa', n).miembros, m, `comité ${n}`);
    assert.equal(Calc.organo('aapp', n).miembros, m, `junta ${n}`);
  }
});
test('mesas del comité: por colegio (art. 73.1 ET), no por plantilla total', () => {
  // 340 personas repartidas 300 + 40: 2 mesas + 1 mesa = 3, y no ceil(340/250) = 2
  const r = Calc.organo('empresa', 340);
  assert.equal(r.mesas, 0); // el órgano no puede saberlas sin el reparto por colegios
  assert.ok(r.notas.some(x => /por colegio/.test(x) && /Reparto de puestos por colegios/.test(x)));
  assert.deepEqual(Calc.colegios(300, 40).mesas, [2, 1]);
  assert.deepEqual(Calc.colegios(520, 10).mesas, [3]); // colegio único
});
test('eventuales: cada 200 días o fracción cuenta una persona más (art. 72.2.b ET)', () => {
  const r = Calc.plantilla(49, 0, 150, 0);
  assert.equal(r.computados, 1);
  assert.equal(r.total, 50);
  assert.equal(Calc.organo('empresa', r.total).tipo, 'comite');
  assert.equal(Calc.organo('empresa', r.total).miembros, 5);
  assert.equal(Calc.plantilla(49, 0, 0, 0).total, 49);    // sin días no se suma nadie
  assert.equal(Calc.plantilla(0, 0, 200, 0).computados, 1); // exacto: sin redondeo
  assert.equal(Calc.plantilla(0, 0, 201, 0).computados, 2);
  assert.ok(Number.isInteger(Calc.plantilla(10, 5, 12345, 0).total));
});
test('eventuales: tope del art. 9.4 RD 1844/1994 (no más que las personas eventuales presentes)', () => {
  const r = Calc.plantilla(49, 0, 450, 2); // 450 ÷ 200 = 2,25 -> 3, pero solo hay 2 personas
  assert.equal(r.computados, 2);
  assert.equal(r.aplicadoTope, true);
  assert.equal(r.total, 51);
  assert.equal(Calc.plantilla(49, 0, 150, 1).aplicadoTope, false);
  assert.equal(Calc.plantilla(49, 0, 150, 1).total, 50);
});
test('ejemplo 15.3: 550 personas (450 + 100) -> 14 y 3', () => {
  const r = Calc.colegios(450, 100);
  assert.equal(r.M, 17);
  assert.deepEqual(r.filas.map(f => f.escanos), [14, 3]);
  assert.ok(Math.abs(r.filas[0].num / r.N - 13.909) < 0.01 && Math.abs(r.filas[1].num / r.N - 3.09) < 0.01);
});
test('colegio único si un cociente < 0,5', () => {
  assert.equal(Calc.colegios(520, 10).unico, true);
});
test('ejemplo 15.4: plantilla 100 + 40 + 24.000/200 = 260', () => {
  assert.equal(Calc.plantilla(100, 40, 24000, 0).total, 260);
  // tope por personas presentes
  assert.equal(Calc.plantilla(10, 0, 24000, 50).total, 60);
});
test('ejemplo 20.4: USO 235, CGT 110, CCOO 61, SO 17; 14 puestos, 10 blancos -> 8/4/2/0', () => {
  const r = Calc.atribuir(14, 10, [{ n: 'USO', votos: 235 }, { n: 'CGT', votos: 110 }, { n: 'CCOO', votos: 61 }, { n: 'SO', votos: 17 }]);
  assert.equal(r.S, 406);
  assert.equal(r.cociente, 29);
  assert.deepEqual(r.filas.map(f => f.escanos), [8, 4, 2, 0]);
  assert.equal(r.filas[3].pasa, false);
  assert.equal(r.filas.reduce((s, f) => s + f.escanos, 0), 14);
});
test('empate de restos se señala', () => {
  const r = Calc.atribuir(3, 0, [{ n: 'A', votos: 50 }, { n: 'B', votos: 50 }]);
  assert.equal(r.empate, true);
});
test('ejemplo 20.3: listas abiertas, 3 delegados', () => {
  const c = [['Artilla', 31], ['Jiménez', 27], ['Martínez', 24], ['Ramos', 11], ['Rodríguez', 29], ['Torrico', 6]].map(([n, votos]) => ({ n, votos }));
  const r = Calc.abierta(3, c);
  assert.deepEqual(r.orden.filter(x => x.elegido).map(x => x.n), ['Artilla', 'Jiménez', 'Rodríguez']);
  assert.equal(r.empate, false);
});
test('ejemplo 8.1: vencimiento 20-12-2025', () => {
  const V = new Date(2025, 11, 20);
  const ini = Calc.addMeses(V, -3);
  assert.equal(Calc.iso(ini), '2025-09-20');
  assert.equal(Calc.iso(Calc.addMeses(ini, 1)), '2025-10-20');
  assert.equal(Calc.iso(Calc.addMeses(ini, 3)), '2025-12-20');
  assert.equal(Calc.iso(Calc.addMeses(new Date(2025, 0, 31), 1)), '2025-02-28'); // ajuste fin de mes
});
test('días hábiles: sin sábados ni festivos', () => {
  const cfg = { sabado: false, festivos: new Set(['2025-12-25']) };
  assert.equal(Calc.iso(Calc.addHabiles(new Date(2025, 11, 24), 1, cfg)), '2025-12-26');
  assert.equal(Calc.iso(Calc.addHabiles(new Date(2025, 11, 26), 1, cfg)), '2025-12-29'); // viernes -> lunes
  assert.equal(Calc.iso(Calc.addHabiles(new Date(2025, 11, 26), 1, { sabado: true, festivos: new Set() })), '2025-12-27');
});
test('cadena de registro de acta (Anexo I)', () => {
  const p = Calc.cadena('registro', new Date(2025, 5, 2), { sabado: false, festivos: new Set() });
  assert.equal(p.length, 7);
  assert.equal(Calc.iso(p[0].fecha), '2025-06-03'); // +1 hábil
  assert.equal(Calc.iso(p[1].fecha), '2025-06-17'); // +10 hábiles
});
