// Modelo: restricciones múltiples por colaborador.
import db from '../config/db.js';

export const RESTRICCION2_TIPOS = [
  { val: 'FIJO_MANANA', label: 'Turno fijo de mañana' },
  { val: 'FIJO_TARDE_NOCHE', label: 'Turno fijo de tarde-noche' },
  { val: 'MEDICA', label: 'Restricción médica' },
  { val: 'ACADEMICA', label: 'Restricción académica' },
  { val: 'VACACIONES', label: 'Vacaciones' },
  { val: 'DIAS_NO_DISPONIBLE', label: 'Días no disponibles' },
  { val: 'FRANJA_NO_DISPONIBLE', label: 'Franja horaria no disponible' },
];
export const etiquetaR2 = (v) => (RESTRICCION2_TIPOS.find((t) => t.val === v) || {}).label || v;

export const Restriccion = {
  porUsuario(usuarioId) {
    return db.prepare('SELECT * FROM restriccion WHERE usuario_id = ? ORDER BY activa DESC, creado_en DESC').all(usuarioId);
  },
  find(id) { return db.prepare('SELECT * FROM restriccion WHERE id = ?').get(id); },

  create(usuarioId, d) {
    const dias = Array.isArray(d.dias_semana) ? d.dias_semana.join(',') : (d.dias_semana || null);
    return db.prepare(`
      INSERT INTO restriccion (usuario_id, tipo, turno, fecha_inicio, fecha_fin, dias_semana, hora_inicio, hora_fin, estado, obs, activa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      Number(usuarioId), d.tipo, d.turno || null,
      d.fecha_inicio || null, d.fecha_fin || null, dias || null,
      d.hora_inicio || null, d.hora_fin || null,
      d.tipo === 'VACACIONES' ? (d.estado || 'PENDIENTE') : 'APROBADA',
      d.obs?.trim() || null
    );
  },

  setEstado(id, estado) { return db.prepare('UPDATE restriccion SET estado = ? WHERE id = ?').run(estado, id); },
  toggle(id) { return db.prepare('UPDATE restriccion SET activa = 1 - activa WHERE id = ?').run(id); },
  remove(id) { return db.prepare('DELETE FROM restriccion WHERE id = ?').run(id); },

  // Restricciones activas de todos los colaboradores de una sede (para el generador).
  activasPorSede(sedeId) {
    return db.prepare(`
      SELECT r.* FROM restriccion r
      JOIN usuario u ON u.id = r.usuario_id
      WHERE u.sede_id = ? AND r.activa = 1
    `).all(sedeId);
  },
};

export default Restriccion;
