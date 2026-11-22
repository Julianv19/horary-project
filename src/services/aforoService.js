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
import { fechasSemana, horaANumero, numeroAHora, DIAS } from '../lib/fechas.js';

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

// Elige los días de descanso (reparte entre colaboradores con el índice).
function diasDescanso(permitidos, diasTrabajo, idx) {
  const descanso = Math.max(0, permitidos.length - diasTrabajo);
  if (descanso === 0) return new Set();
  // Preferimos descansar en días de menor demanda (lunes→jueves), rotando.
  const preferencia = [0, 1, 2, 3, 4, 5, 6].filter((d) => permitidos.includes(d));
  const rotados = preferencia.slice(idx % preferencia.length).concat(preferencia.slice(0, idx % preferencia.length));
  return new Set(rotados.slice(0, descanso));
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
export function generar(sedeId, semanaInicio) {
  const colaboradores = Usuario.paraProgramacion(sedeId);
  const cobertura = Cobertura.mapaPorSede(sedeId); // [dia][hora][rol_id]
  const horarios = Horario.mapaPorSede(sedeId);    // [dia]={apertura,cierre}
  const fechas = fechasSemana(semanaInicio);

  // Descansos APROBADOS dentro de la semana → mapa usuario_id -> Set(diaIndex)
  const forzados = new Map();
  for (const d of Descanso.aprobadasEnRango(sedeId, fechas[0], fechas[6])) {
    const dia = fechas.indexOf(d.fecha);
    if (dia < 0) continue;
    if (!forzados.has(d.usuario_id)) forzados.set(d.usuario_id, new Set());
    forzados.get(d.usuario_id).add(dia);
  }

  // Precalcular reglas por colaborador (respetando descansos solicitados)
  const plan = colaboradores.map((c, idx) => {
    const permitidos = diasPermitidos(c);
    const target = horasObjetivoDia(c);
    const necesita = Math.max(0, permitidos.length - (c.dias_trabajo || 6));

    // Descanso: primero los días solicitados y aprobados, luego se completa.
    const solicitados = new Set([...(forzados.get(c.id) || [])].filter((d) => permitidos.includes(d)));
    const descanso = new Set(solicitados);
    if (descanso.size < necesita) {
      for (const d of diasDescanso(permitidos, c.dias_trabajo || 6, idx)) {
        if (descanso.size >= necesita) break;
        descanso.add(d);
      }
      for (const d of permitidos) {
        if (descanso.size >= necesita) break;
        descanso.add(d);
      }
    }

    const trabaja = permitidos.filter((d) => !descanso.has(d));
    return { c, target, trabaja: new Set(trabaja) };
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

    for (const p of plan) {
      if (!p.trabaja.has(dia)) continue;
      const L = Math.min(p.target, operLen);
      if (L <= 0) continue;
      const remHora = rem[p.c.rol_id] || {};
      const { start } = mejorVentana(open, close, L, remHora);
      turnos.push({
        usuario_id: p.c.id,
        fecha: fechas[dia],
        hora_inicio: numeroAHora(start),
        hora_fin: numeroAHora(start + L),
        orden: 0,
      });
      // Descontar demanda cubierta
      if (rem[p.c.rol_id]) {
        for (let h = start; h < start + L; h++) {
          if (rem[p.c.rol_id][h] > 0) rem[p.c.rol_id][h] -= 1;
        }
      }
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
      d.trabaja = true; d.inicio = t.hora_inicio; d.fin = t.hora_fin; d.horas += horas;
      colab.horasSemana += horas;
    }
    // asignado por rol_id: necesitamos rol_id; lo tomamos del colaborador
    const colRolId = colaboradores.find((c) => c.id === t.usuario_id)?.rol_id;
    if (colRolId != null) {
      (asignado[dia][colRolId] ??= {});
      for (let h = ini; h < fin; h++) asignado[dia][colRolId][h] = (asignado[dia][colRolId][h] || 0) + 1;
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

    porDia.push({
      dia, nombre: DIAS[dia], fecha: fechas[dia], abierto,
      apertura: abierto ? hor.apertura : null, cierre: abierto ? hor.cierre : null,
      horas, filasArea, totalAsignado, totalRequerido,
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

export default { generar, reporte };
