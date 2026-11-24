// Controlador: contingencias operativas.
import { Contingencia, Historial, Snapshot } from '../models/contingencia.js';
import Programacion from '../models/programacion.js';
import Usuario from '../models/usuario.js';
import Sede from '../models/sede.js';
import * as servicio from '../services/contingenciaService.js';
import { lunesDe } from '../lib/fechas.js';

export function index(req, res) {
  res.render('contingencia/index', {
    titulo: 'Contingencias operativas',
    contingencias: Contingencia.all(),
    usuarios: Usuario.listar(),
    sedes: Sede.activas(),
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function crear(req, res) {
  try {
    if (!req.body.usuario_id || !req.body.fecha) throw new Error('Colaborador y fecha son obligatorios.');
    if (!req.body.sede_id) req.body.sede_id = Usuario.find(Number(req.body.usuario_id))?.sede_id;
    const r = Contingencia.create(req.body);
    res.redirect(`/contingencias/${r.lastInsertRowid}`);
  } catch (e) {
    res.redirect(`/contingencias?err=${encodeURIComponent(e.message)}`);
  }
}

export function detalle(req, res) {
  const data = servicio.buscarReemplazos(req.params.id);
  if (!data) return res.redirect('/contingencias?err=' + encodeURIComponent('No existe la contingencia.'));
  res.render('contingencia/detalle', {
    titulo: 'Reemplazos',
    sinProgramacion: false, mensaje: null, afectado: null, afectados: [], propuestas: [], alerta: [],
    ...data,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function aplicar(req, res) {
  const responsable = req.cuenta?.nombre || req.cuenta?.username || 'admin';
  const r = servicio.aplicar(req.params.id, Number(req.body.reemplazo_id), responsable);
  if (r.error) return res.redirect(`/contingencias/${req.params.id}?err=${encodeURIComponent(r.error)}`);
  res.redirect(`/contingencias/${req.params.id}?ok=${encodeURIComponent('Reemplazo confirmado y horario actualizado.')}`);
}

export function sinReemplazo(req, res) {
  Contingencia.setEstado(req.params.id, 'SIN_REEMPLAZO', null);
  res.redirect(`/contingencias/${req.params.id}?ok=${encodeURIComponent('Marcada como sin reemplazo.')}`);
}

export function historial(req, res) {
  res.render('historial/index', {
    titulo: 'Historial de modificaciones',
    cambios: Historial.all(),
  });
}

export default { index, crear, detalle, aplicar, sinReemplazo, historial };
