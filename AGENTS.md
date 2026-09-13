## Agent skills

### Issue tracker

Issues live in Jira at https://stilly.atlassian.net/ in project KAN (Foodpocalypse). Use the Atlassian Cursor plugin. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to Jira labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### TDD

Production changes under `server/src/domain/` and `server/src/routes/` start from a failing test. See `docs/agents/tdd.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root and ADRs in `docs/adr/`. See `docs/agents/domain.md`.
