# MC1 Runbook: Automated Mission Control -> AI-Verse Runtime Proof

**Date:** 2026-09-15  
**Status:** canonical local acceptance runbook  
**Mission Control pin:** `5483a0e1eef15b467c167e95796791112cedbb7c`

## Goal

Prove that stock Builderz Labs Mission Control can dispatch a real task through the canonical AI-Verse Gateway without making Mission Control an AI-Verse owner.

The proof is automated as far as practical.

The user should not manually:

- configure Mission Control;
- create its admin account;
- create its test agent;
- create its test task;
- click the task board;
- copy Mission Control API keys.

The only required secret is the real AI-Verse Gateway bearer token.

## What the proof script does

`npm run mc1:proof`:

1. reads the real local AI-Verse Gateway config from `AIVERSE_GATEWAY_HOME` or `~/.aiverse/gateway`;
2. verifies the configured system ID, default workspace, root and loopback server binding;
3. authenticates to the running Gateway;
4. checks `/health`, `/status` and `/v1/models`;
5. verifies the Gateway advertises model `aiverse`;
6. clones Builderz Mission Control into a disposable lab outside the AI-Verse repositories;
7. checks out the exact audited commit;
8. installs Mission Control with its pinned lockfile;
9. creates a fresh disposable Mission Control data directory;
10. generates temporary Mission Control admin/API credentials in memory;
11. starts stock Mission Control with:
    - `LOCAL_LLM_ENDPOINT=<AI-Verse Gateway>/v1`;
    - `LOCAL_LLM_API_KEY=<AI-Verse Gateway bearer token>`;
12. creates a temporary `ai-verse` agent with `dispatchModel=local/aiverse`;
13. creates a read-only proof task;
14. triggers Mission Control's real task dispatcher;
15. waits for the response returned through AI-Verse Gateway;
16. reports the bound AI-Verse system/workspace and a sanitized response preview;
17. stops Mission Control;
18. deletes the disposable Mission Control run database unless `AIVERSE_MC1_KEEP_LAB_DATA=1`.

The Gateway token is never written by these scripts.

## Before running

The real AI-Verse Gateway must already be configured and running on the Mac.

Default expected endpoint:

`http://127.0.0.1:8787`

The script defaults to the Gateway home:

`~/.aiverse/gateway`

If the Gateway uses another home:

~~~bash
export AIVERSE_GATEWAY_HOME="/path/to/gateway/home"
~~~

If it uses another endpoint:

~~~bash
export AIVERSE_GATEWAY_URL="http://127.0.0.1:PORT"
~~~

## Human checkpoint H1

This is the first point in the Dashboard program where the owner may need to act.

### If AI-Verse-Dashboard is not already cloned

~~~bash
git clone https://github.com/aiverse-filmmakers/AI-Verse-Dashboard.git
cd AI-Verse-Dashboard
npm ci
~~~

### If it is already cloned

~~~bash
cd /path/to/AI-Verse-Dashboard
git pull
npm ci
~~~

### Supply the Gateway bearer token only in the local shell

~~~bash
export AIVERSE_GATEWAY_TOKEN='PASTE_THE_REAL_GATEWAY_TOKEN_HERE'
~~~

Then run:

~~~bash
npm run mc1:proof
~~~

Do not paste the Gateway token into ChatGPT or a GitHub issue.

The final command prints sanitized JSON. Share that sanitized JSON if the proof fails or if acceptance evidence is needed.

## Separate preflight commands

Bootstrap Mission Control lab only:

~~~bash
npm run mc1:bootstrap
~~~

Verify Gateway only:

~~~bash
AIVERSE_GATEWAY_TOKEN='...' npm run mc1:preflight
~~~

Verify Gateway with an additional direct read-only chat smoke:

~~~bash
AIVERSE_GATEWAY_TOKEN='...' npm run mc1:preflight -- --smoke-chat
~~~

## Safety properties

The proof:

- uses stock Mission Control at the exact audited pin;
- does not copy Mission Control source into the production Dashboard yet;
- uses a fresh disposable Mission Control database;
- does not import AI-Verse canonical state into that database;
- does not promote Mission Control state into AI-Verse;
- requires a loopback Gateway by default;
- refuses a non-loopback Gateway unless `AIVERSE_MC1_ALLOW_REMOTE=1` is explicitly set;
- does not modify AI-Verse Gateway source;
- does not modify the selected AI-Verse OS merely to establish the integration;
- sends a task explicitly instructing the runtime not to modify files or external systems;
- records system/workspace binding from the canonical local Gateway config.

## MC1 acceptance

MC1 passes only when:

- the pinned Mission Control lab is verified;
- the real Gateway is healthy and authenticated;
- HTTP `system_id` matches the local canonical Gateway config;
- Mission Control creates the temporary `ai-verse` agent;
- Mission Control dispatches the task through `local/aiverse`;
- a non-empty task result returns;
- the proof reports the Gateway's canonical default workspace;
- Mission Control run state remains disposable;
- deleting the lab state does not damage AI-Verse;
- no secret appears in committed files or sanitized output.

The response marker is an additional quality signal. Transport acceptance does not depend solely on the model echoing the marker.

## After MC1

Do not strip Mission Control panels.

Proceed to MC2:

1. replace the temporary `local/aiverse` disguise with a first-class AI-Verse runtime source;
2. connect the main Chat UI to canonical Gateway;
3. expose explicit system/workspace selection;
4. consume Gateway runs/events and controls;
5. keep all Mission Control features until the MC3 disposition gate.
