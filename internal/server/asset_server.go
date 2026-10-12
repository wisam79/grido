package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"grido/internal/service"
	"grido/internal/utils"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type AssetServerDeps struct {
	FileServer   http.Handler
	SessionToken string
	MemorySvc    *service.MemoryService
	ImageProc    *service.ImageProcessorService
	MediaSvc     *service.MediaService
}

// NewAssetHandler ينشئ معالج HTTP للمسارات المحلية والأصول الثابتة
func NewAssetHandler(deps AssetServerDeps) http.Handler {
	// 🛡️ حارس مسارات /api المحلية: فحص الأصل + توكن جلسة العملية (فشل مغلق).
	// التفاصيل والاختبارات في internal/service/local_api_guard.go.
	apiGuard := service.NewLocalApiGuard(deps.SessionToken)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") && !apiGuard.Authorize(w, r) {
			return
		}

		if r.Method == http.MethodPost && r.URL.Path == "/api/trim-memory" {
			if deps.MemorySvc != nil {
				deps.MemorySvc.TrimNow()
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}

		if r.Method == http.MethodPost && r.URL.Path == "/api/apply-mask" {
			src := r.URL.Query().Get("src")
			wStr := r.URL.Query().Get("w")
			hStr := r.URL.Query().Get("h")
			if src == "" || wStr == "" || hStr == "" {
				http.Error(w, "Missing query params (src, w, h)", http.StatusBadRequest)
				return
			}
			maskW, errW := strconv.Atoi(wStr)
			maskH, errH := strconv.Atoi(hStr)
			if errW != nil || errH != nil || maskW <= 0 || maskH <= 0 {
				http.Error(w, "Invalid dimensions", http.StatusBadRequest)
				return
			}
			expectedLen := int64(maskW) * int64(maskH)
			const maxMaskPixels = int64(32 * 1024 * 1024)
			if expectedLen > maxMaskPixels {
				http.Error(w, "Mask dimensions too large", http.StatusBadRequest)
				return
			}

			maskBytes := make([]byte, expectedLen)
			if _, err := io.ReadFull(r.Body, maskBytes); err != nil {
				http.Error(w, "Failed to read binary mask: "+err.Error(), http.StatusBadRequest)
				return
			}

			if deps.ImageProc == nil {
				http.Error(w, "Image processor unavailable", http.StatusInternalServerError)
				return
			}

			localPath, err := deps.ImageProc.ApplyMaskRaw(src, maskBytes, maskW, maskH)
			if err != nil {
				http.Error(w, "Failed to apply mask: "+err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":   "success",
				"imageSrc": localPath,
			})
			return
		}

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
				} else if ext == ".tif" || ext == ".tiff" {
					// 🖨️ CMYK يُصدَّر TIFF افتراضياً — كانت البوابة تقتصر على PNG/JPEG
					// فيُحفظ ملف TIFF بفلتر خاطئ (لا يظهر في حوار الحفظ).
					d.AddFilter("TIFF Image (*.tif;*.tiff)", "*.tif;*.tiff")
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

			// 🖨️ كشف الاقتطاع (RV-Print-09): نسخ بحد+1 — أي تجاوز يعني body
			// ناقصاً يُجهض بـ 413 بدل ملف مبتور ناجح ظاهرياً.
			limitReader := io.LimitReader(r.Body, service.MaxFileSize+1)
			written, err := io.Copy(af, limitReader)
			if err != nil {
				http.Error(w, "Failed to write file: "+err.Error(), http.StatusInternalServerError)
				return
			}
			if written > service.MaxFileSize {
				http.Error(w, "File exceeds size limit", http.StatusRequestEntityTooLarge)
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

			// +1 بايت: القارئ الأول كان يقصّ عند الحد تماماً فيخفي التجاوز عن العدّ اللاحق.
			limitReader := io.LimitReader(r.Body, 60*1024*1024+1)
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
			// 🖨️ كشف الاقتطاع (RV-Print-09): LimitReader وحده يصمت عن القص —
			// ننسخ بحد+1 فأي زيادة بايت واحد تعني ملفاً ناقصاً يُجهض بـ 413
			// بدل حفظ تالف وإرجاع success (كان يسمّم خط الطباعة لاحقاً).
			const printUploadLimit = int64(60 * 1024 * 1024)
			written, err := io.Copy(af, io.LimitReader(combined, printUploadLimit+1))
			if err != nil {
				http.Error(w, "Failed to write file", http.StatusInternalServerError)
				return
			}
			if written > printUploadLimit {
				http.Error(w, "Uploaded image exceeds 60MB limit", http.StatusRequestEntityTooLarge)
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
			if deps.MediaSvc == nil {
				http.Error(w, "Media service unavailable", http.StatusInternalServerError)
				return
			}
			mediaDir := deps.MediaSvc.GetMediaDir()
			if err := os.MkdirAll(mediaDir, 0o755); err != nil {
				http.Error(w, "Failed to create media dir", http.StatusInternalServerError)
				return
			}

			limitReader := io.LimitReader(r.Body, service.MaxFileSize+1)
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

			ext := deps.MediaSvc.GetExtensionFromMime(detectedMime)
			filename := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
			absPath := filepath.Join(mediaDir, filename)

			af, afErr := utils.CreateAtomic(absPath, 0o644)
			if afErr != nil {
				http.Error(w, "Failed to create file", http.StatusInternalServerError)
				return
			}
			defer af.Abort()

			combined := io.MultiReader(bytes.NewReader(sniffBuf), limitReader)
			// 🖨️ كشف الاقتطاع (RV-Print-09) — نفس عقدة upload-print-image.
			written, err := io.Copy(af, io.LimitReader(combined, service.MaxFileSize+1))
			if err != nil {
				http.Error(w, "Failed to write file", http.StatusInternalServerError)
				return
			}
			if written > service.MaxFileSize {
				http.Error(w, "Uploaded media exceeds size limit", http.StatusRequestEntityTooLarge)
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
				if deps.MediaSvc == nil {
					http.Error(w, "Media service unavailable", http.StatusInternalServerError)
					return
				}
				baseDir = deps.MediaSvc.GetMediaDir()
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
			// 🛡️ خريطة صريحة للصيغ الحديثة: mime.TypeByExtension قد يجهلها على Windows
			// فيُخدَم AVIF/HEIC خطأً كـ octet-stream أو jpeg — نثبتها هنا.
			switch ext {
			case ".avif":
				contentType = "image/avif"
			case ".heic", ".heif":
				contentType = "image/heic"
			case ".jxl":
				contentType = "image/jxl"
			}
			if contentType == "" {
				contentType = "application/octet-stream"
			}
			w.Header().Set("Content-Type", contentType)
			if ext == ".svg" {
				// 🛡️ RV-5: SVG مخزّن يُخدَم في نفس أصل التطبيق — نعزله:
				// sandbox تمنع <script> عند فتحه كوثيقة عليا، وinline تحافظ
				// على العرض داخل <img>/Konva (attachment كان سيكسر المعاينة).
				w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'")
				w.Header().Set("Content-Disposition", `inline; filename="`+filename+`"`)
			}

			http.ServeFile(w, r, absPath)
			return
		}

		if deps.FileServer != nil {
			deps.FileServer.ServeHTTP(w, r)
		}
	})
}
