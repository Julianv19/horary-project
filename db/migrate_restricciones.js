// =====================================================================
//  migrate_restricciones.js  —  Añade a usuario las columnas de
//  restricciones individuales y el marcador de "nuevo" (inducción).
//  Idempotente.  Uso:  node db/migrate_restricciones.js
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

const cols = db.prepare('PRAGMA table_info(usuario)').all().map((c) => c.name);
const añadir = [
  ["restriccion_tipo", "ALTER TABLE usuario ADD COLUMN restriccion_tipo TEXT NOT NULL DEFAULT 'NINGUNA'"],
  ["restriccion_turno", "ALTER TABLE usuario ADD COLUMN restriccion_turno TEXT"],
  ["restriccion_obs", "ALTER TABLE usuario ADD COLUMN restriccion_obs TEXT"],
  ["es_nuevo", "ALTER TABLE usuario ADD COLUMN es_nuevo INTEGER NOT NULL DEFAULT 0"],
];

let n = 0;
for (const [name, sql] of añadir) {
  if (!cols.includes(name)) { db.exec(sql); n++; console.log(`✅ Columna usuario.${name} añadida.`); }
  else console.log(`ℹ  usuario.${name} ya existe.`);
}
console.log(n ? `Listo: ${n} columnas nuevas.` : 'Sin cambios (ya estaba migrado).');
db.close();
