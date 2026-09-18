package main

import (
	"bytes"
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

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 🪵 تهيئة نظام التسجيل الموحد الوحيد (lumberjack + slog) — ملف واحد داخل logs/
	service.InitLogger()

	// 🗄️ تهيئة قاعدة بيانات SQLite المحلية
	db, err := repository.InitDB()
	if err != nil {
		slog.Error("Failed to initialize SQLite database", "error", err.Error())
		os.Exit(1)
	}

	// تشغيل تنظيف الصور غير المستخدمة في الخلفية لتفادي تراكمها
	go repository.CleanupUnusedMedia()

	// 🧹 تنظيف كاش الويب في بيئة التطوير لتفادي الكاش القديم للمتصفح
	if isDevMode() {
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
	initialX := 0
	initialY := 0
	hasSavedPos := false
	startMax := false

	if state, err := loadWindowState(); err == nil {
		if state.Width > 0 && state.Height > 0 {
			initialWidth = state.Width
			initialHeight = state.Height
		}
		const maxScreenSize = 50000
		if state.X > -maxScreenSize && state.X < maxScreenSize &&
			state.Y > -maxScreenSize && state.Y < maxScreenSize &&
			(state.X != 0 || state.Y != 0) &&
			isPointOnAnyMonitor(state.X+50, state.Y+50) {
			initialX = state.X
			initialY = state.Y
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

	// تهيئة تطبيق Wails v3
	wailsApp := application.New(application.Options{
		Name:        "Grido Studio",
		Description: "Professional Photo & Collage Studio",
		Services: []application.Service{
			application.NewService(appInstance),
			application.NewService(projectHandler),
			application.NewService(printHandler),
			application.NewService(backupHandler),
			application.NewService(licenseHandler),
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
	})

	// إعداد خيارات النافذة الرئيسية
	winOptions := application.WebviewWindowOptions{
		Title:              "Grido Studio",
		Width:              initialWidth,
		Height:             initialHeight,
		MinWidth:           900,
		MinHeight:          600,
		Frameless:          true,
		Hidden:             false,
		ZoomControlEnabled: false,
		EnableFileDrop:     true,
		BackgroundColour:   application.NewRGBA(255, 255, 255, 255),
		Windows: application.WindowsWindow{
			BackdropType:                      application.None,
			DisableFramelessWindowDecorations: false,
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

	// حفظ مقاسات وموضع النافذة عند إغلاقها
	mainWindow.OnWindowEvent(events.Common.WindowClosing, func(_ *application.WindowEvent) {
		w, h := mainWindow.Size()
		x, y := mainWindow.Position()
		isMax := mainWindow.IsMaximised()

		state := windowState{
			Width:  w,
			Height: h,
			X:      x,
			Y:      y,
			Max:    isMax,
		}
		_ = saveWindowState(state)
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
	fileServer := application.AssetFileServerFS(assets)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/api/save-file" {
			filename := r.URL.Query().Get("filename")
			if filename == "" {
				filename = "exported_photo.png"
			}
			filename = filepath.Base(filepath.Clean(filename))

			var filePath string
			dir := r.URL.Query().Get("dir")
			if dir != "" {
				exportsDir := filepath.Join(utils.GetAppDir(), "Exports")
				cleanDir := filepath.Clean(dir)
				if fi, err := os.Stat(cleanDir); err == nil && fi.IsDir() {
					if resolvedDir, err := filepath.EvalSymlinks(cleanDir); err == nil {
						cleanDir = resolvedDir
					}
					resolvedExports := exportsDir
					if resolvedBase, err := filepath.EvalSymlinks(exportsDir); err == nil {
						resolvedExports = resolvedBase
					}
					if strings.HasPrefix(cleanDir, filepath.Clean(resolvedExports)+string(filepath.Separator)) {
						filePath = filepath.Join(cleanDir, filename)
					}
				}
			}

			if filePath == "" {
				ext := strings.ToLower(filepath.Ext(filename))
				d := application.Get().Dialog.SaveFile()
				d.SetMessage("Save Image")
				d.SetFilename(filename)
				if ext == ".png" {
					d.AddFilter("PNG Image (*.png)", "*.png")
				} else {
					d.AddFilter("JPEG Image (*.jpg;*.jpeg)", "*.jpg;*.jpeg")
				}

				var err error
				filePath, err = d.PromptForSingleSelection()
				if err != nil {
					http.Error(w, "Dialog error: "+err.Error(), http.StatusInternalServerError)
					return
				}
				if filePath == "" {
					w.WriteHeader(http.StatusNoContent)
					return
				}
			}

			af, err := utils.CreateAtomic(filePath, 0o644)
			if err != nil {
				http.Error(w, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
				return
			}
			defer af.Abort()

			limitReader := io.LimitReader(r.Body, service.MaxFileSize)
			if _, err := io.Copy(af, limitReader); err != nil {
				http.Error(w, "Failed to write file: "+err.Error(), http.StatusInternalServerError)
				return
			}
			if err := af.Commit(); err != nil {
				http.Error(w, "Failed to finalize file: "+err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "success", "path": filePath})
			return
		}

		if r.Method == http.MethodPost && r.URL.Path == "/api/upload-print-image" {
			exportsDir := filepath.Join(utils.GetAppDir(), "Exports")
			if err := os.MkdirAll(exportsDir, 0755); err != nil {
				http.Error(w, "Failed to create exports dir", http.StatusInternalServerError)
				return
			}

			limitReader := io.LimitReader(r.Body, 60*1024*1024)
			sniffBuf := make([]byte, 512)
			n, sniffErr := io.ReadFull(limitReader, sniffBuf)
			if sniffErr != nil && sniffErr != io.ErrUnexpectedEOF {
				http.Error(w, "Failed to read upload body", http.StatusBadRequest)
				return
			}
			sniffBuf = sniffBuf[:n]
			detectedMime := http.DetectContentType(sniffBuf)
			if !strings.HasPrefix(detectedMime, "image/") {
				http.Error(w, "Uploaded content is not an image", http.StatusBadRequest)
				return
			}

			ext := ".png"
			if strings.HasPrefix(detectedMime, "image/jpeg") {
				ext = ".jpg"
			}
			filename := fmt.Sprintf("print_upload_%d%s", time.Now().UnixNano(), ext)
			absPath := filepath.Join(exportsDir, filename)

			af, afErr := utils.CreateAtomic(absPath, 0o644)
			if afErr != nil {
				http.Error(w, "Failed to create file", http.StatusInternalServerError)
				return
			}
			defer af.Abort()

			combined := io.MultiReader(bytes.NewReader(sniffBuf), limitReader)
			if _, err := io.Copy(af, combined); err != nil {
				http.Error(w, "Failed to write file", http.StatusInternalServerError)
				return
			}
			if err := af.Commit(); err != nil {
				http.Error(w, "Failed to finalize file", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":   "success",
				"imageSrc": "/local-image/" + filename,
			})
			return
		}

		if r.Method == http.MethodPost && r.URL.Path == "/api/upload-media" {
			mediaDir := app.mediaSvc.GetMediaDir()
			if err := os.MkdirAll(mediaDir, 0o755); err != nil {
				http.Error(w, "Failed to create media dir", http.StatusInternalServerError)
				return
			}

			limitReader := io.LimitReader(r.Body, service.MaxFileSize)
			sniffBuf := make([]byte, 512)
			n, sniffErr := io.ReadFull(limitReader, sniffBuf)
			if sniffErr != nil && sniffErr != io.ErrUnexpectedEOF {
				http.Error(w, "Failed to read upload body", http.StatusBadRequest)
				return
			}
			sniffBuf = sniffBuf[:n]
			detectedMime := http.DetectContentType(sniffBuf)
			if !strings.HasPrefix(detectedMime, "image/") {
				http.Error(w, "Uploaded content is not an image", http.StatusBadRequest)
				return
			}

			ext := app.mediaSvc.GetExtensionFromMime(detectedMime)
			filename := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
			absPath := filepath.Join(mediaDir, filename)

			af, afErr := utils.CreateAtomic(absPath, 0o644)
			if afErr != nil {
				http.Error(w, "Failed to create file", http.StatusInternalServerError)
				return
			}
			defer af.Abort()

			combined := io.MultiReader(bytes.NewReader(sniffBuf), limitReader)
			if _, err := io.Copy(af, combined); err != nil {
				http.Error(w, "Failed to write file", http.StatusInternalServerError)
				return
			}
			if err := af.Commit(); err != nil {
				http.Error(w, "Failed to finalize file", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":   "success",
				"imageSrc": "/local-image/" + filename,
			})
			return
		}

		if strings.HasPrefix(r.URL.Path, "/local-image/") {
			filePath := strings.TrimPrefix(r.URL.Path, "/local-image/")
			filename := filepath.Base(filepath.Clean(filePath))

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

			resolvedPath, err := filepath.EvalSymlinks(absPath)
			if err != nil {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			if resolvedBase, err := filepath.EvalSymlinks(baseDir); err == nil {
				baseDir = resolvedBase
			}
			if !strings.HasPrefix(resolvedPath, filepath.Clean(baseDir)+string(filepath.Separator)) &&
				resolvedPath != filepath.Clean(baseDir) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")

			ext := strings.ToLower(filepath.Ext(filename))
			contentType := mime.TypeByExtension(ext)
			if contentType == "" {
				contentType = "application/octet-stream"
			}
			w.Header().Set("Content-Type", contentType)

			http.ServeFile(w, r, absPath)
			return
		}

		fileServer.ServeHTTP(w, r)
	})
}

func createCSPMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			devScriptSrc := "'self' 'wasm-unsafe-eval'"
			if isDevMode() {
				devScriptSrc = "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
			}
			w.Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src "+devScriptSrc+"; "+
					"style-src 'self' 'unsafe-inline'; "+
					"img-src 'self' data: blob: https:; "+
					"font-src 'self' data:; "+
					"connect-src 'self' ws: http://localhost:* https://*.supabase.co https://*.modal.run https://api.modal.com; "+
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
	if isDevBuild {
		return true
	}
	if os.Getenv("devserver") != "" || os.Getenv("frontenddevserverurl") != "" || os.Getenv("WAILS_DEV") == "true" {
		return true
	}
	if exe, err := os.Executable(); err == nil && strings.Contains(strings.ToLower(exe), "-dev") {
		return true
	}
	if len(os.Args) > 0 && strings.Contains(strings.ToLower(os.Args[0]), "-dev") {
		return true
	}
	return false
}
