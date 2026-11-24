// Restricciones individuales de colaboradores y utilidades para el generador.
import { horaANumero } from './fechas.js';

// Hora que separa "mañana" de "tarde-noche".
export const PM_SPLIT = 16;

export const RESTRICCION_TIPOS = [
  { val: 'NINGUNA', label: 'Sin restricciones' },
  { val: 'FIJO_MANANA', label: 'Turno fijo de mañana' },
  { val: 'FIJO_TARDE_NOCHE', label: 'Turno fijo de tarde-noche' },
  { val: 'MEDICA', label: 'Restricción médica' },
  { val: 'ESTUDIOS', label: 'Restricción por estudios' },
];

export const RESTRICCION_TURNOS = [
  { val: '', label: '(sin turno fijo)' },
  { val: 'MANANA', label: 'Mañana' },
  { val: 'TARDE_NOCHE', label: 'Tarde-noche' },
];

export const etiquetaTipo = (val) =>
  (RESTRICCION_TIPOS.find((t) => t.val === val) || RESTRICCION_TIPOS[0]).label;

// Turno obligatorio efectivo de un colaborador según su restricción, o null.
export function turnoEfectivo(c) {
  const tipo = c.restriccion_tipo || 'NINGUNA';
  if (tipo === 'FIJO_MANANA') return 'MANANA';
  if (tipo === 'FIJO_TARDE_NOCHE') return 'TARDE_NOCHE';
  if (tipo === 'MEDICA' || tipo === 'ESTUDIOS') return c.restriccion_turno || null;
  return null;
}

// ¿Es una restricción obligatoria que fija un turno? (médica/estudios/fijo con turno)
export function esObligatoria(c) {
  const tipo = c.restriccion_tipo || 'NINGUNA';
  return (tipo === 'FIJO_MANANA' || tipo === 'FIJO_TARDE_NOCHE' ||
          tipo === 'MEDICA' || tipo === 'ESTUDIOS') && turnoEfectivo(c) != null;
}

// Ventana horaria permitida [desde, hasta] dado un turno ('MANANA'|'TARDE_NOCHE'|null).
export function ventanaTurno(open, close, turno) {
  if (turno === 'MANANA') return [open, Math.min(close, PM_SPLIT)];
  if (turno === 'TARDE_NOCHE') return [Math.max(open, PM_SPLIT), close];
  return [open, close];
}

// Ventana permitida de un colaborador en una sede abierta [open, close).
export function ventanaColaborador(c, open, close) {
  return ventanaTurno(open, close, turnoEfectivo(c));
}

// Recorta [o,c) quitando el intervalo [hi,hf); devuelve el mayor tramo contiguo.
function recortarVentana(o, c, hi, hf) {
  if (hf <= o || hi >= c) return [o, c];        // no se solapa
  const izq = [o, Math.min(c, hi)];
  const der = [Math.max(o, hf), c];
  const lIzq = izq[1] - izq[0];
  const lDer = der[1] - der[0];
  if (lIzq <= 0 && lDer <= 0) return [o, o];     // cubre toda la franja
  return lDer > lIzq ? der : izq;
}

// Evalúa la lista de restricciones múltiples de un colaborador para un día.
// ctx = { diaSemana, fecha, open, close }. Devuelve { bloqueado, ventana, turnoFijo }.
export function evaluarRestricciones(lista, ctx) {
  let o = ctx.open, c = ctx.close, turnoFijo = null, bloqueado = false;
  const enRango = (r) =>
    (!r.fecha_inicio || ctx.fecha >= r.fecha_inicio) && (!r.fecha_fin || ctx.fecha <= r.fecha_fin);
  const diaAfectado = (r) =>
    !r.dias_semana || String(r.dias_semana).split(',').filter(Boolean).includes(String(ctx.diaSemana));

  for (const r of lista) {
    if (r.activa === 0) continue;
    switch (r.tipo) {
      case 'VACACIONES':
        if (r.estado === 'APROBADA' && enRango(r)) bloqueado = true;
        break;
      case 'DIAS_NO_DISPONIBLE':
        if (enRango(r) && diaAfectado(r)) bloqueado = true;
        break;
      case 'FIJO_MANANA':
        c = Math.min(c, PM_SPLIT); turnoFijo = 'MANANA';
        break;
      case 'FIJO_TARDE_NOCHE':
        o = Math.max(o, PM_SPLIT); turnoFijo = 'TARDE_NOCHE';
        break;
      case 'MEDICA':
      case 'ACADEMICA':
        if (enRango(r)) {
          if (r.turno === 'MANANA') { c = Math.min(c, PM_SPLIT); turnoFijo = 'MANANA'; }
          else if (r.turno === 'TARDE_NOCHE') { o = Math.max(o, PM_SPLIT); turnoFijo = 'TARDE_NOCHE'; }
          if (r.hora_inicio && r.hora_fin && diaAfectado(r)) {
            [o, c] = recortarVentana(o, c, horaANumero(r.hora_inicio), horaANumero(r.hora_fin));
          }
        }
        break;
      case 'FRANJA_NO_DISPONIBLE':
        if (enRango(r) && diaAfectado(r) && r.hora_inicio && r.hora_fin) {
          [o, c] = recortarVentana(o, c, horaANumero(r.hora_inicio), horaANumero(r.hora_fin));
        }
        break;
    }
  }
  return { bloqueado, ventana: [o, Math.max(o, c)], turnoFijo };
}

export default {
  PM_SPLIT, RESTRICCION_TIPOS, RESTRICCION_TURNOS,
  etiquetaTipo, turnoEfectivo, esObligatoria, ventanaTurno, ventanaColaborador,
  evaluarRestricciones,
};
