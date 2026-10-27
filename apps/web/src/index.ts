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
// Explicitly mounted by the trusted local/native host. Never auto-connects Pages.
export { PersonalChatApplication, mountAuthenticatedPersonalChat } from "./personal-chat-ui.js";
export type { TrustedLocalChatSession } from "./personal-chat-ui.js";
export { renderShellModel, stateSurface } from "./shell.js";
export type { ShellModel, PanelCard, PanelDatum, SwitcherOption } from "./shell.js";
