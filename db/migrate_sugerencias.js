// =====================================================================
//  migrate_sugerencias.js  —  Crea la tabla de sugerencias y solicitudes
//  (etapa previa a la generación de horarios). Idempotente.
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
  CREATE TABLE IF NOT EXISTS sugerencia (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sede_id         INTEGER REFERENCES sede(id)    ON DELETE CASCADE,
    usuario_id      INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL,   -- PRIORIZAR_TURNO|EVITAR_TURNO|ACOMPANAR|NOTA
    turno           TEXT,            -- MANANA|TARDE_NOCHE
    otro_usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    texto           TEXT,
    activa          INTEGER NOT NULL DEFAULT 1,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
console.log('✅ Tabla sugerencia lista.');
db.close();
