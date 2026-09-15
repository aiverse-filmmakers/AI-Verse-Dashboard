# MC1 Runbook: Open Mission Control Against a Real AI-Verse Gateway

**Date:** 2026-09-15  
**Status:** canonical first runtime proof  
**Mission Control pin:** `5483a0e1eef15b467c167e95796791112cedbb7c`

## Goal

Run stock Builderz Labs Mission Control beside AI-Verse and prove one Mission Control task executes through the canonical AI-Verse Gateway.

This is intentionally non-destructive:

- do not strip Mission Control yet;
- do not import its SQLite state into AI-Verse;
- do not replace AI-Verse owners;
- do not treat this as the finished Chat integration.

The generic OpenAI-compatible provider in stock Mission Control is used by task dispatch. The main Mission Control `/chat` page needs a first-class AI-Verse adapter in MC2.

## 1. Start the real AI-Verse Gateway

Use the Gateway installation already bound to the AI-Verse system you want to open.

Check it:

~~~bash
aiverse-gateway status --json
aiverse-gateway doctor --json
~~~

Start it if needed:

~~~bash
aiverse-gateway serve
~~~

Default local endpoint:

~~~text
http://127.0.0.1:8787
~~~

The Gateway bearer token is required for the proof. Use the token from the Gateway setup/secure client store. Do not commit it.

Verify the Gateway directly before involving Mission Control:

~~~bash
export AIVERSE_GATEWAY_TOKEN='...'

curl -s http://127.0.0.1:8787/v1/models \
  -H "Authorization: Bearer $AIVERSE_GATEWAY_TOKEN"
~~~

Optional direct chat smoke:

~~~bash
curl -s http://127.0.0.1:8787/v1/chat/completions \
  -H "Authorization: Bearer $AIVERSE_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "aiverse",
    "messages": [
      {"role": "user", "content": "Reply with AI-Verse Gateway connected."}
    ]
  }'
~~~

## 2. Run the pinned Mission Control reference build

Use a separate lab directory. Do not copy it over the AI-Verse Dashboard repo.

~~~bash
mkdir -p ~/AI-Verse-Lab
cd ~/AI-Verse-Lab

git clone https://github.com/builderz-labs/mission-control.git
cd mission-control
git checkout 5483a0e1eef15b467c167e95796791112cedbb7c
~~~

Install:

~~~bash
corepack enable
pnpm install
~~~

Create local configuration:

~~~bash
cp .env.example .env.local
~~~

Add or override:

~~~text
LOCAL_LLM_ENDPOINT=http://127.0.0.1:8787/v1
LOCAL_LLM_API_KEY=<AI-Verse Gateway bearer token>
~~~

Do not commit `.env.local`.

Launch:

~~~bash
pnpm dev
~~~

Open:

~~~text
http://127.0.0.1:3000/setup
~~~

Complete the local Mission Control admin setup.

## 3. Create the temporary AI-Verse-backed Mission Control agent

In Mission Control, create one test agent such as:

~~~text
Name: ai-verse
Role: assistant
Dispatch model: local/aiverse
~~~

The important field is:

~~~text
dispatchModel=local/aiverse
~~~

Mission Control routes `local/*` through `LOCAL_LLM_ENDPOINT` and strips the `local/` prefix before the request, so AI-Verse Gateway receives model `aiverse`.

## 4. Dispatch one test task

From the Mission Control Tasks surface:

1. create a small test task;
2. assign it to the `ai-verse` test agent;
3. dispatch/run it;
4. watch Mission Control's task/activity surfaces;
5. verify the AI-Verse Gateway run/event stream records the execution.

Recommended task:

~~~text
Inspect the currently selected AI-Verse workspace context and return a one-paragraph summary. Do not modify files.
~~~

## 5. MC1 acceptance

MC1 passes only when all are true:

- Mission Control is the stock pinned reference build;
- AI-Verse Gateway is the canonical runtime edge;
- the request reaches model `aiverse`;
- the run is bound to the intended AI-Verse system/workspace;
- the result returns to Mission Control;
- no Mission Control task/agent/memory/cost store has been declared canonical AI-Verse state;
- no secrets are committed;
- stopping/deleting the reference Mission Control instance does not damage AI-Verse state.

## 6. After MC1

Do not begin stripping panels.

Proceed to MC2:

- introduce a first-class `aiverse` runtime adapter/source in the AI-Verse Dashboard shell;
- connect real Gateway run/session/event controls;
- make system/workspace selection explicit;
- then execute the feature-disposition map before deleting Mission Control functionality.

Canonical feature audit:

`docs/MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md`
