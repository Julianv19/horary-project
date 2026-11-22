// Modelo: ausencias (incapacidad, licencia, vacaciones, permiso).
import db from '../config/db.js';

export const TIPOS = ['INCAPACIDAD', 'LICENCIA', 'VACACIONES', 'PERMISO'];

export const Ausencia = {
  all() {
    return db.prepare(`
      SELECT a.*, u.nombre AS usuario, sede.nombre AS sede, rol.nombre AS rol
      FROM ausencia a
      JOIN usuario u ON u.id = a.usuario_id
      JOIN sede ON sede.id = u.sede_id
      JOIN rol  ON rol.id = u.rol_id
      ORDER BY a.fecha_inicio DESC
    `).all();
  },

  find(id) {
    return db.prepare('SELECT * FROM ausencia WHERE id = ?').get(id);
  },

  create(d) {
    if (!TIPOS.includes(d.tipo)) throw new Error('Tipo de ausencia no válido.');
    if (!d.fecha_inicio || !d.fecha_fin) throw new Error('Fechas de inicio y fin son obligatorias.');
    if (d.fecha_fin < d.fecha_inicio) throw new Error('La fecha fin no puede ser anterior a la de inicio.');
    return db.prepare(
      'INSERT INTO ausencia (usuario_id, tipo, fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?, ?, ?)'
    ).run(Number(d.usuario_id), d.tipo, d.fecha_inicio, d.fecha_fin, d.motivo?.trim() || null);
  },

  remove(id) {
    return db.prepare('DELETE FROM ausencia WHERE id = ?').run(id);
  },

  // Ausencias de los colaboradores de una sede que se solapan con [ini, fin].
  vigentesEnRango(sedeId, ini, fin) {
    return db.prepare(`
      SELECT a.usuario_id, a.tipo, a.fecha_inicio, a.fecha_fin
      FROM ausencia a
      JOIN usuario u ON u.id = a.usuario_id
      WHERE u.sede_id = ? AND a.fecha_inicio <= ? AND a.fecha_fin >= ?
    `).all(sedeId, fin, ini);
  },
};

export default Ausencia;
