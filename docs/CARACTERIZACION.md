# Caracterización del sistema de horarios — WINGZ / Frisby

> Documento de hallazgos del análisis de los dos Excel vigentes. Base para el diseño
> del software MVC (Node.js + Express + EJS + SQLite).
> Fecha de análisis: 2026-11-21.

## 1. Archivos analizados

| Archivo | Marca / Sede | Qué es |
|---------|--------------|--------|
| `HORARIOS F46 OCTUBRE 17 oct.xlsx` | Frisby Cable Plaza (F46) | Versión antigua/sencilla. Una hoja por semana, horarios escritos a mano estilo `8-1520`, `12-14 17-21`. Incluye tareas rotativas (PISO, BODEGA, TRAMPA GRASA, SUSTANCIAS). |
| `ALPES ... 16 AL 22 NOVIEMBRE 2026.xlsx` | WINGZ Wings-N-Beer, sede Alpes (Manizales) | **Sistema real y completo vigente.** Múltiples hojas: PREMISAS, AFORO (día a día), HORAS, AFORO W01 (demanda/ventas), DOMINICALES, FORMATO AFORO SEMANAL, etc. |

El objetivo del software es tomar **las premisas y funciones reales** del archivo ALPES y
reconstruirlas como aplicación, no replicar el Excel.

## 2. Hojas clave del archivo ALPES

- **PREMISAS**: reglas de operación. Horarios de atención por canal (mesa/llevar, domicilios,
  domicilios tercerizados), convenciones de color por cargo, y la regla dura:
  *"cada colaborador debe generar menos de 103 horas quincenales o 51.5 horas semanales,
  incluidas las horas de descanso"*. Rotación de aperturas/cierres en Administración.
- **AFORO**: una **cuadrícula por día** (columnas = horas 8→24), donde cada colaborador tiene
  marcas de `1` (hora completa) o `0.5` (media hora) en las horas que trabaja. Al final de cada
  fila, `T.H` = total horas del día. Se agrupan filas por **área** con subtotales:
  TOTAL ADMINISTRACIÓN, TOTAL COCINA, TOTAL SALÓN, TOTAL DOMICILIOS, y una fila final
  **"No. Personas x hora"** = el aforo real por franja.
- **HORAS**: por colaborador, horas por día (Lun→Dom), `HORAS SEMANA`, `DESCANSO` (horas de
  descanso pagas, factor ~0.1667), `HORAS PAGAS`, `# PERS X CARGO`, y tope `MAX 94 H/Q`.
- **AFORO W01**: **demanda**. Ventas y transacciones estimadas por hora y por día, con tablas que
  convierten *transacciones/ventas por hora* → *número de personas necesarias* por área
  (ej. cocina: 0–2 → 1 persona, 2.1–6 → 2, 6.1–10 → 3, …). Es el motor que justifica el aforo.
- **DOMINICALES**: control de **descansos dominicales** por colaborador y por mes (rotación de
  domingos de descanso — requisito laboral).
- **FORMATO AFORO SEMANAL**: plantilla de proyección con turnos escritos como rangos
  (`15-23`, `12-16/19-23` = turno partido, `D` = descanso) y una columna `RUTINA`
  (TODO EL DÍA / DÍA / NOCHE / DÍA-NOCHE) = el **patrón** asignado.

## 3. Modelo de dominio detectado

### Jerarquía
- **Sede / Restaurante** (Alpes, Molinos, Cable Plaza…). El sistema es multi-sede.
- **Área** (grupo por el que se totaliza el aforo): `ADMINISTRACIÓN`, `COCINA`, `SALÓN`, `DOMICILIOS`.
- **Rol / Cargo** (con color): `ADMINISTRADOR`, `ASISTENTE ADMON`, `ASISTENTE ADMON SUPER`,
  `AUX. PRODUCCIÓN` (y `CAPITÁN`), `HOTS`, `AUX. BARRA`, `ASESOR DE SERVICIO`, `HOST`, `DOMICILIARIO`.
- **Colaborador (Usuario)**: nombre, rol, área, sede, jornada.

### Jornada (tipo de contrato) — observadas en los datos
| Código | Significado probable |
|--------|----------------------|
| `TC` | Tiempo completo |
| `JV` | Jornada variable / medio tiempo (por horas) |
| `SUPER` | Supervisor (jornada especial) |
| `JV FDS` | Solo fines de semana |
| `TERCERIZADO` | Externo (domicilios) |

### Turnos
- Franja horaria por día dividida en bloques de 1 hora (y medias horas con `0.5`).
- **Turno partido** soportado (`12-16/18-22`).
- Marca por hora: trabaja (1), media (0.5), o vacío.

### Estados especiales por día (no cuentan como trabajo)
`DESCANSO` / `D`, `LICENCIA`, `INCAPACIDAD` (`INCA`), `VACACIONES`, `w-06` / `F06` (apoyo a otra
sede), `RENUNCIA`, `NO VINO`.

### Cálculo de horas
- Horas/día = suma de marcas de la fila.
- Horas/semana = suma Lun→Dom.
- Horas pagas = horas trabajadas + horas de descanso pagas (factor ~0.1667 → ~1/6).
- **Topes**: ≤ 51.5 h/semana o ≤ 103 h/quincena (incluyendo descanso). (También aparece `MAX 94 H/Q`.)

### Aforo
- `No. Personas x hora` por área y franja debe **cubrir la demanda**.
- La demanda sale de ventas/transacciones por hora (hoja AFORO W01) → tabla ventas→personas.

### Tareas rotativas (archivo Frisby, probablemente aplica a ALPES)
`PISO`, `ARRIBA/BODEGA`, `TRAMPA GRASA`, `CUARTO FRÍO`, `SUSTANCIAS`, `BIODANZA`, `FUMIGACIÓN` —
asignaciones adicionales por día que rotan entre colaboradores.

## 4. Diferencias entre la regla verbal y el sistema real (a reconciliar)

| Tema | Regla que me diste (verbal) | Lo que hace el Excel real |
|------|------------------------------|---------------------------|
| Horario del local | Fijo 10:00–22:00 todos los días | Variable: Dom cierra 21, Lun–Jue 22, Vie–Sab 23; preparación desde las 8am |
| Tipos de trabajador | Parcial (36–38h, ~6h×6) y Completo (7h exactas ×6 = 42h) | TC, JV, SUPER, JV FDS, TERCERIZADO; horas diarias varían 6–8 |
| Base del aforo | Cubrir la franja con N personas por rol | Demanda por ventas/transacciones por hora |
| Tope de horas | 36–38 / 42 semanales | ≤ 51.5 h/sem o ≤ 103 h/quincena |
| Descanso dominical | (no mencionado) | Rotación de domingos registrada por mes |

## 5. Requerimientos funcionales (del enunciado del usuario)
1. Generar aforo de horarios automático según la regla de negocio.
2. Pedir y respetar solicitudes de descanso por usuario.
3. Modificar la programación ante incapacidades.
4. Calcular horas por usuario por día y por semana.
5. Seguir patrones asignados por el administrador.
6. Discriminar horarios por rol en una sola lista, agrupando por rol/área, cubriendo la
   necesidad del restaurante en la franja horaria.

## 6. Convenciones de trabajo
- Git: cada cambio = un commit documentado. Repo: https://github.com/Julianv19/horary-project.git
- `.env` para variables de entorno + `.gitignore` que lo excluya.
- Este documento se mantiene actualizado con cada hallazgo y decisión.
