// Modelo CRUD: sede
import db from '../config/db.js';

export const Sede = {
  all() {
    return db.prepare('SELECT * FROM sede ORDER BY nombre').all();
  },
  activas() {
    return db.prepare('SELECT * FROM sede WHERE activo = 1 ORDER BY nombre').all();
  },
  find(id) {
    return db.prepare('SELECT * FROM sede WHERE id = ?').get(id);
  },
  create(d) {
    return db.prepare(
      'INSERT INTO sede (nombre, ciudad, activo) VALUES (?, ?, ?)'
    ).run(d.nombre?.trim(), d.ciudad?.trim() || null, d.activo ? 1 : 0);
  },
  update(id, d) {
    return db.prepare(
      'UPDATE sede SET nombre = ?, ciudad = ?, activo = ? WHERE id = ?'
    ).run(d.nombre?.trim(), d.ciudad?.trim() || null, d.activo ? 1 : 0, id);
  },
  remove(id) {
    return db.prepare('DELETE FROM sede WHERE id = ?').run(id);
  },
};

export default Sede;
