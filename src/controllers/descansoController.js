// Controlador: solicitudes de descanso.
import Descanso from '../models/descanso.js';
import Usuario from '../models/usuario.js';
import { DIAS, parseYMD, diaSemanaLunes0 } from '../lib/fechas.js';

export function index(req, res) {
  const solicitudes = Descanso.all().map((s) => ({
    ...s,
    diaNombre: DIAS[diaSemanaLunes0(parseYMD(s.fecha))],
  }));
  res.render('descanso/index', {
    titulo: 'Solicitudes de descanso',
    solicitudes,
    usuarios: Usuario.listar(),
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function crear(req, res) {
  try {
    if (!req.body.usuario_id || !req.body.fecha) throw new Error('Colaborador y fecha son obligatorios.');
    Descanso.create(req.body);
    res.redirect(`/descansos?ok=${encodeURIComponent('Solicitud registrada (pendiente).')}`);
  } catch (e) {
    res.redirect(`/descansos?err=${encodeURIComponent(e.message)}`);
  }
}

export function cambiarEstado(req, res) {
  try {
    Descanso.setEstado(req.params.id, req.body.estado);
    res.redirect(`/descansos?ok=${encodeURIComponent('Solicitud ' + req.body.estado.toLowerCase() + '.')}`);
  } catch (e) {
    res.redirect(`/descansos?err=${encodeURIComponent(e.message)}`);
  }
}

export function eliminar(req, res) {
  Descanso.remove(req.params.id);
  res.redirect(`/descansos?ok=${encodeURIComponent('Solicitud eliminada.')}`);
}

export default { index, crear, cambiarEstado, eliminar };
