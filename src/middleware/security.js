// Middleware de endurecimiento: cabeceras de seguridad y protección CSRF.
import { randomBytes } from 'node:crypto';

// Cabeceras de seguridad básicas (sin dependencias externas).
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  next();
}

// CSRF por token de sincronización guardado en la sesión.
// Las vistas lo usan vía res.locals.csrf; la validación se hace en métodos
// que modifican estado (POST/PUT/PATCH/DELETE). Se exime /login (aún sin sesión).
const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXENTAS = new Set(['/login']);

export function csrf(req, res, next) {
  if (!req.session) return next();
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrfToken;

  if (METODOS_ESCRITURA.has(req.method) && !EXENTAS.has(req.path)) {
    const token = req.body?._csrf;
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('pages/error', {
        titulo: 'Sesión inválida',
        mensaje: 'Token de seguridad inválido o expirado. Recarga la página e inténtalo de nuevo.',
      });
    }
  }
  next();
}

export default { securityHeaders, csrf };
