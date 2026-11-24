import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  turnoEfectivo, esObligatoria, ventanaTurno, ventanaColaborador, PM_SPLIT,
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
