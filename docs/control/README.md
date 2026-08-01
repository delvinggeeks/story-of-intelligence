# Asynchronous Agent Harness

This directory is the audited message bus between the Architect review loop and Copilot CLI.

1. The Architect writes one approved task in `active-task.md`.
2. `tools/run-copilot-task.ps1` creates the named task branch and runs Copilot with narrowly scoped permissions.
3. Copilot writes its declared report and only the explicitly assigned paths.
4. The Architect autonomously reads the diff and report, validates the result, records the decision in `architect-review.md`, and issues the next task.
5. The loop continues until a complete demoable feature is validated.

The harness never pushes, deploys, accesses secrets, or changes the Constitution/ADRs. Human review is reserved for a complete demoable feature, a genuine external blocker, or a decision that materially changes product direction.
