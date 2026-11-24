import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  turnoEfectivo, esObligatoria, ventanaTurno, ventanaColaborador, PM_SPLIT,
  evaluarRestricciones,
} from '../src/lib/restricciones.js';

test('turnoEfectivo según el tipo de restricción', () => {
  assert.equal(turnoEfectivo({ restriccion_tipo: 'NINGUNA' }), null);
  assert.equal(turnoEfectivo({ restriccion_tipo: 'FIJO_MANANA' }), 'MANANA');
  assert.equal(turnoEfectivo({ restriccion_tipo: 'FIJO_TARDE_NOCHE' }), 'TARDE_NOCHE');
  // médica/estudios toman el turno del campo restriccion_turno
  assert.equal(turnoEfectivo({ restriccion_tipo: 'MEDICA', restriccion_turno: 'MANANA' }), 'MANANA');
  assert.equal(turnoEfectivo({ restriccion_tipo: 'ESTUDIOS', restriccion_turno: 'TARDE_NOCHE' }), 'TARDE_NOCHE');
  assert.equal(turnoEfectivo({ restriccion_tipo: 'MEDICA', restriccion_turno: null }), null);
});

test('esObligatoria solo cuando fija un turno', () => {
  assert.equal(esObligatoria({ restriccion_tipo: 'FIJO_MANANA' }), true);
  assert.equal(esObligatoria({ restriccion_tipo: 'MEDICA', restriccion_turno: 'MANANA' }), true);
  assert.equal(esObligatoria({ restriccion_tipo: 'MEDICA', restriccion_turno: null }), false);
  assert.equal(esObligatoria({ restriccion_tipo: 'NINGUNA' }), false);
});

test('ventanaTurno recorta la franja según el turno', () => {
  assert.deepEqual(ventanaTurno(10, 22, null), [10, 22]);
  assert.deepEqual(ventanaTurno(10, 22, 'MANANA'), [10, PM_SPLIT]);
  assert.deepEqual(ventanaTurno(10, 22, 'TARDE_NOCHE'), [PM_SPLIT, 22]);
});

test('ventanaColaborador usa el turno efectivo', () => {
  assert.deepEqual(ventanaColaborador({ restriccion_tipo: 'FIJO_MANANA' }, 10, 22), [10, PM_SPLIT]);
  assert.deepEqual(ventanaColaborador({ restriccion_tipo: 'NINGUNA' }, 10, 22), [10, 22]);
});

const ctx = (dia, fecha) => ({ diaSemana: dia, fecha, open: 10, close: 22 });

test('evaluar: días no disponibles bloquean ese día de la semana', () => {
  const lista = [{ tipo: 'DIAS_NO_DISPONIBLE', dias_semana: '0,2', activa: 1 }];
  assert.equal(evaluarRestricciones(lista, ctx(0, '2026-11-16')).bloqueado, true);
  assert.equal(evaluarRestricciones(lista, ctx(1, '2026-11-17')).bloqueado, false);
  assert.equal(evaluarRestricciones(lista, ctx(2, '2026-11-18')).bloqueado, true);
});

test('evaluar: vacaciones aprobadas bloquean el rango de fechas', () => {
  const lista = [{ tipo: 'VACACIONES', estado: 'APROBADA', fecha_inicio: '2026-11-16', fecha_fin: '2026-11-20', activa: 1 }];
  assert.equal(evaluarRestricciones(lista, ctx(0, '2026-11-18')).bloqueado, true);
  assert.equal(evaluarRestricciones(lista, ctx(0, '2026-11-25')).bloqueado, false);
  // pendiente no bloquea
  const pend = [{ ...lista[0], estado: 'PENDIENTE' }];
  assert.equal(evaluarRestricciones(pend, ctx(0, '2026-11-18')).bloqueado, false);
});

test('evaluar: franja no disponible recorta la ventana al tramo mayor', () => {
  const lista = [{ tipo: 'FRANJA_NO_DISPONIBLE', dias_semana: '0', hora_inicio: '12:00', hora_fin: '16:00', activa: 1 }];
  // 10-22 menos 12-16 → tramos [10,12] y [16,22]; gana [16,22]
  assert.deepEqual(evaluarRestricciones(lista, ctx(0, '2026-11-16')).ventana, [16, 22]);
  // en otro día no afecta
  assert.deepEqual(evaluarRestricciones(lista, ctx(1, '2026-11-17')).ventana, [10, 22]);
});

test('evaluar: turno fijo de mañana recorta hasta PM_SPLIT', () => {
  const r = evaluarRestricciones([{ tipo: 'FIJO_MANANA', activa: 1 }], ctx(0, '2026-11-16'));
  assert.deepEqual(r.ventana, [10, PM_SPLIT]);
  assert.equal(r.turnoFijo, 'MANANA');
});
