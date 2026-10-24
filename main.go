package main

import (
	"embed"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"grido/internal/desktop"
	"grido/internal/handlers"
	"grido/internal/repository"
	"grido/internal/server"
	"grido/internal/service"
	"grido/internal/utils"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

//go:embed all:frontend/dist
var assets embed.FS

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 توكن جلسة مسارات /api المحلية (Local API Session Token)
//
// مسارات /api/* تُنفّذ كتابة ملفات داخل مجلدات التطبيق (Media/Exports) وقد
// تُظهر حوارات نظام — أي أنها تحمل امتيازات التطبيق لا امتيازات صفحة ويب.
// فحص الأصل (Origin == Host) يحجب المتصفحات عملياً، لأن لا صفحة تستطيع إرسال
// Origin مطابق لمضيف الخادم؛ لكنه لا يحجب أي **عملية محلية** تستطيع إرسال طلب
// HTTP مباشر. التوكن يسدّ هذا الباب: عشوائي لكل تشغيل، ويُسلَّم للواجهة عبر
// ربط Wails وحده (IPC داخل العملية، غير قابل للوصول من خارجها)، ولا يُسجَّل
// في أي سجلّ (توكن في اللوج = توكن مسروق).
// ─────────────────────────────────────────────────────────────────────────────

// localApiSessionToken التوكن الساري لهذه العملية (يُولَّد في main قبل إنشاء
// خادم الأصول)، ويُقرأ عبر App.GetLocalApiToken. الحارس نفسه في
// service.LocalApiGuard، وهو المشمول باختبارات CI.
var localApiSessionToken string

func main() {
	// 🪵 تهيئة نظام التسجيل الموحد الوحيد (lumberjack + slog) — ملف واحد داخل logs/
	service.InitLogger()

	// 🧠 سقف ذاكرة ناعم لـ Go: مسار الطباعة يخصّص كانفس الورقة + كانفس
	// التركيب + دفعات الصور (قد تبلغ ~2GB ذروة مشروعة). السقف 3GiB يجعل
	// جامع القمامة يعمل قبل أن يصل التطبيق إلى حد النظام، بدل أن تفاجئه
	// نافذة 144MP على جهاز بذاكرة محدودة. الحد الناعم لا يرفض التخصيص، لكنه
	// يمنع تضخّم الكومة غير المستخدمة.
	debug.SetMemoryLimit(3 << 30)

	// 🔑 توكن جلسة مسارات /api المحلية — قبل إنشاء خادم الأصول (المستهلك له).
	// لا يُسجَّل أبداً: أي سطر لوج يحمله يُسرّبه لكل من يقرأ السجلّات.
	if token, err := utils.GenerateSecureToken(32); err != nil {
		slog.Error("Failed to generate local API session token — /api routes will reject all requests", "error", err.Error())
	} else {
		localApiSessionToken = token
	}

	// 🧯 ربط panics الـ goroutines بمسار الانهيار الموحّد — قبل إطلاق أي
	// goroutine محمية أدناه؛ فـ PanicHandler في Wails لا يرى إلا مساراته المُدارة.
	utils.SetPanicReporter(service.ReportGoroutinePanic)

	// 🧯 التعافي من الانهيار: العملية الجديدة تحمل وسم --crash-relaunch، فتنتظر
	// قليلاً حتى تُفلت العملية المنهارة قفل النسخة الواحدة قبل تهيئة Wails؛
	// وإلا ظنّت نفسها نسخة ثانية وهربت صامتة. أي إقلاع بلا الوسم إقلاع يدوي ⇒
	// انتهت سلسلة الانهيارات السابقة فتُصفّر حارس إعادات التشغيل.
	if service.IsCrashRelaunch(os.Args[1:]) {
		slog.Info("Crash relaunch detected — waiting for the previous instance lock to be released",
			"delay", service.CrashRelaunchSettleDelay.String())
		time.Sleep(service.CrashRelaunchSettleDelay)
	} else if err := service.ClearCrashRestartGuard(); err != nil {
		slog.Warn("Failed to clear crash restart guard", "error", err.Error())
	}

	// 🗄️ تهيئة قاعدة بيانات SQLite المحلية
	db, err := repository.InitDB()
	if err != nil {
		slog.Error("Failed to initialize SQLite database", "error", err.Error())
		os.Exit(1)
	}

	// تشغيل تنظيف الصور غير المستخدمة في الخلفية لتفادي تراكمها
	utils.SafeGo("repository.CleanupUnusedMedia", repository.CleanupUnusedMedia)

	// 🧹 تنظيف كاش الويب في بيئة التطوير لتفادي الكاش القديم للمتصفح
	if isDevMode() {
		cacheDir := desktop.GetWebviewCacheDir()
		_ = os.RemoveAll(cacheDir)
	}

	// تهيئة طبقات المعمارية النظيفة
	licenseRepo := repository.NewLicenseRepository(db)
	licenseSvc := service.NewLicenseService(licenseRepo)
	licenseHandler := handlers.NewLicenseHandler(licenseSvc)

	projectRepo := repository.NewProjectRepository(db)
	projectSvc := service.NewProjectService(projectRepo, licenseRepo)
	projectHandler := handlers.NewProjectHandler(projectSvc)

	printSvc := service.NewPrintService()
	printHandler := handlers.NewPrintHandler(printSvc)

	backupSvc := service.NewBackupService(projectRepo, licenseRepo)
	backupHandler := handlers.NewBackupHandler(backupSvc)

	// استعادة أبعاد وموقع النافذة من الجلسة السابقة.
	// الافتراضي 1280×800: كان 960×640 — وهو أصغر من نقطة انكسار الواجهة
	// (1024) فيفتح التطبيق في الوضع المدمج بلا ألواح جانبية إطلاقاً، ويتقلص
	// تلقائياً على الشاشات الأصغر من المفضل (انظر internal/desktop).
	initialWidth := desktop.DefaultWindowWidth
	initialHeight := desktop.DefaultWindowHeight
	if area, ok := desktop.WorkAreaForPointOrPrimary(0, 0); ok {
		initialWidth, initialHeight = desktop.ResolveDefaultWindowSize(area.W, area.H)
	}
	initialX := 0
	initialY := 0
	hasSavedPos := false
	startMax := false

	if state, err := desktop.LoadWindowState(); err == nil {
		if state.Width > 0 && state.Height > 0 {
			// المقاسات الافتراضية القديمة (960×640 و 1024×720) تُرقّى مرة واحدة
			// للافتراضي الجديد — وإلا بقي المستخدمون الحاليون على مقاس يخفي الألواح.
			// أي مقاس اختاره المستخدم بنفسه يبقى كما هو (بعد تنظيف التالف منه).
			if !desktop.IsLegacyDefaultWindowSize(state.Width, state.Height) {
				initialWidth, initialHeight = desktop.SanitizeRestoredSize(state.Width, state.Height)
			}
		}
		const maxScreenSize = 50000
		if state.X > -maxScreenSize && state.X < maxScreenSize &&
			state.Y > -maxScreenSize && state.Y < maxScreenSize &&
			(state.X != 0 || state.Y != 0) &&
			desktop.IsPointOnAnyMonitor(state.X+50, state.Y+50) {
			// احصر النافذة المستعادة داخل مساحة عمل الشاشة نفسها (ناقص شريط
			// المهام) فلا يُفتح جزء منها خارج الشاشة أو خلف شريط المهام
			initialWidth, initialHeight, initialX, initialY = desktop.ClampWindowToWorkArea(
				initialWidth, initialHeight, state.X, state.Y, desktop.WorkAreasAround(state.X+50, state.Y+50))
			hasSavedPos = true
		}
		startMax = state.Max
	}

	appInstance := NewApp(repository.NewCustomTemplateRepository(db))
	appInstance.licenseSvc = licenseSvc

	// 🖼️ دعم خيار "فتح باستخدام" وسحب الملفات على أيقونة التطبيق (CLI file open)
	if len(os.Args) > 1 {
		for _, arg := range os.Args[1:] {
			if strings.HasPrefix(arg, "-") {
				continue
			}
			if fi, err := os.Stat(arg); err == nil && !fi.IsDir() && isImageFilePath(arg) {
				appInstance.setStartupFile(arg)
			}
		}
	}

	var mainWindow *application.WebviewWindow

	// 📥 طابور حمولات المثيل الثاني (Single Instance) — يُملأ قبل وجود النافذة:
	// Wails يُشغّل OnSecondInstanceLaunch على goroutine مستقلة لحظة وصول إشعار
	// المثيل الثاني (الطابور في newSingleInstanceManager يعمل منذ application.New)،
	// أي أن النافذة قد لا تكون قد أُنشئت بعد — فقراءة mainWindow فوراً كانت
	// سباق بيانات، وقد تُفقد Show/Focus/UnMinimise وحدث file-opened كاملاً.
	// نراكم الحمولة هنا ثم تُصرَّف بعد اكتمال التهيئة (انظر drain أدناه).
	secondInstanceQueue := make(chan application.SecondInstanceData, 8)

	// 🔔 تهيئة خدمة الإشعارات التفاعلية لويندوز
	notifSvc := notifications.New()
	notifSvc.OnNotificationResponse(func(result notifications.NotificationResult) {
		if result.Error != nil {
			slog.Warn("Notification response error", "error", result.Error)
			return
		}
		if result.Response.UserInfo != nil {
			if path, ok := result.Response.UserInfo["filePath"].(string); ok && path != "" {
				_ = appInstance.ShowInFolder(path)
			} else if dir, ok := result.Response.UserInfo["folderPath"].(string); ok && dir != "" {
				_ = appInstance.OpenFolder(dir)
			}
		}
	})
	appInstance.desktopSvc.SetNotificationService(notifSvc)

	// تهيئة تطبيق Wails v3
	wailsApp := application.New(application.Options{
		Name:        "Grido Studio",
		Description: "Professional Photo & Collage Studio",
		PanicHandler: func(panicDetails *application.PanicDetails) {
			slog.Error("Fatal panic intercepted by Wails PanicHandler",
				"error", panicDetails.Error,
				"time", panicDetails.Time,
			)
			if appInstance != nil && appInstance.crashGuardSvc != nil {
				stack := panicDetails.FullStackTrace
				if stack == "" {
					stack = panicDetails.StackTrace
				}
				// حفظ ذري ثم إعادة تشغيل تلقائية (بحدود حارس الحلقات) ثم إنهاء
				// فوري: تسجيل PanicHandler مخصص يُلغي مسار الانهيار الافتراضي في
				// Wails، ولا يجوز الاستمرار بحالة فاسدة.
				appInstance.crashGuardSvc.HandleFatalPanic(panicDetails.Error, stack)
			}
			// شبكة أمان أخيرة: أي panic يصل إلى هنا يُنهي العملية بالرمز 1 كما
			// يفعل Wails افتراضياً — حتى لو تعذّر الحفظ أو غابت خدمة الرصد.
			os.Exit(1)
		},
		Services: []application.Service{
			application.NewService(appInstance),
			application.NewService(projectHandler),
			application.NewService(printHandler),
			application.NewService(backupHandler),
			application.NewService(licenseHandler),
			application.NewService(notifSvc),
		},
		Assets: application.AssetOptions{
			Handler:    createAssetHandler(appInstance),
			Middleware: createCSPMiddleware(),
		},
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "grido-studio-single-instance-lock-v1",
			OnSecondInstanceLaunch: func(secondInstanceData application.SecondInstanceData) {
				// 🛡️ إرسال غير محجوب: طابور ممتلئ أو لا مستهلك بعد لا يجوز أن
				// يُعلّق خيط أحداث المثيل الثاني — نُسجّل الفقدان صراحةً.
				select {
				case secondInstanceQueue <- secondInstanceData:
				default:
					slog.Warn("Second instance launch payload dropped — queue is full",
						"args", len(secondInstanceData.Args))
				}
			},
		},
		Windows: application.WindowsOptions{},
	})

	// إعداد خيارات النافذة الرئيسية مع خامة Mica الأصلية وسحب بدون تأخير
	winOptions := application.WebviewWindowOptions{
		Title:     "Grido Studio",
		Width:     initialWidth,
		Height:    initialHeight,
		MinWidth:  840,
		MinHeight: 560,
		Frameless: true,
		// 🪟 قاعدة دورة حياة Wails v3: لا `Hidden: true` + انتظار غير متزامن
		// لإظهار النافذة من خيط مختلف (سباق مع Win32/WebView2 قد يُلغي
		// الإظهار نهائياً — انظر .agents/rules/backend-wails-runtime.md وقاعدة
		// نجمة SKILL wails-v3-runtime-mastery §1.2). البديل الصحيح: Hidden
		// مخفي افتراضياً (false) مع تمرير حالة البدء صراحةً عبر StartState
		// (WindowStateMaximised أو WindowStateNormal) — يطبّقها Wails على خيط
		// الواجهة أثناء التهيئة فلا يرى المستخدم وميض حجم أو قفزة تكبير.
		Hidden:             false,
		ZoomControlEnabled: false,
		EnableFileDrop:     true,
		BackgroundType:     application.BackgroundTypeTranslucent,
		BackgroundColour:   application.NewRGBA(0, 0, 0, 0),
		Windows: application.WindowsWindow{
			BackdropType:                      application.Mica,
			DisableFramelessWindowDecorations: false,
			NonClientRegionSupport:            true,
		},
		URL: "/",
	}

	if startMax {
		winOptions.StartState = application.WindowStateMaximised
	} else {
		winOptions.StartState = application.WindowStateNormal
	}

	if hasSavedPos {
		winOptions.X = initialX
		winOptions.Y = initialY
	} else {
		winOptions.InitialPosition = application.WindowCentered
	}

	mainWindow = wailsApp.Window.NewWithOptions(winOptions)
	appInstance.desktopSvc.SetMainWindow(mainWindow)

	// 🪟 النافذة تُنشأ الآن ظاهرة (Hidden:false + StartState) فلا حاجة لروتين
	// إظهار مؤجَّل. نكتفي بتأكيد التركيز مرة واحدة وبخنق زمني للتنظيف الأول:
	// WindowRuntimeReady قد يصل أكثر من مرة (إعادة تحميل/استرجاع WebView2)،
	// فمرحلة الإقلاع محميّة بـ sync.Once — Once.Do لا يعيد شيئاً أبداً.
	var runtimeReadyOnce sync.Once
	mainWindow.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
		runtimeReadyOnce.Do(func() {
			mainWindow.Show()
			mainWindow.Focus()
			// 🧹 تنظيف ذكي لذاكرة الإقلاع بعد استقرار واجهة المستخدم
			time.AfterFunc(2*time.Second, func() {
				if appInstance != nil && appInstance.memorySvc != nil {
					appInstance.memorySvc.TrimNow()
				}
			})
		})
	})

	// 🧹 تفريغ ذاكرة العمل عند تصغير النافذة فقط — وبخنق زمني 5 دقائق:
	// فقدان التركيز أُزيل تماماً لأنه لا يعني ضغط ذاكرة إطلاقاً؛ المستخدم
	// ينتقل بين نوافذ أخرى باستمرار، وكل فقدان كان يُطلق دورة GC كاملة
	// (stop-the-world) + EmptyWorkingSet لكل عمليات WebView2 التابعة، فتُجمِّد
	// الواجهة للحظات بلا سبب. التنظيف الدوري (StartAutoTrim) يحمي الذاكرة.
	mainWindow.OnWindowEvent(events.Common.WindowMinimise, func(_ *application.WindowEvent) {
		if appInstance != nil && appInstance.memorySvc != nil {
			appInstance.memorySvc.TrimThrottled()
		}
	})

	// 🧹 الاستماع لأحداث تفريغ الذاكرة القادمة من الواجهة
	wailsApp.Event.On("app:trim-memory", func(_ *application.CustomEvent) {
		if appInstance != nil && appInstance.memorySvc != nil {
			appInstance.memorySvc.TrimNow()
		}
	})

	// 🗂️ أيقونة صينية النظام: نقطة استعادة دائمة للنافذة (إظهار/تركيز) ومسار
	// خروج سريع، فتبقى واجهة التطبيق قابلة للوصول أثناء عمليات الخلفية.
	// الاستدعاء قبل Run صحيح ومقصود: Wails يؤجّل إنشاء الصينية حتى الإقلاع.
	SetupSystemTray(wailsApp, mainWindow)

	// 📥 تصريف حمولات المثيل الثاني بعد وجود النافذة — يُغلق الفتحة بين
	// application.New (بداية الاستماع لإشارات المثيل الثاني) وإنشاء النافذة:
	// أي حمولة وصلت قبله تُعالج الآن بالترتيب، فلا يُفقد إظهار/تركيز النافذة
	// ولا حدث file-opened الذي يستمعه الواجهة. الخيط يعيش طول التطبيق.
	utils.SafeGo("main.second-instance-drain", func() {
		for secondInstanceData := range secondInstanceQueue {
			if mainWindow == nil {
				continue
			}
			if mainWindow.IsMinimised() {
				mainWindow.UnMinimise()
			}
			mainWindow.Show()
			mainWindow.Focus()
			for _, arg := range secondInstanceData.Args {
				if strings.HasPrefix(arg, "-") {
					continue
				}
				if fi, err := os.Stat(arg); err == nil && !fi.IsDir() && isImageFilePath(arg) {
					wailsApp.Event.Emit("file-opened", arg)
				}
			}
		}
	})

	// 📂 معالجة سحب وإفلات الملفات من نظام التشغيل مباشرة
	mainWindow.OnWindowEvent(events.Common.WindowFilesDropped, func(e *application.WindowEvent) {
		ctx := e.Context()
		if ctx == nil {
			return
		}
		paths := ctx.DroppedFiles()
		if len(paths) == 0 {
			return
		}
		var validPaths []string
		for _, p := range paths {
			if isImageFilePath(p) {
				validPaths = append(validPaths, p)
			}
		}
		if len(validPaths) == 0 {
			return
		}
		processed, err := appInstance.mediaSvc.ProcessMultipleOpenedFiles(validPaths)
		if err == nil && len(processed) > 0 {
			wailsApp.Event.Emit("native-file-drop", map[string]any{
				"images": processed,
			})
		}
	})

	// ── تتبع أبعاد النافذة قبل التكبير (Restored Geometry) ─────────────
	// عند الإغلاق أثناء التكبير، mainWindow.Size() تُرجع أبعاد الشاشة
	// الكاملة — وإذا فُفتح التطبيق لاحقاً على شاشة أصغر بحالة max=false
	// (شاشة فُصلت مثلاً)، تظهر النافذة بحجم مبالغ فيه.
	// الحل: نتذكر آخر أبعاد وموضع "طبيعي" ونحفظها بدل أبعاد التكبير.
	//
	// 🔒 سباق البيانات: Wails يُوزّع كل مستمع حدث نافذة على goroutine مستقلة
	// (WebviewWindow.HandleWindowEvent → `go func()` لكل مستمع)، فكانت
	// restoredW/H و restoredX/Y و lastMaximised تُقرأ وتُكتب بالتوازي من
	// مسارات WindowDidResize و WindowDidMove و WindowClosing والحفظ الدوري.
	// القاعدة الصارمة: استدعِ Wails أولاً (Size/Position/IsMaximised) ثم
	// اقفل القفل واكتب — فلا يُحمل القفل أبداً أثناء نداء Wails (InvokeSync
	// ينتظر خيط الواجهة الرئيسي، وحمله أثناء نداء آخر قد يُشلّ الإقلاع).
	var geometryMu sync.Mutex
	restoredW, restoredH := initialWidth, initialHeight
	restoredX, restoredY := initialX, initialY

	// تحديث الأبعاد الطبيعية عند كل تغيير حجم/موضع بشرط عدم التكبير، وبثّ حالة التكبير
	// بثّ حالة التكبير عند تغيّرها فقط — كان يُبثّ في كل دورة WindowDidResize
	// حتى مع ثبات القيمة فيُغرق الواجهة برسائل بلا معلومة أثناء سحب حدّ النافذة.
	lastMaximised := mainWindow.IsMaximised()
	mainWindow.OnWindowEvent(events.Common.WindowDidResize, func(_ *application.WindowEvent) {
		isMax := mainWindow.IsMaximised()
		if !isMax && !mainWindow.IsFullscreen() {
			sizeW, sizeH := mainWindow.Size()
			geometryMu.Lock()
			restoredW, restoredH = sizeW, sizeH
			geometryMu.Unlock()
		}
		geometryMu.Lock()
		maxChanged := isMax != lastMaximised
		if maxChanged {
			lastMaximised = isMax
		}
		geometryMu.Unlock()
		if maxChanged {
			wailsApp.Event.Emit("window-maximized-changed", isMax)
		}
	})
	mainWindow.OnWindowEvent(events.Common.WindowDidMove, func(_ *application.WindowEvent) {
		if !mainWindow.IsMaximised() && !mainWindow.IsFullscreen() {
			posX, posY := mainWindow.Position()
			geometryMu.Lock()
			restoredX, restoredY = posX, posY
			geometryMu.Unlock()
		}
	})

	// ── دالة مساعدة لبناء حالة النافذة الحالية ─────────────────────────
	buildWindowState := func() desktop.WindowState {
		isMax := mainWindow.IsMaximised()
		var w, h, x, y int
		if isMax {
			geometryMu.Lock()
			w, h, x, y = restoredW, restoredH, restoredX, restoredY
			geometryMu.Unlock()
		} else {
			w, h = mainWindow.Size()
			x, y = mainWindow.Position()
		}
		return desktop.WindowState{Width: w, Height: h, X: x, Y: y, Max: isMax}
	}

	// 🔒 قفل مستقل لكتابة ملف حالة النافذة: SaveWindowState ليس مؤمّناً
	// داخلياً (مسار .tmp واحد تحت utils.AtomicWriteFile)، وخيط الإغلاق
	// والحفظ الدوري كل 30 ثانية يعملان معاً — التسلسل هنا يمنع تداخل
	// كتابتين على نفس الملف.
	var saveStateMu sync.Mutex
	saveWindowStateNow := func() {
		state := buildWindowState()
		saveStateMu.Lock()
		defer saveStateMu.Unlock()
		_ = desktop.SaveWindowState(state)
	}

	// ⏱️ حفظ دوري كل 30 ثانية — يحمي من فقدان الحالة عند الإغلاق القسري
	// (kill, crash, انقطاع كهربائي). الحفظ ذري (AtomicWriteFile) فلا فساد.
	utils.SafeGo("main.window-state-autosave", func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			saveWindowStateNow()
		}
	})

	// ── إغلاق النافذة: حفظ الحالة ثم خروج نظيف (عقد app:quit-requested) ──
	//
	// ⚠️ سجل SDK (v3.0.0-beta.28): `Windows.WindowClosing` لا يُلغى من مسار
	// الإغلاق الأصلي (زر X / Alt+F4): معالج WM_CLOSE يبثّ الحدث فقط ويعيد 0،
	// والمستمع الافتراضي في NewWindow هو من يُغلق النافذة فعلياً. لكن
	// RegisterHook يعمل **متزامناً قبل** كل المستمعين، ونداء event.Cancel()
	// يُسقط توزيعهم بالكامل — أي أن إلغاء الحدث يمنع المستمع الافتراضي من
	// الإغلاق فيبقى الإغلاق تحت سيطرتنا (نُمرّر الحالة للواجهة لتفريغ الحفظ
	// التلقائي أولاً، ومهلة الأمان تضمن الخروج لو تعذّر ذلك).
	mainWindow.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		saveWindowStateNow()
		if event != nil {
			event.Cancel()
		}
		requestGracefulQuit(wailsApp)
	})

	// إيقاف الخدمات وتنظيف الموارد عند إغلاق التطبيق
	wailsApp.OnShutdown(func() {
		// 🛑 الخروج المؤكَّد: نُلغي مؤقت أمان الخروج المعلّق كي لا يُطلق
		// Quit على تطبيق في طريق الإغلاق (OnShutdown يعمل فقط عبر App.Quit).
		cancelQuitSafetyTimeout()
		repository.StopCleanupUnusedMedia()
		_ = repository.CloseDB()
	})

	err = wailsApp.Run()
	if err != nil {
		slog.Error("Wails run encountered an error", "error", err.Error())
		os.Exit(1)
	}
}

func createAssetHandler(app *App) http.Handler {
	var memorySvc *service.MemoryService
	var imageProc *service.ImageProcessorService
	var mediaSvc *service.MediaService
	var scannerWarp *service.ScannerWarpService
	if app != nil {
		memorySvc = app.memorySvc
		imageProc = app.imageProc
		mediaSvc = app.mediaSvc
		if mediaSvc != nil {
			scannerWarp = service.NewScannerWarpService(mediaSvc)
		}
	}

	return server.NewAssetHandler(server.AssetServerDeps{
		FileServer:   application.AssetFileServerFS(assets),
		SessionToken: localApiSessionToken,
		MemorySvc:    memorySvc,
		ImageProc:    imageProc,
		MediaSvc:     mediaSvc,
		ScannerWarp:  scannerWarp,
	})
}

func createCSPMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			devScriptSrc := "'self' 'wasm-unsafe-eval'"
			// 🔒 تفخيخ CSP مقصور على بيئة التطوير: خادم الأصول في الإنتاج
			// يستقبل كل طلباته على المضيف wails.localhost، فالمطابقة الجزئية
			// `Contains("localhost")` كانت تُضعف سياسة الإنتاج برمّتها
			// (unsafe-inline + unsafe-eval) لكل صفحة — أي أن CSP الإنتاج
			// كانت ملغاة عملياً. مطابقة المضيف الآن حرفية بلا Contains.
			if isDevMode() || isDevAssetHost(r.Host) {
				devScriptSrc = "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
			}
			w.Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src "+devScriptSrc+"; "+
					"style-src 'self' 'unsafe-inline'; "+
					"img-src 'self' data: blob: https:; "+
					"font-src 'self' data:; "+
					"connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co https://*.modal.run https://api.modal.com; "+
					"worker-src 'self' blob:; "+
					"object-src 'none'; "+
					"base-uri 'self'; "+
					"frame-ancestors 'none';")

			if strings.HasSuffix(r.URL.Path, ".wasm") {
				w.Header().Set("Content-Type", "application/wasm")
			} else if strings.HasSuffix(r.URL.Path, ".onnx") || strings.HasSuffix(r.URL.Path, ".ort") || strings.HasSuffix(r.URL.Path, ".bin") {
				w.Header().Set("Content-Type", "application/octet-stream")
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isDevMode() bool {
	// كشف بيئة التطوير موحّد في utils (يُستخدَم أيضًا لتقييد قراءة .env من مجلد
	// العمل في internal/service) — وسم البناء هو الحاكم، والكشف بالبيئة يكمّله.
	return isDevBuild || utils.IsDevEnvironment()
}

// isDevAssetHost يطابق مضيف خادم تطوير Vite حرفياً (منفذ 9245 كما في
// Taskfile.yml → WAILS_VITE_PORT و frontend/vite.config.ts). المقارنة تتم على
// المضيف كاملاً (بمنفذه) وبعد تصغير الأحرف — فلا تُطابق "localhost" اسم مضيف
// أطول يحتويها مثل wails.localhost الذي يُقدّم خادم أصول الإنتاج.
func isDevAssetHost(host string) bool {
	switch strings.ToLower(strings.TrimSpace(host)) {
	case "localhost:9245", "127.0.0.1:9245", "[::1]:9245":
		return true
	default:
		return false
	}
}

// isImageFilePath يفحص امتدادات الصور المدعومة — مصدر وحيد لكل مداخل فتح
// الصور (وسائط CLI، إطلاق مثيل ثانٍ، السحب والإفلات) لمنع تفرّع قوائم
// الامتدادات في ثلاثة مواضع (حظر ازدواجية المنطق).
func isImageFilePath(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp":
		return true
	default:
		return false
	}
}
