---
type: fix
scope: print
related_files:
  - internal/service/printer_gdi_windows.go:204
  - internal/service/printer_gdi_windows.go:336
  - internal/service/printer_gdi_windows.go:391
  - internal/service/printer_gdi_windows.go:446
  - internal/service/printer_gdi_windows.go:479
  - internal/service/printer_gdi_windows.go:514
  - internal/service/printer_gdi_windows_test.go:1
  - frontend/src/components/editor/print/use-print-export.ts:534
  - frontend/src/components/editor/dialogs/print-dialog.tsx:180
  - frontend/src/components/editor/dialogs/print-dialog.tsx:418
  - frontend/src/components/editor/dialogs/print-dialog.tsx:692
  - frontend/e2e/helpers/wails-v3-bridge.ts:388
  - frontend/test/print-export-payload.test.ts:428
  - frontend/test/print-export-helpers.test.ts:43
  - frontend/e2e/print-dialog.spec.ts:19
  - frontend/e2e/print-export.spec.ts:102
  - frontend/src/components/editor/dialogs/print-dialog.tsx:698
  - frontend/test/print-dialog-backstage.test.tsx:21
  - frontend/test/print-dialog-printer-default.test.tsx:21
---

تقوية محرك الطباعة المباشرة الأصلية بعد مراجعة عتادية شاملة: تصحيح تشويه الطباعة بلا حواف (تغطية cover تحافظ على نسبة الأبعاد بدل التمدد المطاطي)، وسقوط آمن لإعدادات درايفر افتراضية (nil) عند فشل تصديق DEVMODE بدل تمرير مخزن غير مُصادق إلى `CreateDCW`، وتطبيع روابط الرموز وحصر ملفات Temp ببادئة `grido_print_` (طابق عقد `print_native.go` مع فاصل مسار يمنع تجاوز `ExportsEvil`)، وفحص نتيجة `EndPage`/`EndDoc` إلزامياً، وإزالة أثر Premultiplied Alpha في تحويل BGRA (البكسلات شبه الشفافة كانت تُطبع أغمق)، وحكم نجاح مهمة الطباعة من بتات حالة `GetJobW` الرقمية لا من نصوص pStatus المترجمة، وحماية `DeviceCapabilitiesW` من تخصيص ضخم عند إرجاع -1، ومنع الطباعة المباشرة مع فضاء CMYK (GDI يرسم RGB فقط) وتعطيل المفتاح وشرح السبب في الحوار، وحفظ تفضيل الطباعة المباشرة بين الجلسات، ومنع الطباعة المزدوجة عند تجاوز المهلة، وتغليف أخطاء Win32 برسائل عربية واضحة (`win32ErrText`) مع اختبارات Go جديدة للمسار الأمني وتحويل DIB.

الجولة الثالثة (مراجعة عقود المدخلات): إنهاء إلزامي بـ NUL لحقل `DmFormName[32]` عبر `formNameField` (اسم قالب ≥32 محرفاً كان يُنسخ كاملاً بلا NUL فيقرأ الدرايفر نصاً غير منتهٍ داخل منطقة devmode)، والتحقق من مدخلات `DirectPrintRequest` في `validateDirectPrintRequest` قبل لمس Win32 (أبعاد ورقة تتجاوز 1000مم أو نسخ خارج 0–999 كانت تُلفّ صامتة عبر تحويل int16 إلى قيم سالبة تُمرَّر للدرايفر)، ومواءمة قالب e2e القديم مع شكل الربطة الحقيقي `{success, papers, error}`، مع اختبارَي Go جديدين (`TestFormNameField_NULTermination`, `TestValidateDirectPrintRequest_GDI`).

الجولة الرابعة (العتاد المادي والأداء واستئصال الكود الميت): مطابقة المقاسات القياسية (A4/A3/Letter...) عبر `matchStandardPaperID` لمنع رفض `DocumentPropertiesW` في الطابعات المادية عند فرض `DMPAPER_USER`، وفحص الحد الأدنى لحجم DEVMODE (`unsafe.Sizeof(devModeW{})`) لمنع فيضان الذاكرة، ودمج مرن يسقط لنسخة احتياطية تحفظ اتجاه الصفحة عند رفض مقاس الورق، وتسريع `convertToBottomUpDIB` بمسارات مباشرة تقرأ `Pix` لـ RGBA و NRGBA و YCbCr وتلغي ملايين استدعاءات الواجهة، وتفعيل استهلاك `GetSupportedPapers` في `PrintDialog` لمطابقة اسم القالب وعرض شارة الحواف الصفرية وتمرير `formName` للباك إند، واستهلاك `PollJobStatus` في `usePrintExport` لمراقبة طابور الطباعة خلفياً وتنبيه المستخدم الفوري عند أخطاء الورق أو انقطاع الاتصال، مع اختبارات Go جديدة لمطابقة القوالب القياسية والمسارات السريعة لـ DIB.

الجولة الخامسة (قفل الانحدارات بـ 10 اختبارات شاملة): إضافة 10 اختبارات متخصصة تُغطي منظومة التصدير والطباعة بالكامل، مقسمة إلى 5 اختبارات في Go (`TestCalculatePrintDestRect_BorderlessCover` للتحقق من معادلات التغطية والتوسيط، `TestCalculatePrintDestRect_StandardContain` لاحتواء المساحة القابلة للطباعة، `TestCalculatePrintDestRect_FallbackWhenPhysicalZero` للسقوط الآمن عند انعدام الأبعاد الفيزيائية للدرايفر، `TestConvertToBottomUpDIB_NRGBA_TransparentPixelZeroing` للتحقق من تصفير قنوات البكسلات الشفافة، `TestEvaluateJobStatus_Bitmasks` لجدول بتات حالة Spooler وترجمة رسائل السائق) و 5 اختبارات في Vitest (`print-export-payload.test.ts` بإجمالي 18/18: تمرير اسم القالب `formName`، جدولة استدعاء `PollJobStatus` خلفياً بعد 1500ms، تنبيه المستخدم عند كشف فشل الطابعة بعد الإرسال، إدارة استثناءات IPC والسقوط لحوار النظام، ومنع الطباعة المزدوجة عند تجاوز المهلة).

الجولة السادسة (تعميق التغطية بـ 10 اختبارات إضافية لحالات الحافة): إضافة 10 اختبارات متقدمة أخرى، 5 في Go (`TestParseSupportedPaperInfo` لفك قوالب الورق واكتشاف الحواف الصفرية عربياً وإنجليزياً وتحويل الأبعاد، `TestConvertToBottomUpDIB_GrayscaleFallback` لتوسيع التدرج الرمادي الأحادي إلى BGRA، `TestConvertToBottomUpDIB_SubImageBounds` لضمان سلامة قراءة مقتطعات الصور ذات الإحداثيات غير الصفرية، `TestCalculatePrintDestRect_ExactAspectMatch` للنسب المطابقة بدقة، `TestCalculatePrintDestRect_ExtremePanorama` لنسب البانوراما الشديدة 12:1 وتوسيطها) و 5 في Vitest (ترجمة سقوف الأخطاء التقنية عربياً في `describeError`، تمرير مصفوفة عناصر فارغة عند خلو الخانات، السقوط لاسم الطابعة الافتراضية، دقة نصوص إشعار النجاح المخصصة، وتفادي استعلام Spooler لـ jobId الصفري) ليرتفع الإجمالي في `print-export-payload.test.ts` إلى 22/22 حالة و 24 في `print-export-helpers.test.ts` و 279 دالة اختبار في Go.

الجولة السابعة (مواءمة بوابات CI مع مسار الطباعة المباشرة الافتراضي): إضافة `GetSupportedPapers` إلى اعتراضات Vitest في `print-dialog-backstage` و`print-dialog-printer-default` (غيابه من الـ mock كان يُسقط تأثير استعلام قوالب الورق ويمنع وصول نداء «الخصائص» للطابعة المختارة)، وإفشال `PrintDirect` في اختباري السقوط الاحتياطي عبر المتصفح (`print-dialog.spec.ts` و`print-export.spec.ts`) بعد أن صار المسار المباشر الافتراضي ينجح في اعتراض الجسر فيمنع إنشاء حاوية الطباعة، وتحديث إشعار النجاح المتوقع في E2E إلى رسالة المهمة الجديدة، واستبدال `text-[10px]` بفئة مقياس التصميم `text-micro` في شارة قالب الطابعة لإرضاء حارس الاتساق البصري.

