// Modelo: programación semanal y sus turnos.
import db from '../config/db.js';

export const Programacion = {
  find(sedeId, semanaInicio) {
    return db.prepare(
      'SELECT * FROM programacion WHERE sede_id = ? AND semana_inicio = ?'
    ).get(sedeId, semanaInicio);
  },

  findOrCreate(sedeId, semanaInicio) {
    let p = this.find(sedeId, semanaInicio);
    if (!p) {
      const r = db.prepare(
        'INSERT INTO programacion (sede_id, semana_inicio) VALUES (?, ?)'
      ).run(sedeId, semanaInicio);
      p = db.prepare('SELECT * FROM programacion WHERE id = ?').get(r.lastInsertRowid);
    }
    return p;
  },

  listarPorSede(sedeId) {
    return db.prepare(
      'SELECT * FROM programacion WHERE sede_id = ? ORDER BY semana_inicio DESC'
    ).all(sedeId);
  },

  limpiarTurnos(programacionId) {
    return db.prepare('DELETE FROM turno WHERE programacion_id = ?').run(programacionId);
  },

  eliminarTurnosUsuarioFecha(programacionId, usuarioId, fecha) {
    return db.prepare(
      'DELETE FROM turno WHERE programacion_id = ? AND usuario_id = ? AND fecha = ?'
    ).run(programacionId, usuarioId, fecha);
  },

  insertarTurno(t) {
    return db.prepare(`
      INSERT INTO turno (programacion_id, usuario_id, fecha, hora_inicio, hora_fin, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(t.programacion_id, t.usuario_id, t.fecha, t.hora_inicio, t.hora_fin, t.orden ?? 0);
  },

  // Turnos de una programación con detalle de usuario/rol/área/jornada.
  turnosConDetalle(programacionId) {
    return db.prepare(`
      SELECT  tu.*, u.nombre AS usuario,
              rol.nombre AS rol, rol.color AS rol_color,
              area.nombre AS area, area.orden AS area_orden,
              jt.codigo AS jornada_codigo
      FROM turno tu
      JOIN usuario u ON u.id = tu.usuario_id
      JOIN rol  ON rol.id = u.rol_id
      JOIN area ON area.id = rol.area_id
      JOIN jornada_tipo jt ON jt.id = u.jornada_tipo_id
      WHERE tu.programacion_id = ?
      ORDER BY area.orden, rol.nombre, u.nombre, tu.fecha, tu.orden
    `).all(programacionId);
  },
};

export default Programacion;
