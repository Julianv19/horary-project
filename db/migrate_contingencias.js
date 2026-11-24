// =====================================================================
//  migrate_contingencias.js  —  Contingencias operativas: novedades,
//  historial de modificaciones y snapshot del horario original.
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
  CREATE TABLE IF NOT EXISTS contingencia (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sede_id     INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
    usuario_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    fecha       TEXT NOT NULL,
    fecha_fin   TEXT,
    motivo      TEXT,
    obs         TEXT,
    estado      TEXT NOT NULL DEFAULT 'ABIERTA',   -- ABIERTA | RESUELTA | SIN_REEMPLAZO
    reemplazo_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS historial_cambio (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    programacion_id    INTEGER REFERENCES programacion(id) ON DELETE CASCADE,
    contingencia_id    INTEGER REFERENCES contingencia(id) ON DELETE SET NULL,
    fecha_hora         TEXT NOT NULL DEFAULT (datetime('now')),
    usuario_afectado_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    reemplazo_id       INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    responsable        TEXT,
    motivo             TEXT,
    turno_anterior     TEXT,
    turno_nuevo        TEXT
  );

  -- Snapshot del horario ORIGINAL de una semana (antes de contingencias).
  CREATE TABLE IF NOT EXISTS turno_original (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    programacion_id INTEGER NOT NULL REFERENCES programacion(id) ON DELETE CASCADE,
    usuario_id      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    fecha           TEXT NOT NULL,
    hora_inicio     TEXT NOT NULL,
    hora_fin        TEXT NOT NULL
  );
`);
console.log('✅ Tablas de contingencias listas (contingencia, historial_cambio, turno_original).');
db.close();
