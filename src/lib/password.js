// Hashing de contraseñas con scrypt (módulo crypto nativo, sin dependencias).
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(String(password), salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(String(password), salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export default { hashPassword, verifyPassword };
