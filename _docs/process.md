# Process

## Work

- GitHub issues are the only backlog. Work on one issue at a time
- Read the acceptance criteria before starting and again before closing
- Commit regularly; reference the issue in the commit message, e.g. `Add login form (#5)`
- Every step leaves a comment on the issue, so the issue tells the whole story

## Roles

- PM - grooms an issue before anyone implements it, follows `_docs/team/pm.md`
- Engineer - implements one groomed issue, follows `_docs/team/software-engineer.md`
- QA - checks the result against the acceptance criteria, follows `_docs/team/qa-engineer.md`

## Orchestrator

The main session is the orchestrator. It launches the PM, the engineer and QA
as subagents. It does not groom, implement or test anything itself.

## Lifecycle

1. Pick the lowest-numbered open issue
2. PM grooms it (rewrites the body, adds a "Groomed:" comment)
3. Engineer implements it (adds an "Implemented:" comment)
4. QA verifies it (adds a "## QA: PASS" or "## QA: FAIL" comment)
5. On FAIL, go back to step 3 and give the engineer the QA comment as input
6. On PASS, push to `main`, add a closing comment with the commit hash, close the issue
7. Repeat until there are no open issues with the `mvp` label

## Rules

- Never skip step 2
- The engineer never closes an issue
- QA never changes code; it only reports PASS or FAIL
- The orchestrator closes an issue only after QA reports PASS
