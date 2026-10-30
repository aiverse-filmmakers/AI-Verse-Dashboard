# Easy provider setup: Dashboard / Connections handoff

> **31 October reconciliation:** This is a product-experience requirement preserved from the Personal-first plan draft, now linked from the canonical Dashboard plan. It does not itself enable, validate or authorize any provider/paid action. Use actual Connections/Gateway owner contracts and scoped CI before enabling a route. The original 27 October provider links and account rules require verification when implemented.

27 October 2026. Direct operator requirements, proposed planning record. No provider integration, account access, external publication or expansion of the existing Connections qualification plan is implied.

## Required experience

- One beginner-friendly Connections area, reachable directly from chat and relevant creation tools.
- Each provider has its name, a short explanation of what it enables, understandable billing notes and a simple entry button. Include ChatGPT, OpenRouter, KIE.ai, and Higgsfield API; allow later apps, plugins and MCP-backed tools without making users learn that terminology.
- Operator wants familiar “Sign in with [provider]” entry points even when setup needs an API key. The dialog must clearly identify the actual method: “Connect your [provider] account using an API key.” Do not imply OAuth delegation or a verified account identity when only a key has been saved. A final **Connect** action accurately describes key submission; final copy remains subject to design review.
- API-key dialog: one masked “Paste your API key here” field; connect/check action; a short provider-specific guide; links to official account creation/sign-in, key creation and billing when relevant. Explain an API key as a private code allowing AI-Verse to use that account. No terminal, environment variables or manual configuration should be required in the normal user journey.
- Guide: (1) open provider and create/sign in to an account, (2) create/copy the required key, (3) return and paste it, (4) connect. Explain separate API funding where applicable. Preserve the dialog if the user leaves to obtain a key; never persist its secret field in browser storage.
- Prefer the supported browser authorization flow for ChatGPT/OpenRouter. API-key fallback stays simple. Do not invent OAuth for providers that only document keys.
- Complete setup behind the scenes: validate input, save through the credential owner, verify with the least-privileged non-generating provider check where supported, resolve actual capabilities, then show honest status. Saving a key is not validation; configured/verified/authorized states remain distinct.
- Clear failure states: invalid/revoked key, missing permission, unavailable provider, insufficient funding, cancelled login and retry. No paid generation to validate a key without explicit approval. Support replace, disconnect and revoke guidance. Never echo or log a key or send it to the chat model.
- Keep each provider guide and auth/billing facts sourced and dated. No blanket “all models,” “no subscriptions,” or unlimited/savings guarantees.

## Provider explanations / links

**ChatGPT:** “Connect your ChatGPT account to chat and work with AI. Available models and usage depend on your plan.” Use the admitted official sign-in route; eligibility and plan permissions remain separate from identity login.

**OpenRouter:** “Use models like GPT, Claude and Gemini through one account. Add credits and pay for what you use.” Browser PKCE supported; show only actually supported/available models. Official guide: https://openrouter.ai/docs/guides/overview/auth/oauth

**KIE.ai:** “Create images, videos and music with different AI tools through one account. Add credits and use them as you create.” Official key page: https://kie.ai/api-key ; setup: https://docs.kie.ai/getting-started ; pricing: https://kie.ai/pricing . Documented Bearer-key authentication; browser OAuth has not been established.

**Higgsfield API:** “Create images and videos using Higgsfield’s API tools. Add funds and pay as you create.” Key/account console: https://open.higgsfield.ai/api-keys ; setup: https://open.higgsfield.ai/quick-start . Explain prominently: API balance is separate from the website subscription/credits. Current official quickstart asks for the complete copied key in one field, without splitting or assembling credentials; server uses its documented Key authorization scheme. Confirm facts again when implementing, rather than using older third-party instructions.

Official Higgsfield billing/account distinction: https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api . API versus MCP/CLI account usage must remain separate; one does not prove the other.

## Responsibility split

**Dashboard:** cards, dialogs, guides, links, progress/errors, selection and accessible interaction. It must not invent its own canonical credential vault or bypass connection approvals.

**Connections:** reuse existing credential isolation, provider verification, capability admission, authorization, revocation and execution receipts. First inspect current public contracts. Any missing provider-specific auth/verification capability requires a bounded, evidence-backed follow-up; this request does not mean rebuild Connections or automatically expand its two-slice qualification plan.

**Gateway/runtime:** authenticated AI execution and routing; do not confuse a model-runtime credential with general external-tool permission. Existing runtime credential contracts must be inspected before consolidating owners. **Token:** actual usage/cost records. Sharing the UX must not duplicate these owners.

## Delivery boundary

This is a cross-repo requirement handoff for later review. Continue the already planned first working chat path. KIE/Higgsfield creation support needs its actual provider adapter and async asset/job handling after connection; merely showing a connection card does not implement generation. Published as a review handoff only; no agent was messaged and no integration is accepted by this document.
