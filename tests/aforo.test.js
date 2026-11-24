// Test de integración del motor de aforo con una base de datos temporal.
// Verifica que el generador respeta restricciones, reparte a los administrativos
// en turnos opuestos, aplica sugerencias y que la validación no reporta conflictos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// 1) BD temporal ANTES de importar el servicio (para que use este archivo).
const tmpFile = join(mkdtempSync(join(tmpdir(), 'frisby-test-')), 'test.sqlite');
process.env.DB_PATH = tmpFile;

const setup = new DatabaseSync(tmpFile);
setup.exec(readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8'));
setup.exec(`
  INSERT INTO sede (id, nombre, ciudad, activo) VALUES (1, 'Test', 'X', 1);
  INSERT INTO area (id, nombre, orden) VALUES (1,'ADMINISTRACIÓN',1),(2,'COCINA',2);
  INSERT INTO rol (id, nombre, area_id, color) VALUES
    (1,'ADMINISTRADOR',1,'#000'),(2,'ASISTENTE ADMON',1,'#000'),(3,'AUX. PRODUCCIÓN',2,'#000');
  INSERT INTO jornada_tipo (id,codigo,nombre,horas_dia_exactas,horas_dia_min,horas_dia_max,horas_sem_min,horas_sem_max,dias_trabajo)
    VALUES (1,'TC','Tiempo Completo',7,NULL,NULL,42,42,6),
           (2,'PAR','Parcial',NULL,5,7,36,38,6);
`);
for (let d = 0; d < 7; d++) {
  setup.prepare('INSERT INTO sede_horario (sede_id,dia_semana,apertura,cierre) VALUES (1,?,?,?)')
    .run(d, '10:00', '22:00');
}
const insU = setup.prepare(`INSERT INTO usuario
  (id,nombre,email,sede_id,rol_id,jornada_tipo_id,patron_id,restriccion_tipo,restriccion_turno,restriccion_obs,es_nuevo,activo)
  VALUES (?,?,NULL,1,?,?,NULL,?,NULL,NULL,0,1)`);
insU.run(1, 'ADMIN UNO', 1, 1, 'NINGUNA');
insU.run(2, 'ADMIN DOS', 2, 1, 'NINGUNA');
insU.run(3, 'COCINA MANANA', 3, 2, 'FIJO_MANANA');
insU.run(4, 'COCINA LIBRE', 3, 2, 'NINGUNA');
setup.close();

const SEM = '2026-11-16';
const hhToNum = (s) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;

// Conexión de solo lectura para comprobar resultados.
const ro = new DatabaseSync(tmpFile);
const turnosDe = (nombre) => ro.prepare(
  `SELECT t.hora_inicio, t.hora_fin FROM turno t JOIN usuario u ON u.id=t.usuario_id WHERE u.nombre=?`
).all(nombre);

// 2) Importar el servicio (ya con DB_PATH apuntando a la BD temporal).
const aforo = await import('../src/services/aforoService.js');

test('restricción FIJO_MANANA: todos los turnos terminan a las 16:00 o antes', () => {
  aforo.generar(1, SEM);
  const ts = turnosDe('COCINA MANANA');
  assert.ok(ts.length > 0, 'debe tener turnos');
  for (const t of ts) assert.ok(hhToNum(t.hora_fin) <= 16, `turno fuera de ventana: ${t.hora_inicio}-${t.hora_fin}`);
});

test('regla administrativa: los dos administrativos quedan en turnos opuestos', () => {
  aforo.generar(1, SEM);
  const clase = (ts) => new Set(ts.map((t) => (hhToNum(t.hora_fin) <= 16 ? 'M' : 'TN')));
  const a1 = clase(turnosDe('ADMIN UNO'));
  const a2 = clase(turnosDe('ADMIN DOS'));
  assert.equal(a1.size, 1, 'ADMIN UNO debe tener un único turno');
  assert.equal(a2.size, 1, 'ADMIN DOS debe tener un único turno');
  assert.notDeepEqual([...a1], [...a2], 'los administrativos no pueden compartir turno');
});

test('validación sin conflictos obligatorios tras generar', () => {
  aforo.generar(1, SEM);
  const v = aforo.validar(1, SEM);
  assert.equal(v.obligatorias, 0, `no debería haber conflictos obligatorios: ${JSON.stringify(v.conflictos)}`);
});

test('sugerencia PRIORIZAR_TURNO tarde-noche coloca al colaborador en la tarde', () => {
  const w = new DatabaseSync(tmpFile);
  w.prepare(`INSERT INTO sugerencia (sede_id,usuario_id,tipo,turno,activa) VALUES (1,4,'PRIORIZAR_TURNO','TARDE_NOCHE',1)`).run();
  w.close();
  aforo.generar(1, SEM);
  const ts = turnosDe('COCINA LIBRE');
  assert.ok(ts.length > 0);
  for (const t of ts) assert.ok(hhToNum(t.hora_inicio) >= 16, `turno no es de tarde-noche: ${t.hora_inicio}-${t.hora_fin}`);
});
