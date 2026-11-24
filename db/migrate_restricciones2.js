// =====================================================================
//  migrate_restricciones2.js  —  Restricciones múltiples por colaborador
//  (vacaciones con estado, días/franjas no disponibles, rangos médicos/
//  académicos, turnos fijos). Idempotente.
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
  CREATE TABLE IF NOT EXISTS restriccion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id   INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL,   -- FIJO_MANANA|FIJO_TARDE_NOCHE|MEDICA|ACADEMICA|VACACIONES|DIAS_NO_DISPONIBLE|FRANJA_NO_DISPONIBLE
    turno        TEXT,            -- MANANA|TARDE_NOCHE (médica/académica con turno)
    fecha_inicio TEXT,            -- rango (vacaciones / médica temporal)
    fecha_fin    TEXT,
    dias_semana  TEXT,            -- CSV de índices 0..6 (días afectados)
    hora_inicio  TEXT,            -- franja no disponible 'HH:MM'
    hora_fin     TEXT,
    estado       TEXT DEFAULT 'APROBADA', -- vacaciones: PENDIENTE|APROBADA|RECHAZADA
    obs          TEXT,
    activa       INTEGER NOT NULL DEFAULT 1,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_restriccion_usuario ON restriccion(usuario_id);
`);
console.log('✅ Tabla restriccion (múltiple) lista.');
db.close();
