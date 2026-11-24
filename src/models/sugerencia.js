// Modelo: sugerencias y solicitudes previas a la generación de horarios.
import db from '../config/db.js';

export const SUGERENCIA_TIPOS = [
  { val: 'PRIORIZAR_TURNO', label: 'Priorizar en un turno' },
  { val: 'EVITAR_TURNO', label: 'Evitar un turno' },
  { val: 'ACOMPANAR', label: 'Acompañar a (personal experimentado)' },
  { val: 'NOTA', label: 'Nota operativa' },
];
export const etiquetaSug = (v) => (SUGERENCIA_TIPOS.find((t) => t.val === v) || {}).label || v;

export const Sugerencia = {
  all(sedeId = null) {
    const base = `
      SELECT s.*, u.nombre AS usuario, sede.nombre AS sede, o.nombre AS otro_usuario
      FROM sugerencia s
      JOIN usuario u    ON u.id = s.usuario_id
      JOIN sede         ON sede.id = s.sede_id
      LEFT JOIN usuario o ON o.id = s.otro_usuario_id
    `;
    if (sedeId) return db.prepare(base + ' WHERE s.sede_id = ? ORDER BY s.activa DESC, s.creado_en DESC').all(sedeId);
    return db.prepare(base + ' ORDER BY s.activa DESC, s.creado_en DESC').all();
  },

  find(id) { return db.prepare('SELECT * FROM sugerencia WHERE id = ?').get(id); },

  create(d) {
    return db.prepare(`
      INSERT INTO sugerencia (sede_id, usuario_id, tipo, turno, otro_usuario_id, texto, activa)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      Number(d.sede_id), Number(d.usuario_id), d.tipo,
      d.turno || null, d.otro_usuario_id ? Number(d.otro_usuario_id) : null,
      d.texto?.trim() || null
    );
  },

  toggle(id) { return db.prepare('UPDATE sugerencia SET activa = 1 - activa WHERE id = ?').run(id); },
  remove(id) { return db.prepare('DELETE FROM sugerencia WHERE id = ?').run(id); },

  // Sugerencias activas de una sede, para el generador y la validación.
  activasPorSede(sedeId) {
    return db.prepare('SELECT * FROM sugerencia WHERE sede_id = ? AND activa = 1').all(sedeId);
  },
};

export default Sugerencia;
