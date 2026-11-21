// Controlador: editor de cobertura requerida (personas por rol/hora/día).
import Sede from '../models/sede.js';
import Rol from '../models/rol.js';
import Horario from '../models/horario.js';
import Cobertura from '../models/cobertura.js';
import { DIAS, horaANumero } from '../lib/fechas.js';

function rangoHoras(sedeId, dia) {
  const h = Horario.mapaPorSede(sedeId)[dia];
  const open = h ? Math.floor(horaANumero(h.apertura)) : 10;
  const close = h ? Math.ceil(horaANumero(h.cierre)) : 22;
  const horas = [];
  for (let x = open; x < close; x++) horas.push(x);
  return horas;
}

export function editor(req, res) {
  const sedes = Sede.activas();
  const sedeId = req.query.sede ? Number(req.query.sede) : (sedes[0]?.id ?? null);
  const dia = req.query.dia != null ? Number(req.query.dia) : 0;

  const roles = Rol.all();
  const horas = rangoHoras(sedeId, dia);

  // matriz[rol_id][hora] = personas
  const matriz = {};
  for (const r of Cobertura.porSedeDia(sedeId, dia)) {
    (matriz[r.rol_id] ??= {});
    matriz[r.rol_id][r.hora] = r.personas;
  }

  res.render('cobertura/editor', {
    titulo: 'Cobertura requerida',
    sedes, sedeId, dia, DIAS, roles, horas, matriz,
    flash: { ok: req.query.ok || null, err: req.query.err || null },
  });
}

export function guardar(req, res) {
  const sedeId = Number(req.body.sede_id);
  const dia = Number(req.body.dia);

  // Campos con nombre c_<rolId>_<hora>
  for (const [key, value] of Object.entries(req.body)) {
    const m = key.match(/^c_(\d+)_(\d+)$/);
    if (!m) continue;
    const rolId = Number(m[1]);
    const hora = Number(m[2]);
    Cobertura.upsert(sedeId, rolId, dia, hora, Number(value) || 0);
  }

  const destino = `/cobertura?sede=${sedeId}&dia=${dia}`;
  if (req.body.copiar_todos) {
    const otros = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dia);
    Cobertura.copiarADias(sedeId, dia, otros);
    return res.redirect(`${destino}&ok=${encodeURIComponent('Guardado y copiado a todos los días.')}`);
  }
  res.redirect(`${destino}&ok=${encodeURIComponent('Cobertura guardada.')}`);
}

export default { editor, guardar };
