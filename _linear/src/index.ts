#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";

const IssueRelationType = { Blocks: "blocks", Related: "related", Duplicate: "duplicate" } as const;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Carga _linear/.env en local (gitignored); en Claude Desktop usa "env" del config MCP
import "../load-env.mjs";

// ─── Config ───────────────────────────────────────────────────────────────────
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY || LINEAR_API_KEY.includes("xxxxxxxx")) {
  console.error(
    "LINEAR_API_KEY required: set it in MCP env (Claude config) or in _linear/.env (copy from .env.example)."
  );
  process.exit(1);
}
const LINEAR_TEAM_NAME = process.env.LINEAR_TEAM_NAME || "linear_rodieja";
const HEARTBEAT_TTL_MS = Number(process.env.HEARTBEAT_TTL_MS) || 5 * 60 * 1000; // 5 min

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, "../state/agent-claims.json");

const linear = new LinearClient({ apiKey: LINEAR_API_KEY });

// ─── Local claim registry ─────────────────────────────────────────────────────
interface ClaimEntry {
  agentId: string;
  claimedAt: string;
  lastHeartbeat: string;
  branch?: string;
}
interface ClaimRegistry {
  claims: Record<string, ClaimEntry>;
}

function readRegistry(): ClaimRegistry {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { claims: {} };
  }
}

function writeRegistry(reg: ClaimRegistry) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(reg, null, 2));
}

function isClaimStale(entry: ClaimEntry): boolean {
  return Date.now() - new Date(entry.lastHeartbeat).getTime() > HEARTBEAT_TTL_MS;
}

// ─── Team cache ───────────────────────────────────────────────────────────────
let cachedTeamId: string | null = null;

async function getTeamId(): Promise<string> {
  if (cachedTeamId) return cachedTeamId;
  const teams = await linear.teams();
  const team = teams.nodes.find(
    (t) =>
      t.name.toLowerCase() === LINEAR_TEAM_NAME.toLowerCase() ||
      t.key.toLowerCase() === LINEAR_TEAM_NAME.toLowerCase()
  );
  if (!team) {
    const available = teams.nodes.map((t) => `${t.name} (${t.key})`).join(", ");
    throw new Error(`Team "${LINEAR_TEAM_NAME}" not found. Available: ${available}`);
  }
  cachedTeamId = team.id;
  return team.id;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getWorkflowStateId(teamId: string, stateName: string): Promise<string | null> {
  const states = await linear.workflowStates({ filter: { team: { id: { eq: teamId } } } });
  const match = states.nodes.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
  return match?.id ?? null;
}

async function getOrCreateLabel(teamId: string, labelName: string, color?: string): Promise<string> {
  const labels = await linear.issueLabels({ filter: { team: { id: { eq: teamId } } } });
  const existing = labels.nodes.find((l) => l.name.toLowerCase() === labelName.toLowerCase());
  if (existing) return existing.id;
  const result = await linear.createIssueLabel({ teamId, name: labelName, color: color ?? "#6B7280" });
  const label = await result.issueLabel;
  if (!label) throw new Error(`Could not create label ${labelName}`);
  return label.id;
}

async function isIssueBlocked(issueId: string): Promise<boolean> {
  const issue = await linear.issue(issueId);
  const relations = await issue.relations();
  for (const rel of relations.nodes) {
    const relType = rel.type;
    if (relType === "blocked_by" || relType === "blocks") {
      // "blocked_by" means this issue is blocked by another
      if (relType === "blocked_by") {
        const relatedIssue = await rel.relatedIssue;
        if (relatedIssue) {
          const state = await relatedIssue.state;
          const doneLike = ["done", "completed", "cancelled"];
          if (!doneLike.includes((state?.name ?? "").toLowerCase())) return true;
        }
      }
    }
  }
  return false;
}

async function addComment(issueId: string, body: string): Promise<void> {
  await linear.createComment({ issueId, body });
}

async function getArtifactsFromIssue(issueId: string): Promise<Record<string, any> | null> {
  const issue = await linear.issue(issueId);
  const comments = await issue.comments();
  for (const comment of comments.nodes) {
    if (comment.body.startsWith("🤖 **AGENT_ARTIFACTS**")) {
      try {
        const json = comment.body.replace("🤖 **AGENT_ARTIFACTS**\n```json\n", "").replace("\n```", "");
        return JSON.parse(json);
      } catch { return null; }
    }
  }
  return null;
}

// ─── Tool Gating ──────────────────────────────────────────────────────────────
function assertAgentHasClaim(agentId: string, issueId: string) {
  const reg = readRegistry();
  const claim = reg.claims[issueId];
  if (!claim) throw new Error(`TOOL GATE: Agent "${agentId}" has no active claim on issue ${issueId}. Use claim_issue first.`);
  if (claim.agentId !== agentId) throw new Error(`TOOL GATE: Issue ${issueId} is claimed by "${claim.agentId}", not "${agentId}".`);
  if (isClaimStale(claim)) throw new Error(`TOOL GATE: Claim on ${issueId} is stale. Heartbeat expired. Use claim_issue again.`);
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: "linear-rodieja-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [

    // ══ TEAM / META ══════════════════════════════════════════════════════════
    {
      name: "get_team_info",
      description: "Info general del equipo linear_rodieja: ID, estados, configuración.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_workflow_states",
      description: "Lista todos los estados del workflow del equipo (Backlog, Todo, In Progress, etc.).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_team_members",
      description: "Lista todos los miembros del equipo.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "setup_workflow",
      description: "Crea los labels y estados recomendados para la arquitectura multi-agente: role:frontend, role:backend, role:database, role:devops, status:failed, status:awaiting-review.",
      inputSchema: { type: "object", properties: {} },
    },

    // ══ ISSUES CRUD ═══════════════════════════════════════════════════════════
    {
      name: "create_issue",
      description: "Crea un issue con soporte completo: agentRole, dependencias (blocks/blocked_by), outputArtifacts y campos extendidos.",
      inputSchema: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          state: { type: "string", description: "Backlog | Todo | In Progress | In Review | Done | Cancelled" },
          priority: { type: "number", description: "0=Sin prioridad, 1=Urgente, 2=Alta, 3=Media, 4=Baja" },
          agentRole: { type: "string", description: "Rol asignado: frontend | backend | database | devops | orchestrator" },
          labelNames: { type: "array", items: { type: "string" } },
          projectId: { type: "string" },
          cycleId: { type: "string" },
          estimate: { type: "number" },
          dueDate: { type: "string" },
          parentId: { type: "string" },
          blockedBy: { type: "array", items: { type: "string" }, description: "IDs de issues que bloquean a este" },
          blocks: { type: "array", items: { type: "string" }, description: "IDs de issues que este issue bloquea" },
        },
      },
    },
    {
      name: "bulk_create_issues",
      description: "Crea múltiples issues de una vez con soporte para agentRole y dependencias. Ideal para volcar el backlog completo de un sprint.",
      inputSchema: {
        type: "object",
        required: ["issues"],
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              required: ["title"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                state: { type: "string" },
                priority: { type: "number" },
                agentRole: { type: "string" },
                labelNames: { type: "array", items: { type: "string" } },
                projectId: { type: "string" },
                cycleId: { type: "string" },
                estimate: { type: "number" },
                dueDate: { type: "string" },
                parentId: { type: "string" },
                blockedBy: { type: "array", items: { type: "string" } },
                blocks: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
    {
      name: "list_issues",
      description: "Lista issues con filtros opcionales por estado, proyecto, ciclo o label.",
      inputSchema: {
        type: "object",
        properties: {
          state: { type: "string" },
          projectId: { type: "string" },
          cycleId: { type: "string" },
          labelName: { type: "string" },
          agentRole: { type: "string", description: "Filtra por rol: frontend | backend | database | devops" },
          limit: { type: "number", default: 50 },
        },
      },
    },
    {
      name: "update_issue",
      description: "Actualiza campos de un issue (título, descripción, estado, prioridad, etc.).",
      inputSchema: {
        type: "object",
        required: ["issueId"],
        properties: {
          issueId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          state: { type: "string" },
          priority: { type: "number" },
          estimate: { type: "number" },
          dueDate: { type: "string" },
          projectId: { type: "string" },
          cycleId: { type: "string" },
        },
      },
    },
    {
      name: "delete_issue",
      description: "Elimina un issue.",
      inputSchema: {
        type: "object",
        required: ["issueId"],
        properties: { issueId: { type: "string" } },
      },
    },
    {
      name: "create_issue_relation",
      description: "Crea una relación entre dos issues: blocks, blocked_by, o related.",
      inputSchema: {
        type: "object",
        required: ["issueId", "relatedIssueId", "type"],
        properties: {
          issueId: { type: "string" },
          relatedIssueId: { type: "string" },
          type: { type: "string", description: "blocks | related | duplicate" },
        },
      },
    },

    // ══ AGENTE LIFECYCLE ══════════════════════════════════════════════════════
    {
      name: "claim_issue",
      description: "Operación atómica: busca el primer issue disponible (no bloqueado, en Todo) para el rol del agente, lo reclama con lock y lo mueve a In Progress. Si un issue ya está reclamado pero con heartbeat expirado, lo libera y reclama. Retorna el issue o null si no hay tareas disponibles.",
      inputSchema: {
        type: "object",
        required: ["agentId", "agentRole"],
        properties: {
          agentId: { type: "string", description: "ID único del agente (ej: backend-agent-1)" },
          agentRole: { type: "string", description: "frontend | backend | database | devops | orchestrator" },
          cycleId: { type: "string", description: "Filtrar solo issues de este sprint (opcional)" },
          branch: { type: "string", description: "Nombre de la branch git que usará el agente (ej: feature/TASK-1)" },
        },
      },
    },
    {
      name: "ping_issue",
      description: "Heartbeat: actualiza el timestamp del claim activo para evitar que el watchdog lo libere. Debe llamarse cada 2-3 minutos mientras el agente trabaja.",
      inputSchema: {
        type: "object",
        required: ["agentId", "issueId"],
        properties: {
          agentId: { type: "string" },
          issueId: { type: "string" },
        },
      },
    },
    {
      name: "release_issue",
      description: "Libera el claim de un issue sin completarlo. Úsalo en caso de error irrecuperable o cuando el agente necesita liberar la tarea. El issue vuelve a Todo.",
      inputSchema: {
        type: "object",
        required: ["agentId", "issueId"],
        properties: {
          agentId: { type: "string" },
          issueId: { type: "string" },
          reason: { type: "string", description: "Motivo de la liberación (opcional)" },
        },
      },
    },
    {
      name: "fail_issue",
      description: "Marca un issue como fallido con motivo detallado. Requiere claim activo. Publica un comentario con el error y deja el issue en estado Cancelled o con label status:failed.",
      inputSchema: {
        type: "object",
        required: ["agentId", "issueId", "failureReason"],
        properties: {
          agentId: { type: "string" },
          issueId: { type: "string" },
          failureReason: { type: "string", description: "Descripción detallada del fallo" },
          cascadeCancel: { type: "boolean", description: "Si true, cancela también los issues que este bloquea" },
        },
      },
    },
    {
      name: "submit_for_review",
      description: "Mueve el issue a 'In Review' (Awaiting Review) y adjunta los outputArtifacts del trabajo realizado. Requiere claim activo. Los artifacts quedan disponibles para issues dependientes via get_issue_context.",
      inputSchema: {
        type: "object",
        required: ["agentId", "issueId"],
        properties: {
          agentId: { type: "string" },
          issueId: { type: "string" },
          outputArtifacts: {
            type: "object",
            description: "Resumen estructurado del trabajo realizado. Ej: { schema: [...], endpoints: [...], files: [...] }",
          },
          summary: { type: "string", description: "Resumen en lenguaje natural para revisión humana" },
        },
      },
    },
    {
      name: "approve_issue",
      description: "Aprobación humana: mueve el issue de 'In Review' a 'Done' y libera las tareas dependientes. No requiere claim.",
      inputSchema: {
        type: "object",
        required: ["issueId"],
        properties: {
          issueId: { type: "string" },
          approvedBy: { type: "string", description: "Nombre del aprobador" },
          notes: { type: "string" },
        },
      },
    },
    {
      name: "reject_issue",
      description: "Rechazo humano: mueve el issue de 'In Review' de regreso a 'In Progress' con feedback. El agente puede reclamarlo nuevamente.",
      inputSchema: {
        type: "object",
        required: ["issueId", "feedback"],
        properties: {
          issueId: { type: "string" },
          feedback: { type: "string", description: "Feedback detallado para el agente" },
          rejectedBy: { type: "string" },
        },
      },
    },
    {
      name: "get_issue_context",
      description: "Obtiene el contexto completo de un issue: descripción, estado, outputArtifacts de sus dependencias completadas. Úsalo antes de empezar a trabajar en una tarea.",
      inputSchema: {
        type: "object",
        required: ["issueId"],
        properties: { issueId: { type: "string" } },
      },
    },
    {
      name: "list_available_issues",
      description: "Lista issues disponibles (estado Todo, no bloqueados) para un rol específico. No hace claim, solo consulta. Usar antes de claim_issue para planificar.",
      inputSchema: {
        type: "object",
        required: ["agentRole"],
        properties: {
          agentRole: { type: "string" },
          cycleId: { type: "string" },
        },
      },
    },

    // ══ WATCHDOG / HEALTH ═════════════════════════════════════════════════════
    {
      name: "watchdog_check",
      description: "Auditoría del Orquestador: detecta claims con heartbeat expirado, revierte esos issues a Todo y limpia el registro local. Llamar periódicamente durante el sprint.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_sprint_health",
      description: "Métricas en tiempo real del sprint: issues por estado, agentes activos, tareas bloqueadas, velocidad proyectada y alertas.",
      inputSchema: {
        type: "object",
        properties: {
          cycleId: { type: "string", description: "ID del sprint (opcional, usa el activo si no se especifica)" },
        },
      },
    },

    // ══ CYCLES / SPRINTS ══════════════════════════════════════════════════════
    {
      name: "create_cycle",
      description: "Crea un nuevo sprint con nombre y fechas.",
      inputSchema: {
        type: "object",
        required: ["name", "startsAt", "endsAt"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          startsAt: { type: "string" },
          endsAt: { type: "string" },
        },
      },
    },
    {
      name: "list_cycles",
      description: "Lista todos los ciclos/sprints del equipo.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "add_issues_to_cycle",
      description: "Agrega uno o varios issues a un sprint.",
      inputSchema: {
        type: "object",
        required: ["cycleId", "issueIds"],
        properties: {
          cycleId: { type: "string" },
          issueIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "remove_issue_from_cycle",
      description: "Quita un issue de un sprint.",
      inputSchema: {
        type: "object",
        required: ["issueId"],
        properties: { issueId: { type: "string" } },
      },
    },

    // ══ PROJECTS / EPICS ══════════════════════════════════════════════════════
    {
      name: "create_project",
      description: "Crea un proyecto (Epic) en linear_rodieja.",
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          state: { type: "string", default: "planned" },
          targetDate: { type: "string" },
          color: { type: "string" },
        },
      },
    },
    {
      name: "list_projects",
      description: "Lista todos los proyectos/Epics del equipo.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "update_project",
      description: "Actualiza un proyecto/Epic.",
      inputSchema: {
        type: "object",
        required: ["projectId"],
        properties: {
          projectId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          state: { type: "string" },
          targetDate: { type: "string" },
        },
      },
    },

    // ══ LABELS ════════════════════════════════════════════════════════════════
    {
      name: "create_label",
      description: "Crea una etiqueta en el equipo.",
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          color: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    {
      name: "list_labels",
      description: "Lista todas las etiquetas del equipo.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const teamId = await getTeamId();

    // ── get_team_info ──────────────────────────────────────────────────────────
    if (name === "get_team_info") {
      const teams = await linear.teams();
      const team = teams.nodes.find((t) => t.id === teamId)!;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ id: team.id, name: team.name, key: team.key, description: team.description, timezone: team.timezone, issueCount: team.issueCount }, null, 2),
        }],
      };
    }

    // ── get_workflow_states ────────────────────────────────────────────────────
    if (name === "get_workflow_states") {
      const states = await linear.workflowStates({ filter: { team: { id: { eq: teamId } } } });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(states.nodes.map((s) => ({ id: s.id, name: s.name, type: s.type, color: s.color })), null, 2),
        }],
      };
    }

    // ── list_team_members ──────────────────────────────────────────────────────
    if (name === "list_team_members") {
      const team = await linear.team(teamId);
      const memberships = await team.members();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(memberships.nodes.map((m) => ({ id: m.id, name: m.name, email: m.email })), null, 2),
        }],
      };
    }

    // ── setup_workflow ─────────────────────────────────────────────────────────
    if (name === "setup_workflow") {
      const roleLabels = [
        { name: "role:frontend",     color: "#3B82F6" },
        { name: "role:backend",      color: "#10B981" },
        { name: "role:database",     color: "#F59E0B" },
        { name: "role:devops",       color: "#8B5CF6" },
        { name: "role:orchestrator", color: "#EF4444" },
      ];
      const statusLabels = [
        { name: "status:failed",           color: "#DC2626" },
        { name: "status:awaiting-review",  color: "#F97316" },
        { name: "status:stale-claim",      color: "#6B7280" },
      ];
      const created: string[] = [];
      for (const l of [...roleLabels, ...statusLabels]) {
        await getOrCreateLabel(teamId, l.name, l.color);
        created.push(l.name);
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ created, message: "Workflow labels listos para la arquitectura multi-agente." }, null, 2),
        }],
      };
    }

    // ── create_issue ───────────────────────────────────────────────────────────
    if (name === "create_issue") {
      const { title, description, state, priority, agentRole, labelNames = [], projectId, cycleId, estimate, dueDate, parentId, blockedBy = [], blocks: blocksList = [] } = args as any;
      const payload: any = { teamId, title };
      if (description) payload.description = description;
      if (priority !== undefined) payload.priority = priority;
      if (projectId) payload.projectId = projectId;
      if (cycleId) payload.cycleId = cycleId;
      if (estimate !== undefined) payload.estimate = estimate;
      if (dueDate) payload.dueDate = new Date(dueDate);
      if (parentId) payload.parentId = parentId;
      if (state) {
        const stateId = await getWorkflowStateId(teamId, state);
        if (stateId) payload.stateId = stateId;
      }
      const allLabels = [...labelNames];
      if (agentRole) allLabels.push(`role:${agentRole}`);
      if (allLabels.length) {
        const ids: string[] = [];
        for (const lname of allLabels) ids.push(await getOrCreateLabel(teamId, lname));
        payload.labelIds = ids;
      }
      const result = await linear.createIssue(payload);
      const issue = await result.issue;
      if (!issue) throw new Error("No se pudo crear el issue.");
      // Create relations
      for (const depId of blockedBy) {
        await linear.createIssueRelation({ issueId: issue.id, relatedIssueId: depId, type: "blocks" as any });
      }
      for (const blocksId of blocksList) {
        await linear.createIssueRelation({ issueId: issue.id, relatedIssueId: blocksId, type: "blocks" as any });
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url }, null, 2),
        }],
      };
    }

    // ── bulk_create_issues ─────────────────────────────────────────────────────
    if (name === "bulk_create_issues") {
      const { issues } = args as any;
      const created: any[] = [];
      for (const iss of issues) {
        const payload: any = { teamId, title: iss.title };
        if (iss.description) payload.description = iss.description;
        if (iss.priority !== undefined) payload.priority = iss.priority;
        if (iss.projectId) payload.projectId = iss.projectId;
        if (iss.cycleId) payload.cycleId = iss.cycleId;
        if (iss.estimate !== undefined) payload.estimate = iss.estimate;
        if (iss.dueDate) payload.dueDate = new Date(iss.dueDate);
        if (iss.parentId) payload.parentId = iss.parentId;
        if (iss.state) {
          const stateId = await getWorkflowStateId(teamId, iss.state);
          if (stateId) payload.stateId = stateId;
        }
        const allLabels = [...(iss.labelNames ?? [])];
        if (iss.agentRole) allLabels.push(`role:${iss.agentRole}`);
        if (allLabels.length) {
          const ids: string[] = [];
          for (const lname of allLabels) ids.push(await getOrCreateLabel(teamId, lname));
          payload.labelIds = ids;
        }
        const result = await linear.createIssue(payload);
        const issue = await result.issue;
        if (issue) {
          for (const depId of (iss.blockedBy ?? [])) {
            await linear.createIssueRelation({ issueId: issue.id, relatedIssueId: depId, type: "blocks" as any });
          }
          created.push({ id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url });
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ created: created.length, issues: created }, null, 2),
        }],
      };
    }

    // ── list_issues ────────────────────────────────────────────────────────────
    if (name === "list_issues") {
      const { state, projectId, cycleId, labelName, agentRole, limit = 50 } = args as any;
      const filter: any = { team: { id: { eq: teamId } } };
      if (state) filter.state = { name: { eq: state } };
      if (projectId) filter.project = { id: { eq: projectId } };
      if (cycleId) filter.cycle = { id: { eq: cycleId } };
      const targetLabel = agentRole ? `role:${agentRole}` : labelName;
      if (targetLabel) filter.labels = { name: { eq: targetLabel } };
      const issues = await linear.issues({ filter, first: limit });
      const result = await Promise.all(issues.nodes.map(async (i) => {
        const s = await i.state;
        return { id: i.id, identifier: i.identifier, title: i.title, state: s?.name, priority: i.priority, estimate: i.estimate, url: i.url };
      }));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // ── update_issue ───────────────────────────────────────────────────────────
    if (name === "update_issue") {
      const { issueId, title, description, state, priority, estimate, dueDate, projectId, cycleId } = args as any;
      const payload: any = {};
      if (title) payload.title = title;
      if (description) payload.description = description;
      if (priority !== undefined) payload.priority = priority;
      if (estimate !== undefined) payload.estimate = estimate;
      if (dueDate) payload.dueDate = new Date(dueDate);
      if (projectId) payload.projectId = projectId;
      if (cycleId) payload.cycleId = cycleId;
      if (state) {
        const stateId = await getWorkflowStateId(teamId, state);
        if (stateId) payload.stateId = stateId;
      }
      const result = await linear.updateIssue(issueId, payload);
      const issue = await result.issue;
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, id: issue?.id, title: issue?.title }, null, 2) }] };
    }

    // ── delete_issue ───────────────────────────────────────────────────────────
    if (name === "delete_issue") {
      const { issueId } = args as any;
      const result = await linear.deleteIssue(issueId);
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success }, null, 2) }] };
    }

    // ── create_issue_relation ──────────────────────────────────────────────────
    if (name === "create_issue_relation") {
      const { issueId, relatedIssueId, type } = args as any;
      const relType = type === "blocks" ? IssueRelationType.Blocks
        : type === "duplicate" ? IssueRelationType.Duplicate
        : IssueRelationType.Related;
      const result = await linear.createIssueRelation({ issueId, relatedIssueId, type: relType as any });
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success }, null, 2) }] };
    }

    // ── claim_issue ────────────────────────────────────────────────────────────
    if (name === "claim_issue") {
      const { agentId, agentRole, cycleId, branch } = args as any;
      const reg = readRegistry();
      const now = new Date().toISOString();

      // Get candidate issues: Todo state + role label
      const filter: any = {
        team: { id: { eq: teamId } },
        state: { name: { eq: "Todo" } },
        labels: { name: { eq: `role:${agentRole}` } },
      };
      if (cycleId) filter.cycle = { id: { eq: cycleId } };
      const issues = await linear.issues({ filter, first: 50 });

      // Check for stale claims to clean up first
      for (const [iId, claim] of Object.entries(reg.claims)) {
        if (isClaimStale(claim)) {
          delete reg.claims[iId];
          await linear.updateIssue(iId, {
            stateId: (await getWorkflowStateId(teamId, "Todo")) ?? undefined,
          });
          const staleLabelId = await getOrCreateLabel(teamId, "status:stale-claim", "#6B7280");
          await linear.issueAddLabel(iId, staleLabelId);
        }
      }
      writeRegistry(reg);

      // Find first unblocked unclaimed issue
      for (const issue of issues.nodes) {
        const alreadyClaimed = reg.claims[issue.id] && !isClaimStale(reg.claims[issue.id]);
        if (alreadyClaimed) continue;
        const blocked = await isIssueBlocked(issue.id);
        if (blocked) continue;

        // Claim it
        reg.claims[issue.id] = { agentId, claimedAt: now, lastHeartbeat: now, ...(branch ? { branch } : {}) };
        writeRegistry(reg);

        // Move to In Progress
        const inProgressId = await getWorkflowStateId(teamId, "In Progress");
        if (inProgressId) await linear.updateIssue(issue.id, { stateId: inProgressId });

        await addComment(issue.id, `🤖 **AGENT CLAIM**\nAgent \`${agentId}\` (role: ${agentRole}) reclamó este issue.\nBranch: \`${branch ?? "N/A"}\`\nTimestamp: ${now}`);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              claimed: true,
              issueId: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url,
              branch: branch ?? `feature/${issue.identifier}`,
              message: `Issue reclamado exitosamente. Usa ping_issue cada 2-3 min para mantener el claim activo.`,
            }, null, 2),
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ claimed: false, message: `No hay issues disponibles para el rol "${agentRole}". Todos están bloqueados, reclamados o completados.` }, null, 2),
        }],
      };
    }

    // ── ping_issue ─────────────────────────────────────────────────────────────
    if (name === "ping_issue") {
      const { agentId, issueId } = args as any;
      assertAgentHasClaim(agentId, issueId);
      const reg = readRegistry();
      reg.claims[issueId].lastHeartbeat = new Date().toISOString();
      writeRegistry(reg);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, lastHeartbeat: reg.claims[issueId].lastHeartbeat }, null, 2) }] };
    }

    // ── release_issue ──────────────────────────────────────────────────────────
    if (name === "release_issue") {
      const { agentId, issueId, reason } = args as any;
      const reg = readRegistry();
      const claim = reg.claims[issueId];
      if (!claim || claim.agentId !== agentId) throw new Error("No tienes un claim activo sobre este issue.");
      delete reg.claims[issueId];
      writeRegistry(reg);
      const todoId = await getWorkflowStateId(teamId, "Todo");
      if (todoId) await linear.updateIssue(issueId, { stateId: todoId });
      await addComment(issueId, `⚠️ **ISSUE LIBERADO**\nAgent \`${agentId}\` liberó este issue.\n${reason ? `Motivo: ${reason}` : ""}`);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Issue liberado y vuelto a Todo." }, null, 2) }] };
    }

    // ── fail_issue ─────────────────────────────────────────────────────────────
    if (name === "fail_issue") {
      const { agentId, issueId, failureReason, cascadeCancel = false } = args as any;
      assertAgentHasClaim(agentId, issueId);
      const reg = readRegistry();
      delete reg.claims[issueId];
      writeRegistry(reg);

      const failedLabelId = await getOrCreateLabel(teamId, "status:failed", "#DC2626");
      await linear.issueAddLabel(issueId, failedLabelId);
      const cancelledId = await getWorkflowStateId(teamId, "Cancelled");
      if (cancelledId) await linear.updateIssue(issueId, { stateId: cancelledId });
      await addComment(issueId, `❌ **ISSUE FALLIDO**\nAgent: \`${agentId}\`\nMotivo: ${failureReason}\nTimestamp: ${new Date().toISOString()}`);

      const cancelledIssues: string[] = [];
      if (cascadeCancel) {
        const issue = await linear.issue(issueId);
        const relations = await issue.relations();
        for (const rel of relations.nodes) {
          if (rel.type === "blocks") {
            const dep = await rel.relatedIssue;
            if (dep) {
              if (cancelledId) await linear.updateIssue(dep.id, { stateId: cancelledId });
              await addComment(dep.id, `❌ **CANCELADO EN CASCADA**\nDebido al fallo de ${issue.identifier}: ${failureReason}`);
              cancelledIssues.push(dep.identifier);
            }
          }
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, issueId, failureReason, cascadeCancelled: cancelledIssues }, null, 2),
        }],
      };
    }

    // ── submit_for_review ──────────────────────────────────────────────────────
    if (name === "submit_for_review") {
      const { agentId, issueId, outputArtifacts, summary } = args as any;
      assertAgentHasClaim(agentId, issueId);
      const reg = readRegistry();
      delete reg.claims[issueId];
      writeRegistry(reg);

      const reviewStateId = await getWorkflowStateId(teamId, "In Review");
      const fallbackId = await getWorkflowStateId(teamId, "Done");
      const stateId = reviewStateId ?? fallbackId;
      if (stateId) await linear.updateIssue(issueId, { stateId });

      const reviewLabelId = await getOrCreateLabel(teamId, "status:awaiting-review", "#F97316");
      await linear.issueAddLabel(issueId, reviewLabelId);

      if (outputArtifacts) {
        await addComment(issueId, `🤖 **AGENT_ARTIFACTS**\n\`\`\`json\n${JSON.stringify(outputArtifacts, null, 2)}\n\`\`\``);
      }
      if (summary) {
        await addComment(issueId, `📋 **RESUMEN DE TRABAJO**\n${summary}`);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            issueId,
            state: reviewStateId ? "In Review" : "Done (no hay estado In Review)",
            message: "Issue enviado a revisión. Usar approve_issue o reject_issue.",
          }, null, 2),
        }],
      };
    }

    // ── approve_issue ──────────────────────────────────────────────────────────
    if (name === "approve_issue") {
      const { issueId, approvedBy, notes } = args as any;
      const doneId = await getWorkflowStateId(teamId, "Done");
      if (doneId) await linear.updateIssue(issueId, { stateId: doneId });
      await addComment(issueId, `✅ **APROBADO**\nAprobado por: ${approvedBy ?? "humano"}\n${notes ? `Notas: ${notes}` : ""}\nTimestamp: ${new Date().toISOString()}`);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, state: "Done" }, null, 2) }] };
    }

    // ── reject_issue ───────────────────────────────────────────────────────────
    if (name === "reject_issue") {
      const { issueId, feedback, rejectedBy } = args as any;
      const inProgressId = await getWorkflowStateId(teamId, "In Progress");
      if (inProgressId) await linear.updateIssue(issueId, { stateId: inProgressId });
      await addComment(issueId, `🔄 **RECHAZADO — REQUIERE CAMBIOS**\nRechazado por: ${rejectedBy ?? "humano"}\nFeedback: ${feedback}\nTimestamp: ${new Date().toISOString()}`);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, state: "In Progress", feedback }, null, 2) }] };
    }

    // ── get_issue_context ──────────────────────────────────────────────────────
    if (name === "get_issue_context") {
      const { issueId } = args as any;
      const issue = await linear.issue(issueId);
      const state = await issue.state;
      const labels = await issue.labels();
      const relations = await issue.relations();

      const dependencyArtifacts: any[] = [];
      for (const rel of relations.nodes) {
        if (rel.type === "blocks") {
          const dep = await rel.relatedIssue;
          if (dep) {
            const depState = await dep.state;
            const artifacts = await getArtifactsFromIssue(dep.id);
            dependencyArtifacts.push({ id: dep.id, identifier: dep.identifier, title: dep.title, state: depState?.name, artifacts });
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            state: state?.name,
            labels: labels.nodes.map((l) => l.name),
            dependencyArtifacts,
          }, null, 2),
        }],
      };
    }

    // ── list_available_issues ──────────────────────────────────────────────────
    if (name === "list_available_issues") {
      const { agentRole, cycleId } = args as any;
      const reg = readRegistry();
      const filter: any = {
        team: { id: { eq: teamId } },
        state: { name: { eq: "Todo" } },
        labels: { name: { eq: `role:${agentRole}` } },
      };
      if (cycleId) filter.cycle = { id: { eq: cycleId } };
      const issues = await linear.issues({ filter, first: 50 });
      const available: any[] = [];
      for (const issue of issues.nodes) {
        const alreadyClaimed = reg.claims[issue.id] && !isClaimStale(reg.claims[issue.id]);
        if (alreadyClaimed) continue;
        const blocked = await isIssueBlocked(issue.id);
        available.push({ id: issue.id, identifier: issue.identifier, title: issue.title, priority: issue.priority, estimate: issue.estimate, blocked, url: issue.url });
      }
      return { content: [{ type: "text", text: JSON.stringify({ total: available.length, issues: available }, null, 2) }] };
    }

    // ── watchdog_check ─────────────────────────────────────────────────────────
    if (name === "watchdog_check") {
      const reg = readRegistry();
      const reverted: any[] = [];
      const now = Date.now();
      for (const [issueId, claim] of Object.entries(reg.claims)) {
        const age = now - new Date(claim.lastHeartbeat).getTime();
        if (isClaimStale(claim)) {
          const todoId = await getWorkflowStateId(teamId, "Todo");
          if (todoId) await linear.updateIssue(issueId, { stateId: todoId });
          const staleLabelId = await getOrCreateLabel(teamId, "status:stale-claim", "#6B7280");
          await linear.issueAddLabel(issueId, staleLabelId);
          await addComment(issueId, `⏰ **WATCHDOG: CLAIM EXPIRADO**\nEl agente \`${claim.agentId}\` no envió heartbeat en ${Math.round(age / 60000)} minutos. Issue revertido a Todo.`);
          reverted.push({ issueId, agentId: claim.agentId, minutesStale: Math.round(age / 60000) });
          delete reg.claims[issueId];
        }
      }
      writeRegistry(reg);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            reverted: reverted.length,
            activeClaims: Object.keys(reg.claims).length,
            details: reverted,
            message: reverted.length === 0 ? "Todos los claims están activos y saludables." : `${reverted.length} issue(s) revertidos por heartbeat expirado.`,
          }, null, 2),
        }],
      };
    }

    // ── get_sprint_health ──────────────────────────────────────────────────────
    if (name === "get_sprint_health") {
      const { cycleId } = args as any;
      const reg = readRegistry();

      const filter: any = { team: { id: { eq: teamId } } };
      if (cycleId) filter.cycle = { id: { eq: cycleId } };

      const issues = await linear.issues({ filter, first: 200 });
      const stateCount: Record<string, number> = {};
      const blocked: any[] = [];
      const staleWarnings: string[] = [];
      let totalEstimate = 0;
      let doneEstimate = 0;

      for (const issue of issues.nodes) {
        const state = await issue.state;
        const sName = state?.name ?? "Unknown";
        stateCount[sName] = (stateCount[sName] ?? 0) + 1;
        if (issue.estimate) totalEstimate += issue.estimate;
        if (sName === "Done") doneEstimate += (issue.estimate ?? 0);

        // Check if blocked and not done
        if (!["Done", "Cancelled"].includes(sName)) {
          const isBlocked = await isIssueBlocked(issue.id);
          if (isBlocked) blocked.push({ id: issue.id, identifier: issue.identifier, title: issue.title, state: sName });
        }
      }

      // Check stale claims
      const now = Date.now();
      for (const [issueId, claim] of Object.entries(reg.claims)) {
        const age = now - new Date(claim.lastHeartbeat).getTime();
        if (age > HEARTBEAT_TTL_MS * 0.8) {
          staleWarnings.push(`Issue ${issueId} (agent: ${claim.agentId}) — último heartbeat hace ${Math.round(age / 60000)} min`);
        }
      }

      const velocity = totalEstimate > 0 ? Math.round((doneEstimate / totalEstimate) * 100) : 0;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            summary: { totalIssues: issues.nodes.length, stateBreakdown: stateCount, velocityPercent: velocity, activeClaims: Object.keys(reg.claims).length },
            blockedIssues: { count: blocked.length, issues: blocked },
            staleClaimWarnings: staleWarnings,
            alerts: [
              ...blocked.length > 0 ? [`⚠️ ${blocked.length} issue(s) bloqueado(s) no resueltos`] : [],
              ...staleWarnings.length > 0 ? [`⏰ ${staleWarnings.length} agente(s) sin heartbeat reciente`] : [],
              ...(stateCount["Failed"] ?? 0) > 0 ? [`❌ ${stateCount["Failed"]} issue(s) fallido(s) requieren atención`] : [],
            ],
          }, null, 2),
        }],
      };
    }

    // ── create_cycle ───────────────────────────────────────────────────────────
    if (name === "create_cycle") {
      const { name: cycleName, description, startsAt, endsAt } = args as any;
      const result = await linear.createCycle({ teamId, name: cycleName, description, startsAt: new Date(startsAt), endsAt: new Date(endsAt) });
      const cycle = await result.cycle;
      return { content: [{ type: "text", text: JSON.stringify({ id: cycle?.id, name: cycle?.name, startsAt: cycle?.startsAt, endsAt: cycle?.endsAt }, null, 2) }] };
    }

    // ── list_cycles ────────────────────────────────────────────────────────────
    if (name === "list_cycles") {
      const team = await linear.team(teamId);
      const cycles = await team.cycles();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(cycles.nodes.map((c) => ({ id: c.id, name: c.name, number: c.number, startsAt: c.startsAt, endsAt: c.endsAt, progress: c.progress })), null, 2),
        }],
      };
    }

    // ── add_issues_to_cycle ────────────────────────────────────────────────────
    if (name === "add_issues_to_cycle") {
      const { cycleId, issueIds } = args as any;
      const results = [];
      for (const issueId of issueIds) {
        const r = await linear.updateIssue(issueId, { cycleId });
        results.push({ issueId, success: r.success });
      }
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    }

    // ── remove_issue_from_cycle ────────────────────────────────────────────────
    if (name === "remove_issue_from_cycle") {
      const { issueId } = args as any;
      const result = await linear.updateIssue(issueId, { cycleId: null });
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success }, null, 2) }] };
    }

    // ── create_project ─────────────────────────────────────────────────────────
    if (name === "create_project") {
      const { name: projName, description, state = "planned", targetDate, color } = args as any;
      const payload: any = { name: projName, teamIds: [teamId], state };
      if (description) payload.description = description;
      if (targetDate) payload.targetDate = new Date(targetDate);
      if (color) payload.color = color;
      const result = await linear.createProject(payload);
      const project = await result.project;
      return { content: [{ type: "text", text: JSON.stringify({ id: project?.id, name: project?.name, state: project?.state, url: project?.url }, null, 2) }] };
    }

    // ── list_projects ──────────────────────────────────────────────────────────
    if (name === "list_projects") {
      const projects = await linear.projects({ filter: { accessibleTeams: { id: { eq: teamId } } } });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(projects.nodes.map((p) => ({ id: p.id, name: p.name, state: p.state, progress: p.progress, targetDate: p.targetDate, url: p.url })), null, 2),
        }],
      };
    }

    // ── update_project ─────────────────────────────────────────────────────────
    if (name === "update_project") {
      const { projectId, name: projName, description, state, targetDate } = args as any;
      const payload: any = {};
      if (projName) payload.name = projName;
      if (description) payload.description = description;
      if (state) payload.state = state;
      if (targetDate) payload.targetDate = new Date(targetDate);
      const result = await linear.updateProject(projectId, payload);
      const project = await result.project;
      return { content: [{ type: "text", text: JSON.stringify({ success: result.success, id: project?.id, name: project?.name }, null, 2) }] };
    }

    // ── create_label ───────────────────────────────────────────────────────────
    if (name === "create_label") {
      const { name: labelName, color, description } = args as any;
      const result = await linear.createIssueLabel({ teamId, name: labelName, color, description });
      const label = await result.issueLabel;
      return { content: [{ type: "text", text: JSON.stringify({ id: label?.id, name: label?.name, color: label?.color }, null, 2) }] };
    }

    // ── list_labels ────────────────────────────────────────────────────────────
    if (name === "list_labels") {
      const labels = await linear.issueLabels({ filter: { team: { id: { eq: teamId } } } });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(labels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })), null, 2),
        }],
      };
    }

    throw new Error(`Tool desconocida: ${name}`);
  } catch (err: any) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Linear Rodieja MCP v2.0 iniciado — Modo multi-agente activo.");
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
