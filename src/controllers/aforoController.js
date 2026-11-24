// Controlador: motor de aforo (generar y ver el horario semanal).
import Sede from '../models/sede.js';
import Programacion from '../models/programacion.js';
import * as aforo from '../services/aforoService.js';
import { lunesDe, toYMD, fechasSemana } from '../lib/fechas.js';
import { documento } from '../lib/csv.js';

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
  // No regenerar sobre una semana publicada (bloqueada).
  const existente = Programacion.find(sedeId, semana);
  if (existente && existente.estado === 'PUBLICADA') {
    return res.redirect(`/aforo/ver?sede=${sedeId}&semana=${semana}&err=${encodeURIComponent('La semana está publicada. Despublícala antes de regenerar.')}`);
  }
  try {
    const { totalTurnos } = aforo.generar(sedeId, semana, { rotarDomingos: !!req.body.rotar_domingos });
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
  const validacion = data ? aforo.validar(sedeId, semana) : null;
  res.render('aforo/semana', {
    titulo: 'Horario semanal',
    sede: Sede.find(sedeId),
    sedes, sedeId, semana,
    fechas: fechasSemana(semana),
    data, validacion,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

// Publica o vuelve a borrador una programación.
export function publicar(req, res) {
  const sedeId = Number(req.body.sede_id);
  const semana = lunesDe(req.body.semana);
  const estado = req.body.estado === 'PUBLICADA' ? 'PUBLICADA' : 'BORRADOR';

  // No se puede PUBLICAR un horario con conflictos obligatorios.
  if (estado === 'PUBLICADA') {
    const { obligatorias } = aforo.validar(sedeId, semana);
    if (obligatorias > 0) {
      return res.redirect(`/aforo/ver?sede=${sedeId}&semana=${semana}&err=${encodeURIComponent(`No se puede publicar: hay ${obligatorias} conflicto(s) obligatorio(s) por resolver.`)}`);
    }
  }

  const prog = Programacion.find(sedeId, semana);
  if (prog) Programacion.setEstado(prog.id, estado);
  const msg = estado === 'PUBLICADA' ? 'Horario publicado.' : 'Horario vuelto a borrador.';
  res.redirect(`/aforo/ver?sede=${sedeId}&semana=${semana}&ok=${encodeURIComponent(msg)}`);
}

// Exporta el horario de la semana a CSV (compatible con Excel).
export function exportCsv(req, res) {
  const sedeId = Number(req.query.sede);
  const semana = lunesDe(req.query.semana);
  const sede = Sede.find(sedeId);
  const data = aforo.reporte(sedeId, semana);
  if (!data) {
    return res.redirect(`/aforo?sede=${sedeId}&semana=${semana}&err=${encodeURIComponent('No hay horario generado para exportar.')}`);
  }

  const diasCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const estadoTxt = { ok: 'OK', bajo: 'Bajo', alto: 'Alto' };
  const rows = [];

  rows.push(['Horario semanal', sede ? sede.nombre : '']);
  rows.push(['Semana (lunes)', semana]);
  rows.push([]);

  rows.push(['HORAS POR COLABORADOR']);
  rows.push(['Colaborador', 'Rol', 'Jornada', ...diasCortos, 'Semana', 'Estado']);
  for (const c of data.colaboradores) {
    const celdas = c.dias.map((d) => (d.trabaja ? d.horas : (d.ausencia ? d.ausencia.slice(0, 3) : 'D')));
    rows.push([c.nombre, c.rol, c.jornada_codigo, ...celdas, c.horasSemana, estadoTxt[c.estadoJornada] || '']);
  }
  rows.push([]);

  rows.push(['COBERTURA POR HORA (asignado/requerido)']);
  for (const dd of data.porDia) {
    if (!dd.abierto) continue;
    rows.push([`${dd.nombre} ${dd.fecha}`]);
    rows.push(['Área', ...dd.horas]);
    for (const fa of dd.filasArea) {
      rows.push([fa.area, ...fa.asignado.map((a, i) => `${a}/${fa.requerido[i]}`)]);
    }
    rows.push(['TOTAL', ...dd.totalAsignado.map((a, i) => `${a}/${dd.totalRequerido[i]}`)]);
    rows.push([]);
  }

  const nombreArchivo = `horario_${(sede ? sede.nombre : 'sede').replace(/\s+/g, '_')}_${semana}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  res.send(documento(rows));
}

export default { index, generar, ver, publicar, exportCsv };
