# Agentes — Rodieja Contable (Antigravity IDE Customizations)

Coordinación multi-agente del repositorio mediante Linear. Este documento centraliza todas las reglas previamente repartidas (linear-gate-obligatorio, linear-checklist-secuencial, linear-multiagente) y asegura que Antigravity IDE respete estrictamente el flujo.

## 1. Inicio Obligatorio (Gate Linear)
**NUNCA** debes modificar o crear código de producto (Frontend, Backend o Base de datos) sin antes validar tu ticket activo.
Desde `_linear/`:
```bash
cd _linear
node scripts/sprint-next.mjs # o node scripts/sprint_<nombre>.mjs next
```

- **Si hay un issue desbloqueado (ROD-N):** Trabaja **solo** en ese ticket.
- **Si no hay tickets o `next` está vacío:** NO ESCRIBAS CÓDIGO. (Fase 0-2: limpieza, crear `plan_sprint_<nombre>.html`, validarlo con `validate-plan-html.mjs`, esperar aprobación explícita y ejecutar `create`).
- **Si el issue está bloqueado:** DETENTE. Espera a que el upstream o el epic cierre primero.

**Excepción:** Solo puedes saltar Linear si el usuario dice explícitamente "sin linear", "bypass linear" o "solo local".

## 2. Checklist Secuencial (Obligatorio)
Debes completar las tareas **ESTRICTAMENTE DE UNA EN UNA**. Está prohibido implementar en batch o marcar varios checks a la vez.

El ciclo por cada ítem es:
1. **LEER:** `node scripts/linear-update-state.mjs ROD-N --checklist-status` (Identifica el ÚNICO ítem sin marcar `[ ]`).
2. **HACER:** Implementar y probar SOLO lo que pide ese ítem (un solo paso o archivo).
3. **MARCAR:** `node scripts/sprint_<nombre>.mjs checklist ROD-N <n>` (Donde `<n>` es exclusivamente el número de ese ítem).
4. **REPETIR:** Hasta que el issue esté al 100%.

Prohibiciones:
- No uses `checklist ROD-N 1,2,3` ni `--check-all`.
- No marques el ítem 5 si el pendiente era el 3.
- No dejes la marcación del checklist para el final.

## 3. Orquestación y Jerarquía Arquitectónica (BD -> BE -> FE)
El trabajo se divide en roles, y el desarrollo de producto siempre viaja de Base de Datos al Frontend. 

### `role:database`
- **Ámbito:** `0.BaseDeDatos/` (BD `sistema_vehicular`).
- **Ciclo:** Ejecutar el flujo de python completo tras cambios: `python 0.BaseDeDatos/drop_db.py` -> `setup_db.py` -> `load_mocks.py`.
- **Handoff:** Marcar ítem de `GATE_BD/JOOQ` en Linear para destrabar al backend.

### `role:backend`
- **Ámbito:** `1.Backend/RodiejaContable/`.
- **Orden de implementación en código:** IREPO -> REPO -> ISVC -> SVC -> ICTRL -> CTRL -> `.http`.
- **JOOQ Obligatorio:** Todo cambio de BD requiere regenerar JOOQ: `mvn clean compile -DskipTests`.
- **Handoff HTTP:** Tienes que asegurar que los endpoints pasen un `2xx` comprobado con archivos `.http` locales antes de poder hacer `handoff` al Frontend (marcar ítem de `GATE_HTTP`).
- **Pruebas:** `mvn spring-boot:run`.

### `role:frontend`
- **Ámbito:** `2.Frontend/RodiejaContable/`.
- **Limitación:** NO PUEDES INICIAR si el ítem `GATE_HTTP` del issue no está completado en Linear.
- **Pruebas:** `npm start` y verificar con `npm run build` antes de pasar el ticket a `Done`.

## 4. Handoff y Cierre
- Al terminar tu issue y probar: `node scripts/sprint_<nombre>.mjs state ROD-N Testing`
- Efectúa pruebas según tu rol.
- Si aplica, haz handoff: `node scripts/sprint_<nombre>.mjs handoff ROD-M 1` (desbloquea upstream/downstream).
- Finaliza con: `node scripts/sprint_<nombre>.mjs state ROD-N Done`

## 5. Fallos del API Linear
Si el comando de Linear arroja error (ej: falta API KEY), DETENTE. No asumas ni continues trabajando de manera "invisible". Avisa al usuario del fallo técnico en `_linear`.
