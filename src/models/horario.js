// Modelo: horario de la sede (apertura/cierre por día de la semana).
import db from '../config/db.js';

export const Horario = {
  porSede(sedeId) {
    return db.prepare(
      'SELECT dia_semana, apertura, cierre FROM sede_horario WHERE sede_id = ? ORDER BY dia_semana'
    ).all(sedeId);
  },
  // Mapa { dia_semana: {apertura, cierre} }
  mapaPorSede(sedeId) {
    const map = {};
    for (const h of this.porSede(sedeId)) map[h.dia_semana] = { apertura: h.apertura, cierre: h.cierre };
    return map;
  },
};

export default Horario;
