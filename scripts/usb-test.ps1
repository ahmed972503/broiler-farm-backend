# Broiler Farm - USB Debugging Helper Script
$adb = "C:\Users\mahme\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
    Write-Host "Error: adb.exe not found at $adb" -ForegroundColor Red
    exit 1
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Broiler Farm - USB Debugging Setup Tool               " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check connected devices
Write-Host "`n[1/3] Checking connected Android devices via USB..." -ForegroundColor Yellow
$deviceLines = (& $adb devices | Where-Object { $_ -match "\s+device$" })

if (-not $deviceLines) {
    Write-Host "`nKoi authorized device connected nahi mili!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Mobile ko USB cable se PC ke sath connect karein." -ForegroundColor White
    Write-Host "  2. Mobile ki Settings > Developer Options > 'USB Debugging' ON karein." -ForegroundColor White
    Write-Host "  3. Mobile screen par 'Allow USB debugging?' pop-up aye toh 'Allow' ya 'Always allow' karein." -ForegroundColor White
    exit 1
}

Write-Host "Device detected: $deviceLines" -ForegroundColor Green

# 2. Reverse port forwarding (so mobile phone can reach PC server on localhost)
Write-Host "`n[2/3] Setting up Port Forwarding (adb reverse)..." -ForegroundColor Yellow
& $adb reverse tcp:5000 tcp:5000
& $adb reverse tcp:8081 tcp:8081
Write-Host "Port 5000 & 8081 forwarded successfully!" -ForegroundColor Green
Write-Host "Mobile phone can now access http://localhost:5000 over USB cable." -ForegroundColor White

# 3. Ask or install APK
$apkPath = "D:\Poultary Farm\BroilerFarm-release.apk"
if (-not (Test-Path $apkPath)) {
    $apkPath = "D:\Poultary Farm\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
}

if (Test-Path $apkPath) {
    Write-Host "`n[3/3] Installing APK to connected phone ($apkPath)..." -ForegroundColor Yellow
    & $adb install -r $apkPath
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! App phone par install ho chuki hai!         " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Ab mobile mein app open karein:" -ForegroundColor Cyan
    Write-Host "  1. PC par 'npm start' chalayein." -ForegroundColor White
    Write-Host "  2. Mobile app mein top bar se Server par tap karke 'http://localhost:5000' set karein." -ForegroundColor White
    Write-Host "  3. 'Test Ping' daba kar verify karein aur login karein!" -ForegroundColor White
} else {
    Write-Host "`n[3/3] APK file not found." -ForegroundColor Yellow
}
