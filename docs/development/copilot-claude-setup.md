# Copilot + Claude Setup for This Repository

## One-time VS Code setup

1. Install and sign in to **GitHub Copilot** and **GitHub Copilot Chat** in VS Code.
2. Open `C:\Users\LOKESH\OneDrive\Desktop\story-of-intelligence` as the workspace.
3. Open Copilot Chat. In the model menu at the bottom of the chat, select an available **Claude** model. This model choice applies to chat, not necessarily to inline completions.
4. Confirm that Copilot Chat can read `.github/copilot-instructions.md`. Keep that file enabled as the repository’s working agreement.
5. Start each task with: `Read the Constitution and relevant ADRs. State ADR impact, scope, and acceptance criteria before editing.`

GitHub makes the exact Claude model availability dependent on the Copilot plan, organization policy, and current model catalogue. If Claude is not offered, do not bypass policy or add a personal API key to the repository; use the available approved model and keep the same repository instructions.

## Suggested use

- Use **Claude in Chat** for planning a bounded change, explaining code, reviewing diffs, and checking governance.
- Use inline completions only for small, understood edits; review every suggestion.
- Ask Copilot to cite the precise repository files it relied upon, not to invent governance.
- Never put credentials, API keys, or learner data into chat prompts or repository instructions.

## Sprint 1 prompt

```text
Read docs/governance/academy-constitution-ssot-v1.0.md,
docs/governance/adr/ADR-0001-retain-edm-v1.md, and
.github/copilot-instructions.md. We are implementing LOS v1.0 for the
Numbers vertical slice. ADR impact is None. Propose only the smallest
schema/object/validation change that meets the stated Definition of Done.
```
