// Restricciones individuales de colaboradores y utilidades para el generador.
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

export default {
  PM_SPLIT, RESTRICCION_TIPOS, RESTRICCION_TURNOS,
  etiquetaTipo, turnoEfectivo, esObligatoria, ventanaTurno, ventanaColaborador,
};
