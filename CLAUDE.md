# Project memory — boa-foodfight

## Workflow conventions

### Design / visual review (standing arrangement)

When UI work needs design input or visual verification, the coding
agent (dev) may **order a design or visual review** rather than block on
it. The user (PM) fires up a **local agent** to run it and delivers the
results back into the repo.

- **Visual verification can't run in the build sandbox** — Playwright's
  Chromium download is blocked here, so the client UI cannot be rendered
  or screenshotted from this environment. Order it out to a local agent
  (local envs have a browser); the build sandbox verifies everything
  else (typecheck, lint, jscpd, vitest, reconcile, `build:client`).
- The local agent commits its findings + screenshots under
  `docs/test-feedback/<topic>/` so dev can read them back via the repo.
- **Design specs are passed to dev when complete** — dev reviews/ratifies
  them (engine-truth confirmation, signatures) and the coding agent
  builds against them.

So: don't treat "no browser here" or "needs a design call" as a hard
block — flag what's needed and order the review; the user will spin up
the local/design agent and route the result back through the repo.
