// Utilidades de fechas y horas (trabajamos en UTC para evitar desfases).
// Convención de día de la semana: 0=Lunes ... 6=Domingo.

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function parseYMD(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Índice 0=Lunes..6=Domingo a partir de un Date.
export function diaSemanaLunes0(date) {
  return (date.getUTCDay() + 6) % 7;
}

// Devuelve el lunes (YYYY-MM-DD) de la semana que contiene la fecha dada.
export function lunesDe(fechaStr) {
  const d = parseYMD(fechaStr);
  return toYMD(addDays(d, -diaSemanaLunes0(d)));
}

// Array de 7 fechas 'YYYY-MM-DD' empezando en el lunes dado.
export function fechasSemana(lunesStr) {
  const base = parseYMD(lunesStr);
  return Array.from({ length: 7 }, (_, i) => toYMD(addDays(base, i)));
}

// '10:00' -> 10 ; '21:30' -> 21.5
export function horaANumero(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + (m || 0) / 60;
}

// 10 -> '10:00'
export function numeroAHora(n) {
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default { DIAS, parseYMD, toYMD, addDays, diaSemanaLunes0, lunesDe, fechasSemana, horaANumero, numeroAHora };
