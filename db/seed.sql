-- =====================================================================
--  Datos de ejemplo  —  Horary Project
--  Sede real de referencia: WINGZ Alpes (Manizales).
--  dia_semana: 0=Lunes ... 6=Domingo
-- =====================================================================

-- ---- SEDE ----
INSERT INTO sede (nombre, ciudad, activo) VALUES
  ('WINGZ Alpes',  'Manizales', 1),
  ('WINGZ Molinos', 'Manizales', 1);

-- ---- ÁREAS ----
INSERT INTO area (nombre, orden) VALUES
  ('ADMINISTRACIÓN', 1),
  ('COCINA',         2),
  ('SALÓN',          3),
  ('DOMICILIOS',     4);

-- ---- ROLES / CARGOS (con color de convención) ----
INSERT INTO rol (nombre, area_id, color) VALUES
  ('ADMINISTRADOR',          (SELECT id FROM area WHERE nombre='ADMINISTRACIÓN'), '#1f4e79'),
  ('ASISTENTE ADMON',        (SELECT id FROM area WHERE nombre='ADMINISTRACIÓN'), '#2e75b6'),
  ('ASISTENTE ADMON SUPER',  (SELECT id FROM area WHERE nombre='ADMINISTRACIÓN'), '#9dc3e6'),
  ('AUX. PRODUCCIÓN CAPITÁN',(SELECT id FROM area WHERE nombre='COCINA'),         '#14562D'),
  ('AUX. PRODUCCIÓN',        (SELECT id FROM area WHERE nombre='COCINA'),         '#1E6B3A'),
  ('HOTS',                   (SELECT id FROM area WHERE nombre='COCINA'),         '#2E8B57'),
  ('ASESOR DE SERVICIO',     (SELECT id FROM area WHERE nombre='SALÓN'),          '#1F3C88'),
  ('AUX. BARRA',             (SELECT id FROM area WHERE nombre='SALÓN'),          '#5BC2E7'),
  ('HOST',                   (SELECT id FROM area WHERE nombre='SALÓN'),          '#a9d08e'),
  ('DOMICILIARIO',           (SELECT id FROM area WHERE nombre='DOMICILIOS'),     '#7030a0');

-- ---- TIPOS DE JORNADA ----
-- TC: 7 h EXACTAS/día (42 h/sem).  PAR: 36-38 h/sem (~6 h x6).
-- SUP/FDS/TER: configurables.
INSERT INTO jornada_tipo
  (codigo, nombre, horas_dia_exactas, horas_dia_min, horas_dia_max, horas_sem_min, horas_sem_max, dias_trabajo, descripcion) VALUES
  ('TC',  'Tiempo Completo', 7,    NULL, NULL, 42, 42,   6, 'Siete horas exactas por día, seis días.'),
  ('PAR', 'Parcial',         NULL, 5,    7,    36, 38,   6, 'Por horas: 36 a 38 h/semana, ~6 h por 6 días.'),
  ('SUP', 'Supervisor',      NULL, 6,    9,    42, 51.5, 6, 'Jornada flexible de supervisión, tope 51.5 h/sem.'),
  ('FDS', 'Fin de Semana',   NULL, 5,    9,    NULL, NULL, 2, 'Trabaja solo fines de semana.'),
  ('TER', 'Tercerizado',     NULL, NULL, NULL, NULL, NULL, 6, 'Personal externo (p.ej. domicilios).');

-- ---- HORARIO DE LA SEDE Alpes (apertura/cierre variable por día) ----
-- Lun-Jue cierra 22:00, Vie-Sab 23:00, Dom 21:00. Apertura al público 10:00.
INSERT INTO sede_horario (sede_id, dia_semana, apertura, cierre) VALUES
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 0, '10:00', '22:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 1, '10:00', '22:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 2, '10:00', '22:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 3, '10:00', '22:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 4, '10:00', '23:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 5, '10:00', '23:00'),
  ((SELECT id FROM sede WHERE nombre='WINGZ Alpes'), 6, '10:00', '21:00');

-- ---- USUARIOS / COLABORADORES (muestra real de Alpes) ----
INSERT INTO usuario (nombre, sede_id, rol_id, jornada_tipo_id) VALUES
  ('ROBINSON ARANGO LOAIZA',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='ADMINISTRADOR'),
     (SELECT id FROM jornada_tipo WHERE codigo='TC')),
  ('ANGELA VICTORIA HIDALGO',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='ASISTENTE ADMON'),
     (SELECT id FROM jornada_tipo WHERE codigo='TC')),
  ('KEVIN ANDREY BUENO GALEANO',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. PRODUCCIÓN CAPITÁN'),
     (SELECT id FROM jornada_tipo WHERE codigo='TC')),
  ('LUZ MARINA YARCE RAIGOSA',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. PRODUCCIÓN'),
     (SELECT id FROM jornada_tipo WHERE codigo='TC')),
  ('LUISA LOAIZA',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. PRODUCCIÓN'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR')),
  ('EDUARDO CARLOS MALDONADO DOMINGUEZ',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. PRODUCCIÓN'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR')),
  ('LUIS MIGUEL BETANCOURT',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. PRODUCCIÓN'),
     (SELECT id FROM jornada_tipo WHERE codigo='SUP')),
  ('JULIAN OCAMPO',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='AUX. BARRA'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR')),
  ('ANNIUSKA KAROLINA PEROZO VIVAS',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='ASESOR DE SERVICIO'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR')),
  ('ESTEBAN ROMAN',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='ASESOR DE SERVICIO'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR')),
  ('LICED DAYANA RODRIGUEZ ABALO',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='ASESOR DE SERVICIO'),
     (SELECT id FROM jornada_tipo WHERE codigo='FDS')),
  ('JUAN PABLO BAÑOL',
     (SELECT id FROM sede WHERE nombre='WINGZ Alpes'),
     (SELECT id FROM rol  WHERE nombre='DOMICILIARIO'),
     (SELECT id FROM jornada_tipo WHERE codigo='PAR'));
