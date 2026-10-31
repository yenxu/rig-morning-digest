---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue here carries the shape below (approved by Yen, 2026-10-30). Ask the human only
   for anything this shape does not cover.

   - Body opens with `Source: plan.md § <n>`, then `## Scope`, `## Done when` (the plan's line,
     word for word), `## Blocked by` (`#n`, or `—`).
   - Label `plan:<plan name>` (the `plan:` key in `plan.md`'s frontmatter).
   - An issue that waits on someone outside (a reviewer) says so in its scope, and stays open
     until they act; anything after it is blocked by it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md> --label "plan:<plan name>"
   # gh GraphQL blocked? same with REST: gh api -X POST repos/<owner>/<repo>/issues --input <json>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
