# PowerShell script to sync changes to GitHub
# Usage: .\sync-to-github.ps1 [commit-message]

param(
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Starting GitHub sync..." -ForegroundColor Cyan

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository. Run 'git init' first." -ForegroundColor Red
    exit 1
}

# Check if there are any changes
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

# Stage all changes
Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to stage changes." -ForegroundColor Red
    exit 1
}

# Create commit message
if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $CommitMessage = "Auto-sync: $timestamp"
}

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create commit." -ForegroundColor Red
    exit 1
}

# Push to remote
Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to push to remote." -ForegroundColor Red
    Write-Host "You may need to configure authentication (PAT, SSH, or Credential Manager)." -ForegroundColor Yellow
    exit 1
}

Write-Host "Successfully synced to GitHub!" -ForegroundColor Green
Write-Host "Repository: https://github.com/owendavidoff-is-trying-to-do-good/media-sanity-check" -ForegroundColor Cyan

