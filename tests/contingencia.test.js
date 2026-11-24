// Test de integración de contingencias: búsqueda de reemplazos y aplicación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tmpFile = join(mkdtempSync(join(tmpdir(), 'frisby-cont-')), 'test.sqlite');
process.env.DB_PATH = tmpFile;

const setup = new DatabaseSync(tmpFile);
setup.exec(readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8'));
setup.exec(`
  INSERT INTO sede (id,nombre,ciudad,activo) VALUES (1,'Test','X',1);
  INSERT INTO area (id,nombre,orden) VALUES (1,'COCINA',1);
  INSERT INTO rol (id,nombre,area_id,color) VALUES (1,'AUX. PRODUCCIÓN',1,'#1E6B3A');
  INSERT INTO jornada_tipo (id,codigo,nombre,horas_dia_exactas,dias_trabajo) VALUES (1,'TC','Tiempo Completo',7,6);
  INSERT INTO usuario (id,nombre,sede_id,rol_id,jornada_tipo_id,restriccion_tipo,activo)
    VALUES (1,'AFECTADO',1,1,1,'NINGUNA',1),(2,'LIBRE',1,1,1,'NINGUNA',1),(3,'DE VACACIONES',1,1,1,'NINGUNA',1);
  -- W3 de vacaciones aprobadas esa semana
  INSERT INTO restriccion (usuario_id,tipo,estado,fecha_inicio,fecha_fin,activa)
    VALUES (3,'VACACIONES','APROBADA','2026-11-16','2026-11-22',1);
  -- horario publicado: solo el afectado trabaja ese lunes
  INSERT INTO programacion (id,sede_id,semana_inicio,estado) VALUES (1,1,'2026-11-16','PUBLICADA');
  INSERT INTO turno (programacion_id,usuario_id,fecha,hora_inicio,hora_fin,orden) VALUES (1,1,'2026-11-16','10:00','17:00',0);
  INSERT INTO contingencia (id,sede_id,usuario_id,fecha,motivo) VALUES (1,1,1,'2026-11-16','Incapacidad');
`);
for (let d = 0; d < 7; d++) setup.prepare('INSERT INTO sede_horario (sede_id,dia_semana,apertura,cierre) VALUES (1,?,?,?)').run(d, '10:00', '22:00');
setup.close();

const ro = new DatabaseSync(tmpFile);
const cont = await import('../src/services/contingenciaService.js');

test('buscarReemplazos propone al colaborador libre y excluye al de vacaciones', () => {
  const r = cont.buscarReemplazos(1);
  const ids = r.propuestas.map((p) => p.reemplazo_id);
  assert.ok(ids.includes(2), 'el colaborador libre del mismo rol debe proponerse');
  assert.ok(!ids.includes(3), 'el colaborador de vacaciones NO debe proponerse');
  assert.equal(r.alerta.length, 0, 'hay reemplazo, no debería haber alerta');
});

test('aplicar reemplaza el turno y registra el cambio en el historial', () => {
  const res = cont.aplicar(1, 2, 'admin');
  assert.ok(res.ok, 'debe aplicarse sin error');
  const afectado = ro.prepare("SELECT COUNT(*) n FROM turno WHERE usuario_id=1 AND fecha='2026-11-16'").get().n;
  const reemplazo = ro.prepare("SELECT COUNT(*) n FROM turno WHERE usuario_id=2 AND fecha='2026-11-16'").get().n;
  assert.equal(afectado, 0, 'el afectado ya no tiene turno ese día');
  assert.equal(reemplazo, 1, 'el reemplazo cubre el turno');
  const hist = ro.prepare('SELECT COUNT(*) n FROM historial_cambio').get().n;
  assert.equal(hist, 1, 'el cambio queda en el historial');
  const orig = ro.prepare('SELECT COUNT(*) n FROM turno_original').get().n;
  assert.ok(orig >= 1, 'el horario original quedó protegido (snapshot)');
});
