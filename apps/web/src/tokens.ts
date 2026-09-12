/**
 * Design tokens (Task 5, shell §11).
 * Single source of truth for typography, spacing, radius, elevation,
 * semantic status colors, density, focus, and motion. Panels reference
 * these tokens; no hard-coded magic values in panel code.
 */

export const FONT = {
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  scale: { xs: 11, sm: 13, base: 15, lg: 18, xl: 22, display: 30 },
  weight: { regular: 400, medium: 500, semibold: 600 },
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const RADIUS = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const ELEVATION = {
  flat: "none",
  raised: "0 1px 2px rgba(0,0,0,0.35)",
  overlay: "0 8px 24px rgba(0,0,0,0.45)",
} as const;

/** Semantic status colors. Status is never color-only (see STATUS_LABEL). */
export const STATUS_COLOR = {
  ok: "#3fb950",
  working: "#58a6ff",
  waiting: "#d29922",
  blocked: "#f85149",
  done: "#a371f7",
  stale: "#8b949e",
  error: "#f85149",
  unknown: "#8b949e",
} as const;

export type PanelStatus =
  | "ok" | "working" | "waiting" | "blocked" | "done" | "stale" | "error" | "unknown";

/** Non-color-only status communication (§11 accessibility). */
export const STATUS_LABEL: Record<PanelStatus, string> = {
  ok: "OK",
  working: "WORKING",
  waiting: "WAITING",
  blocked: "BLOCKED",
  done: "DONE",
  stale: "STALE",
  error: "ERROR",
  unknown: "UNKNOWN",
};

export const DENSITY = { comfortable: 1, compact: 0.8 } as const;

export const FOCUS_RING = "0 0 0 2px #58a6ff" as const;

/** Motion communicates state, never decorates (§11). Durations in ms. */
export const MOTION = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  respectReducedMotion: true,
} as const;

export const BREAKPOINTS = {
  phone: 0,
  narrow: 640,
  desktop: 1024,
  wide: 1440,
} as const;

/** Component visual states every panel must handle (§11). */
export const COMPONENT_STATES = [
  "default",
  "hover",
  "focus",
  "active",
  "selected",
  "disabled",
  "loading",
  "empty",
  "stale",
  "warning",
  "error",
  "unknown",
] as const;

export type ComponentState = (typeof COMPONENT_STATES)[number];
