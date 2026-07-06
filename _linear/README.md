# _linear — MCP Server (Multi-Agente) — Rodieja Contable

Servidor MCP para Linear.app, bloqueado al equipo **`linear_rodieja`**.

> **Regla universal:** Todo problema, feature, bug o mejora sigue el mismo ciclo: **limpieza** → plan → HTML propuesta → aprobación → `.mjs` → multi-agente (Backlog → Doing → Testing → Done) → HTML resumen. El **proceso es siempre el mismo**; solo cambian issues, archivos y gates (BD, BE, FE o una sola capa).

Documentación de agentes: `AGENTS.md` (raíz). Reglas Cursor: `.cursor/rules/linear-*.mdc`.

---

## Estructura

```
_linear/
├── plans/
│   ├── _plantilla_rodieja.html       ← Plantilla visual (copiar CSS y estructura)
│   ├── plan_sprint_<nombre>.html     ← Fase 2 — propuesta activa (PENDIENTE → APROBADO)
│   └── resumen_sprint_<nombre>.html  ← Fase 6 — cierre del sprint activo
├── scripts/
│   ├── sprint_<nombre>.mjs           ← Orquestación Linear (Fase 4 — tras aprobación)
│   ├── sprint-next.mjs               ← Descubre sprint activo y ejecuta next
│   ├── linear-lib.mjs                ← Checklist + estados compartidos
│   ├── linear-comment.mjs            ← Comentarios Linear
│   ├── linear-update-state.mjs       ← Estados y checklist
│   └── validate-plan-html.mjs        ← Valida contrato Linear del plan HTML
├── src/index.ts                      ← Fuente MCP
├── dist/index.js                     ← Compilado (npm run build)
├── state/agent-claims.json           ← Claims locales (auto-generado)
├── .env.example
└── README.md
```

---

## Instalación

```bash
cd _linear
npm install
npm run build
```

### API key

```bash
cd _linear
copy .env.example .env    # Windows
# Editar .env — Personal API key de Linear + LINEAR_TEAM_NAME=linear_rodieja
```

---

## Configurar MCP en Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "linear-rodieja": {
      "command": "node",
      "args": ["C:/Users/kcamp/CascadeProjects/RodiejaContable/_linear/dist/index.js"],
      "env": {
        "LINEAR_API_KEY": "<tu-api-key>",
        "LINEAR_TEAM_NAME": "linear_rodieja",
        "HEARTBEAT_TTL_MS": "300000"
      }
    }
  }
}
```

Primera vez en Linear: ejecutar herramienta MCP `setup_workflow` para crear labels (`role:database`, `role:backend`, `role:frontend`, `role:orchestrator`).

---

## Las 7 fases (con gates)

| Fase | Qué | Gate |
|------|-----|------|
| **0 — Limpieza** | `cleanup` + borrar artefactos sprint anterior | Sprint anterior cerrado o descarte explícito |
| **1 — Plan** | Análisis, dependencias, roles | Limpieza hecha |
| **2 — HTML propuesta** | `plan_sprint_<nombre>.html` | Desde `_plantilla_rodieja.html` |
| **3 — Aprobación** | Humano revisa | ✅ APROBADO en chat |
| **4 — MJS** | `sprint_<nombre>.mjs create` | Tras aprobación + `validate-plan-html.mjs` OK |
| **5 — Multi-agente** | Doing → Testing → Done | Todos los issues Done |
| **6 — HTML resumen** | `resumen_sprint_<nombre>.html` | Epic Completed |

```
[Limpieza] → [Plan] → [plan_sprint_N.html] → [✅ Aprobado] → [sprint_N.mjs create]
                                                                    ↓
                         database → backend → frontend
                                                                    ↓
                                              [resumen_sprint_N.html]
```

**Un solo sprint activo:** máximo un `plan_sprint_*.html` y un `sprint_*.mjs` en `_linear/`.

---

## Fase 0 — Limpieza

```bash
cd _linear
node scripts/sprint_<anterior>.mjs cleanup
# Borrar local: plans/plan_sprint_<viejo>.html, resumen_sprint_<viejo>.html, scripts/sprint_<viejo>.mjs
```

Conservar siempre: `_plantilla_rodieja.html`, `linear-*.mjs`, `validate-plan-html.mjs`, `sprint-next.mjs`.

---

## Fase 2 — Plan HTML

```bash
copy _linear\plans\_plantilla_rodieja.html _linear\plans\plan_sprint_<nombre>.html
cd _linear
node scripts/validate-plan-html.mjs plans/plan_sprint_<nombre>.html
```

12 secciones Linear + **11 diagnóstico (D1–D11)** + briefing IA + **coherencia semántica**: reglas en `.cursor/rules/` (incl. `linear-plan-coherencia.mdc`) y skill `.cursor/skills/linear-plan-html/SKILL.md`. El HTML debe ser **autocontenido** (problema, brecha código, tabla coherencia-checklist, Mermaid, issues). Checklist: **un ítem a la vez** en Fase 5.

**No ejecutar `create` hasta:** validate exit 0 + **✅ APROBADO** del humano.

---

## Fase 4 — Script `.mjs`

Tras aprobación, crear `_linear/scripts/sprint_<nombre>.mjs` con:

| Comando | Uso |
|---------|-----|
| `create` | Epic + cycle + issues + `blocks` |
| `next` | Próximo issue desbloqueado |
| `status` | Salud del sprint |
| `checklist ROD-N <n>` | **Un solo ítem** — el siguiente pendiente |
| `handoff ROD-M 1` | Señal cross-ticket |
| `state ROD-N Testing` | Pruebas locales |
| `state ROD-N Done` | Cierre (checklist 100 %) |
| `cleanup` | Borra issues del epic |

Issues con prefijo **ROD-N**, labels `role:*`, checklist en descripción.

---

## Fase 5 — Multi-agente

**Antes de codear** (toda IA):

```bash
cd _linear
node scripts/sprint-next.mjs
```

Ciclo por issue:

1. `next` / `claim_issue`
2. Checklist **ítem a ítem** (prohibido batch)
3. `Testing` — pruebas locales del rol
4. `handoff` si aplica
5. `Done`

### Gates de capa

| Gate | Condición |
|------|-----------|
| GATE_SQL/BD | SQL en `0.BaseDeDatos/` mergeado; pipeline OK |
| GATE_JOOQ | `mvn compile` / `spring-boot:run` — POJOs regenerados |
| GATE_HTTP | `.http` con 2xx — **FE no empieza antes** |
| GATE_FE | `api/` + hooks + pages; `npm run build` OK |

### Orden backend (obligatorio)

IREPO → REPO → ISVC → SVC → ICTRL → CTRL → `.http`

### Handoff multi-IA

Upstream marca ítem 1 del ticket downstream; downstream verifica `--checklist-status` antes de implementar.

---

## Fase 5 — Testing local (Rodieja Contable)

Referencia: `comandosDelProyecto.txt` en la raíz del repo.

| Paso | Comando |
|------|---------|
| 1. Drop BD | `python 0.BaseDeDatos/drop_db.py` |
| 2. Schema + mocks | `python 0.BaseDeDatos/setup_db.py; python 0.BaseDeDatos/load_mocks.py` |
| 3. Backend | `cd 1.Backend/RodiejaContable; mvn clean compile -DskipTests; mvn spring-boot:run` |
| 4. Frontend | `cd 2.Frontend/RodiejaContable; npm start` |
| Login dev | `admin@rodieja.com` / `Admin123!` |
| URLs | Frontend http://localhost:3000 · API http://localhost:8080 |

**Docker MariaDB:** contenedor `SistemaPrincipal`, puerto `3306`, usuario `root`, contraseña `123456`, BD `sistema_vehicular` (compartido con otros proyectos locales).

---

## Fase 6 — Resumen

```bash
copy _linear\plans\_plantilla_rodieja.html _linear\plans\resumen_sprint_<nombre>.html
node scripts/sprint_<nombre>.mjs status   # todos Done
```

Marcar epic **Completed** en Linear. Comentario: `Sprint completado. Resumen: _linear/plans/resumen_sprint_<nombre>.html`

---

## Base de datos y JOOQ

| Aspecto | Rodieja Contable |
|---------|------------------|
| Carpeta SQL | `0.BaseDeDatos/` |
| BD | `sistema_vehicular` (una sola) |
| Schema master | `DB/01_sistema_vehicular.sql` + `DB/02_UsersAuth.sql` + `DB/03_AudatexEnvios.sql` vía `00_run_all.sql` |
| Mocks | `DB/04_datos.sql` vía `load_mocks.py` |
| Pipeline | `drop_db.py` → `setup_db.py` → `load_mocks.py` |
| jOOQ | Regenera en `mvn compile` contra MariaDB viva |

**Un solo agente** ejecuta `drop_db` por sprint. Backend espera GATE_BD antes de confiar en POJOs JOOQ.

---

## Checklist secuencial (enforced)

```bash
node scripts/sprint_<nombre>.mjs show ROD-N
node scripts/linear-update-state.mjs ROD-N --checklist-status
node scripts/sprint_<nombre>.mjs checklist ROD-N 3    # solo si 3 es el pendiente
```

**Prohibido:** `checklist ROD-N 1,2,3`, `all`, marcar fuera de orden.

Los **comentarios** Linear son opcionales; **no sustituyen** el checklist en la descripción.

---

## Alcance por tipo de problema

| Tipo | Issues típicos | Gates |
|------|----------------|-------|
| Solo UI | FE: api → hook → page → build | GATE_FE |
| Solo API | BE: IREPO…→ `.http` | GATE_HTTP |
| Schema + full stack | DB → JOOQ → BE → `.http` → FE | Todos |
| Solo seeds | DB (+ mocks) | GATE_BD |

Gates N/A deben declararse explícitos en el plan HTML.

---

## Herramientas MCP (resumen)

| Grupo | Herramientas clave |
|-------|-------------------|
| Setup | `setup_workflow`, `get_team_info` |
| Issues | `create_issue`, `bulk_create_issues`, `update_issue`, `create_issue_relation` |
| Agente | `claim_issue`, `ping_issue`, `release_issue`, `fail_issue`, `submit_for_review`, `get_issue_context` |
| Salud | `watchdog_check`, `get_sprint_health` |
| Proyectos | `create_project`, `update_project`, `list_projects` |

Tool gating: `ping_issue`, `release_issue`, `fail_issue`, `submit_for_review` requieren claim activo.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `LINEAR_API_KEY` | Personal API key (`.env`) |
| `LINEAR_TEAM_NAME` | `linear_rodieja` |
| `HEARTBEAT_TTL_MS` | TTL claim (default 300000) |

---

## Arranque de trabajo nuevo

```
1. Cerrar sprint anterior (Done + resumen + epic Completed)
2. cleanup → borrar plan/resumen/sprint_*.mjs viejos
3. plan_sprint_<nuevo>.html → validate → ✅ APROBADO
4. sprint_<nuevo>.mjs → create
5. Fase 5 multi-agente
6. resumen_sprint_<nuevo>.html → epic Completed
```

---

## FAQ

| Pregunta | Respuesta |
|----------|-----------|
| ¿Primero Linear o código? | Linear: `next` o Fase 0–2 si no hay sprint |
| ¿Varios agentes? | Sí entre epics sin choque; no en misma cadena `blocks` |
| ¿Bypass? | Solo si el humano dice *sin linear* / *bypass linear* |
| ¿Commit sin ticket? | Evitar; usar `[ROD-N]` en mensaje de commit |
