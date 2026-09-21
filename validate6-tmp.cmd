@echo off
cd /d c:\projects\grido\frontend
node scripts/ensure-bindings.mjs > ..\tsc-tmp.log 2>&1
npx tsc --noEmit >> ..\tsc-tmp.log 2>&1
echo === TSC EXIT %ERRORLEVEL% === >> ..\tsc-tmp.log
