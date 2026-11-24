// =====================================================================
//  contingenciaService.js  —  Reemplazos ante contingencias operativas.
//  buscarReemplazos: propone colaboradores viables para el turno afectado.
//  aplicar: confirma un reemplazo, protege el horario original y registra
//           el cambio en el historial. Nunca modifica otros turnos.
// =====================================================================
import Usuario from '../models/usuario.js';
import Programacion from '../models/programacion.js';
import Ausencia from '../models/ausencia.js';
import Descanso from '../models/descanso.js';
import Restriccion from '../models/restriccion.js';
import Horario from '../models/horario.js';
import { Contingencia, Historial, Snapshot } from '../models/contingencia.js';
import { lunesDe, parseYMD, diaSemanaLunes0, horaANumero } from '../lib/fechas.js';
import { evaluarRestricciones, turnoEfectivo, PM_SPLIT } from '../lib/restricciones.js';

function solapan(aIni, aFin, bIni, bFin) {
  return !(bFin <= aIni || bIni >= aFin);
}

export function buscarReemplazos(contingenciaId) {
  const c = Contingencia.find(contingenciaId);
  if (!c) return null;
  const sedeId = c.sede_id;
  const fecha = c.fecha;
  const semana = lunesDe(fecha);
  const prog = Programacion.find(sedeId, semana);
  if (!prog) return { contingencia: c, sinProgramacion: true, afectados: [], propuestas: [], alerta: [] };

  const dia = diaSemanaLunes0(parseYMD(fecha));
  const afectados = Programacion.turnosDeUsuario(prog.id, c.usuario_id).filter((t) => t.fecha === fecha);

  const colaboradores = Usuario.paraProgramacion(sedeId);
  const afectado = colaboradores.find((x) => x.id === c.usuario_id) || Usuario.find(c.usuario_id);
  if (afectados.length === 0) {
    return { contingencia: c, prog, afectado, afectados: [], propuestas: [], alerta: [], mensaje: 'El colaborador no tenía turno ese día.' };
  }

  const hor = Horario.mapaPorSede(sedeId)[dia];
  const open = hor ? Math.floor(horaANumero(hor.apertura)) : 10;
  const close = hor ? Math.ceil(horaANumero(hor.cierre)) : 22;

  // Restricciones, ausencias y descansos vigentes esa fecha.
  const restr = new Map();
  for (const r of Restriccion.activasPorSede(sedeId)) {
    if (!restr.has(r.usuario_id)) restr.set(r.usuario_id, []);
    restr.get(r.usuario_id).push(r);
  }
  const ausentesIds = new Set(Ausencia.vigentesEnRango(sedeId, fecha, fecha).map((a) => a.usuario_id));
  const descansoIds = new Set(Descanso.aprobadasEnRango(sedeId, fecha, fecha).map((d) => d.usuario_id));

  // Turnos de ese día (quién está ocupado) y horas semanales (balance).
  const todos = Programacion.turnosConDetalle(prog.id);
  const ocupado = new Map();
  const horasSem = new Map();
  for (const t of todos) {
    horasSem.set(t.usuario_id, (horasSem.get(t.usuario_id) || 0) + (horaANumero(t.hora_fin) - horaANumero(t.hora_inicio)));
    if (t.fecha === fecha) {
      if (!ocupado.has(t.usuario_id)) ocupado.set(t.usuario_id, []);
      ocupado.get(t.usuario_id).push(t);
    }
  }

  const propuestas = [];
  const alerta = [];
  for (const af of afectados) {
    const ini = horaANumero(af.hora_inicio);
    const fin = horaANumero(af.hora_fin);
    const viables = [];
    for (const x of colaboradores) {
      if (x.id === afectado.id || x.rol_id !== afectado.rol_id) continue;  // mismo rol / competencia
      if (ausentesIds.has(x.id)) continue;   // incapacidad / vacaciones / licencia / permiso
      if (descansoIds.has(x.id)) continue;   // descanso aprobado
      const ev = evaluarRestricciones(restr.get(x.id) || [], { diaSemana: dia, fecha, open, close });
      if (ev.bloqueado) continue;            // vacaciones aprobadas / días no disponibles
      let [wo, wc] = ev.ventana;
      const te = turnoEfectivo(x);
      if (te === 'MANANA') wc = Math.min(wc, PM_SPLIT);
      if (te === 'TARDE_NOCHE') wo = Math.max(wo, PM_SPLIT);
      if (ini < wo || fin > wc) continue;    // el turno no cabe en su ventana permitida
      const sus = ocupado.get(x.id) || [];
      if (sus.some((t) => solapan(ini, fin, horaANumero(t.hora_inicio), horaANumero(t.hora_fin)))) continue; // no puede duplicarse
      viables.push({ x, libre: sus.length === 0, horas: horasSem.get(x.id) || 0, sus });
    }
    viables.sort((a, b) => (b.libre - a.libre) || (a.horas - b.horas));

    if (viables.length === 0) {
      alerta.push({ fecha, franja: `${af.hora_inicio}–${af.hora_fin}`, rol: afectado.rol, faltan: 1, motivo: 'Sin personal del mismo rol disponible que cumpla las reglas' });
    } else {
      for (const v of viables.slice(0, 5)) {
        const actuales = v.sus.map((t) => `${t.hora_inicio}–${t.hora_fin}`).join(', ');
        propuestas.push({
          reemplazo_id: v.x.id, nombre: v.x.nombre, rol: v.x.rol,
          turno_actual: v.libre ? 'Libre ese día' : actuales,
          turno_propuesto: `${af.hora_inicio}–${af.hora_fin}`,
          motivo: v.libre ? 'Libre ese día, mismo rol, sin restricciones' : 'Mismo rol y disponible (se le añadiría el turno)',
          impacto: v.libre ? 'Sin impacto: estaba libre' : `Ya trabajaba ${actuales}; se le añadiría el turno`,
          horas: Math.round(v.horas * 10) / 10,
        });
      }
    }
  }
  return { contingencia: c, prog, afectado, afectados, propuestas, alerta };
}

// Confirma un reemplazo: protege el original, cambia los turnos del afectado por
// el reemplazo y registra el cambio. No toca ningún otro turno.
export function aplicar(contingenciaId, reemplazoId, responsable) {
  const c = Contingencia.find(contingenciaId);
  if (!c) return { error: 'Contingencia no encontrada.' };
  const prog = Programacion.find(c.sede_id, lunesDe(c.fecha));
  if (!prog) return { error: 'No hay programación para esa semana.' };

  const afectados = Programacion.turnosDeUsuario(prog.id, c.usuario_id).filter((t) => t.fecha === c.fecha);
  if (afectados.length === 0) return { error: 'El colaborador no tenía turno ese día.' };

  Snapshot.guardar(prog.id); // protege el horario ORIGINAL (una sola vez)

  const afectadoNom = Usuario.find(c.usuario_id)?.nombre || `#${c.usuario_id}`;
  const reempNom = Usuario.find(reemplazoId)?.nombre || `#${reemplazoId}`;

  for (const af of afectados) {
    Programacion.insertarTurno({
      programacion_id: prog.id, usuario_id: Number(reemplazoId),
      fecha: c.fecha, hora_inicio: af.hora_inicio, hora_fin: af.hora_fin, orden: 0,
    });
    Historial.add({
      programacion_id: prog.id, contingencia_id: c.id,
      usuario_afectado_id: c.usuario_id, reemplazo_id: Number(reemplazoId),
      responsable, motivo: c.motivo,
      turno_anterior: `${afectadoNom}: ${af.hora_inicio}–${af.hora_fin}`,
      turno_nuevo: `${reempNom}: ${af.hora_inicio}–${af.hora_fin}`,
    });
  }
  // Quita los turnos del colaborador afectado ese día.
  Programacion.eliminarTurnosUsuarioFecha(prog.id, c.usuario_id, c.fecha);
  Contingencia.setEstado(c.id, 'RESUELTA', Number(reemplazoId));
  return { ok: true };
}

export default { buscarReemplazos, aplicar };
