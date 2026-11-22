// Modelo: cuentas de acceso (admin o colaborador).
import db from '../config/db.js';
import { verifyPassword } from '../lib/password.js';

export const Cuenta = {
  find(id) {
    return db.prepare('SELECT * FROM cuenta WHERE id = ?').get(id);
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM cuenta WHERE username = ?').get(username);
  },

  // Devuelve la cuenta si las credenciales son válidas, o null.
  autenticar(username, password) {
    const c = this.findByUsername(String(username || '').trim());
    if (!c) return null;
    return verifyPassword(password, c.password_hash) ? c : null;
  },
};

export default Cuenta;
