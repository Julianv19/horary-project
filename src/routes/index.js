// Definición de rutas de la aplicación.
import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import { crudFactory, registrarRutas } from '../controllers/crudFactory.js';
import resources from '../config/resources.js';

const router = Router();

// --- Tablero ---
router.get('/', dashboard.index);

// --- Recursos CRUD (sedes, áreas, roles, jornadas, colaboradores) ---
for (const cfg of Object.values(resources)) {
  registrarRutas(router, cfg.basePath, crudFactory(cfg));
}

// --- Healthcheck ---
router.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

export default router;
