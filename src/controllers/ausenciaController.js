// Controlador: ausencias / incapacidades y reprogramación.
import Ausencia, { TIPOS } from '../models/ausencia.js';
import Usuario from '../models/usuario.js';
import Sede from '../models/sede.js';
import * as aforo from '../services/aforoService.js';
import { lunesDe, toYMD } from '../lib/fechas.js';

export function index(req, res) {
  const sedes = Sede.activas();
  res.render('ausencia/index', {
    titulo: 'Incapacidades y ausencias',
    ausencias: Ausencia.all(),
    usuarios: Usuario.listar(),
    tipos: TIPOS,
    sedes,
    sedeId: sedes[0]?.id ?? null,
    semana: lunesDe(toYMD(new Date())),
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function crear(req, res) {
  try {
    Ausencia.create(req.body);
    res.redirect(`/incapacidades?ok=${encodeURIComponent('Ausencia registrada.')}`);
  } catch (e) {
    res.redirect(`/incapacidades?err=${encodeURIComponent(e.message)}`);
  }
}

export function eliminar(req, res) {
  Ausencia.remove(req.params.id);
  res.redirect(`/incapacidades?ok=${encodeURIComponent('Ausencia eliminada.')}`);
}

// Modifica una programación ya generada quitando los turnos afectados.
export function aplicar(req, res) {
  const sedeId = Number(req.body.sede_id);
  const semana = lunesDe(req.body.semana);
  const r = aforo.aplicarAusencias(sedeId, semana);
  if (r.sinProgramacion) {
    return res.redirect(`/incapacidades?err=${encodeURIComponent('No hay horario generado para esa semana. Genéralo primero en Aforo.')}`);
  }
  res.redirect(`/aforo/ver?sede=${sedeId}&semana=${semana}&ok=${encodeURIComponent(`Programación ajustada: ${r.eliminados} turnos retirados por ausencias.`)}`);
}

export default { index, crear, eliminar, aplicar };
