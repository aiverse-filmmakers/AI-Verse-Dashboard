import {
  PROTOCOL_VERSION,
  assertQueryOnly,
  isKnownMethod,
  negotiateHandshake,
  parseFrame,
  type DashboardRequest,
  type DashboardResponse,
} from "../../../packages/protocol/src/index.js";
import {
  getWorkspace,
  listWorkspaces,
  readMarkdownFile,
  readPurposeProjection,
  type DisposableCache,
} from "../../../packages/os-read-adapter/src/index.js";
import {
  buildNowModel,
  buildPurposeMissionModel,
  buildWorkspaceProjections,
} from "../../../packages/read-models/src/index.js";
import type { SessionStore } from "../../../packages/live/src/sessions.js";
import type { SystemRegistry } from "../../../packages/registry/src/index.js";

export const GATEWAY_VERSION = "gateway-0.1.0-alpha.0";
export const GATEWAY_PHASE = "phase-2-live" as const;
const SUPPORTED_QUERIES = [
  "system.list",
  "system.get",
  "system.info",
  "workspace.list",
  "workspace.get",
  "workspace.health",
  "workspace.inbox.list",
  "purpose.get",
  "task.list",
  "agent.list",
  "agent.sessions",
  "run.list",
  "run.get",
  "run.logs",
  "source.preview",
] as const;

export class QueryRouter {
  private sessions?: SessionStore;
  constructor(
    private readonly registry: SystemRegistry,
    private readonly cache: DisposableCache,
  ) {}

  attachSessions(sessions: SessionStore): void {
    this.sessions = sessions;
  }

  assertSubscriptionWorkspace(systemId: string, workspaceId: string): void {
    getWorkspace(this.registry, systemId, workspaceId);
  }

  handle(raw: unknown): DashboardResponse {
    let req: DashboardRequest;
    try {
      const frame = parseFrame(raw);
      if (frame.type !== "req") {
        return this.fail(undefined, undefined, "INVALID_ENVELOPE", "expected a req frame");
      }
      req = frame;
    } catch (err) {
      return this.fail(undefined, undefined, "INVALID_ENVELOPE", (err as Error).message.slice(0, 300));
    }
    try {
      const result = this.route(req);
      return {
        type: "res",
        v: PROTOCOL_VERSION,
        id: req.id,
        ok: true,
        ...(req.systemId !== undefined ? { systemId: req.systemId } : {}),
        result,
        observedAt: new Date().toISOString(),
        sourceVersion: GATEWAY_VERSION,
      };
    } catch (err) {
      const code = ((err as { code?: string }).code ?? "INVALID_ENVELOPE") as string;
      return this.fail(req.id, req.systemId, code, (err as Error).message.slice(0, 300));
    }
  }

  private fail(
    id: string | undefined,
    systemId: string | undefined,
    code: string,
    message: string,
  ): DashboardResponse {
    return {
      type: "res",
      v: PROTOCOL_VERSION,
      id: id ?? "unparseable",
      ok: false,
      ...(systemId !== undefined ? { systemId } : {}),
      error: { code, message },
      observedAt: new Date().toISOString(),
      sourceVersion: GATEWAY_VERSION,
    };
  }

  private route(req: DashboardRequest): unknown {
    assertQueryOnly(req.method);
    if (!isKnownMethod(req.method)) {
      throw Object.assign(new Error(`unknown method ${req.method}`), { code: "UNKNOWN_METHOD" });
    }
    switch (req.method) {
      case "protocol.handshake": {
        const major = (req.params as { clientProtocolMajor?: unknown } | undefined)?.clientProtocolMajor;
        return negotiateHandshake(major);
      }
      case "protocol.capabilities":
        return { phase: GATEWAY_PHASE, methods: [...SUPPORTED_QUERIES], maxParamsBytes: 65536 };
      case "system.list":
        return { systems: this.registry.listPublic() };
      case "system.get":
      case "system.info": {
        const rec = this.registry.get(req.systemId as string);
        if (!rec) {
          throw Object.assign(new Error(`unknown systemId ${req.systemId}`), {
            code: "SYSTEM_NOT_REGISTERED",
          });
        }
        if (req.method === "system.get") {
          const { root: _r, architecture: _a, ...pub } = rec;
          void _r;
          void _a;
          return { system: pub };
        }
        return {
          systemId: rec.systemId,
          authorized: rec.authorized,
          workspaces: listWorkspaces(this.registry, rec.systemId).length,
        };
      }
      case "workspace.list":
        return { workspaces: listWorkspaces(this.registry, req.systemId as string) };
      case "workspace.get": {
        const { summary } = getWorkspace(
          this.registry,
          req.systemId as string,
          req.workspaceId as string,
        );
        return { workspace: summary };
      }
      case "purpose.get": {
        const projection = readPurposeProjection(
          this.registry,
          req.systemId as string,
          req.workspaceId as string,
        );
        return {
          workspaceId: req.workspaceId as string,
          ...buildPurposeMissionModel(projection),
        };
      }
      case "workspace.health": {
        const projections = this.projections(req.systemId as string, req.workspaceId as string);
        return {
          workspaceId: projections.workspaceId,
          available: false,
          availability: "unavailable",
          status: "unknown",
          health: projections.health,
          observedAt: projections.observedAt,
        };
      }
      case "workspace.inbox.list": {
        const projections = this.projections(req.systemId as string, req.workspaceId as string);
        return {
          workspaceId: projections.workspaceId,
          available: false,
          availability: "unavailable",
          items: projections.inbox,
          observedAt: projections.observedAt,
        };
      }
      case "task.list": {
        const projections = this.projections(req.systemId as string, req.workspaceId as string);
        return {
          workspaceId: projections.workspaceId,
          available: projections.work.available,
          availability: "unavailable",
          summary: projections.work,
          now: buildNowModel({
            systemId: projections.systemId,
            workspaceId: projections.workspaceId,
            focus: null,
            work: null,
            inbox: null,
            health: null,
          }),
          observedAt: projections.observedAt,
        };
      }
      case "source.preview": {
        const rel = (req.params as { path?: unknown } | undefined)?.path;
        if (typeof rel !== "string") {
          throw Object.assign(new Error("source.preview needs params.path (relative)"), {
            code: "INVALID_ENVELOPE",
          });
        }
        const systemId = req.systemId as string;
        const workspaceId = req.workspaceId as string;
        const { rootReal } = getWorkspace(this.registry, systemId, workspaceId);
        const cached = this.cache.getProjection(systemId, workspaceId, rel, NaN, NaN);
        void cached;
        const proj = readMarkdownFile(rootReal, rel);
        this.cache.putProjection(systemId, workspaceId, rel, proj.mtimeMs, proj.size, proj);
        return {
          projection: proj,
          provenance: {
            systemId,
            source: `workspace://${workspaceId}/${proj.path}`,
            observedAt: new Date().toISOString(),
            sourceModifiedAt: new Date(proj.mtimeMs).toISOString(),
            freshness: "fresh",
            canonical: true,
          },
        };
      }
      case "agent.list": {
        const sessions = this.requireSessions();
        const systemId = req.systemId as string;
        const workspaceId = req.workspaceId as string;
        getWorkspace(this.registry, systemId, workspaceId);
        return {
          systemId,
          workspaceId,
          agents: sessions.summaries(systemId, workspaceId),
          observedAt: new Date().toISOString(),
        };
      }
      case "agent.sessions": {
        const sessions = this.requireSessions();
        const systemId = req.systemId as string;
        const workspaceId = req.workspaceId as string;
        getWorkspace(this.registry, systemId, workspaceId);
        const params = (req.params ?? {}) as { sessionId?: unknown; limit?: unknown };
        if (typeof params.sessionId === "string") {
          const one = sessions.get(systemId, params.sessionId);
          if (!one || one.workspaceId !== workspaceId) {
            throw Object.assign(new Error(`unknown session ${params.sessionId}`), {
              code: "SESSION_NOT_FOUND",
            });
          }
          return { session: one, observedAt: new Date().toISOString() };
        }
        const limit =
          typeof params.limit === "number" && Number.isInteger(params.limit)
            ? Math.max(1, Math.min(params.limit, 100))
            : 100;
        return {
          systemId,
          workspaceId,
          sessions: sessions.summaries(systemId, workspaceId),
          history: sessions.recentEntries(systemId, workspaceId, { limit }),
          observedAt: new Date().toISOString(),
        };
      }
      case "run.list": {
        const sessions = this.requireSessions();
        const systemId = req.systemId as string;
        const workspaceId = req.workspaceId as string;
        getWorkspace(this.registry, systemId, workspaceId);
        const params = (req.params ?? {}) as { kinds?: unknown; limit?: unknown };
        const kinds = Array.isArray(params.kinds)
          ? params.kinds.filter((k): k is string => typeof k === "string").slice(0, 11)
          : ["run-event", "error-event", "tool-call"];
        const limit =
          typeof params.limit === "number" && Number.isInteger(params.limit)
            ? Math.max(1, Math.min(params.limit, 200))
            : 50;
        return {
          systemId,
          workspaceId,
          runs: sessions.recentEntries(systemId, workspaceId, { kinds, limit }),
          observedAt: new Date().toISOString(),
        };
      }
      case "run.get":
      case "run.logs": {
        const sessions = this.requireSessions();
        const systemId = req.systemId as string;
        const workspaceId = req.workspaceId as string;
        getWorkspace(this.registry, systemId, workspaceId);
        const params = (req.params ?? {}) as { entryId?: unknown; sessionId?: unknown; limit?: unknown };
        if (typeof params.entryId !== "string" || params.entryId.length === 0) {
          throw Object.assign(new Error(`${req.method} needs params.entryId`), {
            code: "INVALID_ENVELOPE",
          });
        }
        const found = sessions.findEntry(systemId, params.entryId);
        if (!found) {
          throw Object.assign(new Error(`unknown entry ${params.entryId}`), {
            code: "ENTRY_NOT_FOUND",
          });
        }
        if (typeof params.sessionId === "string" && params.sessionId !== found.sessionId) {
          throw Object.assign(new Error("entry does not belong to that session"), {
            code: "ENTRY_NOT_FOUND",
          });
        }
        const entry = found.entry;
        if (entry.workspaceId !== workspaceId) {
          throw Object.assign(new Error("entry does not belong to that workspace"), {
            code: "ENTRY_NOT_FOUND",
          });
        }
        return { entry, sessionId: found.sessionId, observedAt: new Date().toISOString() };
      }
      default:
        throw Object.assign(new Error(`${req.method} not yet served`), {
          code: "UNKNOWN_METHOD",
        });
    }
  }

  private requireSessions(): SessionStore {
    const sessions = this.sessions;
    if (!sessions) {
      throw Object.assign(new Error("live sessions not attached"), {
        code: "SESSIONS_UNAVAILABLE",
      });
    }
    return sessions;
  }

  private projections(systemId: string, workspaceId: string) {
    return buildWorkspaceProjections(this.registry, systemId, workspaceId);
  }
}
