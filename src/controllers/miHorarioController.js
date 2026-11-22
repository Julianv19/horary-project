// Controlador: horario personal del colaborador autenticado.
import Usuario from '../models/usuario.js';
import Programacion from '../models/programacion.js';
import { lunesDe, toYMD, fechasSemana, horaANumero, DIAS } from '../lib/fechas.js';

export function index(req, res) {
  const cuenta = req.cuenta;
  const semana = req.query.semana ? lunesDe(req.query.semana) : lunesDe(toYMD(new Date()));
  const fechas = fechasSemana(semana);
  const dias = fechas.map((f, i) => ({ fecha: f, nombre: DIAS[i], turnos: [], horas: 0 }));

  const usuario = cuenta.usuario_id ? Usuario.find(cuenta.usuario_id) : null;
  let publicado = false;
  let horasSemana = 0;

  if (usuario) {
    const prog = Programacion.find(usuario.sede_id, semana);
    publicado = !!prog && prog.estado === 'PUBLICADA';
    if (publicado) {
      for (const t of Programacion.turnosDeUsuario(prog.id, usuario.id)) {
        const i = fechas.indexOf(t.fecha);
        if (i < 0) continue;
        const h = horaANumero(t.hora_fin) - horaANumero(t.hora_inicio);
        dias[i].turnos.push(t);
        dias[i].horas = Math.round((dias[i].horas + h) * 10) / 10;
        horasSemana += h;
      }
    }
  }

  res.render('mi-horario/index', {
    titulo: 'Mi horario',
    usuario, semana, fechas, dias,
    publicado, horasSemana: Math.round(horasSemana * 10) / 10,
  });
}

export default { index };
