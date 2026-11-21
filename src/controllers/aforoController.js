// Controlador: motor de aforo (generar y ver el horario semanal).
import Sede from '../models/sede.js';
import Programacion from '../models/programacion.js';
import * as aforo from '../services/aforoService.js';
import { lunesDe, toYMD, fechasSemana } from '../lib/fechas.js';

function semanaPorDefecto() {
  return lunesDe(toYMD(new Date()));
}

export function index(req, res) {
  const sedes = Sede.activas();
  const sedeId = req.query.sede ? Number(req.query.sede) : (sedes[0]?.id ?? null);
  const semana = req.query.semana ? lunesDe(req.query.semana) : semanaPorDefecto();

  res.render('aforo/index', {
    titulo: 'Motor de aforo',
    sedes, sedeId, semana,
    programaciones: sedeId ? Programacion.listarPorSede(sedeId) : [],
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function generar(req, res) {
  const sedeId = Number(req.body.sede_id);
  const semana = lunesDe(req.body.semana);
  try {
    const { totalTurnos } = aforo.generar(sedeId, semana);
    res.redirect(`/aforo/ver?sede=${sedeId}&semana=${semana}&ok=${encodeURIComponent(`Aforo generado: ${totalTurnos} turnos.`)}`);
  } catch (e) {
    res.redirect(`/aforo?sede=${sedeId}&semana=${semana}&err=${encodeURIComponent(e.message)}`);
  }
}

export function ver(req, res) {
  const sedes = Sede.activas();
  const sedeId = req.query.sede ? Number(req.query.sede) : (sedes[0]?.id ?? null);
  const semana = req.query.semana ? lunesDe(req.query.semana) : semanaPorDefecto();

  const data = aforo.reporte(sedeId, semana);
  res.render('aforo/semana', {
    titulo: 'Horario semanal',
    sede: Sede.find(sedeId),
    sedes, sedeId, semana,
    fechas: fechasSemana(semana),
    data,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export default { index, generar, ver };
