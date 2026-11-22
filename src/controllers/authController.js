// Controlador: inicio y cierre de sesión.
import Cuenta from '../models/cuenta.js';

export function loginForm(req, res) {
  if (req.cuenta) return res.redirect(req.cuenta.es_admin ? '/' : '/mi-horario');
  res.render('auth/login', { titulo: 'Entrar', error: null });
}

export function login(req, res) {
  const cuenta = Cuenta.autenticar(req.body.username, req.body.password);
  if (!cuenta) {
    return res.status(401).render('auth/login', { titulo: 'Entrar', error: 'Usuario o contraseña incorrectos.' });
  }
  req.session.cuentaId = cuenta.id;
  res.redirect(cuenta.es_admin ? '/' : '/mi-horario');
}

export function logout(req, res) {
  req.session.destroy(() => res.redirect('/login'));
}

export default { loginForm, login, logout };
