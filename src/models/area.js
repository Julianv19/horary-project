// Modelo CRUD: area
import db from '../config/db.js';

export const Area = {
  all() {
    return db.prepare('SELECT * FROM area ORDER BY orden, nombre').all();
  },
  find(id) {
    return db.prepare('SELECT * FROM area WHERE id = ?').get(id);
  },
  create(d) {
    return db.prepare(
      'INSERT INTO area (nombre, orden) VALUES (?, ?)'
    ).run(d.nombre?.trim(), Number(d.orden) || 0);
  },
  update(id, d) {
    return db.prepare(
      'UPDATE area SET nombre = ?, orden = ? WHERE id = ?'
    ).run(d.nombre?.trim(), Number(d.orden) || 0, id);
  },
  remove(id) {
    return db.prepare('DELETE FROM area WHERE id = ?').run(id);
  },
};

export default Area;
