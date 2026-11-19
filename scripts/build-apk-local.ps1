# Build Broiler Farm Android APK locally using installed JDK and Android SDK
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$androidDir = Join-Path $rootDir "apps\mobile\android"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Building BroilerFarm.apk locally on Windows           " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\mahme\AppData\Local\Android\Sdk"
$tempCache = "C:\Users\mahme\AppData\Local\Temp\gradle-cache"

Set-Location $androidDir

Write-Host "[1/2] Running Gradle assembleDebug..." -ForegroundColor Yellow
cmd.exe /c "gradlew.bat assembleDebug --project-cache-dir `"$tempCache`""

$apkSource = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$apkDest = Join-Path $rootDir "BroilerFarm.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! BroilerFarm.apk is ready!                   " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  File Location: $apkDest" -ForegroundColor White
    Write-Host "  You can now attach and send this file on WhatsApp!" -ForegroundColor White
} else {
    Write-Host "ERROR: APK was not found at $apkSource" -ForegroundColor Red
    exit 1
}
