@echo off
setlocal EnableExtensions
rem === Almanac one-click launcher: PATH-independent, logs to startup_log.txt ===
set "LOG=%~dp0startup_log.txt"
set "SRV=%~dp0server.py"
set "CURL=%SystemRoot%\System32\curl.exe"
set "PYW="
echo [%date% %time%] launcher start > "%LOG%"

rem --- 1) server already up AND serving pages? open page directly (no python needed) ---
rem     健康检查用页面本身而非 /api/ping：僵尸服务器只答 ping 不答页面，
rem     若只 ping 会永远不重启（双击"打不开"的另一半个原因）
"%CURL%" -s -f -o nul -m 2 http://127.0.0.1:8630/
if not errorlevel 1 goto open

rem --- 1b) unhealthy: a zombie may hold the port, kill it before starting fresh ---
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='pythonw.exe' or Name='python.exe'\" | Where-Object { $_.CommandLine -match 'server\.py' -and ($_.CommandLine -match 'Almanac' -or $_.CommandLine -match '8630') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
timeout /t 1 /nobreak >nul

rem --- 2) locate pythonw: PATH first, then known absolute fallbacks ---
where pythonw >nul 2>nul && set "PYW=pythonw"
if not defined PYW where pyw >nul 2>nul && set "PYW=pyw"
if not defined PYW if exist "%LocalAppData%\Programs\Python\Launcher\pyw.exe" set "PYW=%LocalAppData%\Programs\Python\Launcher\pyw.exe"
if not defined PYW if exist "%LocalAppData%\Programs\Python\Python313\pythonw.exe" set "PYW=%LocalAppData%\Programs\Python\Python313\pythonw.exe"
if not defined PYW if exist "%LocalAppData%\Programs\Python\Python312\pythonw.exe" set "PYW=%LocalAppData%\Programs\Python\Python312\pythonw.exe"
if not defined PYW (
  echo [%time%] ERROR pythonw not found >> "%LOG%"
  echo Python not found - see startup_log.txt
  pause
  exit /b 1
)
echo [%time%] starting server >> "%LOG%"
start "" /min "%PYW%" "%SRV%" 8630

rem --- 3) wait up to 15s for readiness (page itself, not just ping) ---
set /a tries=0
:wait
"%CURL%" -s -f -o nul -m 2 http://127.0.0.1:8630/
if not errorlevel 1 goto open
set /a tries+=1
if %tries% lss 15 (
  timeout /t 1 /nobreak >nul
  goto wait
)
echo [%time%] ERROR server not ready after 15s >> "%LOG%"
echo Server failed to start - see startup_log.txt
pause
exit /b 1

:open
rem default-browser association may be broken on this machine: launch a real
rem browser exe explicitly instead of relying on "start URL"
rem Firefox just started and is not ready yet: wait a moment, or the URL gets lost
powershell -NoProfile -Command "$p=Get-Process firefox -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1; if($p -and ((Get-Date)-$p.StartTime).TotalSeconds -lt 10){ Start-Sleep -Seconds 6 }" >nul 2>nul
echo [%time%] opening page >> "%LOG%"
set "URL=http://127.0.0.1:8630"
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" (
  start "" "%ProgramFiles%\Mozilla Firefox\firefox.exe" --new-window "%URL%"
  goto done
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --new-window "%URL%"
  goto done
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --new-window "%URL%"
  goto done
)
start "" "%URL%"
:done
exit /b 0
