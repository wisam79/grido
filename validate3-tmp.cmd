@echo off
cd /d c:\projects\grido\frontend
npx vitest run test/collage-presets-tab.test.tsx > ..\vitest-base-tmp.log 2>&1
echo === BASELINE DONE === >> ..\vitest-base-tmp.log
