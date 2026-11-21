// =====================================================================
//  seed_cobertura.js  —  Carga un perfil de cobertura de ejemplo.
//  Útil para probar el motor de aforo con datos realistas.
//  Uso:  node db/seed_cobertura.js ["WINGZ Alpes"]
//  (aplica el mismo perfil de demanda a los 7 días de la semana).
// =====================================================================
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '..', process.env.DB_PATH || './db/horary.sqlite');

const nombreSede = process.argv[2] || 'WINGZ Alpes';

// Demanda por hora (10..21) y rol representativo de cada área.
const perfil = {
  'AUX. PRODUCCIÓN':   { 10:1,11:2,12:3,13:3,14:2,15:2,16:3,17:3,18:4,19:4,20:4,21:3 },
  'ASESOR DE SERVICIO':{ 10:1,11:1,12:2,13:2,14:2,15:1,16:1,17:2,18:3,19:3,20:3,21:2 },
  'ADMINISTRADOR':     { 10:1,11:1,12:1,13:1,14:1,15:1,16:1,17:1,18:1,19:1,20:1,21:1 },
  'DOMICILIARIO':      { 12:1,13:1,14:1,17:1,18:2,19:2,20:2,21:1 },
};

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

const sede = db.prepare('SELECT id FROM sede WHERE nombre = ?').get(nombreSede);
if (!sede) { console.error(`No existe la sede "${nombreSede}".`); process.exit(1); }

const upsert = db.prepare(`
  INSERT INTO cobertura_requerida (sede_id, rol_id, dia_semana, hora, personas)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(sede_id, rol_id, dia_semana, hora) DO UPDATE SET personas = excluded.personas
`);

let n = 0;
db.exec('BEGIN');
try {
  for (const [rolNombre, horas] of Object.entries(perfil)) {
    const rol = db.prepare('SELECT id FROM rol WHERE nombre = ?').get(rolNombre);
    if (!rol) { console.warn(`Rol no encontrado: ${rolNombre}`); continue; }
    for (let dia = 0; dia < 7; dia++) {
      for (const [hora, personas] of Object.entries(horas)) {
        upsert.run(sede.id, rol.id, dia, Number(hora), personas);
        n++;
      }
    }
  }
  db.exec('COMMIT');
} catch (e) { db.exec('ROLLBACK'); throw e; }

console.log(`✅ Cobertura de ejemplo cargada para "${nombreSede}": ${n} celdas (7 días).`);
db.close();
