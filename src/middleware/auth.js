// Middleware de autenticación y autorización.
import Cuenta from '../models/cuenta.js';

// Carga la cuenta de la sesión en req.cuenta / res.locals.cuenta.
export function cargarCuenta(req, res, next) {
  const id = req.session?.cuentaId;
  req.cuenta = id ? Cuenta.find(id) : null;
  res.locals.cuenta = req.cuenta || null;
  next();
}

// Exige sesión iniciada.
export function requireLogin(req, res, next) {
  if (!req.cuenta) return res.redirect('/login');
  next();
}

// Exige que la cuenta sea administradora.
export function requireAdmin(req, res, next) {
  if (!req.cuenta) return res.redirect('/login');
  if (!req.cuenta.es_admin) {
    return res.status(403).render('pages/error', {
      titulo: 'Acceso restringido',
      mensaje: 'Esta sección es solo para administradores.',
    });
  }
  next();
}

export default { cargarCuenta, requireLogin, requireAdmin };
