---
trigger: glob
glob: "{.github/**/*,scripts/**/*,build/**/*,Taskfile.yml,package.json,admin-web/netlify/**/*,vitest.config.ts,playwright.config.ts}"
description: "قواعد جودة الكود، أتمتة NSIS، ترفيع الإصدارات، وسياسات CI/CD"
---

# قواعد الجودة والبناء والـ CI/CD (Quality, Build & CI/CD)

التفاصيل في `.agents/skills/wails-desktop-build/SKILL.md` و`.agents/skills/grido-qa-and-release/SKILL.md`.

- **الأسرار والبناء والبيئة:** يُمنع حقن أي سرّ AI مشترك في الثنائي/ldflags (`Authorization: Bearer <JWT>` فقط). فعّل `CGO_ENABLED=1` لـ SQLite واحقن `-X` ldflags عبر `build/windows/Taskfile.yml` (وانسخ `.env` لأي `worktree` جديد). ملف `build/windows/info.json` يحافظ على مفتاح `"0409"` ومفتاح `"FileVersion"`؛ والأيقونة/البيانات مصدرها `build/appicon.png` و`build/config.yml`. `admin-web/netlify/functions/download.ts` يوجّه عبر `/api/download` ويتحقق من `gridostudio.exe`.
- **مثبت Windows NSIS:** السكريبت الحاكم الوحيد `build/windows/installer/project.nsi` بترميز UTF-8 with BOM (لا `build/windows/nsis/project.nsi`) و`APP_NAME: "GridoStudio"` و`bin/GridoStudio.exe` و`nsExec::ExecToStack` للقتل الصامت (لا `ExecWait`) و`wails_tools.nsh` في مجلده الحاكم. احتفظ بـ`$APPDATA\GridoStudio` و`$LOCALAPPDATA\GridoStudio` عند الإزالة؛ شغّل `CleanupTempUpdates()` عند الإقلاع وأنهِ التطبيق بعد مهلة بدء المثبت (`3s`) لتحرير الأقفال والـ Mutex.
- **الإصدار والتوقيع:** الترفيع حصراً عبر `node scripts/release.mjs patch|minor|major` بعد التأكد من نجاح CI 100% واجتياز `lint` (`--max-warnings 0`) و`typecheck` و`format:check` و`docs-gate`. لا تشغّل `wails3 update build-assets` أثناء الترفيع. SignPath v1 يستخدم `actions/upload-artifact@v4` و`continue-on-error: true` ومطابقة حالة `signing-policy-slug`.
- **الاختبارات وCI السحابي:** يُمنع تشغيل Playwright E2E أو Full Suite محلياً؛ الفحص الشامل في GitHub Actions مع مراقبة إلزامية (`gh run list`/`gh run watch`/`gh run view --log-failed`). عند تذبذب توقيت CI دون تغيير مصدري، استخدم مهلة `waitFor` صريحة (~4ث) أو `gh run rerun` للدورة الملغاة وتأكد من تغطية الوظائف الفعلية. استعمل محددات Playwright مرنة (`getByRole` / `.or()`)، و`go vet ./...` و`go build ./...`، واختبارات الطفرة لعقود `ExportPrintSheet`/`validatePrintRequest`.
- **بوابات الطباعة والعتاد:** `windows-build` يشغّل `^TestGDIPure_` (مستبعداً `TestGDILive_*`)، و`print-performance-report` يعمل بوضع `report-only` بلا عتبات مخترعة، وقبول الطابعة الفيزيائية في `docs/print-acceptance/` مستقل عن CI/GDI. واجهة الهبوط تعتمد صياغة مباشرة موجهة لاستوديوهات التصوير والمطابع، وحدود تغطية `vitest.config.ts` تتوافق مع الوحدات المختبرة فعلياً.
