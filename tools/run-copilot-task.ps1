[CmdletBinding()]
param(
    [string]$Model = "claude-sonnet-4.6"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot

$taskPath = Join-Path $repositoryRoot "docs\control\active-task.md"
$reportPath = Join-Path $repositoryRoot "docs\control\copilot-report.md"
if (-not (Test-Path -LiteralPath $taskPath)) { throw "Missing approved task: $taskPath" }
if (-not (Test-Path -LiteralPath $reportPath)) { throw "Missing Copilot report target: $reportPath" }
if (-not (Get-Command copilot -ErrorAction SilentlyContinue)) { throw "Copilot CLI is not on this PowerShell PATH. Run this script from the terminal where 'copilot' works, or add its install directory to PATH." }

$status = git status --porcelain
if ($status) { throw "Working tree must be clean before starting a controlled Copilot task." }

$task = Get-Content -LiteralPath $taskPath -Raw
if ($task -notmatch "\*\*Status:\*\* Approved for Copilot execution") { throw "The active task is not approved for Copilot execution." }
if ($task -notmatch '\*\*Branch:\*\* `([^`]+)`') { throw "Active task must declare a branch." }
$branch = $Matches[1]

$currentBranch = git branch --show-current
if ($currentBranch -eq "main") {
    git switch -c $branch
} elseif ($currentBranch -ne $branch) {
    throw "Run from main or the assigned task branch '$branch'; current branch is '$currentBranch'."
}

$prompt = @"
You are the implementation reviewer in a controlled asynchronous engineering loop.
Read docs/control/active-task.md and follow it exactly. Read .github/copilot-instructions.md before reviewing.

This is a read-only review task. You may read repository files, run only the listed Node checks and git diff command, and write only docs/control/copilot-report.md.
Do not edit product code, Constitution, ADRs, task instructions, or any other file. Do not commit, push, merge, deploy, call external services, access secrets, or ask the user questions.

Replace docs/control/copilot-report.md with a concise evidence-based report matching the active task's acceptance criteria. Then stop.
"@

& copilot -p $prompt --model=$Model --no-remote --no-remote-export --no-ask-user --allow-tool "view,glob,grep,write(docs/control/copilot-report.md),shell(node:*),shell(git diff:*)" --deny-tool "shell(git push),shell(git commit),shell(git merge),shell(git rebase),shell(git reset),shell(git clean),shell(git checkout),read(.env),write(.env)"
if ($LASTEXITCODE -ne 0) { throw "Copilot exited with code $LASTEXITCODE" }

Write-Host "Copilot task completed. Review docs/control/copilot-report.md and git diff before accepting any change."
