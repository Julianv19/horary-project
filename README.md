# Horary Project 🍗🕙

Sistema **MVC** para administrar los **horarios y el aforo de personal** de un restaurante.
Construido con **Node.js + Express + EJS + SQLite**.

Basado en el análisis del sistema real de horarios de WINGZ (sede Alpes, Manizales) y Frisby (F46).
Ver [`docs/CARACTERIZACION.md`](docs/CARACTERIZACION.md).

## Decisiones de diseño (acordadas)

- **Horario del local:** variable por sede y por día (configurable), no fijo.
- **Jornadas:** tipos reales y configurables (tiempo completo, parcial, supervisor, fin de semana, tercerizado).
  - Tiempo completo: 7 h **exactas** por día (42 h/sem).
  - Parcial: 36–38 h/sem (~6 h × 6 días, 1 descanso).
- **Aforo automático:** por **cobertura** — el administrador define cuántas personas por rol/área
  se necesitan en cada franja, y el motor arma los turnos cubriendo esa necesidad, respetando
  descansos y topes de horas.
- **Multi-sede** desde el diseño.

## Requerimientos funcionales

1. Generar aforo de horarios automático según la regla de negocio.
2. Pedir y respetar solicitudes de descanso por usuario.
3. Modificar la programación ante incapacidades.
4. Calcular horas por usuario por día y por semana.
5. Seguir patrones asignados por el administrador.
6. Discriminar horarios por rol, agrupando por rol/área y cubriendo la necesidad del restaurante.

## Requisitos

- Node.js **>= 22.5** (usa el módulo nativo `node:sqlite`, sin dependencias nativas).

## Puesta en marcha

```bash
npm install          # instala express, ejs, dotenv
cp .env.example .env # crea tu configuración local
npm run db:init      # crea la base de datos SQLite y carga datos de ejemplo
npm run dev          # arranca en http://localhost:3000 (recarga en caliente)
```

## Estructura (MVC)

```
src/
  app.js            Arranque de Express y middlewares
  config/           Carga de .env (env.js) y conexión SQLite (db.js)
  models/           Acceso a datos por entidad
  controllers/      Orquestación petición → modelo/servicio → vista
  services/         Reglas de negocio (aforo, horas, descansos)
  routes/           Definición de rutas
  views/            Plantillas EJS
  public/           CSS/JS estáticos
db/
  schema.sql        Esquema de la base de datos
  seed.sql          Datos de ejemplo (sede Alpes, áreas, roles, jornadas, usuarios)
  init.js           Script que crea la BD a partir de schema.sql + seed.sql
docs/
  CARACTERIZACION.md
```

## Flujo de trabajo

- Git: **cada cambio es un commit** documentado.
- Variables de entorno en `.env` (ignorado por git); plantilla en `.env.example`.
