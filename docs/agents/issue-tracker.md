# Issue tracker: Jira

Issues and specs for this repo live in Jira at https://stilly.atlassian.net/.
Use the Atlassian Cursor plugin (MCP namespace `plugin-atlassian-atlassian`) for all operations. Do not use `gh` or local `.scratch/` files.

## Site and project

- **Site**: https://stilly.atlassian.net/
- **cloudId**: `stilly.atlassian.net` (UUID `3b51a000-fb59-4b8e-be62-283c12832506` if the hostname is rejected)
- **Project key**: `KAN` (`My Software Team`)
- **Issue keys**: `KAN-<n>` (e.g. `KAN-12`)
- **Board**: team-managed software project, default Kanban (`To Do` → `In Progress` → `Done`)
- **Issue types**: Task (default for tickets/specs), Story, Epic, Subtask

## Conventions

Pass `cloudId: "stilly.atlassian.net"` on every Atlassian tool call. Use Markdown (`contentFormat: "markdown"`) for descriptions and comments.

- **Create an issue**: `createJiraIssue` with `projectKey: "KAN"`, `issueTypeName: "Task"` (or `"Epic"` / `"Story"` when the skill asks), `summary`, and `description`. Put triage labels in `additional_fields.labels` as an array of strings.
- **Read an issue**: `getJiraIssue` with `issueIdOrKey` (e.g. `KAN-12`) and `fields` including `comment` when conversation history is needed. `responseContentFormat: "markdown"`.
- **List issues**: `searchJiraIssuesUsingJql` with JQL scoped to `project = KAN`. Filter by labels and status, e.g. `project = KAN AND labels = "ready-for-agent" AND status != Done`.
- **Comment**: `addCommentToJiraIssue` with `issueIdOrKey` and `commentBody`.
- **Apply / remove labels**: `editJiraIssue` with `fields.labels` set to the full desired label list (read first, then write the updated array).
- **Transition**: `getTransitionsForJiraIssue` then `transitionJiraIssue` with the matching transition id. Kanban statuses are To Do, In Progress, Done.
- **Close**: transition to **Done**, and add a closing comment when the skill asks for one.
- **Assign**: `lookupJiraAccountId` then `editJiraIssue` with `fields.assignee` set to `{ "accountId": "<id>" }`.

Browse URL for an issue: `https://stilly.atlassian.net/browse/KAN-<n>`.

## When a skill says "publish to the issue tracker"

Create a Jira issue in `KAN` via `createJiraIssue`. Return the issue key (`KAN-<n>`) and browse URL.

## When a skill says "fetch the relevant ticket"

`getJiraIssue` on the given `KAN-<n>` key, including comments.

## Wayfinding operations

Used by `/wayfinder`. The **map** is an Epic; **child** tickets are Tasks in that Epic.

- **Map**: an Epic in `KAN` labelled `wayfinder:map`, body holding Notes / Decisions-so-far / Fog. `createJiraIssue` with `issueTypeName: "Epic"` and `additional_fields.labels: ["wayfinder:map"]`.
- **Child ticket**: a Task with `parent` set to the map Epic's key. Labels: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). Once claimed, assign it to the driving dev.
- **Blocking**: Jira **Blocks** links. `createIssueLink` with `type: "Blocks"`, `inwardIssue` = blocker key, `outwardIssue` = blocked key (`getIssueLinkTypes` if that type name is missing). A ticket is unblocked when every inward blocker is **Done**.
- **Frontier query**: `searchJiraIssuesUsingJql` for open children of the map Epic that are unassigned and have no open blocker (`status != Done AND parent = <map-key> AND assignee is EMPTY`). First in Epic rank / created order wins; skip any still blocked by an open Blocks link.
- **Claim**: assign the issue to the current user (`lookupJiraAccountId` + `editJiraIssue`). First write of the session.
- **Resolve**: `addCommentToJiraIssue` with the answer, transition to **Done**, then append a context pointer (gist + link) to the map Epic's Decisions-so-far (`getJiraIssue` then `editJiraIssue` on the description).
