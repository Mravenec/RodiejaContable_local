---
name: linear-plan-html
description: >-
  Author _linear/plans/plan_sprint_<nombre>.html as exhaustive self-contained
  briefing: D1–D11 diagnosis, coherencia-checklist, Mermaid, Linear issues.
  Use when creating sprint plans, Fase 2 Linear, or validate-plan-html.
---

# Plan HTML sprint — briefing exhaustivo sin discrepancias

Este skill consolida todas las reglas previas sobre la creación de planes HTML para los sprints, asegurando que se cumplan las reglas D1-D11, la coherencia con checklists y los diagramas Mermaid, necesarios para `validate-plan-html.mjs`.

## Cuándo usar
- Crear o editar `_linear/plans/plan_sprint_<nombre>.html`
- Fase 2 Linear (antes de ✅ APROBADO y `create`)
- Al investigar un problema para proponer un plan de acción formal

## Origen obligatorio
```bash
cp _linear/plans/_plantilla_rodieja.html _linear/plans/plan_sprint_<nombre>.html
```
**Prohibido:** HTML desde cero; plan solo «de producto» sin diagnóstico forense.

## Flujo de redacción (IA u orquestador)
1. **Investigar código real** — backend, BD, FE del dominio del sprint.
2. **Copiar plantilla** y rellenar en este orden:
   - Hero + chips
   - `INSTRUCCIONES PARA LA IA` (`id="para-la-ia"`). Incluir: qué problema es, qué está roto, qué sprint lo arregla. Y que el checklist es secuencial de un solo paso a la vez.
   - Diagnóstico **D1–D11** (ver abajo)
   - `<hr class="sep">`
   - Contrato Linear (12 secciones)
   - Aprobación
3. **Por cada hallazgo Hn:** `code-ref` + fila en `id="coherencia-checklist"` + ítem `- [ ]` en checklists verbatim.
4. **Validar** antes de pedir APROBADO:

```bash
cd _linear
node scripts/validate-plan-html.mjs plans/plan_sprint_<nombre>.html
```
Exit 0 obligatorio (estructura + coherencia semántica).

## Secciones diagnóstico D1–D11 obligatorias
| # | Sección HTML | Contenido |
|---|--------------|-----------|
| D1 | Diagnóstico — Estado actual | sprint-next, código fuera de gate |
| D2 | Flujo deseado + Flujo actual | 2× Mermaid `sequenceDiagram` |
| D3 | Hallazgos causa raíz | H1…Hn + `code-ref` + Fix → ROD-N |
| D4 | Arquitectura híbrida | Tabla componente × fuente × estado |
| D5 | Solución paso a paso | Pasos → issues |
| D6 | Resumen ejecutivo | Problema → Causa → Fix → Issue (≥4 filas) |
| D7 | Comportamiento esperado | E2E concreto (ej. 150→162 sin vaciar) |
| D8 | Regla de oro | BD fuente de verdad; refresh incremental |
| D9 | Mapeo necesidad del usuario | Tabla necesidad × sección × issue |
| D10 | Brecha código | Ya escrito vs Falta implementar |
| D11 | Coherencia | Tabla `id="coherencia-checklist"` |

## Coherencia sin discrepancias (crítico)
- Cada fix del resumen ejecutivo → ≥1 fila en `coherencia-checklist` → ≥1 ítem checklist.
- Si el diagnóstico cita un endpoint o cambio (ej. `POST /api/`), debe aparecer explícito en los checklists verbatim.
- `validate-plan-html.mjs` ejecuta `validateCoherence()` y falla si hay endpoints huérfanos.

## Mermaid (Para el HTML)
```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });</script>
```
Mínimo 2 `sequenceDiagram`: flujo **deseado** y flujo **actual/roto**.

## Referencias de código
```html
<div class="code-ref">
  <div class="code-ref-path">ruta/archivo.ext · líneas N–M</div>
  <pre>fragmento real del repo</pre>
</div>
```

## Checklist secuencial en el Plan
Documentar claramente en la sección "Linear — Checklist secuencial":
- `checklist ROD-N <n>` solo el pendiente.
- Prohibido: `1,2,3`, `all`, `--check-all`.
