# Build Broiler Farm Android Release APK locally using installed JDK and Android SDK
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$androidDir = Join-Path $rootDir "apps\mobile\android"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Building BroilerFarm Release APK locally on Windows   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\mahme\AppData\Local\Android\Sdk"
$tempCache = "C:\Users\mahme\AppData\Local\Temp\gradle-cache"

Set-Location $androidDir

Write-Host "[1/2] Running Gradle assembleRelease..." -ForegroundColor Yellow
cmd.exe /c "gradlew.bat assembleRelease --project-cache-dir `"$tempCache`""

$apkSource = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
$apkDest = Join-Path $rootDir "BroilerFarm-release.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! BroilerFarm-release.apk is ready!           " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  File Location: $apkDest" -ForegroundColor White
    Write-Host "  Release APK Location: $apkSource" -ForegroundColor White
} else {
    Write-Host "ERROR: APK was not found at $apkSource" -ForegroundColor Red
    exit 1
}
