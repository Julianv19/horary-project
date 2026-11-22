// Controlador: control de descansos dominicales por mes.
import Sede from '../models/sede.js';
import Dominical from '../models/dominical.js';

export function index(req, res) {
  const sedes = Sede.activas();
  const sedeId = req.query.sede ? Number(req.query.sede) : (sedes[0]?.id ?? null);

  const hoy = new Date();
  const mesStr = req.query.mes || `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}`;
  const anio = Number(mesStr.slice(0, 4));
  const mes = Number(mesStr.slice(5, 7));

  const reporte = sedeId ? Dominical.reporteMes(sedeId, anio, mes) : { domingos: [], colaboradores: [] };

  res.render('dominical/index', {
    titulo: 'Descansos dominicales',
    sedes, sedeId, mesStr, reporte,
  });
}

export default { index };
