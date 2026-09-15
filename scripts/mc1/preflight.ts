import {
  preflightGateway,
  redactSecrets,
  settingsFromEnv,
} from "./lib.js";

async function main(): Promise<void> {
  const settings = settingsFromEnv();
  const result = await preflightGateway(settings, {
    smokeChat: process.argv.includes("--smoke-chat"),
  });
  process.stdout.write(
    JSON.stringify(
      redactSecrets(result, [settings.gatewayToken]),
      null,
      2,
    ) + "\n",
  );
}

main().catch((error) => {
  const settings = settingsFromEnv();
  process.stderr.write(
    JSON.stringify(
      redactSecrets(
        {
          ok: false,
          task: "MC1.2",
          error: String((error as Error).message || error),
        },
        [settings.gatewayToken],
      ),
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
});
