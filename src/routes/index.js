// Definición de rutas de la aplicación.
import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import { crudFactory, registrarRutas } from '../controllers/crudFactory.js';
import resources from '../config/resources.js';
import * as cobertura from '../controllers/coberturaController.js';
import * as aforo from '../controllers/aforoController.js';
import * as descanso from '../controllers/descansoController.js';
import * as ausencia from '../controllers/ausenciaController.js';
import * as patron from '../controllers/patronController.js';
import * as dominical from '../controllers/dominicalController.js';

const router = Router();

// --- Tablero ---
router.get('/', dashboard.index);

// --- Recursos CRUD (sedes, áreas, roles, jornadas, colaboradores) ---
for (const cfg of Object.values(resources)) {
  registrarRutas(router, cfg.basePath, crudFactory(cfg));
}

// --- Cobertura requerida ---
router.get('/cobertura', cobertura.editor);
router.post('/cobertura', cobertura.guardar);

// --- Motor de aforo ---
router.get('/aforo', aforo.index);
router.post('/aforo/generar', aforo.generar);
router.get('/aforo/ver', aforo.ver);
router.get('/aforo/export.csv', aforo.exportCsv);

// --- Solicitudes de descanso ---
router.get('/descansos', descanso.index);
router.post('/descansos', descanso.crear);
router.post('/descansos/:id/estado', descanso.cambiarEstado);
router.post('/descansos/:id/eliminar', descanso.eliminar);

// --- Incapacidades / ausencias ---
router.get('/incapacidades', ausencia.index);
router.post('/incapacidades', ausencia.crear);
router.post('/incapacidades/aplicar', ausencia.aplicar);
router.post('/incapacidades/:id/eliminar', ausencia.eliminar);

// --- Patrones de turnos ---
router.get('/patrones', patron.index);
router.get('/patrones/nuevo', patron.formNew);
router.post('/patrones', patron.crear);
router.get('/patrones/:id/editar', patron.formEdit);
router.post('/patrones/:id', patron.actualizar);
router.post('/patrones/:id/eliminar', patron.eliminar);
router.post('/patrones/:id/turnos', patron.addTurno);
router.post('/patrones/:id/turnos/:tid/eliminar', patron.removeTurno);

// --- Descansos dominicales ---
router.get('/dominicales', dominical.index);

// --- Healthcheck ---
router.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

export default router;
