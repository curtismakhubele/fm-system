$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$nodePath = $null
$portableNode = Join-Path $appRoot '.tools\node\node.exe'
if (Test-Path $portableNode) {
  $nodePath = (Resolve-Path $portableNode).Path
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath -and $nodeCmd) {
  $nodePath = $nodeCmd.Source
}

if (-not $nodePath) {
  $searchDirs = @()
  if ($env:ProgramFiles) { $searchDirs += Join-Path $env:ProgramFiles 'nodejs' }
  $progFilesX86 = ${env:ProgramFiles(x86)}
  if ($progFilesX86) { $searchDirs += Join-Path $progFilesX86 'nodejs' }
  if ($env:ProgramData) { $searchDirs += Join-Path $env:ProgramData 'chocolatey\bin' }
  if ($env:LOCALAPPDATA) { $searchDirs += Join-Path $env:LOCALAPPDATA 'nodejs'; $searchDirs += Join-Path $env:LOCALAPPDATA 'Programs\nodejs' }
  if ($env:USERPROFILE) { $searchDirs += Join-Path $env:USERPROFILE 'nodejs' }
  $searchDirs += 'C:\tools'

  foreach ($dir in $searchDirs) {
    if (-not $dir) { continue }
    if (Test-Path $dir) {
      $candidate = Get-ChildItem -Path $dir -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($candidate) {
        $nodePath = $candidate.FullName
        break
      }
    }
  }
}

if (-not $nodePath) {
  Write-Host 'Node.js 18 or newer is required. Install it from https://nodejs.org, then run this file again.' -ForegroundColor Yellow
  exit 1
}

$nodeDir = Split-Path -Parent $nodePath
if (-not (($env:PATH -split ';') | Where-Object { $_ -eq $nodeDir })) {
  $env:PATH = "$nodeDir;$env:PATH"
}

Set-Location -LiteralPath $appRoot
& $nodePath server.js
