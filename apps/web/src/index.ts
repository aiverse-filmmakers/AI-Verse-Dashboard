/**
 * Web shell entry (Task 5).
 * Re-exports the shell model for the future React/Vite host.
 * No DOM, no framework, no canonical state here.
 */
export { PanelRegistry, defaultPhase1Panels, phase2Panels } from "./panels.js";
export type { PanelDefinition, PanelPlacement, PanelState, PanelMount } from "./panels.js";
export { LayoutManager } from "./layout.js";
export type { PanelInstance, LayoutPreset } from "./layout.js";
export * from "./tokens.js";
export { renderShellModel, stateSurface } from "./shell.js";
export type { ShellModel, PanelCard, PanelDatum, SwitcherOption } from "./shell.js";

/** Display only authenticated canonical Gateway model and readiness facts. */
export {PersonalModelStatus,inspectModelCatalog} from "./personal-model-status.js";
export type {ModelCatalogView} from "./personal-model-status.js";

/** Scope-bound read-only activity, never a conversation database. */
export {PersonalAgentActivity,inspectActivity,inspectCanonicalSessions,
  inspectCanonicalRuns,filterActivityEvents} from "./personal-agent-activity.js";

/** Read-only, provenanced owner diagnostics. No native credentials in UI. */
export {PersonalDiagnostics,inspectGateway,inspectCanvas,inspectHistory,
  inspectSystem,inspectSystems,inspectWorkspace,inspectRunDiagnostics}
  from "./personal-diagnostics.js";

/** Scratch UI has no persistence until admitted canonical Data owner responds. */
export {CanvasWorkspace} from "./canvas-workspace.js";
