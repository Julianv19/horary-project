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
npm install                 # instala express, express-session, ejs, dotenv
cp .env.example .env         # crea tu configuración local (ajusta SESSION_SECRET)
npm run db:init              # crea la base de datos SQLite y carga datos de ejemplo
node db/migrate_patrones.js      # patrones de ejemplo (y columna patron_id)
node db/migrate_auth.js          # crea accesos: admin + una cuenta por colaborador
node db/migrate_restricciones.js # restricciones individuales + "en inducción"
node db/migrate_sugerencias.js   # tabla de sugerencias y solicitudes
node db/migrate_restricciones2.js # restricciones múltiples (vacaciones, días/franjas)
node db/migrate_demanda.js       # demanda operativa (refuerzo por franja/rol)
node db/migrate_contingencias.js # contingencias, historial y snapshot original
node db/migrate_inducciones.js   # inducciones (colaborador nuevo + mentor)
node db/migrate_colores.js       # colores corporativos por rol
node db/seed_cobertura.js        # (opcional) cobertura de ejemplo para probar el aforo
npm run dev                      # arranca en http://localhost:3000 (recarga en caliente)
```

## Acceso

- **Administrador**: usuario `admin`, contraseña `admin123` (ve y gestiona todo).
- **Colaborador**: usuario `<nombre>.<id>` (p. ej. `robinson.1`), contraseña `clave123`;
  solo ve **su propio horario** cuando la semana está **publicada**.

> Cambia estas contraseñas de ejemplo antes de cualquier uso real, y pon un
> `SESSION_SECRET` aleatorio en `.env`.

## Motor de aforo (por cobertura)

1. **Cobertura** (`/cobertura`): define cuántas personas necesita cada rol por hora y día.
2. **Aforo** (`/aforo`): elige sede y semana y pulsa *Generar*. El motor:
   - calcula horas/día y días de trabajo de cada colaborador según su jornada,
   - asigna 1 descanso semanal (repartido) y respeta a los de fin de semana,
   - coloca un bloque contiguo por día que cubra la mayor demanda de su rol.
3. **Horario** (`/aforo/ver`): muestra las horas por colaborador (con validación de
   jornada) y la cobertura por hora (verde = cubierto, rojo = hueco, ámbar = sobrecupo).

> Heurística voraz: bloques contiguos para quien no tiene patrón, no óptima pero auditable.

## Patrones del administrador

En **Patrones** (`/patrones`) el administrador define plantillas con turnos por día
(varios bloques el mismo día = **turno partido**, p. ej. `12:00-16:00 / 18:00-22:00`).
Se asignan a un colaborador desde su ficha (**Colaboradores**); si un colaborador tiene
patrón, el motor sigue ese patrón en vez de la colocación automática.

> Si actualizas desde una base anterior, ejecuta una vez `node db/migrate_patrones.js`
> para añadir la columna `usuario.patron_id` y cargar patrones de ejemplo.

## Publicar un horario

En el horario (`/aforo/ver`) el administrador puede **Publicar** la semana: queda
visible para los colaboradores en **Mi horario** y se **bloquea** para regenerar
(hay que volverla a borrador para rehacerla).

## Seguridad y pruebas

- **CSRF**: token de sincronización en todos los formularios que modifican datos.
- **Cabeceras**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- **Cookie de sesión**: `httpOnly`, `sameSite=lax` y `secure` en producción.
- **Tests** (runner nativo de Node, sin dependencias):

```bash
npm test
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
