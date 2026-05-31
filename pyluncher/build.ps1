$ErrorActionPreference = "Stop"

$LauncherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = (Resolve-Path (Join-Path $LauncherDir "..")).ProviderPath
$Launcher = Join-Path $LauncherDir "launcher.py"
$DistDir = Join-Path $LauncherDir "dist"
$BuildDir = Join-Path $LauncherDir "build"
$SpecDir = $LauncherDir
$PythonCache = Join-Path $RootDir "game\__pycache__"
$OutputExe = Join-Path $DistDir "GoodETC_Launcher.exe"

if (Test-Path $PythonCache) {
  Remove-Item -LiteralPath $PythonCache -Recurse -Force
}

if (Test-Path $OutputExe) {
  Remove-Item -LiteralPath $OutputExe -Force
}

$HomeData = "--add-data=$((Join-Path $RootDir 'home.html')):."
$GameData = "--add-data=$((Join-Path $RootDir 'game')):game"

$PythonExe = "py"
$PythonArgs = @("-3")

cmd /d /c "py -3 --version >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  $PythonExe = "python"
  $PythonArgs = @()
  cmd /d /c "python --version >nul 2>nul"
  if ($LASTEXITCODE -ne 0) {
    throw "No Python 3 interpreter found. Install Python 3 or add python.exe to PATH."
  }
}

& $PythonExe @PythonArgs -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --windowed `
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

Write-Host "Built: $OutputExe"
