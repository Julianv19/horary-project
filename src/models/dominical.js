// Modelo: control de descansos dominicales (como la hoja DOMINICALES del Excel).
// Se calcula a partir de los horarios generados: un domingo "descansado" es un
// domingo en el que, existiendo programación de esa semana, el colaborador no
// tiene turnos.
import db from '../config/db.js';
import Programacion from './programacion.js';
import { toYMD, addDays, diaSemanaLunes0, lunesDe, fechasSemana } from '../lib/fechas.js';

const trabajaronEnFecha = (progId, fecha) =>
  new Set(db.prepare('SELECT DISTINCT usuario_id FROM turno WHERE programacion_id = ? AND fecha = ?')
    .all(progId, fecha).map((r) => r.usuario_id));

function domingosDelMes(anio, mes) {
  const res = [];
  let d = new Date(Date.UTC(anio, mes - 1, 1));
  while (d.getUTCMonth() === mes - 1) {
    if (diaSemanaLunes0(d) === 6) res.push(toYMD(d));
    d = addDays(d, 1);
  }
  return res;
}

export const Dominical = {
  domingosDelMes,

  // Reporte por mes: colaboradores x domingos (T=trabajó, D=descansó, null=sin programación).
  reporteMes(sedeId, anio, mes) {
    const domingos = domingosDelMes(anio, mes);
    const colaboradores = db.prepare(`
      SELECT u.id, u.nombre, rol.nombre AS rol, area.nombre AS area, area.orden AS area_orden
      FROM usuario u
      JOIN rol ON rol.id = u.rol_id
      JOIN area ON area.id = rol.area_id
      WHERE u.sede_id = ? AND u.activo = 1
      ORDER BY area.orden, rol.nombre, u.nombre
    `).all(sedeId);

    // Para cada domingo, saber quién trabajó (si hay programación de esa semana).
    const trabajaronPorDom = {};
    const hayProg = {};
    for (const dom of domingos) {
      const prog = Programacion.find(sedeId, lunesDe(dom));
      hayProg[dom] = !!prog;
      trabajaronPorDom[dom] = prog ? trabajaronEnFecha(prog.id, dom) : new Set();
    }

    const filas = colaboradores.map((c) => {
      let descansos = 0;
      const celdas = domingos.map((dom) => {
        if (!hayProg[dom]) return null;
        const trabajo = trabajaronPorDom[dom].has(c.id);
        if (!trabajo) descansos++;
        return trabajo ? 'T' : 'D';
      });
      return { ...c, celdas, descansos };
    });

    return { domingos, colaboradores: filas };
  },

  // Conteo histórico de domingos descansados por colaborador, en programaciones
  // ANTERIORES a la semana dada (para rotar de forma justa).
  historialConteo(sedeId, semanaInicio) {
    const counts = new Map();
    const activos = db.prepare('SELECT id FROM usuario WHERE sede_id = ? AND activo = 1').all(sedeId).map((r) => r.id);
    for (const prog of Programacion.listarPorSede(sedeId)) {
      if (prog.semana_inicio >= semanaInicio) continue;
      const domingo = fechasSemana(prog.semana_inicio)[6];
      const trabajaron = trabajaronEnFecha(prog.id, domingo);
      for (const id of activos) {
        if (!trabajaron.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  },
};

export default Dominical;
