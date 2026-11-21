// Modelo CRUD: rol
import db from '../config/db.js';

export const Rol = {
  all() {
    return db.prepare(`
      SELECT rol.*, area.nombre AS area
      FROM rol JOIN area ON area.id = rol.area_id
      ORDER BY area.orden, rol.nombre
    `).all();
  },
  find(id) {
    return db.prepare('SELECT * FROM rol WHERE id = ?').get(id);
  },
  create(d) {
    return db.prepare(
      'INSERT INTO rol (nombre, area_id, color) VALUES (?, ?, ?)'
    ).run(d.nombre?.trim(), Number(d.area_id), d.color?.trim() || '#cccccc');
  },
  update(id, d) {
    return db.prepare(
      'UPDATE rol SET nombre = ?, area_id = ?, color = ? WHERE id = ?'
    ).run(d.nombre?.trim(), Number(d.area_id), d.color?.trim() || '#cccccc', id);
  },
  remove(id) {
    return db.prepare('DELETE FROM rol WHERE id = ?').run(id);
  },
};

export default Rol;
