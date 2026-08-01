# Asynchronous Agent Harness

This directory is the audited message bus between the Architect review loop and Copilot CLI.

1. The Architect writes one approved task in `active-task.md`.
2. `tools/run-copilot-task.ps1` creates the named task branch and runs Copilot with narrowly scoped permissions.
3. Copilot writes only `copilot-report.md` for a review task, or the explicitly assigned paths for an implementation task.
4. The Architect reads the diff and report, then records the decision in `architect-review.md`.
5. Only an accepted review permits the next task.

The harness never pushes, merges, deploys, accesses secrets, or changes the Constitution/ADRs. A human runs the PowerShell script; no scheduled automation is enabled.
