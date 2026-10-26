# MC1 local/aiverse routing repair proposal (not authorized to deploy)

**2026-10-26 — Status: PROPOSAL / NOT AN ACCEPTED PIN OR ROADMAP AMENDMENT**

## Proven source-level defect

The audited Builderz Labs Mission Control pin `5483a0e1eef15b467c167e95796791112cedbb7c` and its current upstream `main` at inspection time (`e28edf8b28c85a32f1fd55ac577d325df6b16e4a`) both implement, in `src/lib/task-dispatch.ts`:

- `classifyDirectModel()` reduces `cfg.dispatchModel` to its final slash-delimited segment, discarding the `local/` provider;
- `pickProvider()` treats the resulting unknown `aiverse` name as Anthropic, not local;
- the scheduler returns HTTP 500 (`ANTHROPIC_API_KEY not set`) and the assigned task cannot reach the Gateway.

This is **not** a missing Anthropic key, a Gateway authentication problem or evidence that Gateway needs a different model name. Real accepted Gateway model is `aiverse`.

Evidence: [failed exact local/aiverse synthetic proof](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40314698303). The isolated deterministic GitHub transport proof [passed](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40315327229) by temporarily using the pinned upstream Ollama catalog alias; that workaround is not a real owner model configuration.

## Smallest proposed correct repair (requires separate owner approval)

Prefer a **reviewed, immutable upstream Mission Control revision** that preserves the provider prefix through model selection and strips it **only** when assembling the local-compatible HTTP request. The relevant *candidate* behavior in upstream `classifyDirectModel()` is equivalent to:

```ts
const chosen = cfg.dispatchModel.trim()
if (/^(local|ollama|lmstudio|litellm)\/[^/]+$/i.test(chosen)) {
  return chosen // preserve provider for pickProvider()
}
return chosen.replace(/^.*\//, '') // preserve old nested alias fallback
```

This is explanatory patch guidance only. **Do not patch the audited Mission Control checkout in place, introduce a fake AI-Verse model, or advance its pin without an approved compatibility/provenance and plan amendment.** A first-class Dashboard/Gateway adapter is the alternative, but that belongs to Dashboard MC2 and also needs an explicit scope/sequence decision before substituting it for MC1.

## Acceptance checks for a separate routing repair PR

1. Exact `dispatchModel=local/aiverse` selects *local*, sends an authenticated `POST /v1/chat/completions` to the configured Gateway, and the provider request model is `aiverse`; no Anthropic network request or token is involved.
2. Invalid/no Gateway token is rejected; a wrong Gateway system/workspace fails closed, with no mutation of canonical AI-Verse owner state.
3. Existing dispatch model aliases (`openai/gpt-*`, `ollama/*`, `9router/cc/*`, and native Anthropic) remain compatible; negative routes do not silently fall back to another provider.
4. A new immutable upstream revision (or explicitly reviewed first-class adapter implementation), corresponding license/provenance and merged Linux/macOS/Windows source checks are independently accepted before modifying the runtime pin.
5. The existing Dashboard hosted proof is rerun **without** the CI alias using genuine `local/aiverse`, retains unique marker/task resolution and cleanup, and a supervised disposable local proof only happens **after** the independently recorded MC1.4 audit-gate release.

## Current executable safeguard

The Dashboard MC1 proof now calls `assertMc1RoutingGate` after authenticated Gateway preflight and before Mission Control bootstrap. The known-broken pin is blocked in real-owner mode; any unreviewed replacement pin also fails closed. Only `CI=true` plus explicit synthetic test flag, `ci-synthetic` system, deterministic runtime, approved pinned source and a disposable synthetic root can pass the hosted compatibility route. This does **not** release MC1.4 or G4.1.

## Handoff

- Already accepted Gateway slices: **8/10 (80%)**, unchanged.
- Dashboard MC1.4: **BLOCKED** by independent whole-system owner gate. Dashboard MC1.5: pending. G4.1 and G4.2: not accepted.
- Next separate decision: approve a safe upstream routing revision or formally propose an MC2 first-class adapter sequencing amendment; then qualify exact rev and release audit gate before any owner machine trial.
- No owner credentials, member release, product distribution pin, or production data may be used in preparation.
