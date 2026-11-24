// =====================================================================
//  migrate_inducciones.js  —  Inducciones (colaborador nuevo + mentor).
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
  CREATE TABLE IF NOT EXISTS induccion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id   INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,  -- nuevo
    mentor_id    INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    fecha_inicio TEXT,
    fecha_fin    TEXT,
    obs          TEXT,
    activa       INTEGER NOT NULL DEFAULT 1
  );
`);
console.log('✅ Tabla induccion lista.');
db.close();
