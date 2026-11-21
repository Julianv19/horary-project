// Modelo: cobertura_requerida (personas necesarias por sede + rol + día + hora).
import db from '../config/db.js';

export const Cobertura = {
  porSede(sedeId) {
    return db.prepare(
      'SELECT * FROM cobertura_requerida WHERE sede_id = ?'
    ).all(sedeId);
  },

  // Filas de un día concreto, con nombre/área del rol.
  porSedeDia(sedeId, dia) {
    return db.prepare(`
      SELECT c.*, rol.nombre AS rol, area.nombre AS area, area.orden AS area_orden
      FROM cobertura_requerida c
      JOIN rol  ON rol.id = c.rol_id
      JOIN area ON area.id = rol.area_id
      WHERE c.sede_id = ? AND c.dia_semana = ?
    `).all(sedeId, dia);
  },

  // Mapa anidado map[dia][hora][rol_id] = personas (toda la sede).
  mapaPorSede(sedeId) {
    const map = {};
    for (const r of this.porSede(sedeId)) {
      (map[r.dia_semana] ??= {});
      (map[r.dia_semana][r.hora] ??= {});
      map[r.dia_semana][r.hora][r.rol_id] = r.personas;
    }
    return map;
  },

  // Inserta o actualiza una celda. personas<=0 elimina la fila.
  upsert(sedeId, rolId, dia, hora, personas) {
    const n = Number(personas) || 0;
    if (n <= 0) {
      return db.prepare(
        'DELETE FROM cobertura_requerida WHERE sede_id=? AND rol_id=? AND dia_semana=? AND hora=?'
      ).run(sedeId, rolId, dia, hora);
    }
    return db.prepare(`
      INSERT INTO cobertura_requerida (sede_id, rol_id, dia_semana, hora, personas)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(sede_id, rol_id, dia_semana, hora)
      DO UPDATE SET personas = excluded.personas
    `).run(sedeId, rolId, dia, hora, n);
  },

  // Copia la cobertura de un día origen a los demás días (1..6 o lista).
  copiarADias(sedeId, diaOrigen, diasDestino) {
    const filas = db.prepare(
      'SELECT rol_id, hora, personas FROM cobertura_requerida WHERE sede_id=? AND dia_semana=?'
    ).all(sedeId, diaOrigen);
    try {
      db.exec('BEGIN');
      for (const dia of diasDestino) {
        db.prepare('DELETE FROM cobertura_requerida WHERE sede_id=? AND dia_semana=?').run(sedeId, dia);
        for (const f of filas) {
          db.prepare(
            'INSERT INTO cobertura_requerida (sede_id, rol_id, dia_semana, hora, personas) VALUES (?,?,?,?,?)'
          ).run(sedeId, f.rol_id, dia, f.hora, f.personas);
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};

export default Cobertura;
