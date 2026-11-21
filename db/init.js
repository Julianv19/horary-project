// =====================================================================
//  init.js  —  Crea la base de datos SQLite a partir de schema.sql + seed.sql
//  Uso:
//    node db/init.js            crea la BD si no existe y aplica schema + seed
//    node db/init.js --reset    borra la BD existente y la recrea desde cero
// =====================================================================

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const dbPath = resolve(projectRoot, process.env.DB_PATH || './db/horary.sqlite');
const reset = process.argv.includes('--reset');

const schemaSql = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');
const seedSql = readFileSync(resolve(__dirname, 'seed.sql'), 'utf8');

if (reset && existsSync(dbPath)) {
  rmSync(dbPath);
  console.log(`🗑  Base de datos anterior eliminada: ${dbPath}`);
}

// Asegura que la carpeta destino exista
mkdirSync(dirname(dbPath), { recursive: true });

const yaExistia = existsSync(dbPath);
const db = new DatabaseSync(dbPath);

try {
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('📐 Aplicando esquema (schema.sql)...');
  db.exec(schemaSql);

  // Solo sembramos si la tabla sede está vacía (evita duplicar datos)
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM sede').get();
  if (total === 0) {
    console.log('🌱 Cargando datos de ejemplo (seed.sql)...');
    db.exec(seedSql);
  } else {
    console.log('ℹ  La base ya contiene datos; se omite el seed.');
  }

  // Pequeño resumen
  const resumen = {
    sedes: db.prepare('SELECT COUNT(*) AS n FROM sede').get().n,
    areas: db.prepare('SELECT COUNT(*) AS n FROM area').get().n,
    roles: db.prepare('SELECT COUNT(*) AS n FROM rol').get().n,
    jornadas: db.prepare('SELECT COUNT(*) AS n FROM jornada_tipo').get().n,
    usuarios: db.prepare('SELECT COUNT(*) AS n FROM usuario').get().n,
  };
  console.log('✅ Base de datos lista:', yaExistia ? `(${dbPath})` : `(creada en ${dbPath})`);
  console.table(resumen);
} finally {
  db.close();
}
