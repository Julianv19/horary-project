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
import * as sugerencia from '../controllers/sugerenciaController.js';
import * as auth from '../controllers/authController.js';
import * as miHorario from '../controllers/miHorarioController.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ===================== Público =====================
router.get('/login', auth.loginForm);
router.post('/login', auth.login);
router.get('/logout', auth.logout);
router.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ===================== Colaborador (requiere sesión) =====================
router.get('/mi-horario', requireLogin, miHorario.index);

// ===================== Administrador =====================
router.use(requireAdmin); // todo lo de abajo exige cuenta admin

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
router.post('/aforo/publicar', aforo.publicar);
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

// --- Sugerencias y solicitudes ---
router.get('/sugerencias', sugerencia.index);
router.post('/sugerencias', sugerencia.crear);
router.post('/sugerencias/:id/toggle', sugerencia.toggle);
router.post('/sugerencias/:id/eliminar', sugerencia.eliminar);

// --- Descansos dominicales ---
router.get('/dominicales', dominical.index);

export default router;
