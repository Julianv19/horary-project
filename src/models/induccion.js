// Modelo: inducciones (colaborador nuevo acompañado por un mentor).
import db from '../config/db.js';

export const Induccion = {
  all() {
    return db.prepare(`
      SELECT i.*, u.nombre AS nuevo, m.nombre AS mentor
      FROM induccion i
      JOIN usuario u ON u.id = i.usuario_id
      LEFT JOIN usuario m ON m.id = i.mentor_id
      ORDER BY i.activa DESC, i.id DESC
    `).all().map((r) => ({
      ...r,
      periodo: `${r.fecha_inicio || '…'} → ${r.fecha_fin || '…'}`,
      mentor: r.mentor || '(sin mentor)',
    }));
  },

  find(id) { return db.prepare('SELECT * FROM induccion WHERE id = ?').get(id); },

  create(d) {
    const r = db.prepare(`
      INSERT INTO induccion (usuario_id, mentor_id, fecha_inicio, fecha_fin, obs, activa)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(Number(d.usuario_id), d.mentor_id ? Number(d.mentor_id) : null,
      d.fecha_inicio || null, d.fecha_fin || null, d.obs?.trim() || null);
    // Marca al colaborador como "en inducción".
    db.prepare('UPDATE usuario SET es_nuevo = 1 WHERE id = ?').run(Number(d.usuario_id));
    return r;
  },

  update(id, d) {
    return db.prepare(`
      UPDATE induccion SET usuario_id=?, mentor_id=?, fecha_inicio=?, fecha_fin=?, obs=?
      WHERE id=?
    `).run(Number(d.usuario_id), d.mentor_id ? Number(d.mentor_id) : null,
      d.fecha_inicio || null, d.fecha_fin || null, d.obs?.trim() || null, id);
  },

  remove(id) { return db.prepare('DELETE FROM induccion WHERE id = ?').run(id); },

  // Inducciones vigentes de una sede en una fecha (para el generador).
  vigentesPorSede(sedeId, fecha) {
    return db.prepare(`
      SELECT i.* FROM induccion i
      JOIN usuario u ON u.id = i.usuario_id
      WHERE u.sede_id = ? AND i.activa = 1
        AND (i.fecha_inicio IS NULL OR i.fecha_inicio <= ?)
        AND (i.fecha_fin IS NULL OR i.fecha_fin >= ?)
    `).all(sedeId, fecha, fecha);
  },
};

export default Induccion;
