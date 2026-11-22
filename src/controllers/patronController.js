// Controlador: patrones de turnos (plantillas del administrador).
import Patron, { RUTINAS } from '../models/patron.js';
import { DIAS } from '../lib/fechas.js';

export function index(req, res) {
  res.render('patron/list', {
    titulo: 'Patrones de turnos',
    patrones: Patron.all(),
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function formNew(req, res) {
  res.render('patron/form', {
    titulo: 'Nuevo patrón',
    patron: {}, turnosPorDia: {}, RUTINAS, DIAS, esNuevo: true, error: null,
  });
}

export function crear(req, res) {
  try {
    const r = Patron.create(req.body);
    // Ir a la edición para añadir los turnos del patrón.
    res.redirect(`/patrones/${r.lastInsertRowid}/editar?ok=${encodeURIComponent('Patrón creado. Agrega sus turnos por día.')}`);
  } catch (e) {
    res.status(400).render('patron/form', {
      titulo: 'Nuevo patrón', patron: req.body, turnosPorDia: {}, RUTINAS, DIAS, esNuevo: true, error: e.message,
    });
  }
}

export function formEdit(req, res) {
  const patron = Patron.find(req.params.id);
  if (!patron) return res.redirect('/patrones?err=' + encodeURIComponent('No existe el patrón.'));
  res.render('patron/form', {
    titulo: `Editar patrón: ${patron.nombre}`,
    patron, turnosPorDia: Patron.turnosConIdPorDia(patron.id), RUTINAS, DIAS, esNuevo: false,
    error: null,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function actualizar(req, res) {
  Patron.update(req.params.id, req.body);
  res.redirect(`/patrones/${req.params.id}/editar?ok=${encodeURIComponent('Patrón actualizado.')}`);
}

export function eliminar(req, res) {
  Patron.remove(req.params.id);
  res.redirect(`/patrones?ok=${encodeURIComponent('Patrón eliminado.')}`);
}

export function addTurno(req, res) {
  const id = req.params.id;
  try {
    if (!req.body.hora_inicio || !req.body.hora_fin) throw new Error('Horas obligatorias.');
    if (req.body.hora_fin <= req.body.hora_inicio) throw new Error('La hora fin debe ser mayor que la de inicio.');
    Patron.addTurno(id, Number(req.body.dia_semana), req.body.hora_inicio, req.body.hora_fin);
    res.redirect(`/patrones/${id}/editar?ok=${encodeURIComponent('Turno agregado.')}`);
  } catch (e) {
    res.redirect(`/patrones/${id}/editar?err=${encodeURIComponent(e.message)}`);
  }
}

export function removeTurno(req, res) {
  Patron.removeTurno(req.params.tid);
  res.redirect(`/patrones/${req.params.id}/editar?ok=${encodeURIComponent('Turno eliminado.')}`);
}

export default { index, formNew, crear, formEdit, actualizar, eliminar, addTurno, removeTurno };
