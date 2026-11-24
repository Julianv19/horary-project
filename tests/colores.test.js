// 10. Los colores de cada rol permanecen correctamente asignados (desde el seed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tmp = join(mkdtempSync(join(tmpdir(), 'frisby-col-')), 'c.sqlite');
const db = new DatabaseSync(tmp);
db.exec(readFileSync(resolve(process.cwd(), 'db/schema.sql'), 'utf8'));
db.exec(readFileSync(resolve(process.cwd(), 'db/seed.sql'), 'utf8'));

const colorDe = (nombre) => db.prepare('SELECT color FROM rol WHERE nombre = ?').get(nombre)?.color;

test('10. Colores corporativos por rol (barra azul claro, asesores azul oscuro, cocina verde)', () => {
  assert.equal(colorDe('AUX. BARRA'), '#5BC2E7');          // azul claro
  assert.equal(colorDe('ASESOR DE SERVICIO'), '#1F3C88');  // azul oscuro
  assert.equal(colorDe('AUX. PRODUCCIÓN'), '#1E6B3A');     // verde oscuro
});
