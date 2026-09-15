import {
  ensurePinnedMissionControlLab,
  redactSecrets,
  settingsFromEnv,
} from "./lib.js";

async function main(): Promise<void> {
  const settings = settingsFromEnv();
  const result = ensurePinnedMissionControlLab(settings, {
    install: true,
    resetDirty: process.argv.includes("--reset-lab"),
  });
  process.stdout.write(
    JSON.stringify(
      redactSecrets(
        {
          ok: true,
          task: "MC1.1",
          mission_control: result,
          lab_root: settings.labRoot,
          note: "Stock Mission Control is pinned and installed in a disposable lab outside the AI-Verse repositories.",
        },
        [settings.gatewayToken],
      ),
      null,
      2,
    ) + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(
    JSON.stringify(
      {
        ok: false,
        task: "MC1.1",
        error: String((error as Error).message || error),
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
});
