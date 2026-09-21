@echo off
cd /d c:\projects\grido\frontend
npx vitest run test/collage-layers-tab.test.tsx > ..\vitest-tmp.log 2>&1
echo === VITEST DONE === >> ..\vitest-tmp.log
