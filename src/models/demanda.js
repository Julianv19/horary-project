// Modelo: demanda operativa (refuerzo por franja y rol).
import db from '../config/db.js';
import { DIAS } from '../lib/fechas.js';

export const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'];

export const Demanda = {
  all() {
    const rows = db.prepare(`
      SELECT d.*, rol.nombre AS rol_nombre, sede.nombre AS sede_nombre
      FROM demanda d
      LEFT JOIN rol ON rol.id = d.rol_id
      JOIN sede ON sede.id = d.sede_id
      ORDER BY d.dia_semana, d.hora_inicio
    `).all();
    return rows.map((r) => ({
      ...r,
      dia: DIAS[r.dia_semana],
      franja: `${r.hora_inicio}–${r.hora_fin}`,
      rol: r.rol_nombre || '(cualquiera)',
      sede: r.sede_nombre,
    }));
  },

  find(id) { return db.prepare('SELECT * FROM demanda WHERE id = ?').get(id); },

  create(d) {
    return db.prepare(`
      INSERT INTO demanda (sede_id, dia_semana, hora_inicio, hora_fin, rol_id, personas, prioridad, obs, activa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      Number(d.sede_id), Number(d.dia_semana), d.hora_inicio, d.hora_fin,
      d.rol_id ? Number(d.rol_id) : null, Number(d.personas) || 1,
      d.prioridad || 'MEDIA', d.obs?.trim() || null
    );
  },

  update(id, d) {
    return db.prepare(`
      UPDATE demanda SET sede_id=?, dia_semana=?, hora_inicio=?, hora_fin=?, rol_id=?, personas=?, prioridad=?, obs=?
      WHERE id=?
    `).run(
      Number(d.sede_id), Number(d.dia_semana), d.hora_inicio, d.hora_fin,
      d.rol_id ? Number(d.rol_id) : null, Number(d.personas) || 1,
      d.prioridad || 'MEDIA', d.obs?.trim() || null, id
    );
  },

  remove(id) { return db.prepare('DELETE FROM demanda WHERE id = ?').run(id); },

  activasPorSede(sedeId) {
    return db.prepare('SELECT * FROM demanda WHERE sede_id = ? AND activa = 1').all(sedeId);
  },
};

export default Demanda;
