import { z } from "zod";
import {
  MAX_PARAMS_BYTES,
  PROTOCOL_VERSION,
  SUPPORTED_MAJORS,
  checkNoRawRoots,
  jsonBytes,
  systemIdSchema,
  workspaceIdSchema,
} from "./ids.js";
import {
  ALL_METHODS,
  PROTOCOL_ERRORS,
  isKnownMethod,
  requiresSystem,
  requiresWorkspace,
} from "./methods.js";

/** Frame ids: client-chosen correlation, 1-128 chars. */
const frameIdSchema = z.string().min(1).max(128);

/** ISO-8601 datetime string (zod-version-agnostic check). */
const dateTimeSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((s) => !Number.isNaN(Date.parse(s)), "must be an ISO datetime");

const methodSchema = z.enum(ALL_METHODS);

/**
 * Request frame. systemId required on every OS-bound method, workspaceId
 * required on every workspace-scoped method. Raw roots never parse.
 */
export const requestSchema = z
  .object({
    type: z.literal("req"),
    v: z.literal(PROTOCOL_VERSION),
    id: frameIdSchema,
    method: methodSchema,
    systemId: systemIdSchema.optional(),
    workspaceId: workspaceIdSchema.optional(),
    params: z.unknown().optional(),
  })
  .strict()
  .superRefine((frame, ctx) => {
    if (requiresSystem(frame.method) && frame.systemId === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `${PROTOCOL_ERRORS.SYSTEM_REQUIRED}: ${frame.method} needs systemId`,
      });
    }
    if (requiresWorkspace(frame.method) && frame.workspaceId === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `${PROTOCOL_ERRORS.WORKSPACE_REQUIRED}: ${frame.method} needs workspaceId`,
      });
    }
    if (frame.params !== undefined) {
      const roots = checkNoRawRoots(frame.params);
      if (!roots.ok) {
        ctx.addIssue({
          code: "custom",
          message: `${PROTOCOL_ERRORS.RAW_ROOT_FORBIDDEN}: forbidden key at ${roots.at}`,
        });
      }
      if (jsonBytes(frame.params) > MAX_PARAMS_BYTES) {
        ctx.addIssue({
          code: "custom",
          message: `${PROTOCOL_ERRORS.PAYLOAD_TOO_LARGE}: params exceed ${MAX_PARAMS_BYTES} bytes`,
        });
      }
    }
  });

export type DashboardRequest = z.infer<typeof requestSchema>;

const protocolErrorSchema = z.object({
  code: z.string().min(1).max(64),
  message: z.string().min(1).max(1024),
});

/** Response frame: exactly one of result (ok) or error (!ok). */
export const responseSchema = z
  .object({
    type: z.literal("res"),
    v: z.literal(PROTOCOL_VERSION),
    id: frameIdSchema,
    ok: z.boolean(),
    systemId: systemIdSchema.optional(),
    result: z.unknown().optional(),
    error: protocolErrorSchema.optional(),
    observedAt: dateTimeSchema,
    sourceVersion: z.string().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((frame, ctx) => {
    if (frame.ok && frame.error !== undefined) {
      ctx.addIssue({ code: "custom", message: "ok responses must not carry error" });
    }
    if (!frame.ok && frame.error === undefined) {
      ctx.addIssue({ code: "custom", message: "failed responses must carry error" });
    }
  });

export type DashboardResponse = z.infer<typeof responseSchema>;

/** Event frame: always carries systemId; seq monotonic per stream. */
export const eventSchema = z
  .object({
    type: z.literal("event"),
    v: z.literal(PROTOCOL_VERSION),
    event: z.string().min(1).max(128),
    systemId: systemIdSchema,
    workspaceId: workspaceIdSchema.optional(),
    seq: z.number().int().nonnegative(),
    observedAt: dateTimeSchema,
    payload: z.unknown().optional(),
  })
  .strict();

export type DashboardEvent = z.infer<typeof eventSchema>;

/** Parse any frame by its type tag; unknown methods/shapes fail closed. */
export function parseFrame(data: unknown): DashboardRequest | DashboardResponse | DashboardEvent {
  const tagged = (data as { type?: unknown })?.type;
  if (tagged === "req") return requestSchema.parse(data);
  if (tagged === "res") return responseSchema.parse(data);
  if (tagged === "event") return eventSchema.parse(data);
  throw new Error(`${PROTOCOL_ERRORS.INVALID_ENVELOPE}: unknown frame type`);
}

/** Handshake params/result: major negotiation + capability pointer. */
export const handshakeParamsSchema = z
  .object({
    clientProtocolMajor: z.number().int().nonnegative(),
    clientName: z.string().min(1).max(128).optional(),
  })
  .strict();

export const handshakeResultSchema = z
  .object({
    serverProtocol: z.literal(PROTOCOL_VERSION),
    supportedMajors: z.array(z.number().int().nonnegative()),
    phase: z.literal("phase-1-read-only"),
  })
  .strict();

/** Negotiate: accept only supported majors, fail closed otherwise. */
export function negotiateHandshake(clientMajor: unknown): z.infer<typeof handshakeResultSchema> {
  const params = handshakeParamsSchema.parse({ clientProtocolMajor: clientMajor });
  if (!(SUPPORTED_MAJORS as readonly number[]).includes(params.clientProtocolMajor)) {
    throw new Error(
      `${PROTOCOL_ERRORS.VERSION_MISMATCH}: client major ${params.clientProtocolMajor}, server supports ${(SUPPORTED_MAJORS as readonly number[]).join(",")}`,
    );
  }
  return {
    serverProtocol: PROTOCOL_VERSION,
    supportedMajors: [...SUPPORTED_MAJORS],
    phase: "phase-1-read-only",
  };
}

export { isKnownMethod };
