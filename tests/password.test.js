import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

test('hashPassword genera un hash con sal', () => {
  const h = hashPassword('secreto');
  assert.match(h, /^[0-9a-f]+:[0-9a-f]+$/);
});

test('verifyPassword acepta la correcta y rechaza la incorrecta', () => {
  const h = hashPassword('MiClave123');
  assert.equal(verifyPassword('MiClave123', h), true);
  assert.equal(verifyPassword('otra', h), false);
});

test('verifyPassword rechaza valores vacíos o malformados', () => {
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', 'sinseparador'), false);
});

test('dos hashes de la misma clave son distintos (sal aleatoria)', () => {
  assert.notEqual(hashPassword('igual'), hashPassword('igual'));
});
