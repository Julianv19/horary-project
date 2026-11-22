// Modelo: solicitudes de descanso (las pide el colaborador, las aprueba el admin).
import db from '../config/db.js';

export const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];

export const Descanso = {
  all() {
    return db.prepare(`
      SELECT  s.*, u.nombre AS usuario,
              sede.nombre AS sede, rol.nombre AS rol
      FROM descanso_solicitud s
      JOIN usuario u ON u.id = s.usuario_id
      JOIN sede ON sede.id = u.sede_id
      JOIN rol  ON rol.id = u.rol_id
      ORDER BY (s.estado='PENDIENTE') DESC, s.fecha DESC, s.creado_en DESC
    `).all();
  },

  find(id) {
    return db.prepare('SELECT * FROM descanso_solicitud WHERE id = ?').get(id);
  },

  create(d) {
    return db.prepare(
      'INSERT INTO descanso_solicitud (usuario_id, fecha, motivo, estado) VALUES (?, ?, ?, ?)'
    ).run(Number(d.usuario_id), d.fecha, d.motivo?.trim() || null, 'PENDIENTE');
  },

  setEstado(id, estado) {
    if (!ESTADOS.includes(estado)) throw new Error('Estado no válido.');
    return db.prepare('UPDATE descanso_solicitud SET estado = ? WHERE id = ?').run(estado, id);
  },

  remove(id) {
    return db.prepare('DELETE FROM descanso_solicitud WHERE id = ?').run(id);
  },

  // Descansos APROBADOS de los colaboradores de una sede dentro de un rango.
  aprobadasEnRango(sedeId, fechaIni, fechaFin) {
    return db.prepare(`
      SELECT s.usuario_id, s.fecha
      FROM descanso_solicitud s
      JOIN usuario u ON u.id = s.usuario_id
      WHERE u.sede_id = ? AND s.estado = 'APROBADA'
        AND s.fecha BETWEEN ? AND ?
    `).all(sedeId, fechaIni, fechaFin);
  },
};

export default Descanso;
