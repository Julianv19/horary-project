// =====================================================================
//  app.js  —  Arranque de la aplicación Express (MVC)
// =====================================================================
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, isDev } from './config/env.js';
import router from './routes/index.js';
import resources from './config/resources.js';

// Menú de navegación derivado de los recursos CRUD
const menu = [
  { basePath: '/', label: 'Tablero' },
  ...Object.values(resources).map((r) => ({ basePath: r.basePath, label: r.plural })),
  { basePath: '/cobertura', label: 'Cobertura' },
  { basePath: '/aforo', label: 'Aforo' },
  { basePath: '/descansos', label: 'Descansos' },
];

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// --- Motor de vistas: EJS ---
app.set('view engine', 'ejs');
app.set('views', resolve(__dirname, 'views'));

// --- Middlewares ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(resolve(__dirname, 'public')));

// Variables disponibles en todas las vistas
app.use((req, res, next) => {
  res.locals.appName = 'Horary Project';
  res.locals.currentPath = req.path;
  res.locals.menu = menu;
  next();
});

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
