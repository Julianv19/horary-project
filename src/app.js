// =====================================================================
//  app.js  —  Arranque de la aplicación Express (MVC)
// =====================================================================
import express from 'express';
import session from 'express-session';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, isDev } from './config/env.js';
import router from './routes/index.js';
import resources from './config/resources.js';
import { cargarCuenta } from './middleware/auth.js';
import { securityHeaders, csrf } from './middleware/security.js';

// Menú de navegación, organizado por flujo de uso (requerimiento 6):
// primero lo principal, al final la configuración.
const menu = [
  { basePath: '/', label: 'Tablero' },
  { basePath: '/colaboradores', label: 'Colaboradores' },
  { basePath: '/sugerencias', label: 'Sugerencias' },
  { basePath: '/inducciones', label: 'Inducciones' },
  { basePath: '/cobertura', label: 'Cobertura' },
  { basePath: '/demanda', label: 'Demanda' },
  { basePath: '/aforo', label: 'Aforo' },
  { basePath: '/contingencias', label: 'Contingencias' },
  { basePath: '/historial', label: 'Historial' },
  { basePath: '/patrones', label: 'Patrones' },
  { basePath: '/descansos', label: 'Descansos' },
  { basePath: '/incapacidades', label: 'Incapacidades' },
  { basePath: '/dominicales', label: 'Dominicales' },
  { basePath: '/sedes', label: 'Sedes' },
  { basePath: '/areas', label: 'Áreas' },
  { basePath: '/roles', label: 'Roles' },
  { basePath: '/jornadas', label: 'Jornadas' },
];

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// --- Motor de vistas: EJS ---
app.set('view engine', 'ejs');
app.set('views', resolve(__dirname, 'views'));

// --- Middlewares ---
app.use(securityHeaders);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(resolve(__dirname, 'public')));

// Sesiones + carga de la cuenta autenticada
app.use(session({
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: !isDev, maxAge: 1000 * 60 * 60 * 8 },
}));
app.use(cargarCuenta);

// Variables disponibles en todas las vistas (antes del CSRF, para que su
// página de error también disponga de ellas).
app.use((req, res, next) => {
  res.locals.appName = 'FRISBY';
  res.locals.currentPath = req.path;
  res.locals.menu = menu;
  next();
});

app.use(csrf);

// --- Rutas ---
app.use('/', router);

// --- 404 ---
app.use((req, res) => {
  res.status(404).render('pages/error', {
    titulo: 'No encontrado',
    mensaje: `La ruta ${req.originalUrl} no existe.`,
  });
});

// --- Manejo de errores ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/error', {
    titulo: 'Error',
    mensaje: isDev ? err.message : 'Ocurrió un error interno.',
  });
});

app.listen(env.port, () => {
  console.log(`🚀 Horary Project en http://localhost:${env.port}  (${env.nodeEnv})`);
});

export default app;
