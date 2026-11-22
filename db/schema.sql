-- =====================================================================
--  Esquema de base de datos  —  Horary Project
--  Motor: SQLite (node:sqlite)
--  Convención: nombres de tabla en singular, snake_case.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
--  SEDE  (multi-sede desde el diseño)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sede (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT    NOT NULL,
  ciudad    TEXT,
  activo    INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
--  ÁREA  (grupo por el que se totaliza el aforo)
--  Ej: ADMINISTRACIÓN, COCINA, SALÓN, DOMICILIOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS area (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT    NOT NULL UNIQUE,
  orden     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
--  ROL / CARGO  (pertenece a un área, con color de convención)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT    NOT NULL,
  area_id   INTEGER NOT NULL REFERENCES area(id) ON DELETE RESTRICT,
  color     TEXT    DEFAULT '#cccccc',
  UNIQUE(nombre, area_id)
);

-- ---------------------------------------------------------------------
--  TIPO DE JORNADA  (contrato: reglas de horas configurables)
--  horas_dia_exactas: si > 0, el tipo exige exactamente ese nº de horas/día
--                     (ej. Tiempo Completo = 7). NULL/0 = flexible por rango.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jornada_tipo (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo            TEXT    NOT NULL UNIQUE,   -- TC, PAR, SUP, FDS, TER
  nombre            TEXT    NOT NULL,
  horas_dia_exactas REAL,                      -- p.ej. 7 para TC; NULL si flexible
  horas_dia_min     REAL,
  horas_dia_max     REAL,
  horas_sem_min     REAL,
  horas_sem_max     REAL,
  dias_trabajo      INTEGER DEFAULT 6,          -- días laborables por semana
  descripcion       TEXT
);

-- ---------------------------------------------------------------------
--  USUARIO / COLABORADOR
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre           TEXT    NOT NULL,
  email            TEXT,
  sede_id          INTEGER NOT NULL REFERENCES sede(id)         ON DELETE RESTRICT,
  rol_id           INTEGER NOT NULL REFERENCES rol(id)          ON DELETE RESTRICT,
  jornada_tipo_id  INTEGER NOT NULL REFERENCES jornada_tipo(id) ON DELETE RESTRICT,
  patron_id        INTEGER REFERENCES patron(id)                ON DELETE SET NULL,
  activo           INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
--  HORARIO DE LA SEDE  (apertura/cierre variable por día de la semana)
--  dia_semana: 0=Lunes ... 6=Domingo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sede_horario (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sede_id    INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  apertura   TEXT    NOT NULL,   -- 'HH:MM'
  cierre     TEXT    NOT NULL,   -- 'HH:MM'
  UNIQUE(sede_id, dia_semana)
);

-- ---------------------------------------------------------------------
--  COBERTURA REQUERIDA  (base del aforo por cobertura)
--  Personas necesarias por sede + rol + día + hora.
--  hora: entero 0..23 (bloque horario que inicia a esa hora)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cobertura_requerida (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sede_id     INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
  rol_id      INTEGER NOT NULL REFERENCES rol(id)  ON DELETE CASCADE,
  dia_semana  INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora        INTEGER NOT NULL CHECK (hora BETWEEN 0 AND 23),
  personas    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(sede_id, rol_id, dia_semana, hora)
);

-- ---------------------------------------------------------------------
--  PATRÓN  (plantilla de turnos que asigna el administrador)
--  rutina orientativa: TODO_DIA | DIA | NOCHE | DIA_NOCHE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patron (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  rutina      TEXT,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS patron_turno (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patron_id    INTEGER NOT NULL REFERENCES patron(id) ON DELETE CASCADE,
  dia_semana   INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio  TEXT    NOT NULL,   -- 'HH:MM'
  hora_fin     TEXT    NOT NULL,   -- 'HH:MM'
  orden        INTEGER NOT NULL DEFAULT 0   -- para turnos partidos (0,1,...)
);

-- ---------------------------------------------------------------------
--  PROGRAMACIÓN  (una semana de horarios para una sede)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programacion (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sede_id       INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
  semana_inicio TEXT    NOT NULL,   -- 'YYYY-MM-DD' (lunes de la semana)
  estado        TEXT    NOT NULL DEFAULT 'BORRADOR', -- BORRADOR | PUBLICADA
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sede_id, semana_inicio)
);

-- ---------------------------------------------------------------------
--  TURNO  (un bloque de trabajo de un usuario en una fecha)
--  Los turnos partidos se guardan como varias filas (orden 0,1,...).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turno (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  programacion_id  INTEGER NOT NULL REFERENCES programacion(id) ON DELETE CASCADE,
  usuario_id       INTEGER NOT NULL REFERENCES usuario(id)      ON DELETE CASCADE,
  fecha            TEXT    NOT NULL,   -- 'YYYY-MM-DD'
  hora_inicio      TEXT    NOT NULL,   -- 'HH:MM'
  hora_fin         TEXT    NOT NULL,   -- 'HH:MM'
  orden            INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
--  AUSENCIA  (descanso, licencia, incapacidad, vacaciones)
--  tipo: DESCANSO | LICENCIA | INCAPACIDAD | VACACIONES | PERMISO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ausencia (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo          TEXT    NOT NULL,
  fecha_inicio  TEXT    NOT NULL,   -- 'YYYY-MM-DD'
  fecha_fin     TEXT    NOT NULL,   -- 'YYYY-MM-DD'
  motivo        TEXT
);

-- ---------------------------------------------------------------------
--  SOLICITUD DE DESCANSO  (la pide el colaborador; la aprueba el admin)
--  estado: PENDIENTE | APROBADA | RECHAZADA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS descanso_solicitud (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  fecha        TEXT    NOT NULL,   -- 'YYYY-MM-DD' día solicitado
  estado       TEXT    NOT NULL DEFAULT 'PENDIENTE',
  motivo       TEXT,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_turno_usuario  ON turno(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turno_prog     ON turno(programacion_id);
CREATE INDEX IF NOT EXISTS idx_usuario_sede   ON usuario(sede_id);
CREATE INDEX IF NOT EXISTS idx_cobertura_sede ON cobertura_requerida(sede_id, dia_semana);
