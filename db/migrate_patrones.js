// =====================================================================
//  migrate_patrones.js  —  Añade usuario.patron_id (si falta) y carga
//  patrones de ejemplo (incluye turnos partidos). Idempotente.
//  Uso:  node db/migrate_patrones.js
// =====================================================================
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '..', process.env.DB_PATH || './db/horary.sqlite');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

// 1) Columna usuario.patron_id
const cols = db.prepare('PRAGMA table_info(usuario)').all();
if (!cols.some((c) => c.name === 'patron_id')) {
  db.exec('ALTER TABLE usuario ADD COLUMN patron_id INTEGER REFERENCES patron(id)');
  console.log('✅ Columna usuario.patron_id añadida.');
} else {
  console.log('ℹ  usuario.patron_id ya existe.');
}

// 2) Patrones de ejemplo (solo si no hay ninguno)
const hay = db.prepare('SELECT COUNT(*) AS n FROM patron').get().n;
if (hay === 0) {
  const insPatron = db.prepare('INSERT INTO patron (nombre, rutina, descripcion) VALUES (?, ?, ?)');
  const insTurno = db.prepare(
    'INSERT INTO patron_turno (patron_id, dia_semana, hora_inicio, hora_fin, orden) VALUES (?, ?, ?, ?, ?)'
  );

  // nombre, rutina, [ {dia, bloques:[[inicio,fin],...]} ... ]
  const patrones = [
    { nombre: 'Mañana', rutina: 'DIA', dias: [0,1,2,3,4,5], bloques: [['10:00','17:00']] },
    { nombre: 'Noche', rutina: 'NOCHE', dias: [1,2,3,4,5,6], bloques: [['15:00','22:00']] },
    { nombre: 'Partido', rutina: 'DIA_NOCHE', dias: [0,1,2,3,4,5], bloques: [['12:00','16:00'],['18:00','22:00']] },
  ];

  db.exec('BEGIN');
  try {
    for (const p of patrones) {
      const { lastInsertRowid: pid } = insPatron.run(p.nombre, p.rutina, null);
      for (const dia of p.dias) {
        p.bloques.forEach(([ini, fin], orden) => insTurno.run(pid, dia, ini, fin, orden));
      }
    }
    db.exec('COMMIT');
    console.log(`✅ ${patrones.length} patrones de ejemplo creados (Mañana, Noche, Partido).`);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
} else {
  console.log(`ℹ  Ya existen ${hay} patrones; no se cargan ejemplos.`);
}

db.close();
