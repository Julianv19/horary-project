// =====================================================================
//  aforoService.js  —  Motor de aforo por cobertura
//
//  generar(sedeId, semana):  construye los turnos de la semana cubriendo
//    la cobertura requerida, respetando jornada, descanso y horario.
//  reporte(sedeId, semana):  arma el reporte (horario + cobertura + horas)
//    a partir de los turnos ya guardados.
//
//  Heurística voraz y transparente (v1): bloques contiguos, no óptimo.
// =====================================================================
import Usuario from '../models/usuario.js';
import Cobertura from '../models/cobertura.js';
import Horario from '../models/horario.js';
import Programacion from '../models/programacion.js';
import Descanso from '../models/descanso.js';
import Ausencia from '../models/ausencia.js';
import Patron from '../models/patron.js';
import Dominical from '../models/dominical.js';
import Sugerencia from '../models/sugerencia.js';
import Restriccion from '../models/restriccion.js';
import Demanda from '../models/demanda.js';
import Induccion from '../models/induccion.js';
import { fechasSemana, horaANumero, numeroAHora, DIAS, parseYMD } from '../lib/fechas.js';
import { turnoEfectivo, ventanaTurno, etiquetaTipo, PM_SPLIT, evaluarRestricciones } from '../lib/restricciones.js';

// Roles administrativos que deben repartirse mañana / tarde-noche.
const ROLES_ADMIN = new Set(['ADMINISTRADOR', 'ASISTENTE ADMON']);
const esAdminRol = (c) => ROLES_ADMIN.has((c.rol || '').toUpperCase());

// Asigna a los administrativos turnos opuestos (uno mañana, otro tarde-noche),
// honrando primero sus restricciones y rotando por semana. Devuelve Map id->turno.
function turnosAdministrativos(colaboradores, semanaInicio) {
  const admins = colaboradores.filter(esAdminRol);
  const map = new Map();
  if (admins.length === 0) return map;
  const usados = new Set();
  const libres = [];
  for (const a of admins) {
    const t = turnoEfectivo(a);
    if (t) { map.set(a.id, t); usados.add(t); } else libres.push(a);
  }
  const orden = ['MANANA', 'TARDE_NOCHE'];
  const semanaIdx = Math.floor(parseYMD(semanaInicio).getTime() / (7 * 86400000));
  let k = semanaIdx % 2;
  for (const a of libres) {
    let t = orden[k % 2];
    if (admins.length >= 2 && usados.has(t)) t = orden[(k + 1) % 2];
    map.set(a.id, t); usados.add(t); k++;
  }
  return map;
}

// ---- Reglas derivadas de la jornada ---------------------------------
function horasObjetivoDia(j) {
  if (j.horas_dia_exactas) return Math.round(j.horas_dia_exactas);
  const dias = j.dias_trabajo || 6;
  if (j.horas_sem_min) {
    let h = Math.round(j.horas_sem_min / dias);
    if (j.horas_dia_min) h = Math.max(h, Math.round(j.horas_dia_min));
    if (j.horas_dia_max) h = Math.min(h, Math.round(j.horas_dia_max));
    return h;
  }
  if (j.horas_dia_max) return Math.round(j.horas_dia_max);
  return 6;
}

// Días en que el tipo de jornada puede trabajar (0=Lun..6=Dom).
function diasPermitidos(j) {
  const dias = j.dias_trabajo || 6;
  if (dias <= 2) return [5, 6];        // fin de semana: Sáb, Dom
  if (dias === 3) return [4, 5, 6];    // Vie, Sáb, Dom
  return [0, 1, 2, 3, 4, 5, 6];
}

// Orden de preferencia de días para descansar (menor demanda primero), rotado por idx.
function ordenPreferencia(dias, idx) {
  const pref = [0, 1, 2, 3, 4, 5, 6].filter((d) => dias.includes(d));
  if (pref.length === 0) return [];
  const k = idx % pref.length;
  return pref.slice(k).concat(pref.slice(0, k));
}

// Construye usuario_id -> Set(diaIndex) para filas con rango [fecha_inicio, fecha_fin].
function mapaDiasPorRango(rows, fechas) {
  const m = new Map();
  for (const r of rows) {
    for (let i = 0; i < 7; i++) {
      if (fechas[i] >= r.fecha_inicio && fechas[i] <= r.fecha_fin) {
        if (!m.has(r.usuario_id)) m.set(r.usuario_id, new Set());
        m.get(r.usuario_id).add(i);
      }
    }
  }
  return m;
}

// Mejor ventana contigua de longitud L que cubre más demanda pendiente.
function mejorVentana(open, close, L, remHora) {
  let best = { start: open, score: -1 };
  for (let s = open; s <= close - L; s++) {
    let score = 0;
    for (let h = s; h < s + L; h++) score += Math.max(0, remHora[h] || 0);
    if (score > best.score) best = { start: s, score };
  }
  if (best.score < 0) best = { start: open, score: 0 };
  return best;
}

// ---- Generación -----------------------------------------------------
export function generar(sedeId, semanaInicio, opciones = {}) {
  const colaboradores = Usuario.paraProgramacion(sedeId);
  const cobertura = Cobertura.mapaPorSede(sedeId); // [dia][hora][rol_id]
  const horarios = Horario.mapaPorSede(sedeId);    // [dia]={apertura,cierre}
  const fechas = fechasSemana(semanaInicio);

  // Demanda operativa (refuerzo por franja/rol) agrupada por día de la semana.
  const demandaPorDia = {};
  for (const dm of Demanda.activasPorSede(sedeId)) {
    if (!dm.rol_id) continue; // el refuerzo general se reporta, no se asigna por rol
    (demandaPorDia[dm.dia_semana] ??= []).push(dm);
  }

  // Descansos APROBADOS dentro de la semana → mapa usuario_id -> Set(diaIndex)
  const forzados = new Map();
  for (const d of Descanso.aprobadasEnRango(sedeId, fechas[0], fechas[6])) {
    const dia = fechas.indexOf(d.fecha);
    if (dia < 0) continue;
    if (!forzados.has(d.usuario_id)) forzados.set(d.usuario_id, new Set());
    forzados.get(d.usuario_id).add(dia);
  }

  // Ausencias (incapacidad/licencia/vacaciones/permiso) que caen en la semana.
  const ausentes = mapaDiasPorRango(Ausencia.vigentesEnRango(sedeId, fechas[0], fechas[6]), fechas);

  // Patrones asignados (turnos por día, incluye partidos).
  const patronDias = new Map();
  for (const pid of [...new Set(colaboradores.map((c) => c.patron_id).filter(Boolean))]) {
    patronDias.set(pid, Patron.turnosPorDia(pid));
  }

  // Rotación de descanso dominical: en cada rol, descansa el domingo quien
  // MENOS domingos ha descansado hasta ahora (solo trabajadores de semana completa).
  const domingoDescanso = new Set();
  if (opciones.rotarDomingos) {
    const hist = Dominical.historialConteo(sedeId, semanaInicio);
    const porRol = new Map();
    for (const c of colaboradores) {
      if (diasPermitidos(c).length < 7) continue;               // solo semana completa
      if ((ausentes.get(c.id) || new Set()).has(6)) continue;   // ya ausente el domingo
      if (c.patron_id) continue;                                // el patrón manda
      (porRol.get(c.rol_id) || porRol.set(c.rol_id, []).get(c.rol_id)).push(c);
    }
    for (const lista of porRol.values()) {
      lista.sort((a, b) => (hist.get(a.id) || 0) - (hist.get(b.id) || 0) || a.id - b.id);
      if (lista.length) domingoDescanso.add(lista[0].id);
    }
  }

  // Regla administrativa: reparto obligatorio mañana / tarde-noche.
  const adminTurno = turnosAdministrativos(colaboradores, semanaInicio);

  // Turno OBLIGATORIO de un colaborador (regla administrativa, restricción o turno fijo).
  const colaboradorPorId = new Map(colaboradores.map((x) => [x.id, x]));
  const turnoObligatorio = (colab) => {
    const rs = restrPorUsuario.get(colab.id) || [];
    const fijo = rs.some((r) => r.tipo === 'FIJO_MANANA') ? 'MANANA'
      : rs.some((r) => r.tipo === 'FIJO_TARDE_NOCHE') ? 'TARDE_NOCHE' : null;
    return adminTurno.get(colab.id) || turnoEfectivo(colab) || fijo;
  };

  // Sugerencias (preferencia suave de turno; no sobrescriben lo obligatorio).
  const opuesto = (t) => (t === 'MANANA' ? 'TARDE_NOCHE' : 'MANANA');
  const sPrioriza = new Map();
  const sEvita = new Map();
  for (const s of Sugerencia.activasPorSede(sedeId)) {
    if (s.tipo === 'PRIORIZAR_TURNO' && s.turno) sPrioriza.set(s.usuario_id, s.turno);
    else if (s.tipo === 'EVITAR_TURNO' && s.turno) sEvita.set(s.usuario_id, s.turno);
  }
  const turnoSugerido = (id) => sPrioriza.get(id) || (sEvita.has(id) ? opuesto(sEvita.get(id)) : null);

  // Restricciones múltiples por colaborador (vacaciones, días/franjas, rangos).
  const restrPorUsuario = new Map();
  for (const r of Restriccion.activasPorSede(sedeId)) {
    if (!restrPorUsuario.has(r.usuario_id)) restrPorUsuario.set(r.usuario_id, []);
    restrPorUsuario.get(r.usuario_id).push(r);
  }

  // Inducciones vigentes: colaborador nuevo -> mentor (para alinear turnos).
  const mentorDe = new Map();
  for (const ind of Induccion.vigentesPorSede(sedeId, fechas[0])) {
    if (ind.mentor_id) mentorDe.set(ind.usuario_id, ind.mentor_id);
  }

  // Precalcular reglas por colaborador. Ausencias y descansos tienen prioridad;
  // si tiene patrón, el patrón define los días y horas de trabajo.
  const plan = colaboradores.map((c, idx) => {
    const target = horasObjetivoDia(c);
    const fueraPorAusencia = ausentes.get(c.id) || new Set();
    const solicitados = new Set(forzados.get(c.id) || []);
    const patron = c.patron_id ? patronDias.get(c.patron_id) : null;
    const restr = restrPorUsuario.get(c.id) || [];

    // Días bloqueados por restricciones (vacaciones aprobadas, días no disponibles).
    const bloqueados = new Set();
    for (let d = 0; d < 7; d++) {
      if (evaluarRestricciones(restr, { diaSemana: d, fecha: fechas[d], open: 0, close: 24 }).bloqueado) bloqueados.add(d);
    }
    // Turno fijo por restricción (además del nivel usuario / regla administrativa).
    // Turno: obligatorio (regla admin / restricción) > turno del mentor (inducción)
    // > preferencia sugerida.
    const obligatorio = turnoObligatorio(c);
    let turnoMentor = null;
    if (c.es_nuevo && mentorDe.has(c.id)) {
      const m = colaboradorPorId.get(mentorDe.get(c.id));
      if (m) turnoMentor = turnoObligatorio(m);
    }
    const forcedTurno = obligatorio || turnoMentor || turnoSugerido(c.id);
    const fuera = (d) => fueraPorAusencia.has(d) || bloqueados.has(d);

    if (patron) {
      const trabaja = [0, 1, 2, 3, 4, 5, 6].filter(
        (d) => patron[d] && patron[d].length && !fuera(d) && !solicitados.has(d)
      );
      return { c, target, patron, forcedTurno, restr, trabaja: new Set(trabaja) };
    }

    // Sin patrón: colocación automática con descanso.
    const permitidos = diasPermitidos(c);
    const base = permitidos.filter((d) => !fuera(d));
    const necesita = Math.max(0, base.length - (c.dias_trabajo || 6));
    const descanso = new Set([...solicitados].filter((d) => base.includes(d)));
    if (domingoDescanso.has(c.id) && base.includes(6)) descanso.add(6);
    for (const d of ordenPreferencia(base, idx)) {
      if (descanso.size >= necesita) break;
      descanso.add(d);
    }
    const trabaja = base.filter((d) => !descanso.has(d));
    return { c, target, patron: null, forcedTurno, restr, trabaja: new Set(trabaja) };
  });

  const turnos = [];

  for (let dia = 0; dia < 7; dia++) {
    const hor = horarios[dia];
    if (!hor) continue; // sede cerrada ese día
    const open = Math.floor(horaANumero(hor.apertura));
    const close = Math.ceil(horaANumero(hor.cierre));
    const operLen = close - open;
    if (operLen <= 0) continue;

    // Demanda pendiente por rol → {hora: n}
    const rem = {};
    const covDia = cobertura[dia] || {};
    for (const horaStr of Object.keys(covDia)) {
      const hora = Number(horaStr);
      for (const rolId of Object.keys(covDia[hora])) {
        (rem[rolId] ??= {});
        rem[rolId][hora] = covDia[hora][rolId];
      }
    }
    // Sumar la demanda operativa (refuerzo) a la demanda pendiente de ese día.
    for (const dm of (demandaPorDia[dia] || [])) {
      const hi = Math.floor(horaANumero(dm.hora_inicio));
      const hf = Math.ceil(horaANumero(dm.hora_fin));
      (rem[dm.rol_id] ??= {});
      for (let h = hi; h < hf; h++) rem[dm.rol_id][h] = (rem[dm.rol_id][h] || 0) + dm.personas;
    }

    const descontar = (rolId, ini, fin) => {
      if (!rem[rolId]) return;
      for (let h = ini; h < fin; h++) if (rem[rolId][h] > 0) rem[rolId][h] -= 1;
    };

    for (const p of plan) {
      if (!p.trabaja.has(dia)) continue;

      // Con patrón: colocar sus bloques (soporta turnos partidos).
      if (p.patron) {
        for (const b of (p.patron[dia] || [])) {
          turnos.push({
            usuario_id: p.c.id, fecha: fechas[dia],
            hora_inicio: b.hora_inicio, hora_fin: b.hora_fin, orden: b.orden,
          });
          descontar(p.c.rol_id, Math.floor(horaANumero(b.hora_inicio)), Math.ceil(horaANumero(b.hora_fin)));
        }
        continue;
      }

      // Sin patrón: bloque contiguo dentro de la ventana permitida (turno obligatorio
      // + recorte por restricciones del día) que cubra la mayor demanda.
      let [wOpen, wClose] = ventanaTurno(open, close, p.forcedTurno);
      const ev = evaluarRestricciones(p.restr || [], { diaSemana: dia, fecha: fechas[dia], open, close });
      wOpen = Math.max(wOpen, ev.ventana[0]);
      wClose = Math.min(wClose, ev.ventana[1]);
      const L = Math.min(p.target, Math.max(0, wClose - wOpen));
      if (L <= 0) continue;
      const { start } = mejorVentana(wOpen, wClose, L, rem[p.c.rol_id] || {});
      turnos.push({
        usuario_id: p.c.id, fecha: fechas[dia],
        hora_inicio: numeroAHora(start), hora_fin: numeroAHora(start + L), orden: 0,
      });
      descontar(p.c.rol_id, start, start + L);
    }
  }

  // Persistir
  const prog = Programacion.findOrCreate(sedeId, semanaInicio);
  Programacion.limpiarTurnos(prog.id);
  for (const t of turnos) Programacion.insertarTurno({ ...t, programacion_id: prog.id });

  return { programacion: prog, totalTurnos: turnos.length };
}

// ---- Reporte --------------------------------------------------------
export function reporte(sedeId, semanaInicio) {
  const prog = Programacion.find(sedeId, semanaInicio);
  if (!prog) return null;

  const turnos = Programacion.turnosConDetalle(prog.id);
  const cobertura = Cobertura.mapaPorSede(sedeId);
  const horarios = Horario.mapaPorSede(sedeId);
  const colaboradores = Usuario.paraProgramacion(sedeId);
  const fechas = fechasSemana(semanaInicio);
  const fechaADia = Object.fromEntries(fechas.map((f, i) => [f, i]));

  // Índice: asignado[dia][rol_id][hora] = nº personas
  const asignado = {};
  // Detalle: detalleDia[dia] = Map(usuario_id -> {horas:Set, seg:[], dur})
  const detalleDia = {};
  // Por colaborador: dias[7] = {trabaja, inicio, fin, horas}
  const porColab = new Map();
  for (const c of colaboradores) {
    porColab.set(c.id, {
      id: c.id, nombre: c.nombre, area: c.area, area_orden: c.area_orden,
      rol: c.rol, color: null, jornada_codigo: c.jornada_codigo,
      horas_sem_min: c.horas_sem_min, horas_sem_max: c.horas_sem_max,
      dias: Array.from({ length: 7 }, () => ({ trabaja: false, inicio: null, fin: null, horas: 0 })),
      horasSemana: 0,
    });
  }

  for (const t of turnos) {
    const dia = fechaADia[t.fecha];
    if (dia === undefined) continue;
    const ini = Math.floor(horaANumero(t.hora_inicio));
    const fin = Math.ceil(horaANumero(t.hora_fin));
    const horas = horaANumero(t.hora_fin) - horaANumero(t.hora_inicio);

    (asignado[dia] ??= {});
    const colab = porColab.get(t.usuario_id);
    if (colab) {
      colab.color = t.rol_color;
      const d = colab.dias[dia];
      d.trabaja = true; d.inicio = t.hora_inicio; d.fin = t.hora_fin;
      d.horas = Math.round((d.horas + horas) * 10) / 10;
      (d.segmentos ??= []).push(`${t.hora_inicio}–${t.hora_fin}`);
      colab.horasSemana = Math.round((colab.horasSemana + horas) * 10) / 10;
    }
    // asignado por rol_id: necesitamos rol_id; lo tomamos del colaborador
    const colRolId = colaboradores.find((c) => c.id === t.usuario_id)?.rol_id;
    if (colRolId != null) {
      (asignado[dia][colRolId] ??= {});
      for (let h = ini; h < fin; h++) asignado[dia][colRolId][h] = (asignado[dia][colRolId][h] || 0) + 1;
    }

    // Detalle por colaborador: horas marcadas y segmentos del día.
    (detalleDia[dia] ??= new Map());
    if (!detalleDia[dia].has(t.usuario_id)) detalleDia[dia].set(t.usuario_id, { horas: new Set(), seg: [], dur: 0 });
    const det = detalleDia[dia].get(t.usuario_id);
    for (let h = ini; h < fin; h++) det.horas.add(h);
    det.seg.push(`${t.hora_inicio}–${t.hora_fin}`);
    det.dur = Math.round((det.dur + horas) * 10) / 10;
  }

  // Marcar días de ausencia (incapacidad/licencia/...) en el resumen por colaborador.
  for (const a of Ausencia.vigentesEnRango(sedeId, fechas[0], fechas[6])) {
    const colab = porColab.get(a.usuario_id);
    if (!colab) continue;
    for (let i = 0; i < 7; i++) {
      if (fechas[i] >= a.fecha_inicio && fechas[i] <= a.fecha_fin) colab.dias[i].ausencia = a.tipo;
    }
  }

  // Construir reporte por día
  const porDia = [];
  for (let dia = 0; dia < 7; dia++) {
    const hor = horarios[dia];
    const abierto = !!hor;
    const open = abierto ? Math.floor(horaANumero(hor.apertura)) : 10;
    const close = abierto ? Math.ceil(horaANumero(hor.cierre)) : 22;
    const horas = [];
    for (let h = open; h < close; h++) horas.push(h);

    // Agregar por área: requerido y asignado por hora
    const covDia = cobertura[dia] || {};
    const asigDia = asignado[dia] || {};

    // mapa rol_id → área (desde colaboradores) y lista de áreas con demanda o personal
    const areasMap = new Map(); // area -> {orden, requerido{h}, asignado{h}}
    const ensure = (area, orden) => {
      if (!areasMap.has(area)) areasMap.set(area, { area, orden, requerido: {}, asignado: {} });
      return areasMap.get(area);
    };
    // requerido: recorrer cobertura del día
    for (const horaStr of Object.keys(covDia)) {
      const h = Number(horaStr);
      for (const rolId of Object.keys(covDia[h])) {
        const info = colaboradores.find((c) => c.rol_id === Number(rolId));
        const area = info ? info.area : 'OTROS';
        const orden = info ? info.area_orden : 99;
        const row = ensure(area, orden);
        row.requerido[h] = (row.requerido[h] || 0) + covDia[h][rolId];
      }
    }
    // asignado: recorrer asigDia por rol
    for (const rolId of Object.keys(asigDia)) {
      const info = colaboradores.find((c) => c.rol_id === Number(rolId));
      const area = info ? info.area : 'OTROS';
      const orden = info ? info.area_orden : 99;
      const row = ensure(area, orden);
      for (const h of Object.keys(asigDia[rolId])) {
        row.asignado[Number(h)] = (row.asignado[Number(h)] || 0) + asigDia[rolId][h];
      }
    }

    const filasArea = [...areasMap.values()].sort((a, b) => a.orden - b.orden).map((r) => ({
      area: r.area,
      requerido: horas.map((h) => r.requerido[h] || 0),
      asignado: horas.map((h) => r.asignado[h] || 0),
      gap: horas.map((h) => (r.requerido[h] || 0) - (r.asignado[h] || 0)),
    }));

    const totalAsignado = horas.map((h, i) => filasArea.reduce((s, f) => s + f.asignado[i], 0));
    const totalRequerido = horas.map((h, i) => filasArea.reduce((s, f) => s + f.requerido[i], 0));

    // Detalle por colaborador que trabaja ese día, agrupado por área.
    const trabajadores = detalleDia[dia] || new Map();
    const gruposMap = new Map(); // area -> {area, orden, filas:[]}
    for (const [uid, info] of trabajadores) {
      const c = porColab.get(uid);
      if (!c) continue;
      if (!gruposMap.has(c.area)) gruposMap.set(c.area, { area: c.area, orden: c.area_orden, filas: [] });
      gruposMap.get(c.area).filas.push({
        nombre: c.nombre, rol: c.rol, color: c.color, jornada: c.jornada_codigo,
        marcas: horas.map((h) => (info.horas.has(h) ? 1 : '')),
        segmentos: info.seg, horas: info.dur,
      });
    }
    const reqPorArea = Object.fromEntries(filasArea.map((f) => [f.area, f.requerido]));
    const grupos = [...gruposMap.values()]
      .sort((a, b) => a.orden - b.orden)
      .map((g) => ({
        ...g,
        filas: g.filas.sort((a, b) => a.rol.localeCompare(b.rol) || a.nombre.localeCompare(b.nombre)),
        personasPorHora: horas.map((h, i) => g.filas.reduce((s, f) => s + (f.marcas[i] ? 1 : 0), 0)),
        requerido: reqPorArea[g.area] || horas.map(() => 0),
      }));

    // Quién descansa o está ausente ese día (de los que podrían trabajar).
    const descansan = colaboradores
      .filter((c) => !trabajadores.has(c.id))
      .map((c) => ({ nombre: c.nombre, nota: porColab.get(c.id)?.dias[dia]?.ausencia || 'Descanso' }));

    porDia.push({
      dia, nombre: DIAS[dia], fecha: fechas[dia], abierto,
      apertura: abierto ? hor.apertura : null, cierre: abierto ? hor.cierre : null,
      horas, filasArea, totalAsignado, totalRequerido, grupos, descansan,
    });
  }

  // Compliance de jornada por colaborador
  const colabList = [...porColab.values()].sort(
    (a, b) => a.area_orden - b.area_orden || a.rol.localeCompare(b.rol) || a.nombre.localeCompare(b.nombre)
  );
  for (const c of colabList) {
    let estado = 'ok';
    if (c.horas_sem_min != null && c.horasSemana < c.horas_sem_min) estado = 'bajo';
    else if (c.horas_sem_max != null && c.horasSemana > c.horas_sem_max) estado = 'alto';
    c.estadoJornada = estado;
  }

  return { programacion: prog, fechas, porDia, colaboradores: colabList };
}

// ---- Modificar una programación ya generada ante ausencias ----------
// Quita de la semana ya generada los turnos que caen en una ausencia, para
// que el administrador vea los huecos y los cubra (o regenere la semana).
export function aplicarAusencias(sedeId, semanaInicio) {
  const prog = Programacion.find(sedeId, semanaInicio);
  if (!prog) return { sinProgramacion: true, eliminados: 0 };

  const fechas = fechasSemana(semanaInicio);
  const filas = Ausencia.vigentesEnRango(sedeId, fechas[0], fechas[6]);
  let eliminados = 0;
  for (const a of filas) {
    for (let i = 0; i < 7; i++) {
      if (fechas[i] >= a.fecha_inicio && fechas[i] <= a.fecha_fin) {
        const r = Programacion.eliminarTurnosUsuarioFecha(prog.id, a.usuario_id, fechas[i]);
        eliminados += r.changes || 0;
      }
    }
  }
  return { eliminados, programacion: prog };
}

// ---- Validación de reglas obligatorias ------------------------------
// Revisa los turnos ya generados contra las reglas que NO se pueden incumplir.
// Devuelve { conflictos:[{colaborador,turno,motivo,severidad}], obligatorias }.
export function validar(sedeId, semanaInicio) {
  const prog = Programacion.find(sedeId, semanaInicio);
  if (!prog) return { conflictos: [], obligatorias: 0, sinProgramacion: true };

  const turnos = Programacion.turnosConDetalle(prog.id);
  const colaboradores = Usuario.paraProgramacion(sedeId);
  const byId = new Map(colaboradores.map((c) => [c.id, c]));
  const fechas = fechasSemana(semanaInicio);
  const fechaADia = Object.fromEntries(fechas.map((f, i) => [f, i]));
  const conflictos = [];

  // 1) Restricciones individuales (turno fijo médico/estudios/mañana/tarde-noche).
  for (const t of turnos) {
    const c = byId.get(t.usuario_id);
    if (!c) continue;
    const te = turnoEfectivo(c);
    if (!te) continue;
    const ini = horaANumero(t.hora_inicio);
    const fin = horaANumero(t.hora_fin);
    const dentro = te === 'MANANA' ? fin <= PM_SPLIT : ini >= PM_SPLIT;
    if (!dentro) {
      conflictos.push({
        colaborador: c.nombre,
        turno: `${DIAS[fechaADia[t.fecha]]} ${t.hora_inicio}–${t.hora_fin}`,
        motivo: `Incompatible con su restricción (${etiquetaTipo(c.restriccion_tipo)} · ${te === 'MANANA' ? 'mañana' : 'tarde-noche'})`,
        severidad: 'obligatoria',
      });
    }
  }

  // 2) Distribución administrativa: por día no puede haber dos en el mismo turno.
  const adminIds = new Set(colaboradores.filter(esAdminRol).map((c) => c.id));
  const porDiaAdmin = {};
  for (const t of turnos) {
    if (!adminIds.has(t.usuario_id)) continue;
    const ini = horaANumero(t.hora_inicio);
    const fin = horaANumero(t.hora_fin);
    const turno = fin <= PM_SPLIT ? 'MANANA' : (ini >= PM_SPLIT ? 'TARDE_NOCHE' : 'MIXTO');
    const dia = fechaADia[t.fecha];
    (porDiaAdmin[dia] ??= {});
    (porDiaAdmin[dia][turno] ??= new Set()).add(byId.get(t.usuario_id)?.nombre || `#${t.usuario_id}`);
  }
  for (const dia of Object.keys(porDiaAdmin)) {
    for (const turno of ['MANANA', 'TARDE_NOCHE', 'MIXTO']) {
      const nombres = porDiaAdmin[dia][turno];
      if (nombres && nombres.size >= 2) {
        conflictos.push({
          colaborador: [...nombres].join(', '),
          turno: `${DIAS[dia]} (${turno === 'MANANA' ? 'mañana' : turno === 'TARDE_NOCHE' ? 'tarde-noche' : 'turno solapado'})`,
          motivo: 'Dos administrativos en el mismo turno (deben repartirse mañana / tarde-noche)',
          severidad: 'obligatoria',
        });
      }
    }
  }

  // 3) Sugerencias: "evitar turno" incumplido (no bloquea).
  const evita = new Map();
  for (const s of Sugerencia.activasPorSede(sedeId)) {
    if (s.tipo === 'EVITAR_TURNO' && s.turno) evita.set(s.usuario_id, s.turno);
  }
  for (const t of turnos) {
    const tev = evita.get(t.usuario_id);
    if (!tev) continue;
    const ini = horaANumero(t.hora_inicio);
    const fin = horaANumero(t.hora_fin);
    const enTurno = tev === 'MANANA' ? ini < PM_SPLIT : fin > PM_SPLIT;
    if (enTurno) {
      conflictos.push({
        colaborador: byId.get(t.usuario_id)?.nombre,
        turno: `${DIAS[fechaADia[t.fecha]]} ${t.hora_inicio}–${t.hora_fin}`,
        motivo: `Sugerencia: se pidió evitar el turno de ${tev === 'MANANA' ? 'mañana' : 'tarde-noche'}`,
        severidad: 'sugerencia',
      });
    }
  }

  // 4) Inducción: colaborador nuevo sin personal experimentado en su área ese día.
  if (colaboradores.some((c) => c.es_nuevo)) {
    const porDiaArea = {};
    for (const t of turnos) {
      const c = byId.get(t.usuario_id);
      if (!c) continue;
      const dia = fechaADia[t.fecha];
      (porDiaArea[dia] ??= {});
      (porDiaArea[dia][c.area] ??= { nuevos: new Set(), exp: new Set() });
      if (c.es_nuevo) porDiaArea[dia][c.area].nuevos.add(c.nombre);
      else porDiaArea[dia][c.area].exp.add(c.nombre);
    }
    for (const dia of Object.keys(porDiaArea)) {
      for (const area of Object.keys(porDiaArea[dia])) {
        const g = porDiaArea[dia][area];
        if (g.nuevos.size && g.exp.size === 0) {
          conflictos.push({
            colaborador: [...g.nuevos].join(', '),
            turno: `${DIAS[dia]} (${area})`,
            motivo: 'Colaborador nuevo sin personal experimentado en su área ese día',
            severidad: 'sugerencia',
          });
        }
      }
    }
  }

  // 5) Déficit de demanda operativa (no bloquea): avisa si una franja no se cubre.
  const asignado = {};
  for (const t of turnos) {
    const c = byId.get(t.usuario_id);
    if (!c) continue;
    const dia = fechaADia[t.fecha];
    const ini = Math.floor(horaANumero(t.hora_inicio));
    const fin = Math.ceil(horaANumero(t.hora_fin));
    (asignado[dia] ??= {});
    (asignado[dia][c.rol_id] ??= {});
    for (let h = ini; h < fin; h++) asignado[dia][c.rol_id][h] = (asignado[dia][c.rol_id][h] || 0) + 1;
  }
  for (const dm of Demanda.activasPorSede(sedeId)) {
    if (!dm.rol_id) continue;
    const hi = Math.floor(horaANumero(dm.hora_inicio));
    const hf = Math.ceil(horaANumero(dm.hora_fin));
    let peor = Infinity;
    for (let h = hi; h < hf; h++) peor = Math.min(peor, asignado[dm.dia_semana]?.[dm.rol_id]?.[h] || 0);
    if (peor < dm.personas) {
      const rolNombre = colaboradores.find((c) => c.rol_id === dm.rol_id)?.rol || `rol ${dm.rol_id}`;
      conflictos.push({
        colaborador: rolNombre,
        turno: `${DIAS[dm.dia_semana]} ${dm.hora_inicio}–${dm.hora_fin}`,
        motivo: `Déficit de demanda (prioridad ${dm.prioridad}): faltan ${dm.personas - peor} de ${dm.personas}`,
        severidad: 'sugerencia',
      });
    }
  }

  const obligatorias = conflictos.filter((x) => x.severidad === 'obligatoria').length;
  const sugerencias = conflictos.filter((x) => x.severidad === 'sugerencia').length;
  return { conflictos, obligatorias, sugerencias };
}

export default { generar, reporte, aplicarAusencias, validar };
