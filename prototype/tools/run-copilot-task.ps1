[CmdletBinding()]
param(
    [string]$Model = "claude-sonnet-4.6"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repositoryRoot

$taskPath = Join-Path $repositoryRoot "docs\control\active-task.md"
if (-not (Test-Path -LiteralPath $taskPath)) { throw "Missing approved task: $taskPath" }
if (-not (Get-Command copilot -ErrorAction SilentlyContinue)) { throw "Copilot CLI is not on this PowerShell PATH. Run this script from the terminal where 'copilot' works, or add its install directory to PATH." }

$status = git status --porcelain
if ($status) { throw "Working tree must be clean before starting a controlled Copilot task." }

$task = Get-Content -LiteralPath $taskPath -Raw
if ($task -notmatch "\*\*Status:\*\* Approved for Copilot execution") { throw "The active task is not approved for Copilot execution." }
if ($task -notmatch '\*\*Branch:\*\* `([^`]+)`') { throw "Active task must declare a branch." }
$branch = $Matches[1]
if ($task -notmatch '\*\*Report:\*\* `([^`]+)`') { throw "Active task must declare a report path." }
$reportRelativePath = $Matches[1]
if ($reportRelativePath -notmatch '^docs/control/[A-Za-z0-9._-]+\.md$') { throw "Report path must be a Markdown file directly under docs/control." }
$reportPath = Join-Path $repositoryRoot ($reportRelativePath -replace '/', '\\')
if (-not (Test-Path -LiteralPath $reportPath)) { throw "Missing Copilot report target: $reportPath" }

$allowedWriteSection = [regex]::Match($task, '(?ms)^## Allowed writes\s*$(.*?)(?=^## |\z)').Groups[1].Value
$allowedWritePaths = [regex]::Matches($allowedWriteSection, '(?m)^\s*-\s+`([^`]+)`') | ForEach-Object { $_.Groups[1].Value }
if ($allowedWritePaths.Count -eq 0) { throw "Active task must explicitly list allowed write paths." }
foreach ($allowedPath in $allowedWritePaths) {
    if ($allowedPath -match '(^|[\\/])\.\.?([\\/]|$)' -or $allowedPath -match '(^|[\\/])\.env') { throw "Unsafe allowed write path: $allowedPath" }
}
$writePermissions = ($allowedWritePaths | ForEach-Object { "write($_)" }) -join ','

$currentBranch = git branch --show-current
if ($currentBranch -eq "main") {
    git switch -c $branch
} elseif ($currentBranch -ne $branch) {
    throw "Run from main or the assigned task branch '$branch'; current branch is '$currentBranch'."
}

$prompt = @"
You are the implementation reviewer in a controlled asynchronous engineering loop.
Read docs/control/active-task.md and follow it exactly. Read .github/copilot-instructions.md before reviewing.

You may read repository files, run only the listed Node checks and git diff command, and write only the paths explicitly listed under "Allowed writes" in the active task.
Do not edit the Constitution, ADRs, task instructions, or any unlisted file. Do not commit, push, merge, deploy, call external services, access secrets, or ask the user questions.

Write the required evidence-based report to the task's declared report path. Then stop.
"@

& copilot -p $prompt --model=$Model --no-remote --no-remote-export --no-ask-user --allow-tool "view,glob,grep,$writePermissions,shell(node:*),shell(git diff:*)" --deny-tool "shell(git push),shell(git commit),shell(git merge),shell(git rebase),shell(git reset),shell(git clean),shell(git checkout),read(.env),write(.env)"
if ($LASTEXITCODE -ne 0) { throw "Copilot exited with code $LASTEXITCODE" }

Write-Host "Copilot task completed. Review docs/control/copilot-report.md and git diff before accepting any change."
