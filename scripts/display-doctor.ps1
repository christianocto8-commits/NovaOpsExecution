$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$Out = Join-Path $Root "display-report.txt"

"== NovaOps Display Doctor ==" | Set-Content $Out
"Date: $(Get-Date)" | Add-Content $Out
"" | Add-Content $Out

"== Git ==" | Add-Content $Out
Set-Location $Root
git rev-parse HEAD | Add-Content $Out
git status --short | Add-Content $Out
"" | Add-Content $Out

"== System ==" | Add-Content $Out
Get-ComputerInfo | Select-Object OsName,OsVersion,WindowsVersion,CsManufacturer,CsModel,CsProcessors,CsTotalPhysicalMemory | Format-List | Out-String | Add-Content $Out
"" | Add-Content $Out

"== Display / GPU ==" | Add-Content $Out
Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,VideoModeDescription,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate | Format-List | Out-String | Add-Content $Out
"" | Add-Content $Out

"== Monitor ==" | Add-Content $Out
Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID | ForEach-Object {
  $name = ($_.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ""
  $serial = ($_.SerialNumberID | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ""
  "MonitorName=$name Serial=$serial"
} | Add-Content $Out
"" | Add-Content $Out

"== DPI / Scaling ==" | Add-Content $Out
Get-ItemProperty "HKCU:\Control Panel\Desktop" | Select-Object LogPixels,Win8DpiScaling | Format-List | Out-String | Add-Content $Out
"" | Add-Content $Out

"== Color Profiles ==" | Add-Content $Out
Get-ChildItem "$env:WINDIR\System32\spool\drivers\color" | Select-Object Name,Length,LastWriteTime | Format-Table | Out-String | Add-Content $Out
"" | Add-Content $Out

"== Edge Version ==" | Add-Content $Out
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (Test-Path $edge) {
  (Get-Item $edge).VersionInfo | Select-Object ProductVersion,FileVersion | Format-List | Out-String | Add-Content $Out
}
"" | Add-Content $Out

"== Node / npm ==" | Add-Content $Out
node -v | Add-Content $Out
npm -v | Add-Content $Out
"" | Add-Content $Out

"== Frontend Packages ==" | Add-Content $Out
Set-Location (Join-Path $Root "apps\web")
npm list next --depth=0 | Add-Content $Out
npm list react --depth=0 | Add-Content $Out
npm list tailwindcss --depth=0 | Add-Content $Out
"" | Add-Content $Out

"== Browser GPU Manual Step ==" | Add-Content $Out
"Open edge://gpu, click Copy Report to Clipboard, save as edge-gpu-report.txt beside this file." | Add-Content $Out

Write-Host "Display report created:"
Write-Host $Out
