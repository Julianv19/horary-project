// Modelo: contingencias operativas, historial de cambios y snapshot original.
import db from '../config/db.js';

export const Contingencia = {
  all(sedeId = null) {
    const base = `
      SELECT c.*, u.nombre AS usuario, rep.nombre AS reemplazo, sede.nombre AS sede
      FROM contingencia c
      JOIN usuario u ON u.id = c.usuario_id
      JOIN sede ON sede.id = c.sede_id
      LEFT JOIN usuario rep ON rep.id = c.reemplazo_id
    `;
    if (sedeId) return db.prepare(base + ' WHERE c.sede_id = ? ORDER BY c.creado_en DESC').all(sedeId);
    return db.prepare(base + ' ORDER BY c.creado_en DESC').all();
  },
  find(id) { return db.prepare('SELECT * FROM contingencia WHERE id = ?').get(id); },
  create(d) {
    return db.prepare(
      'INSERT INTO contingencia (sede_id, usuario_id, fecha, fecha_fin, motivo, obs) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(Number(d.sede_id), Number(d.usuario_id), d.fecha, d.fecha_fin || null, d.motivo?.trim() || null, d.obs?.trim() || null);
  },
  setEstado(id, estado, reemplazoId = null) {
    return db.prepare('UPDATE contingencia SET estado = ?, reemplazo_id = ? WHERE id = ?').run(estado, reemplazoId, id);
  },
  remove(id) { return db.prepare('DELETE FROM contingencia WHERE id = ?').run(id); },
};

export const Historial = {
  add(h) {
    return db.prepare(`
      INSERT INTO historial_cambio
        (programacion_id, contingencia_id, usuario_afectado_id, reemplazo_id, responsable, motivo, turno_anterior, turno_nuevo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(h.programacion_id || null, h.contingencia_id || null, h.usuario_afectado_id || null,
      h.reemplazo_id || null, h.responsable || null, h.motivo || null, h.turno_anterior || null, h.turno_nuevo || null);
  },
  all() {
    return db.prepare(`
      SELECT hc.*, ua.nombre AS afectado, rep.nombre AS reemplazo
      FROM historial_cambio hc
      LEFT JOIN usuario ua ON ua.id = hc.usuario_afectado_id
      LEFT JOIN usuario rep ON rep.id = hc.reemplazo_id
      ORDER BY hc.fecha_hora DESC
    `).all();
  },
};

export const Snapshot = {
  existe(programacionId) {
    return !!db.prepare('SELECT 1 FROM turno_original WHERE programacion_id = ? LIMIT 1').get(programacionId);
  },
  // Guarda el horario ORIGINAL (una sola vez por semana).
  guardar(programacionId) {
    if (this.existe(programacionId)) return;
    const turnos = db.prepare('SELECT usuario_id, fecha, hora_inicio, hora_fin FROM turno WHERE programacion_id = ?').all(programacionId);
    const ins = db.prepare('INSERT INTO turno_original (programacion_id, usuario_id, fecha, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)');
    for (const t of turnos) ins.run(programacionId, t.usuario_id, t.fecha, t.hora_inicio, t.hora_fin);
  },
  original(programacionId) {
    return db.prepare(`
      SELECT o.*, u.nombre AS usuario FROM turno_original o
      JOIN usuario u ON u.id = o.usuario_id
      WHERE o.programacion_id = ? ORDER BY o.fecha, o.hora_inicio
    `).all(programacionId);
  },
};

export default Contingencia;
