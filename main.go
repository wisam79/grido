package main

import (
	"embed"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
			if fi, err := os.Stat(arg); err == nil && !fi.IsDir() {
				ext := strings.ToLower(filepath.Ext(arg))
				switch ext {
				case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp":
					appInstance.setStartupFile(arg)
				}
			}
		}
	}

	var mainWindow *application.WebviewWindow

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
				if mainWindow != nil {
					mainWindow.UnMinimise()
					mainWindow.Show()
					mainWindow.Focus()
				}
				if len(secondInstanceData.Args) > 0 {
					for _, arg := range secondInstanceData.Args {
						if strings.HasPrefix(arg, "-") {
							continue
						}
						if fi, err := os.Stat(arg); err == nil && !fi.IsDir() {
							ext := strings.ToLower(filepath.Ext(arg))
							switch ext {
							case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp":
								if application.Get() != nil {
									application.Get().Event.Emit("file-opened", arg)
								}
							}
						}
					}
				}
			},
		},
		Windows: application.WindowsOptions{},
	})

	// إعداد خيارات النافذة الرئيسية مع خامة Mica الأصلية وسحب بدون تأخير
	winOptions := application.WebviewWindowOptions{
		Title:              "Grido Studio",
		Width:              initialWidth,
		Height:             initialHeight,
		MinWidth:           840,
		MinHeight:          560,
		Frameless:          true,
		Hidden:             true, // تبدأ مخفية لمنع وميض الحجم — تُظهر بعد WindowRuntimeReady
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

	// 🪟 إظهار النافذة بعد جاهزية الـ WebView لمنع وميض الحجم الأولي:
	// النافذة تبدأ مخفية (Hidden:true) فلا يرى المستخدم إطاراً فارغاً أو
	// قفزة حجم من الافتراضي إلى المُكبّر — تظهر بعد اكتمال تحميل الواجهة.
	mainWindow.OnWindowEvent(events.Common.WindowRuntimeReady, func(_ *application.WindowEvent) {
		mainWindow.Show()
		mainWindow.Focus()
		// 🧹 تنظيف ذكي لذاكرة الإقلاع بعد استقرار واجهة المستخدم
		time.AfterFunc(2*time.Second, func() {
			if appInstance != nil && appInstance.memorySvc != nil {
				appInstance.memorySvc.TrimNow()
			}
		})
	})

	// 🧹 تفريغ ذاكرة العمل (Working Set) تلقائياً عند تصغير النافذة أو فقدان التركيز
	mainWindow.OnWindowEvent(events.Common.WindowMinimise, func(_ *application.WindowEvent) {
		if appInstance != nil && appInstance.memorySvc != nil {
			appInstance.memorySvc.TrimNow()
		}
	})
	mainWindow.OnWindowEvent(events.Common.WindowLostFocus, func(_ *application.WindowEvent) {
		if appInstance != nil && appInstance.memorySvc != nil {
			appInstance.memorySvc.TrimNow()
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
			ext := strings.ToLower(filepath.Ext(p))
			switch ext {
			case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp":
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
	// الكاملة — وإذا فُتح التطبيق لاحقاً على شاشة أصغر بحالة max=false
	// (شاشة فُصلت مثلاً)، تظهر النافذة بحجم مبالغ فيه.
	// الحل: نتذكر آخر أبعاد وموضع "طبيعي" ونحفظها بدل أبعاد التكبير.
	restoredW, restoredH := initialWidth, initialHeight
	restoredX, restoredY := initialX, initialY

	// تحديث الأبعاد الطبيعية عند كل تغيير حجم/موضع بشرط عدم التكبير، وبثّ حالة التكبير
	// بثّ حالة التكبير عند تغيّرها فقط — كان يُبثّ في كل دورة WindowDidResize
	// حتى مع ثبات القيمة فيُغرق الواجهة برسائل بلا معلومة أثناء سحب حدّ النافذة.
	lastMaximised := mainWindow.IsMaximised()
	mainWindow.OnWindowEvent(events.Common.WindowDidResize, func(_ *application.WindowEvent) {
		isMax := mainWindow.IsMaximised()
		if !isMax && !mainWindow.IsFullscreen() {
			restoredW, restoredH = mainWindow.Size()
		}
		if isMax != lastMaximised {
			lastMaximised = isMax
			wailsApp.Event.Emit("window-maximized-changed", isMax)
		}
	})
	mainWindow.OnWindowEvent(events.Common.WindowDidMove, func(_ *application.WindowEvent) {
		if !mainWindow.IsMaximised() && !mainWindow.IsFullscreen() {
			restoredX, restoredY = mainWindow.Position()
		}
	})

	// ── دالة مساعدة لبناء حالة النافذة الحالية ─────────────────────────
	buildWindowState := func() desktop.WindowState {
		isMax := mainWindow.IsMaximised()
		var w, h, x, y int
		if isMax {
			w, h = restoredW, restoredH
			x, y = restoredX, restoredY
		} else {
			w, h = mainWindow.Size()
			x, y = mainWindow.Position()
		}
		return desktop.WindowState{Width: w, Height: h, X: x, Y: y, Max: isMax}
	}

	// حفظ مقاسات وموضع النافذة عند إغلاقها
	mainWindow.OnWindowEvent(events.Common.WindowClosing, func(_ *application.WindowEvent) {
		_ = desktop.SaveWindowState(buildWindowState())
	})

	// ⏱️ حفظ دوري كل 30 ثانية — يحمي من فقدان الحالة عند الإغلاق القسري
	// (kill, crash, انقطاع كهربائي). الحفظ ذري (AtomicWriteFile) فلا فساد.
	utils.SafeGo("main.window-state-autosave", func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			_ = desktop.SaveWindowState(buildWindowState())
		}
	})

	// إيقاف الخدمات وتنظيف الموارد عند إغلاق التطبيق
	wailsApp.OnShutdown(func() {
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
	if app != nil {
		memorySvc = app.memorySvc
		imageProc = app.imageProc
		mediaSvc = app.mediaSvc
	}

	return server.NewAssetHandler(server.AssetServerDeps{
		FileServer:   application.AssetFileServerFS(assets),
		SessionToken: localApiSessionToken,
		MemorySvc:    memorySvc,
		ImageProc:    imageProc,
		MediaSvc:     mediaSvc,
	})
}

func createCSPMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			devScriptSrc := "'self' 'wasm-unsafe-eval'"
			if isDevMode() || strings.Contains(r.Host, "9245") || strings.Contains(r.Host, "localhost") || strings.Contains(r.Host, "127.0.0.1") {
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
