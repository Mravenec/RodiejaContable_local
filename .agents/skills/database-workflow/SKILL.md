---
name: database-workflow
description: >-
  Strictly enforces the backend and database integration sequence: python DB scripts -> JOOQ -> HTTP tests.
  Use when changes affect the database schema, models, or core API endpoints.
---

# Database & Backend Execution Workflow (BD -> BE -> FE)

Esta skill garantiza que Antigravity IDE respeta el orden estricto de desarrollo para evitar inconsistencias de datos o código que no compila, honrando la regla "Base de Datos es la fuente de la verdad".

## Cuándo usar
- Cada vez que un ticket de Linear incluya un `role:database` o requiera modificaciones en `0.BaseDeDatos/`.
- Cada vez que se vayan a construir controladores (CTRL) o repositorios (REPO) en el Backend.

## Regla de Oro: Orden Estricto de Ejecución

Está terminantemente prohibido implementar la capa de Frontend antes de que los Gate de BD y Backend estén validados (`[x]`). El orden es **único e inmutable**:

### Fase 1: Database (`0.BaseDeDatos`)
Si hay cambios estructurales (tablas, columnas, mocks nuevos):
1. El agente (rol `database`) debe modificar los scripts correspondientes (`setup_db.py`, `load_mocks.py`).
2. Debe ejecutar el pipeline completo de limpieza y llenado:
   ```bash
   python 0.BaseDeDatos/drop_db.py
   python 0.BaseDeDatos/setup_db.py
   python 0.BaseDeDatos/load_mocks.py
   ```
3. Si el script ejecuta correctamente, se marca el ítem del checklist de `GATE_BD` o `JOOQ` en el issue de Linear y se hace `handoff` a la siguiente etapa.

### Fase 2: Backend (JOOQ & POJOS)
Una vez la BD esté recreada con la nueva estructura:
1. El agente (rol `backend`) debe reconstruir los modelos y POJOs de JOOQ **inmediatamente**:
   ```bash
   cd 1.Backend/RodiejaContable
   mvn clean compile -DskipTests
   ```
2. **Prohibido:** Modificar a mano archivos autogenerados bajo la carpeta `com.rodiejacontable.database.jooq.*`. Todo cambio debe provenir de `setup_db.py` y el comando `mvn compile`.

### Fase 3: Pruebas del API (`GATE_HTTP`)
1. Tras implementar los servicios y el controlador, se DEBE verificar el correcto funcionamiento ejecutando Spring Boot:
   ```bash
   cd 1.Backend/RodiejaContable
   mvn spring-boot:run
   ```
2. Realiza peticiones reales contra el endpoint nuevo usando archivos `.http` locales o herramientas similares por terminal.
3. El endpoint debe retornar exitosamente (`2xx`).
4. **Handoff:** Solo tras pasar estas pruebas se puede marcar `[x] GATE_HTTP` en el checklist de Linear para desbloquear al frontend.
