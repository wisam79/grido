@echo off
cd /d c:\projects\grido\frontend
call npm test -- test/zoom.test.ts > ..\vitest-zoom-tmp.log 2>&1
echo === ZOOM DONE === >> ..\vitest-zoom-tmp.log
