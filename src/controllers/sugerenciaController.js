// Controlador: sugerencias y solicitudes previas a la generación.
import Sugerencia, { SUGERENCIA_TIPOS } from '../models/sugerencia.js';
import Usuario from '../models/usuario.js';
import Sede from '../models/sede.js';
import { RESTRICCION_TURNOS } from '../lib/restricciones.js';

export function index(req, res) {
  res.render('sugerencia/index', {
    titulo: 'Sugerencias y solicitudes',
    sugerencias: Sugerencia.all(),
    usuarios: Usuario.listar(),
    sedes: Sede.activas(),
    tipos: SUGERENCIA_TIPOS,
    turnos: RESTRICCION_TURNOS,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function crear(req, res) {
  try {
    if (!req.body.usuario_id || !req.body.tipo) throw new Error('Colaborador y tipo son obligatorios.');
    // Inferir sede del colaborador si no viene.
    if (!req.body.sede_id) {
      const u = Usuario.find(Number(req.body.usuario_id));
      req.body.sede_id = u?.sede_id;
    }
    Sugerencia.create(req.body);
    res.redirect(`/sugerencias?ok=${encodeURIComponent('Sugerencia registrada.')}`);
  } catch (e) {
    res.redirect(`/sugerencias?err=${encodeURIComponent(e.message)}`);
  }
}

export function toggle(req, res) {
  Sugerencia.toggle(req.params.id);
  res.redirect(`/sugerencias?ok=${encodeURIComponent('Estado actualizado.')}`);
}

export function eliminar(req, res) {
  Sugerencia.remove(req.params.id);
  res.redirect(`/sugerencias?ok=${encodeURIComponent('Sugerencia eliminada.')}`);
}

export default { index, crear, toggle, eliminar };
