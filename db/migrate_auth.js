// =====================================================================
//  migrate_auth.js  —  Crea la tabla cuenta y siembra accesos.
//  - 1 administrador:  admin / admin123
//  - 1 cuenta por colaborador: <nombre>.<id> / clave123
//  Idempotente. Uso:  node db/migrate_auth.js
// =====================================================================
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { hashPassword } from '../src/lib/password.js';

loadEnv();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '..', process.env.DB_PATH || './db/horary.sqlite');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS cuenta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    es_admin INTEGER NOT NULL DEFAULT 0,
    usuario_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
    nombre TEXT
  );
`);

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'user';

const insert = db.prepare(
  'INSERT OR IGNORE INTO cuenta (username, password_hash, es_admin, usuario_id, nombre) VALUES (?, ?, ?, ?, ?)'
);

// Admin
const existeAdmin = db.prepare("SELECT 1 FROM cuenta WHERE username='admin'").get();
if (!existeAdmin) {
  insert.run('admin', hashPassword('admin123'), 1, null, 'Administrador');
  console.log('✅ Admin creado:  usuario "admin"  contraseña "admin123"');
} else {
  console.log('ℹ  La cuenta admin ya existe.');
}

// Una cuenta por colaborador (sin cuenta aún)
const colaboradores = db.prepare(`
  SELECT u.id, u.nombre FROM usuario u
  WHERE u.id NOT IN (SELECT usuario_id FROM cuenta WHERE usuario_id IS NOT NULL)
`).all();

let creadas = 0;
for (const u of colaboradores) {
  const username = `${slug(u.nombre.split(' ')[0])}.${u.id}`;
  const r = insert.run(username, hashPassword('clave123'), 0, u.id, u.nombre);
  if (r.changes) creadas++;
}
console.log(`✅ ${creadas} cuentas de colaborador creadas (contraseña por defecto: "clave123").`);
console.log('   Usuario de cada colaborador: <nombre>.<id>  (p. ej. "robinson.1"). Ver tabla cuenta.');

db.close();
