// Modelo: patrones de turnos (plantillas que define el administrador).
import db from '../config/db.js';

export const RUTINAS = ['TODO_DIA', 'DIA', 'NOCHE', 'DIA_NOCHE'];

export const Patron = {
  all() {
    return db.prepare(`
      SELECT p.*, COUNT(t.id) AS turnos,
             COUNT(DISTINCT t.dia_semana) AS dias
      FROM patron p
      LEFT JOIN patron_turno t ON t.patron_id = p.id
      GROUP BY p.id
      ORDER BY p.nombre
    `).all();
  },

  find(id) {
    return db.prepare('SELECT * FROM patron WHERE id = ?').get(id);
  },

  create(d) {
    return db.prepare(
      'INSERT INTO patron (nombre, rutina, descripcion) VALUES (?, ?, ?)'
    ).run(d.nombre?.trim(), d.rutina || null, d.descripcion?.trim() || null);
  },

  update(id, d) {
    return db.prepare(
      'UPDATE patron SET nombre = ?, rutina = ?, descripcion = ? WHERE id = ?'
    ).run(d.nombre?.trim(), d.rutina || null, d.descripcion?.trim() || null, id);
  },

  remove(id) {
    // Desvincula colaboradores y borra los turnos del patrón antes de eliminarlo.
    db.prepare('UPDATE usuario SET patron_id = NULL WHERE patron_id = ?').run(id);
    db.prepare('DELETE FROM patron_turno WHERE patron_id = ?').run(id);
    return db.prepare('DELETE FROM patron WHERE id = ?').run(id);
  },

  turnos(patronId) {
    return db.prepare(
      'SELECT * FROM patron_turno WHERE patron_id = ? ORDER BY dia_semana, orden'
    ).all(patronId);
  },

  // Mapa { dia: [ {hora_inicio, hora_fin, orden}, ... ] }
  turnosPorDia(patronId) {
    const map = {};
    for (const t of this.turnos(patronId)) {
      (map[t.dia_semana] ??= []).push({ hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, orden: t.orden });
    }
    return map;
  },

  // Igual que turnosPorDia pero incluye el id de cada turno (para editarlos).
  turnosConIdPorDia(patronId) {
    const map = {};
    for (const t of this.turnos(patronId)) {
      (map[t.dia_semana] ??= []).push({ id: t.id, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin, orden: t.orden });
    }
    return map;
  },

  addTurno(patronId, dia, inicio, fin) {
    const orden = db.prepare(
      'SELECT COALESCE(MAX(orden), -1) + 1 AS o FROM patron_turno WHERE patron_id = ? AND dia_semana = ?'
    ).get(patronId, dia).o;
    return db.prepare(
      'INSERT INTO patron_turno (patron_id, dia_semana, hora_inicio, hora_fin, orden) VALUES (?, ?, ?, ?, ?)'
    ).run(patronId, dia, inicio, fin, orden);
  },

  removeTurno(turnoId) {
    return db.prepare('DELETE FROM patron_turno WHERE id = ?').run(turnoId);
  },

  usados() {
    return db.prepare('SELECT DISTINCT patron_id FROM usuario WHERE patron_id IS NOT NULL').all().map((r) => r.patron_id);
  },
};

export default Patron;
