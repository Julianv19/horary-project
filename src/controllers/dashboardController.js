// Controlador del tablero (home). Reúne catálogos y colaboradores para la vista.
import Catalogo from '../models/catalogo.js';
import Usuario from '../models/usuario.js';

export function index(req, res) {
  const sedes = Catalogo.sedes();
  const sedeId = req.query.sede ? Number(req.query.sede) : (sedes[0]?.id ?? null);

  const usuarios = Usuario.listar(sedeId);

  // Agrupar colaboradores por área y luego por rol (lista única discriminada por rol).
  const porArea = new Map();
  for (const u of usuarios) {
    if (!porArea.has(u.area)) porArea.set(u.area, new Map());
    const roles = porArea.get(u.area);
    if (!roles.has(u.rol)) roles.set(u.rol, { color: u.rol_color, personas: [] });
    roles.get(u.rol).personas.push(u);
  }
  // Convertir a estructura simple para EJS
  const grupos = [...porArea.entries()].map(([area, roles]) => ({
    area,
    roles: [...roles.entries()].map(([rol, info]) => ({ rol, color: info.color, personas: info.personas })),
  }));

  res.render('pages/dashboard', {
    titulo: 'Tablero de horarios',
    sedes,
    sedeId,
    jornadas: Catalogo.jornadas(),
    totalColaboradores: usuarios.length,
    contarPorArea: Usuario.contarPorArea(sedeId),
    grupos,
  });
}

export default { index };
