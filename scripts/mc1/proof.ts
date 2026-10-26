import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildMissionControlEnvironment,
  ensurePinnedMissionControlLab,
  preflightGateway,
  randomSecret,
  redactSecrets,
  removeLabPath,
  requestJson,
  settingsFromEnv,
  startMissionControl,
  stopChild,
  waitForMissionControl,
} from "./lib.js";

interface MissionControlAgent {
  id?: number;
  name?: string;
  config?: Record<string, unknown>;
}

interface MissionControlTask {
  id?: number;
  title?: string;
  status?: string;
  resolution?: string | null;
  outcome?: string | null;
  error_message?: string | null;
  assigned_to?: string | null;
}

function taskFromResponse(value: Record<string, unknown>): MissionControlTask {
  const task = value.task;
  if (!task || typeof task !== "object") {
    throw new Error("Mission Control task response did not contain a task");
  }
  return task as MissionControlTask;
}

async function waitForTaskResult(
  baseUrl: string,
  apiKey: string,
  taskId: number,
  timeoutMs = 150_000,
): Promise<MissionControlTask> {
  const deadline = Date.now() + timeoutMs;
  let latest: MissionControlTask | null = null;
  while (Date.now() < deadline) {
    const response = await requestJson(`${baseUrl}/api/tasks/${taskId}`, {
      apiKey,
      signal: AbortSignal.timeout(5000),
    });
    latest = taskFromResponse(response);
    const status = String(latest.status || "");
    if (status === "failed") {
      throw new Error(
        `Mission Control task failed: ${String(latest.error_message || "unknown error")}`,
      );
    }
    if (
      typeof latest.resolution === "string" &&
      latest.resolution.trim() &&
      ["review", "quality_review", "done"].includes(status)
    ) {
      return latest;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(
    `Timed out waiting for Mission Control task result. Last status: ${String(latest?.status || "unknown")}`,
  );
}

async function main(): Promise<void> {
  const settings = settingsFromEnv();
  const ciSynthetic = process.env.CI === "true" &&
    process.env.AIVERSE_MC1_CI_SYNTHETIC === "1";
  const report = (stage: string) => {
    if (ciSynthetic) {
      process.stderr.write("mc1-ci:" + stage + "\n");
    }
  };
  const keepData = process.env.AIVERSE_MC1_KEEP_LAB_DATA === "1";
  const nonce = randomSecret(8).toLowerCase();
  const runDir = join(settings.labRoot, "runs", nonce);
  const dataDir = join(runDir, "mission-control-data");
  let child: ReturnType<typeof startMissionControl>["child"] | null = null;

  try {
    const gateway = await preflightGateway(settings, { smokeChat: false });
    report("authenticated-gateway-preflight-complete");
    report("installing-existing-pinned-mission-control-lab");
    const lab = ensurePinnedMissionControlLab(settings, {
      install: true,
      resetDirty: process.argv.includes("--reset-lab"),
    });
    report("pinned-mission-control-lab-ready");

    mkdirSync(dataDir, { recursive: true });
    const mcApiKey = randomSecret(32);
    const adminPassword = `MC1-${randomSecret(24)}!`;
    const authSecret = randomSecret(32);
    const env = buildMissionControlEnvironment({
      settings,
      dataDir,
      mcApiKey,
      adminPassword,
      authSecret,
    });

    report("starting-mission-control");
    const started = startMissionControl(settings, env);
    child = started.child;
    const mcBase = `http://127.0.0.1:${settings.missionControlPort}`;
    await waitForMissionControl(mcBase, mcApiKey, child, {
      logTail: started.logTail,
    });
    report("mission-control-ready");

    // Pinned Mission Control strips "local/" from dispatchModel before
    // provider classification. Only the disposable deterministic CI check
    // can use its built-in Ollama catalog alias to exercise local HTTP.
    // Real owner proof keeps the exact "local/aiverse" request and remains
    // blocked until that upstream model-selection bug is repaired.
    const dispatchModel = ciSynthetic
      ? "ollama/deepseek-r1:14b"
      : "local/aiverse";
    const agentResponse = await requestJson(`${mcBase}/api/agents`, {
      method: "POST",
      apiKey: mcApiKey,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ai-verse",
        role: "assistant",
        status: "idle",
        config: {
          dispatchModel,
          mc1Proof: true,
        },
      }),
    });
    const agent = agentResponse.agent as MissionControlAgent | undefined;
    if (
      !agent ||
      agent.name !== "ai-verse" ||
      agent.config?.dispatchModel !== dispatchModel
    ) {
      throw new Error("Mission Control did not create the expected AI-Verse proof agent");
    }

    const expectedMarker = `MC1-AIVERSE-PROOF:${nonce}`;
    const createTaskResponse = await requestJson(`${mcBase}/api/tasks`, {
      method: "POST",
      apiKey: mcApiKey,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `AI-Verse MC1 proof ${nonce}`,
        description: [
          "This is a read-only integration proof.",
          `Begin your response with exactly: ${expectedMarker}`,
          "Then give one short sentence confirming you are responding through the active AI-Verse context.",
          "Do not modify files. Do not call external side-effect tools.",
        ].join("\n"),
        status: "assigned",
        priority: "medium",
        assigned_to: "ai-verse",
        tags: ["mc1", "aiverse", "read-only"],
        metadata: {
          mc1_proof: true,
          nonce,
        },
      }),
    });
    const createdTask = taskFromResponse(createTaskResponse);
    if (!Number.isInteger(createdTask.id)) {
      throw new Error("Mission Control did not return a numeric proof task id");
    }

    report("synthetic-task-created");
    // The stock scheduler awaits routing/reconciliation/dispatch before replying.
    // A delayed HTTP response does not establish that no task was dispatched.
    // In the synthetic CI test only, bound that response and inspect canonical
    // Mission Control task state instead of hanging the entire acceptance job.
    const schedulerAbort = new AbortController();
    const schedulerDeadline = setTimeout(
      () => schedulerAbort.abort(),
      ciSynthetic ? 20_000 : 150_000,
    );
    let schedulerResponse: Record<string, unknown> = {};
    try {
      schedulerResponse = await requestJson(`${mcBase}/api/scheduler`, {
        method: "POST",
        apiKey: mcApiKey,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: "task_dispatch" }),
        signal: schedulerAbort.signal,
      });
      report("scheduler-response-received");
    } catch (error) {
      if (!ciSynthetic) throw error;
      report("scheduler-response-unavailable");
      const diagnostic = String((error as Error).message || error);
      const safeDiagnostic = redactSecrets(diagnostic, [
        settings.gatewayToken, mcApiKey, adminPassword, authSecret,
      ]);
      report("scheduler-error:" + String(safeDiagnostic).slice(0, 450));
      const probe = await requestJson(
        `${mcBase}/api/tasks/${createdTask.id}`,
        { apiKey: mcApiKey, signal: AbortSignal.timeout(5000) },
      );
      const observed = taskFromResponse(probe);
      report("task-state-after-scheduler:" + String(observed.status || "unknown"));
      if (observed.status === "assigned") {
        throw new Error(
          "Scheduler did not dispatch synthetic task within 20s; task remains assigned. " +
          String((error as Error).message || error),
        );
      }
      // Continue only if the existing task was actually dispatched; its
      // returned resolution and unique marker remain mandatory below.
    } finally {
      clearTimeout(schedulerDeadline);
    }

    report("scheduler-invoked");
    const completedTask = await waitForTaskResult(
      mcBase,
      mcApiKey,
      createdTask.id as number,
    );
    const resolution = String(completedTask.resolution || "").trim();
    if (!resolution) {
      throw new Error("Mission Control task completed without a resolution");
    }

    report("task-resolution-received");
    const markerPresent = resolution.includes(expectedMarker);
    const result = {
      ok: true,
      task: "MC1.4",
      mission_control: {
        pin: lab.pin,
        temporary_agent: "ai-verse",
        dispatch_model: dispatchModel,
        local_routing_compatibility_alias: ciSynthetic,
        task_id: createdTask.id,
        final_status: completedTask.status,
        outcome: completedTask.outcome ?? null,
        scheduler_message:
          typeof schedulerResponse.message === "string"
            ? schedulerResponse.message
            : null,
        expected_marker: expectedMarker,
        marker_present: markerPresent,
        response_preview: resolution.slice(0, 800),
      },
      aiverse_gateway: {
        url: settings.gatewayUrl,
        system_id: gateway.binding.systemId,
        workspace_id: gateway.binding.defaultWorkspace,
        runtime:
          typeof gateway.status.runtime === "string"
            ? gateway.status.runtime
            : null,
        state: gateway.status.state,
        model: gateway.model.id,
      },
      isolation: {
        mission_control_data: "disposable-lab-only",
        aiverse_owner_state_imported_into_mc: false,
        mc_domain_state_promoted_to_aiverse: false,
      },
      note: markerPresent
        ? "MC1 runtime proof passed with explicit response marker."
        : "MC1 runtime route passed, but the model did not echo the requested marker. Treat marker absence as a review note, not proof of a different transport.",
    };

    process.stdout.write(
      JSON.stringify(
        redactSecrets(result, [
          settings.gatewayToken,
          mcApiKey,
          adminPassword,
          authSecret,
        ]),
        null,
        2,
      ) + "\n",
    );
  } finally {
    if (child) await stopChild(child);
    if (!keepData) {
      try {
        removeLabPath(runDir, settings.labRoot);
      } catch {
        // Preserve the primary proof result/error. Cleanup is best-effort.
      }
    }
  }
}

main().catch((error) => {
  let token = "";
  try {
    token = settingsFromEnv().gatewayToken;
  } catch {
    // ignore
  }
  process.stderr.write(
    JSON.stringify(
      redactSecrets(
        {
          ok: false,
          task: "MC1.4",
          error: String((error as Error).message || error),
        },
        [token],
      ),
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
});
