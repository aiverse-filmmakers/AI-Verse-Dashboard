/**
 * Interactive trusted-host entrypoint for the local Personal application.
 * All credential checks are performed by the original start-connected host.
 */
process.env.AIVERSE_DASHBOARD_PERSONAL_UI="1";
await import("../../dist/scripts/mc2/start-connected.js");
