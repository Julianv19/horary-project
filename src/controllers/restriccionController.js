// Controlador: restricciones múltiples por colaborador.
import Restriccion, { RESTRICCION2_TIPOS } from '../models/restriccion.js';
import Usuario from '../models/usuario.js';
import { DIAS } from '../lib/fechas.js';
import { RESTRICCION_TURNOS as TURNOS } from '../lib/restricciones.js';

export function index(req, res) {
  const usuario = Usuario.find(req.params.id);
  if (!usuario) return res.redirect('/colaboradores?err=' + encodeURIComponent('No existe el colaborador.'));
  res.render('restriccion/index', {
    titulo: 'Restricciones',
    usuario,
    restricciones: Restriccion.porUsuario(usuario.id),
    tipos: RESTRICCION2_TIPOS,
    turnos: TURNOS,
    DIAS,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function crear(req, res) {
  const id = req.params.id;
  try {
    if (!req.body.tipo) throw new Error('Selecciona un tipo de restricción.');
    Restriccion.create(id, req.body);
    res.redirect(`/colaboradores/${id}/restricciones?ok=${encodeURIComponent('Restricción agregada.')}`);
  } catch (e) {
    res.redirect(`/colaboradores/${id}/restricciones?err=${encodeURIComponent(e.message)}`);
  }
}

export function eliminar(req, res) {
  Restriccion.remove(req.params.rid);
  res.redirect(`/colaboradores/${req.params.id}/restricciones?ok=${encodeURIComponent('Restricción eliminada.')}`);
}

export function toggle(req, res) {
  Restriccion.toggle(req.params.rid);
  res.redirect(`/colaboradores/${req.params.id}/restricciones?ok=${encodeURIComponent('Estado actualizado.')}`);
}

export function estado(req, res) {
  Restriccion.setEstado(req.params.rid, req.body.estado);
  res.redirect(`/colaboradores/${req.params.id}/restricciones?ok=${encodeURIComponent('Solicitud ' + (req.body.estado || '').toLowerCase() + '.')}`);
}

export default { index, crear, eliminar, toggle, estado };
