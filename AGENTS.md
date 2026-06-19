# Agentes — Rodieja Contable

Coordinación multi-agente del repo. Reglas Cursor: `linear-gate-obligatorio.mdc` + `linear-plan-html-obligatorio.mdc` + `linear-checklist-secuencial.mdc` + `linear-multiagente.mdc`. Pipeline completo: `_linear/README.md`.

## Inicio obligatorio (toda tarea de producto)

**Antes de editar código**, desde `_linear/`:

```bash
cd _linear
node scripts/sprint-next.mjs
```

- Si hay issue desbloqueado → trabajar **solo** ese ticket (checklist secuencial — ver sección siguiente).
- Si no hay `sprint_<activo>.mjs` o `next` vacío → **no codear**: Fase 0–2 (limpieza → plan HTML Linear completo → `validate-plan-html.mjs` → aprobación → `create`).
- Si el issue está **bloqueado** (`blocks`) → esperar; otro agente/epic upstream debe cerrar primero.

Bypass Linear **solo** si el humano lo pide explícito en el mensaje (*sin linear*, *bypass linear*, *solo local*).

### Por qué Linear en multi-agente

| Sin Linear | Con Linear |
|------------|------------|
| Varios chats pisan el mismo archivo | Un issue activo por cadena; `blocks` fuerza orden |
| FE arranca antes del `.http` | GATE_HTTP en checklist + handoff |
| No hay testigo de quién terminó qué | `Done` + handoff desbloquea downstream |
| Commits sin trazabilidad | Issue ROD-N ↔ checklist ↔ estado |

## Checklist secuencial — obligatorio (un ítem a la vez)

Fuente: `linear-checklist-secuencial.mdc` + `linear-lib.mjs` (el script **rechaza** batch).

**Regla de oro:** leer → hacer **uno** → marcar → repetir. **Nunca** implementar varios ítems y marcar al final.

### Ciclo por cada ítem del checklist

```
1. LEER   → show ROD-N  o  linear-update-state.mjs ROD-N --checklist-status
            (identificar el ÚNICO ítem pendiente: el primero sin [x])

2. HACER  → implementar y probar SOLO ese ítem (un archivo/paso del issue)

3. MARCAR → checklist ROD-N <n>     donde <n> = ese ítem y solo ese número

4. REPETIR desde paso 1 hasta checklist 100 %
```

Solo entonces: `state ROD-N Testing` → pruebas locales del rol → `handoff` (si aplica) → `state ROD-N Done`.

### Comandos del ciclo

```bash
node scripts/sprint_<nombre>.mjs show ROD-N
node scripts/linear-update-state.mjs ROD-N --checklist-status
node scripts/sprint_<nombre>.mjs checklist ROD-N 1    # solo si 1 es el pendiente
node scripts/sprint_<nombre>.mjs checklist ROD-N 2    # solo después de que 1 esté [x]
```

### Prohibido (exit 1 en `linear-lib.mjs`)

| Acción | Por qué |
|--------|---------|
| `checklist ROD-N 1,2,3` | Batch — rechazado |
| `checklist ROD-N all` o `Done --check-all` | Batch — rechazado |
| Marcar ítem 5 si el pendiente es 3 | Fuera de orden — rechazado |
| Codear ítems 1–4 y marcar checklist al cerrar el issue | Progreso no registrado paso a paso |
| `state Done` con checklist incompleto | Bloqueado |

### Gate externo (ítem 1 con ⏸)

Si el ítem 1 dice «NO iniciar hasta…» o «GATE_HTTP»:

1. `show` / `--checklist-status` en **ese** ticket.
2. Si ítem 1 sigue `[ ]` → **no implementar** ítem 2+ (aunque `blocks` ya liberó).
3. Cuando upstream hace `handoff ROD-N 1`, verificar `[x]` y recién entonces continuar.

## Plan HTML — contrato Linear (Fase 2)

Todo `plan_sprint_<nombre>.html` es **casi un ticket de Linear**: no es solo el dominio del producto.

1. Copiar `_linear/plans/_plantilla_rodieja.html` (tiene esqueleto de secciones `Linear — …`).
2. Rellenar las 12 secciones listadas en `linear-plan-html-obligatorio.mdc`.
3. Validar antes de pedir aprobación o hacer `create`:

```bash
cd _linear
node scripts/validate-plan-html.mjs plans/plan_sprint_<nombre>.html
```

4. Humano responde **✅ APROBADO** en chat.
5. `node scripts/sprint_<nombre>.mjs create`

Gates N/A (sin BD) deben figurar explícitos; si hay `role:database`, incluir `drop_db` → `setup_db` → `load_mocks` en Testing.

## Roles

### Orquestador (`role:orchestrator`)

- Ejecuta Fases 0–4 y 6: limpieza, plan HTML (desde `_plantilla_rodieja.html`), validación, `sprint_<nombre>.mjs create`, cierre con `resumen_sprint_*.html`.
- Bucle: `next` → asignar/reclamar issue → verificar Done + handoffs → `status`.
- No implementa código de producto salvo fixes mínimos del script `_linear/`.
- Usa `get_sprint_health` / `watchdog_check` si MCP Linear está activo.

### Database (`role:database`)

- Archivos en `0.BaseDeDatos/` — BD única `sistema_vehicular`.
- **Un solo agente** corre `drop_db` → `setup_db` → `load_mocks` por sprint.
- Mismo ciclo checklist: un ítem SQL/pipeline por vez → marcar → siguiente.
- Handoff a backend: marcar ítem 1 del issue GATE_BD/JOOQ downstream.

### Backend (`role:backend`)

- Código en `1.Backend/RodiejaContable/`.
- Orden por issue: IREPO → REPO → ISVC → SVC → ICTRL → CTRL → `.http` (un paso = un ítem checklist).
- jOOQ se regenera en `mvn compile` / `spring-boot:run`.
- GATE_HTTP obligatorio antes de que frontend empiece.
- Handoff: `handoff` al primer issue FE del epic cuando `.http` pasa 2xx.

### Frontend (`role:frontend`)

- Código en `2.Frontend/RodiejaContable/` — `api/`, `hooks/`, `pages/`.
- No iniciar si ítem 1 del issue dice «⏸ GATE_HTTP» sin `[x]`.
- Verificar `npm run build` en Testing antes de Done.

## Ciclo por issue (todos los roles)

```
next → claim_issue → get_issue_context
→ LEER checklist (--checklist-status)
→ Doing: [HACER un ítem] → [MARCAR checklist ROD-N <n>] → repetir
→ Testing: pruebas locales según rol
→ handoff (si aplica) → state Done
```

## Paralelismo

| Escenario | Agentes |
|-----------|---------|
| Epic BE serial + Epic FE espera | 1 activo en BE; FE bloqueado hasta handoff |
| 2 epics sin choque de archivos | 2 chats Agent en paralelo |
| `drop_db` o mismo `.jsx` | 1 agente; el otro espera checklist cross-epic |

## Comandos locales (ver `comandosDelProyecto.txt`)

| Rol | Testing local |
|-----|----------------|
| Database | `python 0.BaseDeDatos/drop_db.py` → `setup_db.py` → `load_mocks.py` |
| Backend | `cd 1.Backend/RodiejaContable; mvn clean compile -DskipTests; mvn spring-boot:run` |
| Frontend | `cd 2.Frontend/RodiejaContable; npm start` / `npm run build` |
| Login dev | `admin@rodieja.com` / `Admin123!` — http://localhost:3000 · API :8080 |

Docker MariaDB compartido: contenedor `SistemaPrincipal`, puerto `3306`, `root`/`123456`, BD `sistema_vehicular`.

## Comandos Linear (desde `_linear/`)

```bash
node scripts/sprint_<nombre>.mjs next
node scripts/sprint_<nombre>.mjs show ROD-N
node scripts/linear-update-state.mjs ROD-N --checklist-status
node scripts/sprint_<nombre>.mjs checklist ROD-N <n>   # un solo <n>, el pendiente
node scripts/sprint_<nombre>.mjs handoff ROD-M 1
node scripts/sprint_<nombre>.mjs state ROD-N Testing
node scripts/sprint_<nombre>.mjs state ROD-N Done
```

MCP (si está configurado en Cursor): `claim_issue`, `ping_issue`, `get_issue_context`, `submit_for_review`, `fail_issue`.

## Prohibido

- Plan HTML sin secciones Linear (`validate-plan-html.mjs` falla).
- `sprint_*.mjs create` sin ✅ APROBADO y sin validación exitosa.
- Trabajar sin issue reclamado o sin `next` claro.
- Paralelizar issues de la misma cadena `blocks`.
- Cerrar trabajo sin Linear (`state Done` + checklist completo).
- **Batch de checklist** (`1,2,3`, `all`, `--check-all`) — `linear-lib.mjs` exit 1.
- **Varios ítems de código** sin marcar cada uno en Linear antes del siguiente.
- Marcar checklist sin haber leído `--checklist-status` (riesgo de marcar el ítem equivocado).
