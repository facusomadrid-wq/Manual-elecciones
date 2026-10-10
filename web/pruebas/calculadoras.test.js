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
  assert.equal(Calc.organo('empresa', 340).mesas, 2);
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
