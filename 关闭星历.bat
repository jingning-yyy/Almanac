@echo off
rem Almanac stopper: find and kill the background server (server.py, port 8630)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='pythonw.exe' or Name='python.exe'\" | Where-Object { $_.CommandLine -match 'server\.py' -and ($_.CommandLine -match 'Almanac' -or $_.CommandLine -match '8630') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host ('stopped pid ' + $_.ProcessId) }"
echo [Almanac] server stopped.
pause
