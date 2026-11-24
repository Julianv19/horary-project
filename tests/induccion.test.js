// Test: el generador alinea el turno del colaborador nuevo con el de su mentor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tmpFile = join(mkdtempSync(join(tmpdir(), 'frisby-ind-')), 'test.sqlite');
process.env.DB_PATH = tmpFile;

const setup = new DatabaseSync(tmpFile);
setup.exec(readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8'));
setup.exec(`
  INSERT INTO sede (id,nombre,ciudad,activo) VALUES (1,'Test','X',1);
  INSERT INTO area (id,nombre,orden) VALUES (1,'COCINA',1);
  INSERT INTO rol (id,nombre,area_id,color) VALUES (1,'AUX. PRODUCCIÓN',1,'#1E6B3A');
  INSERT INTO jornada_tipo (id,codigo,nombre,horas_dia_min,horas_dia_max,horas_sem_min,horas_sem_max,dias_trabajo)
    VALUES (1,'PAR','Parcial',5,7,36,38,6);
  -- mentor con turno fijo de tarde-noche; nuevo sin restricciones
  INSERT INTO usuario (id,nombre,sede_id,rol_id,jornada_tipo_id,restriccion_tipo,es_nuevo,activo) VALUES
    (1,'MENTOR',1,1,1,'FIJO_TARDE_NOCHE',0,1),
    (2,'NUEVO',1,1,1,'NINGUNA',1,1);
  INSERT INTO induccion (usuario_id,mentor_id,activa) VALUES (2,1,1);
`);
for (let d = 0; d < 7; d++) setup.prepare('INSERT INTO sede_horario (sede_id,dia_semana,apertura,cierre) VALUES (1,?,?,?)').run(d, '10:00', '22:00');
setup.close();

const hh = (s) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;
const ro = new DatabaseSync(tmpFile);
const aforo = await import('../src/services/aforoService.js');

test('el colaborador nuevo se asigna al mismo turno que su mentor (tarde-noche)', () => {
  aforo.generar(1, '2026-11-16');
  const mentor = ro.prepare("SELECT * FROM turno t JOIN usuario u ON u.id=t.usuario_id WHERE u.nombre='MENTOR'").all();
  const nuevo = ro.prepare("SELECT * FROM turno t JOIN usuario u ON u.id=t.usuario_id WHERE u.nombre='NUEVO'").all();
  assert.ok(mentor.length > 0 && nuevo.length > 0);
  for (const t of mentor) assert.ok(hh(t.hora_inicio) >= 16, `mentor no es tarde-noche: ${t.hora_inicio}`);
  for (const t of nuevo) assert.ok(hh(t.hora_inicio) >= 16, `el nuevo debería seguir al mentor (tarde-noche): ${t.hora_inicio}`);
});
