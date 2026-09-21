@echo off
cd /d c:\projects\grido
echo === GO VET === > validate-tmp.log 2>&1
go vet . >> validate-tmp.log 2>&1
echo === GO TEST === >> validate-tmp.log 2>&1
go test -run "TestResolveDefaultWindowSize|TestSanitizeRestoredSize|TestClampWindowToWorkArea|TestCenterInWorkArea" -v . >> validate-tmp.log 2>&1
cd /d c:\projects\grido\frontend
echo === TSC === >> ..\validate-tmp.log 2>&1
npx tsc --noEmit >> ..\validate-tmp.log 2>&1
echo === ESLINT === >> ..\validate-tmp.log 2>&1
npx eslint src test e2e --report-unused-disable-directives --max-warnings 0 >> ..\validate-tmp.log 2>&1
echo === DONE === >> ..\validate-tmp.log 2>&1
