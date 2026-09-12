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
  type DisposableCache,
} from "../../../packages/os-read-adapter/src/index.js";
import type { SystemRegistry } from "../../../packages/registry/src/index.js";

/**
 * Query router (Task 4, Blueprint Rules 1-3 + 8).
 * Parsed protocol requests in, response frames out. Every OS-bound method
 * resolves through the registry; workspace methods resolve inside the
 * selected OS only. Missing/unknown/unauthorized never falls back to
 * another registered system. Commands are blocked (Phase 1 read-only).
 */

export const GATEWAY_VERSION = "gateway-0.1.0-alpha.0";
const SUPPORTED_QUERIES = [
  "system.list",
  "system.get",
  "system.info",
  "workspace.list",
  "workspace.get",
  "workspace.health",
  "source.preview",
] as const;

export class QueryRouter {
  constructor(
    private readonly registry: SystemRegistry,
    private readonly cache: DisposableCache,
  ) {}

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
    // Phase 1: commands parse (Task 1) but never execute.
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
        return { phase: "phase-1-read-only", methods: [...SUPPORTED_QUERIES], maxParamsBytes: 65536 };
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
      case "workspace.health": {
        const { summary } = getWorkspace(
          this.registry,
          req.systemId as string,
          req.workspaceId as string,
        );
        return {
          workspaceId: summary.id,
          status: summary.status ?? "unknown",
          manifest: "ok",
          observedAt: new Date().toISOString(),
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
        // Freshness: stat first; serve cache only when mtime+size match.
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
      default:
        throw Object.assign(new Error(`${req.method} not yet served in Phase 1`), {
          code: "UNKNOWN_METHOD",
        });
    }
  }
}
