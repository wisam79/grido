package main

import (
	"context"
	"embed"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"grido/internal/handlers"
	"grido/internal/repository"
	"grido/internal/service"
	"grido/internal/utils"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 🪵 تهيئة نظام التسجيل الموحد (slog) لحفظ السجلات في ملف app.log
	logFile, logErr := utils.InitLogger()
	if logErr == nil {
		defer logFile.Close()
	}

	// 🔒 قفل تشغيل مثيل واحد فقط للتطبيق لمنع مشاكل تعارض الملفات
	cleanup, err := checkSingleInstance()
	if err != nil {
		slog.Error("Grido Studio is already running. Exiting...")
		os.Exit(0)
	}
	defer cleanup()

	// 🗄️ تهيئة قاعدة بيانات SQLite المحلية
	db, err := repository.InitDB()
	if err != nil {
		slog.Error("Failed to initialize SQLite database", "error", err.Error())
		os.Exit(1)
	}

	// تشغيل تنظيف الصور غير المستخدمة في الخلفية لتفادي تراكمها
	go repository.CleanupUnusedMedia()

	// 🧹 تنظيف كاش الويب في بيئة التطوير لتفادي الكاش القديم للمتصفح
	if os.Getenv("WAILS_DEV") == "true" {
		cacheDir := getWebviewCacheDir()
		_ = os.RemoveAll(cacheDir)
	}

	// تهيئة طبقات المعمارية النظيفة
	projectRepo := repository.NewProjectRepository(db)
	projectSvc := service.NewProjectService(projectRepo)
	projectHandler := handlers.NewProjectHandler(projectSvc)

	printSvc := service.NewPrintService()
	printHandler := handlers.NewPrintHandler(printSvc)

	// استعادة أبعاد وموقع النافذة من الجلسة السابقة
	initialWidth := 1280
	initialHeight := 820
	if state, err := loadWindowState(); err == nil {
		if state.Width > 0 && state.Height > 0 {
			initialWidth = state.Width
			initialHeight = state.Height
		}
	}

	app := NewApp()

	err = wails.Run(&options.App{
		Title:             "Grido Studio",
		Width:             initialWidth,
		Height:            initialHeight,
		MinWidth:          900,
		MinHeight:         600,
		StartHidden:       true, // إخفاء النافذة أثناء التحميل الأولي لتفادي الوميض
		AssetServer: &assetserver.Options{
			Assets: assets,
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.HasPrefix(r.URL.Path, "/local-image/") {
					filePath := strings.TrimPrefix(r.URL.Path, "/local-image/")
					filename := filepath.Base(filepath.Clean(filePath))

					// 🔒 التحقق الأمني: السماح فقط بالملفات داخل مجلد Media المعتمد
					mediaDir := getMediaDir()
					absPath := filepath.Join(mediaDir, filename)

					if _, err := os.Stat(absPath); err == nil {
						file, err := os.Open(absPath)
						if err != nil {
							http.Error(w, "Unable to open image file", http.StatusInternalServerError)
							return
						}
						defer file.Close()

						// قراءة أول 512 بايت للتحقق من نوع MIME للملف
						buf := make([]byte, 512)
						n, err := file.Read(buf)
						if err != nil && err != io.EOF {
							http.Error(w, "Unable to read image headers", http.StatusInternalServerError)
							return
						}

						contentType := http.DetectContentType(buf[:n])
						if !strings.HasPrefix(contentType, "image/") {
							http.Error(w, "Forbidden: Invalid file content type", http.StatusForbidden)
							return
						}

						// تعيين رؤوس الأمان المناسبة
						w.Header().Set("X-Content-Type-Options", "nosniff")
						w.Header().Set("Content-Type", contentType)

						// إرجاع مؤشر القراءة للبداية
						_, _ = file.Seek(0, 0)
						stat, err := file.Stat()
						if err != nil {
							http.Error(w, "Unable to stat file", http.StatusInternalServerError)
							return
						}

						http.ServeContent(w, r, filename, stat.ModTime(), file)
						return
					} else {
						http.Error(w, "Image not found on disk", http.StatusNotFound)
						return
					}
				}
				http.NotFound(w, r)
			}),
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					// Ensure WebAssembly and model files are served with correct MIME types
					if strings.HasSuffix(r.URL.Path, ".wasm") {
						w.Header().Set("Content-Type", "application/wasm")
					} else if strings.HasSuffix(r.URL.Path, ".onnx") || strings.HasSuffix(r.URL.Path, ".ort") {
						w.Header().Set("Content-Type", "application/octet-stream")
					}

					next.ServeHTTP(w, r)
				})
			},
		},
		BackgroundColour:  &options.RGBA{R: 0, G: 0, B: 0, A: 0},
		OnStartup: func(ctx context.Context) {
			// استعادة موضع النافذة وحالة التكبير عند بدء التشغيل
			if state, err := loadWindowState(); err == nil {
				if state.X != 0 || state.Y != 0 {
					wailsruntime.WindowSetPosition(ctx, state.X, state.Y)
				}
				if state.Max {
					wailsruntime.WindowMaximise(ctx)
				}
			}
			app.startup(ctx)
		},
		OnDomReady: func(ctx context.Context) {
			wailsruntime.WindowShow(ctx)
		},
		OnShutdown: func(ctx context.Context) {
			// حفظ مقاسات وموضع النافذة عند إغلاق التطبيق
			isMax := wailsruntime.WindowIsMaximised(ctx)
			w, h := wailsruntime.WindowGetSize(ctx)
			x, y := wailsruntime.WindowGetPosition(ctx)

			state := windowState{
				Width:  w,
				Height: h,
				X:      x,
				Y:      y,
				Max:    isMax,
			}
			_ = saveWindowState(state)

			// إغلاق آمن لقاعدة البيانات
			_ = repository.CloseDB()

			app.shutdown(ctx)
		},
		Bind: []interface{}{
			app,
			projectHandler, // ربط طبقة التحكم مع Wails
			printHandler,
		},
		Frameless:         true,
		Windows: &windows.Options{
			WebviewIsTransparent:              true,
			WindowIsTranslucent:               true,
			BackdropType:                      windows.Mica,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			WebviewUserDataPath:              getWebviewCacheDir(), // تعيين مجلد الكاش الآمن لـ WebView2
			OnSuspend: func() {
				slog.Info("Entering suspend mode...")
				// ملاحظة: لا نغلق قاعدة البيانات لأن الـ Repository يحتفظ بمرجع قديم
				// SQLite يتعامل مع وضع السكون بأمان بدون تدخل
			},
			OnResume: func() {
				slog.Info("Resuming from suspend...")
			},
		},
	})

	if err != nil {
		slog.Error("Wails run encountered an error", "error", err.Error())
		os.Exit(1)
	}
}
