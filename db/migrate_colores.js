// =====================================================================
//  migrate_colores.js  —  Fija los colores corporativos por rol.
//  Aux. barra: azul claro · Asesores: azul oscuro · Cocina: verde oscuro.
//  Idempotente.  Uso:  node db/migrate_colores.js
// =====================================================================
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '..', process.env.DB_PATH || './db/horary.sqlite');

const db = new DatabaseSync(dbPath);

// nombre de rol -> color
const colores = {
  'AUX. BARRA': '#5BC2E7',              // azul claro
  'ASESOR DE SERVICIO': '#1F3C88',      // azul oscuro
  'AUX. PRODUCCIÓN': '#1E6B3A',         // verde oscuro (cocina)
  'AUX. PRODUCCIÓN CAPITÁN': '#14562D', // verde oscuro
  'HOTS': '#2E8B57',                    // verde (cocina)
};

const upd = db.prepare('UPDATE rol SET color = ? WHERE nombre = ?');
let n = 0;
for (const [nombre, color] of Object.entries(colores)) {
  const r = upd.run(color, nombre);
  if (r.changes) { n++; console.log(`✅ ${nombre} → ${color}`); }
  else console.log(`ℹ  rol no encontrado: ${nombre}`);
}
console.log(`Listo: ${n} roles actualizados.`);
db.close();
