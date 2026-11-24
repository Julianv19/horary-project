// =====================================================================
//  migrate_demanda.js  —  Demanda operativa (refuerzo por franja/rol).
//  Idempotente.
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
db.exec(`
  CREATE TABLE IF NOT EXISTS demanda (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sede_id     INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
    dia_semana  INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TEXT NOT NULL,
    hora_fin    TEXT NOT NULL,
    rol_id      INTEGER REFERENCES rol(id) ON DELETE CASCADE,
    personas    INTEGER NOT NULL DEFAULT 1,
    prioridad   TEXT NOT NULL DEFAULT 'MEDIA',  -- ALTA | MEDIA | BAJA
    obs         TEXT,
    activa      INTEGER NOT NULL DEFAULT 1
  );
`);
console.log('✅ Tabla demanda lista.');
db.close();
