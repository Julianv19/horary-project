import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campo, fila, documento } from '../src/lib/csv.js';

test('campo escapa separadores y comillas', () => {
  assert.equal(campo('simple'), 'simple');
  assert.equal(campo('a;b'), '"a;b"');
  assert.equal(campo('dice "hola"'), '"dice ""hola"""');
  assert.equal(campo(null), '');
});

test('fila une con punto y coma', () => {
  assert.equal(fila(['a', 'b', 'c']), 'a;b;c');
});

test('documento lleva BOM y separa filas con CRLF', () => {
  const doc = documento([['a', 'b'], ['c', 'd']]);
  assert.ok(doc.startsWith('﻿'));
  assert.equal(doc, '﻿a;b\r\nc;d');
});
