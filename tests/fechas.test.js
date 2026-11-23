import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lunesDe, fechasSemana, horaANumero, numeroAHora, diaSemanaLunes0, parseYMD,
} from '../src/lib/fechas.js';

test('lunesDe devuelve el lunes de la semana', () => {
  assert.equal(lunesDe('2026-11-16'), '2026-11-16'); // ya es lunes
  assert.equal(lunesDe('2026-11-22'), '2026-11-16'); // domingo → lunes anterior
  assert.equal(lunesDe('2026-11-18'), '2026-11-16'); // miércoles
});

test('fechasSemana devuelve 7 fechas de lunes a domingo', () => {
  const f = fechasSemana('2026-11-16');
  assert.equal(f.length, 7);
  assert.equal(f[0], '2026-11-16');
  assert.equal(f[6], '2026-11-22');
});

test('conversión hora <-> número', () => {
  assert.equal(horaANumero('10:00'), 10);
  assert.equal(horaANumero('21:30'), 21.5);
  assert.equal(numeroAHora(10), '10:00');
  assert.equal(numeroAHora(21.5), '21:30');
});

test('diaSemanaLunes0: 0=lunes, 6=domingo', () => {
  assert.equal(diaSemanaLunes0(parseYMD('2026-11-16')), 0);
  assert.equal(diaSemanaLunes0(parseYMD('2026-11-22')), 6);
});
