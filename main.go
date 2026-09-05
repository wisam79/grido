package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	// 🪵 تهيئة نظام التسجيل الموحد الوحيد (lumberjack + slog) — ملف واحد داخل logs/
	service.InitLogger()

	// 🔒 قفل تشغيل مثيل واحد فقط للتطبيق لمنع مشاكل تعارض الملفات
	cleanup, err := checkSingleInstance()
	if err != nil {
		slog.Error("Grido Studio is already running. Exiting...")
		os.Exit(1)
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

	// استعادة أبعاد وموقع النافذة من الجلسة السابقة
	initialWidth := 1024
	initialHeight := 720
	if state, err := loadWindowState(); err == nil {
		if state.Width > 0 && state.Height > 0 {
			initialWidth = state.Width
			initialHeight = state.Height
		}
	}

	app := NewApp(repository.NewCustomTemplateRepository(db))

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
					app.setStartupFile(arg)
				}
			}
		}
	}

	err = wails.Run(&options.App{
		Title:       "Grido Studio",
		Width:       initialWidth,
		Height:      initialHeight,
		MinWidth:    900,
		MinHeight:   600,
		StartHidden: true, // إخفاء النافذة أثناء التحميل الأولي لتفادي الوميض
		AssetServer: &assetserver.Options{
			Assets: assets,
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method == http.MethodPost && r.URL.Path == "/api/save-file" {
					filename := r.URL.Query().Get("filename")
					if filename == "" {
						filename = "exported_photo.png"
					}
					filename = filepath.Base(filepath.Clean(filename))

					var filePath string
					dir := r.URL.Query().Get("dir")
					if dir != "" {
						cleanDir := filepath.Clean(dir)
						if fi, err := os.Stat(cleanDir); err == nil && fi.IsDir() {
							filePath = filepath.Join(cleanDir, filename)
						}
					}

					if filePath == "" {
						ext := strings.ToLower(filepath.Ext(filename))
						var filters []wailsruntime.FileFilter
						if ext == ".png" {
							filters = []wailsruntime.FileFilter{{DisplayName: "PNG Image (*.png)", Pattern: "*.png"}}
						} else {
							filters = []wailsruntime.FileFilter{{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"}}
						}

						var err error
						filePath, err = wailsruntime.SaveFileDialog(app.ctx, wailsruntime.SaveDialogOptions{
							Title:           "Save Image",
							DefaultFilename: filename,
							Filters:         filters,
						})
						if err != nil {
							http.Error(w, "Dialog error: "+err.Error(), http.StatusInternalServerError)
							return
						}
						if filePath == "" {
							w.WriteHeader(http.StatusNoContent)
							return
						}
					}

					tmpPath := fmt.Sprintf("%s.%d.tmp", filePath, time.Now().UnixNano())
					defer os.Remove(tmpPath)

					outFile, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
					if err != nil {
						http.Error(w, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
						return
					}

					limitReader := io.LimitReader(r.Body, service.MaxFileSize)
					if _, err := io.Copy(outFile, limitReader); err != nil {
						_ = outFile.Close()
						http.Error(w, "Failed to write file: "+err.Error(), http.StatusInternalServerError)
						return
					}
					if err := outFile.Sync(); err != nil {
						_ = outFile.Close()
						http.Error(w, "Failed to sync file: "+err.Error(), http.StatusInternalServerError)
						return
					}
					if err := outFile.Close(); err != nil {
						http.Error(w, "Failed to close file: "+err.Error(), http.StatusInternalServerError)
						return
					}
					if err := os.Rename(tmpPath, filePath); err != nil {
						http.Error(w, "Failed to finalize file: "+err.Error(), http.StatusInternalServerError)
						return
					}

					w.Header().Set("Content-Type", "application/json")
					_ = json.NewEncoder(w).Encode(map[string]string{"status": "success", "path": filePath})
					return
				}

				if strings.HasPrefix(r.URL.Path, "/local-image/") {
					filePath := strings.TrimPrefix(r.URL.Path, "/local-image/")
					filename := filepath.Base(filepath.Clean(filePath))

					// 🔒 التحقق الأمني: السماح بالملفات داخل مجلد Media، أو مجلد Exports للملفات المؤقتة التي تبدأ بـ print_
					var baseDir string
					if strings.HasPrefix(filename, "print_") {
						baseDir = filepath.Join(utils.GetAppDir(), "Exports")
					} else {
						baseDir = app.mediaSvc.GetMediaDir()
					}
					absPath := filepath.Join(baseDir, filename)

					if _, err := os.Stat(absPath); err != nil {
						http.Error(w, "Image not found on disk", http.StatusNotFound)
						return
					}

					// 🔒 حماية ضد هجمات Symlink: تحليل المسار بالكامل والتأكد من بقائه داخل المجلد المعتمد
					resolvedPath, err := filepath.EvalSymlinks(absPath)
					if err != nil {
						http.Error(w, "Forbidden", http.StatusForbidden)
						return
					}
					if !strings.HasPrefix(resolvedPath, filepath.Clean(baseDir)+string(filepath.Separator)) &&
						resolvedPath != filepath.Clean(baseDir) {
						http.Error(w, "Forbidden", http.StatusForbidden)
						return
					}

					// تعيين رؤوس الأمان والسرعة والتخزين المؤقت الطويل لأن أسماء الملفات فريدة
					w.Header().Set("X-Content-Type-Options", "nosniff")
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")

					// تحديد نوع المحتوى بدقة بناءً على الامتداد — يدعم png وjpeg وwebp وgif
					ext := strings.ToLower(filepath.Ext(filename))
					contentType := mime.TypeByExtension(ext)
					if contentType == "" {
						contentType = "application/octet-stream"
					}
					w.Header().Set("Content-Type", contentType)

					http.ServeFile(w, r, absPath)
					return
				}
				http.NotFound(w, r)
			}),
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					// 🔒 تطبيق رأس حماية أمني مشدد (Content Security Policy) للـ WebView2
					// يسمح بـ WebAssembly (OpenCV/MediaPipe) و Web Workers والمصادر الخارجية المصرح بها فقط
					w.Header().Set("Content-Security-Policy",
						"default-src 'self'; "+
							"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; "+
							"style-src 'self' 'unsafe-inline'; "+
							"img-src 'self' data: blob: https:; "+
							"font-src 'self' data:; "+
							"connect-src 'self' https://*.supabase.co https://*.modal.run https://api.modal.com; "+
							"worker-src 'self' blob:;")

					// Ensure WebAssembly and model files are served with correct MIME types
					if strings.HasSuffix(r.URL.Path, ".wasm") {
						w.Header().Set("Content-Type", "application/wasm")
					} else if strings.HasSuffix(r.URL.Path, ".onnx") || strings.HasSuffix(r.URL.Path, ".ort") || strings.HasSuffix(r.URL.Path, ".bin") {
						w.Header().Set("Content-Type", "application/octet-stream")
					}

					next.ServeHTTP(w, r)
				})
			},
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		OnStartup: func(ctx context.Context) {
			// استعادة موضع النافذة وحالة التكبير عند بدء التشغيل
			if state, err := loadWindowState(); err == nil {
				// حماية متقدمة: التحقق أن الموضع السابق يقع ضمن شاشة متصلة فعلياً (لمنع النوافذ الشبحية عند فصل شاشة خارجية)
				const maxScreenSize = 50000
				if state.X > -maxScreenSize && state.X < maxScreenSize &&
					state.Y > -maxScreenSize && state.Y < maxScreenSize &&
					(state.X != 0 || state.Y != 0) &&
					isPointOnAnyMonitor(state.X+50, state.Y+50) {
					wailsruntime.WindowSetPosition(ctx, state.X, state.Y)
				} else if state.X != 0 || state.Y != 0 {
					wailsruntime.WindowCenter(ctx)
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
			defer func() {
				if r := recover(); r != nil {
					// حماية من خطأ runtime panic (ScaleToDefaultDPI/divide by zero) عند الإغلاق السريع لـ Wails
				}
			}()
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

			// إيقاف تنظيف الميديا بشكل آمن
			repository.StopCleanupUnusedMedia()

			// إغلاق آمن لقاعدة البيانات
			_ = repository.CloseDB()

			app.shutdown(ctx)
		},
		Bind: []interface{}{
			app,
			projectHandler, // ربط طبقة التحكم مع Wails
			printHandler,
			backupHandler,
			licenseHandler,
		},
		Frameless: true,
		Windows: &windows.Options{
			WebviewIsTransparent:              false, // إيقاف الشفافية لأنها تسبب مشاكل بصرية وظهور خلفية سوداء في ويندوز 10
			WindowIsTranslucent:               false,
			BackdropType:                      windows.None, // إيقاف Mica لأنه مدعوم فقط في ويندوز 11 ويتسبب بتشوهات في ويندوز 10
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false, // الحفاظ على هذه كـ false للإبقاء على ظل النافذة الافتراضي لنظام ويندوز
			WebviewUserDataPath:               getWebviewCacheDir(), // تعيين مجلد الكاش الآمن لـ WebView2
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
