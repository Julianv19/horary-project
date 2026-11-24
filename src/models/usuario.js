// Modelo: usuarios / colaboradores con su rol, área y jornada.
import db from '../config/db.js';

export const Usuario = {
  // Lista completa con detalle legible, opcionalmente filtrada por sede.
  listar(sedeId = null) {
    const base = `
      SELECT  u.id, u.nombre, u.activo,
              sede.nombre        AS sede,
              rol.nombre         AS rol,
              rol.color          AS rol_color,
              area.nombre        AS area,
              area.orden         AS area_orden,
              jornada_tipo.codigo AS jornada_codigo,
              jornada_tipo.nombre AS jornada,
              u.patron_id         AS patron_id,
              patron.nombre       AS patron,
              u.restriccion_tipo  AS restriccion_tipo,
              u.restriccion_turno AS restriccion_turno,
              u.es_nuevo          AS es_nuevo
      FROM usuario u
      JOIN sede         ON sede.id = u.sede_id
      JOIN rol          ON rol.id = u.rol_id
      JOIN area         ON area.id = rol.area_id
      JOIN jornada_tipo ON jornada_tipo.id = u.jornada_tipo_id
      LEFT JOIN patron ON patron.id = u.patron_id
    `;
    if (sedeId) {
      return db.prepare(base + ' WHERE u.sede_id = ? ORDER BY area.orden, rol.nombre, u.nombre').all(sedeId);
    }
    return db.prepare(base + ' ORDER BY sede.nombre, area.orden, rol.nombre, u.nombre').all();
  },

  contar() {
    return db.prepare('SELECT COUNT(*) AS n FROM usuario WHERE activo = 1').get().n;
  },

  // Conteo de colaboradores por área (para el aforo por rol/área).
  contarPorArea(sedeId = null) {
    const where = sedeId ? 'WHERE u.sede_id = ?' : '';
    const sql = `
      SELECT area.nombre AS area, area.orden AS orden, COUNT(*) AS personas
      FROM usuario u
      JOIN rol  ON rol.id = u.rol_id
      JOIN area ON area.id = rol.area_id
      ${where}
      GROUP BY area.id
      ORDER BY area.orden
    `;
    return sedeId ? db.prepare(sql).all(sedeId) : db.prepare(sql).all();
  },

  // --- CRUD ---
  // all() para el listado de gestión: alias legibles que usa la vista.
  all() {
    return this.listar();
  },
  find(id) {
    return db.prepare('SELECT * FROM usuario WHERE id = ?').get(id);
  },

  // Colaboradores activos de una sede con TODAS las reglas de su jornada.
  // Lo usa el motor de aforo.
  paraProgramacion(sedeId) {
    return db.prepare(`
      SELECT  u.id, u.nombre, u.rol_id, u.patron_id,
              u.restriccion_tipo, u.restriccion_turno, u.es_nuevo,
              rol.nombre AS rol, area.nombre AS area, area.orden AS area_orden,
              jt.codigo AS jornada_codigo, jt.nombre AS jornada,
              jt.horas_dia_exactas, jt.horas_dia_min, jt.horas_dia_max,
              jt.horas_sem_min, jt.horas_sem_max, jt.dias_trabajo
      FROM usuario u
      JOIN rol  ON rol.id = u.rol_id
      JOIN area ON area.id = rol.area_id
      JOIN jornada_tipo jt ON jt.id = u.jornada_tipo_id
      WHERE u.sede_id = ? AND u.activo = 1
      ORDER BY area.orden, rol.nombre, u.nombre
    `).all(sedeId);
  },
  create(d) {
    return db.prepare(`
      INSERT INTO usuario (nombre, email, sede_id, rol_id, jornada_tipo_id, patron_id,
                           restriccion_tipo, restriccion_turno, restriccion_obs, es_nuevo, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.nombre?.trim(), d.email?.trim() || null,
      Number(d.sede_id), Number(d.rol_id), Number(d.jornada_tipo_id),
      d.patron_id ? Number(d.patron_id) : null,
      d.restriccion_tipo || 'NINGUNA', d.restriccion_turno || null,
      d.restriccion_obs?.trim() || null, d.es_nuevo ? 1 : 0,
      d.activo ? 1 : 0
    );
  },
  update(id, d) {
    return db.prepare(`
      UPDATE usuario SET nombre = ?, email = ?, sede_id = ?, rol_id = ?,
             jornada_tipo_id = ?, patron_id = ?, restriccion_tipo = ?,
             restriccion_turno = ?, restriccion_obs = ?, es_nuevo = ?, activo = ?
      WHERE id = ?
    `).run(
      d.nombre?.trim(), d.email?.trim() || null,
      Number(d.sede_id), Number(d.rol_id), Number(d.jornada_tipo_id),
      d.patron_id ? Number(d.patron_id) : null,
      d.restriccion_tipo || 'NINGUNA', d.restriccion_turno || null,
      d.restriccion_obs?.trim() || null, d.es_nuevo ? 1 : 0,
      d.activo ? 1 : 0, id
    );
  },
  remove(id) {
    return db.prepare('DELETE FROM usuario WHERE id = ?').run(id);
  },
};

export default Usuario;
