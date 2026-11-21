// Modelo: catálogos base (sedes, áreas, roles, jornadas).
import db from '../config/db.js';

export const Catalogo = {
  sedes() {
    return db.prepare('SELECT * FROM sede WHERE activo = 1 ORDER BY nombre').all();
  },

  jornadas() {
    return db.prepare('SELECT * FROM jornada_tipo ORDER BY id').all();
  },

  areas() {
    return db.prepare('SELECT * FROM area ORDER BY orden, nombre').all();
  },

  roles() {
    return db.prepare(`
      SELECT rol.id, rol.nombre, rol.color, area.nombre AS area, area.orden AS area_orden
      FROM rol
      JOIN area ON area.id = rol.area_id
      ORDER BY area.orden, rol.nombre
    `).all();
  },
};

export default Catalogo;
