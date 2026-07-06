---
name: linear-plan-html
description: >-
  Author or expand _linear/plans/plan_sprint_<nombre>.html as a self-contained
  AI briefing (diagnosis, mermaid diagrams, code refs, Linear issues). Use when
  creating sprint plans, plan_sprint_*.html, Fase 2 Linear, or validate-plan-html.
---

# Plan HTML sprint — briefing autocontenido para IA

## Cuándo usar

- Crear o editar `_linear/plans/plan_sprint_<nombre>.html`
- Fase 2 Linear (antes de APROBADO y `create`)
- El humano pide plan detallado, diagnóstico, o contexto para agentes

## Origen obligatorio

```bash
copy _linear\plans\_plantilla_rodieja.html _linear\plans\plan_sprint_<nombre>.html
```

No crear HTML desde cero sin plantilla.

## Orden de secciones en el documento (lectura IA)

1. **INSTRUCCIONES PARA LA IA** (`id="para-la-ia"`) — qué leer, reglas checklist, comandos gate
2. **Diagnóstico completo** — problema, estado código, por qué falla hoy
3. **Diagramas Mermaid** — flujo deseado + flujo actual (mínimo 2 `sequenceDiagram`)
4. **Hallazgos** — cada uno con ruta archivo + líneas + fix → issue
5. **Solución + regla de oro + comportamiento E2E**
6. **Contrato Linear** (12 secciones) + checklists verbatim
7. **Aprobación**

## Contenido mínimo diagnóstico (D1–D8)

Ver `.cursor/rules/linear-plan-diagnostico-exhaustivo.mdc`.

Cada hallazgo del diagnóstico **debe** tener ≥1 ítem `- [ ]` en checklists ROD-N. Prohibida discrepancia plan ↔ issues.

## Diagramas Mermaid

Incluir en `<div class="mermaid">` y cargar Mermaid en `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });</script>
```

Mínimo: diagrama **flujo deseado** y **flujo actual**.

## Referencias de código en el plan

Usar bloques con ruta y líneas (legibles por IA sin abrir repo):

```html
<div class="code-ref">
  <div class="code-ref-path">2.Frontend/.../OportunidadesAudatex.js · líneas 106–107</div>
  <pre>setOportunidades([]);
setTotalCargado(0);</pre>
</div>
```

## Checklist secuencial (obligatorio en plan)

Incluir sección **Linear — Checklist secuencial** que documente:

- Un ítem a la vez: `checklist ROD-N <n>` solo el pendiente
- Prohibido: `checklist ROD-N 1,2,3`, `all`, `--check-all`
- Ciclo: leer `--checklist-status` → implementar **solo ese ítem** → marcar → repetir

## Validación antes de pedir APROBADO

```bash
cd _linear
node scripts/validate-plan-html.mjs plans/plan_sprint_<nombre>.html
```

Exit 0 en Linear (12) + Diagnóstico (8) + IA briefing (5).

## Reglas relacionadas

- `linear-plan-html-obligatorio.mdc`
- `linear-plan-diagnostico-exhaustivo.mdc`
- `linear-checklist-secuencial.mdc`
- `AGENTS.md`
