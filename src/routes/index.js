// Definición de rutas de la aplicación.
import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';

const router = Router();

router.get('/', dashboard.index);

// Healthcheck sencillo
router.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

export default router;
