// Modelo CRUD: jornada_tipo
import db from '../config/db.js';

// Convierte '' o undefined a NULL; números válidos a Number.
const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

export const Jornada = {
  all() {
    return db.prepare('SELECT * FROM jornada_tipo ORDER BY id').all();
  },
  find(id) {
    return db.prepare('SELECT * FROM jornada_tipo WHERE id = ?').get(id);
  },
  create(d) {
    return db.prepare(`
      INSERT INTO jornada_tipo
        (codigo, nombre, horas_dia_exactas, horas_dia_min, horas_dia_max,
         horas_sem_min, horas_sem_max, dias_trabajo, descripcion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.codigo?.trim().toUpperCase(), d.nombre?.trim(),
      num(d.horas_dia_exactas), num(d.horas_dia_min), num(d.horas_dia_max),
      num(d.horas_sem_min), num(d.horas_sem_max),
      num(d.dias_trabajo) ?? 6, d.descripcion?.trim() || null
    );
  },
  update(id, d) {
    return db.prepare(`
      UPDATE jornada_tipo SET
        codigo = ?, nombre = ?, horas_dia_exactas = ?, horas_dia_min = ?,
        horas_dia_max = ?, horas_sem_min = ?, horas_sem_max = ?,
        dias_trabajo = ?, descripcion = ?
      WHERE id = ?
    `).run(
      d.codigo?.trim().toUpperCase(), d.nombre?.trim(),
      num(d.horas_dia_exactas), num(d.horas_dia_min), num(d.horas_dia_max),
      num(d.horas_sem_min), num(d.horas_sem_max),
      num(d.dias_trabajo) ?? 6, d.descripcion?.trim() || null, id
    );
  },
  remove(id) {
    return db.prepare('DELETE FROM jornada_tipo WHERE id = ?').run(id);
  },
};

export default Jornada;
