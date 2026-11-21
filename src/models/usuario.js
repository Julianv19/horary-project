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
              jornada_tipo.nombre AS jornada
      FROM usuario u
      JOIN sede         ON sede.id = u.sede_id
      JOIN rol          ON rol.id = u.rol_id
      JOIN area         ON area.id = rol.area_id
      JOIN jornada_tipo ON jornada_tipo.id = u.jornada_tipo_id
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
};

export default Usuario;
