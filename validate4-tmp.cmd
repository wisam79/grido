@echo off
cd /d c:\projects\grido\frontend
call npm test -- test/collage-layers-tab.test.tsx > ..\vitest-npm-tmp.log 2>&1
echo === NPM VITEST DONE === >> ..\vitest-npm-tmp.log
