// =====================================================================
//  Pruebas OBLIGATORIAS del spec FRISBY (sección 12).
//  Cada test está numerado según el requisito.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tmpFile = join(mkdtempSync(join(tmpdir(), 'frisby-oblig-')), 'test.sqlite');
process.env.DB_PATH = tmpFile;

const schema = readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8');
const setup = new DatabaseSync(tmpFile);
setup.exec(schema);
setup.exec(`
  INSERT INTO sede (id,nombre,ciudad,activo) VALUES (1,'Test','X',1);
  INSERT INTO area (id,nombre,orden) VALUES (1,'ADMINISTRACIÓN',1),(2,'COCINA',2),(3,'SALÓN',3);
  INSERT INTO rol (id,nombre,area_id,color) VALUES
    (1,'ADMINISTRADOR',1,'#1f4e79'),(2,'ASISTENTE ADMON',1,'#2e75b6'),
    (3,'AUX. PRODUCCIÓN',2,'#1E6B3A'),(4,'AUX. BARRA',3,'#5BC2E7'),(5,'ASESOR DE SERVICIO',3,'#1F3C88');
  INSERT INTO jornada_tipo (id,codigo,nombre,horas_dia_exactas,horas_dia_min,horas_dia_max,horas_sem_min,horas_sem_max,dias_trabajo)
    VALUES (1,'TC','Tiempo Completo',7,NULL,NULL,42,42,6),(2,'PAR','Parcial',NULL,5,7,36,38,6);
  INSERT INTO usuario (id,nombre,sede_id,rol_id,jornada_tipo_id,restriccion_tipo,es_nuevo,activo) VALUES
    (1,'ADMIN1',1,1,1,'NINGUNA',0,1),(2,'ADMIN2',1,2,1,'NINGUNA',0,1),
    (3,'COC_FIJO',1,3,2,'FIJO_MANANA',0,1),(4,'COC_VAC',1,3,2,'NINGUNA',0,1),
    (5,'COC_A',1,3,2,'NINGUNA',0,1),(6,'COC_B',1,3,2,'NINGUNA',0,1),
    (7,'COC_INC',1,3,2,'NINGUNA',0,1),(8,'COC_NUEVO',1,3,2,'NINGUNA',1,1);
  -- vacaciones (id4) e incapacidad (id7) cubriendo la semana y "hoy"
  INSERT INTO restriccion (usuario_id,tipo,estado,fecha_inicio,fecha_fin,activa)
    VALUES (4,'VACACIONES','APROBADA','2026-11-01','2026-12-31',1);
  INSERT INTO ausencia (usuario_id,tipo,fecha_inicio,fecha_fin)
    VALUES (7,'INCAPACIDAD','2026-11-01','2026-12-31');
  -- demanda alta: sábado (día 5) 18-22, 2 AUX PRODUCCIÓN
  INSERT INTO demanda (sede_id,dia_semana,hora_inicio,hora_fin,rol_id,personas,prioridad,activa)
    VALUES (1,5,'18:00','22:00',3,2,'ALTA',1);
`);
for (let d = 0; d < 7; d++) setup.prepare('INSERT INTO sede_horario (sede_id,dia_semana,apertura,cierre) VALUES (1,?,?,?)').run(d, '10:00', '22:00');
setup.close();

const SEM = '2026-11-16';
const hh = (s) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;
const ro = new DatabaseSync(tmpFile);
const turnosDe = (nombre) => ro.prepare('SELECT t.* FROM turno t JOIN usuario u ON u.id=t.usuario_id WHERE u.nombre=?').all(nombre);
const cobertura = (fecha, horaN) => ro.prepare(
  `SELECT COUNT(*) n FROM turno t JOIN usuario u ON u.id=t.usuario_id JOIN rol ON rol.id=u.rol_id
   WHERE rol.nombre='AUX. PRODUCCIÓN' AND t.fecha=?
     AND CAST(substr(t.hora_inicio,1,2) AS INT) <= ? AND CAST(substr(t.hora_fin,1,2) AS INT) > ?`
).get(fecha, horaN, horaN).n;

const aforo = await import('../src/services/aforoService.js');
const cont = await import('../src/services/contingenciaService.js');
const { default: Usuario } = await import('../src/models/usuario.js');

aforo.generar(1, SEM);

test('1. Turno fijo de mañana no recibe turno de noche', () => {
  const ts = turnosDe('COC_FIJO');
  assert.ok(ts.length > 0);
  for (const t of ts) assert.ok(hh(t.hora_fin) <= 16, `${t.hora_inicio}-${t.hora_fin}`);
});

test('2. Un colaborador de vacaciones no recibe asignaciones', () => {
  assert.equal(turnosDe('COC_VAC').length, 0);
});

test('4. Los administrativos no comparten el mismo turno', () => {
  const clase = (ts) => new Set(ts.map((t) => (hh(t.hora_fin) <= 16 ? 'M' : 'TN')));
  const a = clase(turnosDe('ADMIN1'));
  const b = clase(turnosDe('ADMIN2'));
  assert.equal(a.size, 1); assert.equal(b.size, 1);
  assert.notDeepEqual([...a], [...b]);
});

test('5. Los días de alta demanda reciben prioridad de cobertura', () => {
  // sábado 2026-11-21, franja 18-22 pedía 2 AUX PRODUCCIÓN
  assert.ok(cobertura('2026-11-21', 20) >= 2, 'la franja de alta demanda debe tener refuerzo');
});

test('6. Los colaboradores nuevos pueden tener acompañamiento', () => {
  // existe un día en que el nuevo (8) trabaja junto a un experimentado (5 o 6)
  const nuevo = new Set(turnosDe('COC_NUEVO').map((t) => t.fecha));
  const exp = new Set([...turnosDe('COC_A'), ...turnosDe('COC_B')].map((t) => t.fecha));
  assert.ok([...nuevo].some((f) => exp.has(f)), 'el nuevo comparte día con personal experimentado');
});

test('3 y 7. Incapacidad posterior: propuestas que excluyen a incapacitados/vacaciones', () => {
  // Elegir un día en que trabaja COC_A y hay un cocinero libre (B o NUEVO descansa).
  const diasA = turnosDe('COC_A').map((t) => t.fecha);
  const b = new Set(turnosDe('COC_B').map((t) => t.fecha));
  const n = new Set(turnosDe('COC_NUEVO').map((t) => t.fecha));
  const fecha = diasA.find((f) => !b.has(f) || !n.has(f)) || diasA[0];
  const w = new DatabaseSync(tmpFile);
  w.prepare("INSERT INTO contingencia (id,sede_id,usuario_id,fecha,motivo) VALUES (100,1,5,?,'Incapacidad')").run(fecha);
  w.close();
  const r = cont.buscarReemplazos(100);
  assert.ok(r.propuestas.length > 0, '7. debe generar propuestas de reemplazo');
  const ids = r.propuestas.map((p) => p.reemplazo_id);
  assert.ok(!ids.includes(7), '3. un incapacitado NO debe proponerse');
  assert.ok(!ids.includes(4), '3. un colaborador de vacaciones NO debe proponerse');
});

test('8. buscarReemplazos no modifica ningún horario (solo lee)', () => {
  const antes = ro.prepare('SELECT COUNT(*) n FROM turno').get().n;
  cont.buscarReemplazos(100);
  const despues = ro.prepare('SELECT COUNT(*) n FROM turno').get().n;
  assert.equal(antes, despues, 'no debe cambiar turnos al solo buscar');
});

test('9. Al aplicar, el cambio queda registrado en el historial', () => {
  const r = cont.buscarReemplazos(100);
  const rid = r.propuestas[0].reemplazo_id;
  cont.aplicar(100, rid, 'admin');
  const hist = ro.prepare('SELECT COUNT(*) n FROM historial_cambio').get().n;
  assert.ok(hist >= 1);
  const orig = ro.prepare('SELECT COUNT(*) n FROM turno_original').get().n;
  assert.ok(orig >= 1, 'el horario original quedó protegido');
});

test('11. Descansando/incapacitados siguen en el listado con su estado', () => {
  const lista = Usuario.listar(1);
  const inc = lista.find((u) => u.nombre === 'COC_INC');
  const vac = lista.find((u) => u.nombre === 'COC_VAC');
  assert.ok(inc, 'el incapacitado sigue en el listado');
  assert.equal(inc.estado, 'INCAPACIDAD');
  assert.ok(vac, 'el de vacaciones sigue en el listado');
  assert.equal(vac.estado, 'VACACIONES');
});
