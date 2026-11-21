// Conexión única (singleton) a la base de datos SQLite usando el módulo nativo node:sqlite.
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const dbFile = resolve(projectRoot, env.dbPath);

if (!existsSync(dbFile)) {
  console.warn(
    `⚠  No se encontró la base de datos en ${dbFile}.\n` +
    `   Ejecuta "npm run db:init" para crearla antes de arrancar.`
  );
}

export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA foreign_keys = ON;');

// Cierre ordenado
function cerrar() {
  try { db.close(); } catch { /* ignore */ }
}
process.on('SIGINT', () => { cerrar(); process.exit(0); });
process.on('SIGTERM', () => { cerrar(); process.exit(0); });

export default db;
