// =====================================================================
//  resources.js
//  Define de forma declarativa cada recurso administrable (CRUD):
//    - columns: columnas del listado
//    - fields : campos del formulario (con opciones para los <select>)
//  El crudFactory y las vistas genéricas consumen esta configuración.
// =====================================================================
import Sede from '../models/sede.js';
import Area from '../models/area.js';
import Rol from '../models/rol.js';
import Jornada from '../models/jornada.js';
import Usuario from '../models/usuario.js';
import Patron from '../models/patron.js';
import { RESTRICCION_TIPOS, RESTRICCION_TURNOS } from '../lib/restricciones.js';

const opcionesRestriccion = () => RESTRICCION_TIPOS.map((t) => ({ value: t.val, label: t.label }));
const opcionesTurnoRestriccion = () => RESTRICCION_TURNOS.map((t) => ({ value: t.val, label: t.label }));

const opcionesSede = () =>
  Sede.activas().map((s) => ({ value: s.id, label: s.nombre }));

const opcionesArea = () =>
  Area.all().map((a) => ({ value: a.id, label: a.nombre }));

const opcionesRol = () =>
  Rol.all().map((r) => ({ value: r.id, label: `${r.area} · ${r.nombre}` }));

const opcionesJornada = () =>
  Jornada.all().map((j) => ({ value: j.id, label: `${j.codigo} — ${j.nombre}` }));

const opcionesPatron = () =>
  Patron.all().map((p) => ({ value: p.id, label: p.nombre }));

export const resources = {
  colaboradores: {
    basePath: '/colaboradores',
    singular: 'colaborador',
    plural: 'Colaboradores',
    model: Usuario,
    extraActions: [{ label: 'Restricciones', path: 'restricciones' }],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'area', label: 'Área' },
      { key: 'rol', label: 'Rol' },
      { key: 'jornada_codigo', label: 'Jornada' },
      { key: 'patron', label: 'Patrón' },
      { key: 'estado', label: 'Estado', type: 'estado' },
      { key: 'restriccion_tipo', label: 'Restricción' },
      { key: 'sede', label: 'Sede' },
      { key: 'activo', label: 'Activo', type: 'bool' },
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'sede_id', label: 'Sede', type: 'select', required: true, options: opcionesSede() },
      { name: 'rol_id', label: 'Rol', type: 'select', required: true, options: opcionesRol() },
      { name: 'jornada_tipo_id', label: 'Jornada', type: 'select', required: true, options: opcionesJornada() },
      { name: 'patron_id', label: 'Patrón (opcional)', type: 'select', options: opcionesPatron(), help: 'Si se asigna, el motor seguirá este patrón de turnos.' },
      { name: 'restriccion_tipo', label: 'Restricción', type: 'select', options: opcionesRestriccion(), help: 'El generador respeta esta restricción antes de asignar turnos.' },
      { name: 'restriccion_turno', label: 'Turno de la restricción', type: 'select', options: opcionesTurnoRestriccion(), help: 'Para restricción médica o por estudios: fija mañana o tarde-noche.' },
      { name: 'restriccion_obs', label: 'Observaciones de la restricción', type: 'textarea' },
      { name: 'es_nuevo', label: 'En inducción (colaborador nuevo)', type: 'checkbox' },
      { name: 'activo', label: 'Activo', type: 'checkbox', default: true },
    ],
  },

  sedes: {
    basePath: '/sedes',
    singular: 'sede',
    plural: 'Sedes',
    model: Sede,
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'activo', label: 'Activa', type: 'bool' },
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'ciudad', label: 'Ciudad', type: 'text' },
      { name: 'activo', label: 'Activa', type: 'checkbox', default: true },
    ],
  },

  areas: {
    basePath: '/areas',
    singular: 'área',
    plural: 'Áreas',
    model: Area,
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'orden', label: 'Orden' },
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'orden', label: 'Orden', type: 'number' },
    ],
  },

  roles: {
    basePath: '/roles',
    singular: 'rol',
    plural: 'Roles',
    model: Rol,
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'area', label: 'Área' },
      { key: 'color', label: 'Color', type: 'color' },
    ],
    fields: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'area_id', label: 'Área', type: 'select', required: true, options: opcionesArea() },
      { name: 'color', label: 'Color', type: 'color', default: '#cccccc' },
    ],
  },

  jornadas: {
    basePath: '/jornadas',
    singular: 'tipo de jornada',
    plural: 'Tipos de jornada',
    model: Jornada,
    columns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'horas_dia_exactas', label: 'H/día exactas' },
      { key: 'horas_sem_min', label: 'H/sem mín' },
      { key: 'horas_sem_max', label: 'H/sem máx' },
      { key: 'dias_trabajo', label: 'Días' },
    ],
    fields: () => [
      { name: 'codigo', label: 'Código', type: 'text', required: true, help: 'Ej: TC, PAR, SUP' },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'horas_dia_exactas', label: 'Horas/día exactas', type: 'number', step: '0.5', help: 'Deja vacío si es flexible' },
      { name: 'horas_dia_min', label: 'Horas/día mín', type: 'number', step: '0.5' },
      { name: 'horas_dia_max', label: 'Horas/día máx', type: 'number', step: '0.5' },
      { name: 'horas_sem_min', label: 'Horas/semana mín', type: 'number', step: '0.5' },
      { name: 'horas_sem_max', label: 'Horas/semana máx', type: 'number', step: '0.5' },
      { name: 'dias_trabajo', label: 'Días de trabajo', type: 'number', default: 6 },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    ],
  },
};

export default resources;
