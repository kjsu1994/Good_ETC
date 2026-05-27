$ErrorActionPreference = "Stop"

$LauncherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = (Resolve-Path (Join-Path $LauncherDir "..")).ProviderPath
$Launcher = Join-Path $LauncherDir "launcher.py"
$DistDir = Join-Path $LauncherDir "dist"
$BuildDir = Join-Path $LauncherDir "build"
$SpecDir = $LauncherDir
$PythonCache = Join-Path $RootDir "game\__pycache__"

if (Test-Path $PythonCache) {
  Remove-Item -LiteralPath $PythonCache -Recurse -Force
}

$HomeData = "--add-data=$((Join-Path $RootDir 'home.html')):."
$GameData = "--add-data=$((Join-Path $RootDir 'game')):game"

py -3 -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --name GoodETC_Launcher `
  --paths "$RootDir" `
  $HomeData `
  $GameData `
  --distpath "$DistDir" `
  --workpath "$BuildDir" `
  --specpath "$SpecDir" `
  "$Launcher"

if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller failed with exit code $LASTEXITCODE"
}

Write-Host "Built: $(Join-Path $DistDir 'GoodETC_Launcher.exe')"
