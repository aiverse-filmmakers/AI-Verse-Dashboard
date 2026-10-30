# Dashboard design preview on GitHub Pages

**Prepared 27 October 2026.** This is a **public static prototype**, not an admitted AI-Verse application, logged-in account, API connection or member release.

## Intended public preview

Once GitHub Pages is enabled and a deployment passes:

- Preview: https://aiverse-filmmakers.github.io/AI-Verse-Dashboard/
- Inspiration gallery: https://aiverse-filmmakers.github.io/AI-Verse-Dashboard/inspiration/
- Workflow: [Publish Dashboard design preview](../.github/workflows/dashboard-preview-pages.yml)
- Review source: `codex/dashboard-source-checkpoint` (Dashboard PR #42, stacked on plan PR #41).

**Deployment currently blocked until GitHub Pages is switched on.** First run [40473485228](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40473485228) found preview files but failed at `actions/configure-pages` with `Get Pages site failed ... Not Found`. This is a repository setting, not a preview build error. The live URLs above are the **expected** addresses, not a claim the site is already online.

## Required one-time GitHub activation (repository admin)

1. Open [Dashboard repository Pages settings](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/settings/pages).
2. Under **Build and deployment**, change **Source** to **GitHub Actions**. Do not select branch deployment: its folder picker supports only repository root and `/docs`, while the preview deliberately lives under `apps/web/preview`.
3. Return to [the failed preview workflow run](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40473485228) and select **Re-run jobs**.
4. Check that **Package static preview only** and **Publish static design preview** both pass. Confirm the public root, `/inspiration/` and stylesheet/JavaScript load before circulating the link.
5. If GitHub reports environment protection, ensure the `github-pages` deployment environment permits this preview branch. Do not remove unrelated protection rules.

The connected GitHub code actions can commit the workflow but **do not have a Pages settings/enablement write operation**. `actions/configure-pages@v5` cannot enable it with `GITHUB_TOKEN` alone. Do not add a long-lived credential merely to avoid this one setting.

## How subsequent edits become visible

Every push that changes `apps/web/preview/**` on `codex/dashboard-source-checkpoint` automatically runs this workflow. It uploads **only** `apps/web/preview` to GitHub Pages; the rest of the repository, Gateway, host auth helpers and secrets are not in the site artifact. A full page reload after the workflow succeeds shows the latest published UI.

**Important:** Changes to an unsynced Mac workspace, other Git branches or future non-preview UI code do **not** automatically appear. The local Dashboard Codex agent should sync the preview changes to the monitored branch, fetching and reconciling current remote head before pushing, without overwriting others' work. If source development moves away from this branch or folder, update and review the deployment trigger/source intentionally.

The preview uses sample data, deterministic chat and browser-local storage. Do not paste secrets or real user content into a public-hosted prototype. Browser-local demo state can outlive a deployment; for a clean state use a private window. Public design-preview deployment does not imply provider sign-in, Gateway execution, payments, desktop packaging or member release.
