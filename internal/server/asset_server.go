package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"grido/internal/core/domain"
	"grido/internal/service"
	"grido/internal/utils"
)

type AssetServerDeps struct {
	FileServer      http.Handler
	SessionToken    string
	MemorySvc       *service.MemoryService
	ImageProc       *service.ImageProcessorService
	MediaSvc        *service.MediaService
	ScannerWarp     *service.ScannerWarpService
	ScannerDetector *service.ScannerDetectorService
	Runtime         domain.RuntimeBridge
}

// AssetServer خادم HTTP للمسارات المحلية والأصول الثابتة وحوارات حفظ الملفات
type AssetServer struct {
	deps     AssetServerDeps
	apiGuard *service.LocalApiGuard
	runtime  domain.RuntimeBridge
}

var _ http.Handler = (*AssetServer)(nil)

// NewAssetServer ينشئ خادم أصول جديد مع تهيئة حارس المسارات وجسر الرنتايم
func NewAssetServer(deps AssetServerDeps) *AssetServer {
	rt := deps.Runtime
	if rt == nil {
		rt = service.NewWailsRuntimeBridge()
	}
	return &AssetServer{
		deps:     deps,
		apiGuard: service.NewLocalApiGuard(deps.SessionToken),
		runtime:  rt,
	}
}

// SetRuntimeBridge يستبدل جسر الرنتايم (اختبارات/بيئات معزولة) — nil يُتجاهل
func (s *AssetServer) SetRuntimeBridge(bridge domain.RuntimeBridge) {
	if bridge != nil {
		s.runtime = bridge
	}
}

// NewAssetHandler ينشئ معالج HTTP للمسارات المحلية والأصول الثابتة
func NewAssetHandler(deps AssetServerDeps) *AssetServer {
	return NewAssetServer(deps)
}

// serveThumbnail يقدّم مصغرة مشتقة من صورة Media. المسار تحت /local-image/
// وليس /api/ لأن <img src> لا يستطيع إرسال هيدر جلسة عبر LocalApiGuard.
func (s *AssetServer) serveThumbnail(w http.ResponseWriter, r *http.Request) {
	deps := s.deps
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if deps.MediaSvc == nil {
		http.Error(w, "Media service unavailable", http.StatusInternalServerError)
		return
	}

	raw := strings.TrimPrefix(r.URL.Path, "/local-image/thumb/")
	if raw == "" || strings.ContainsAny(raw, `/\`) {
		http.Error(w, "Invalid thumbnail path", http.StatusBadRequest)
		return
	}
	filename := filepath.Base(filepath.Clean(raw))
	if filename != raw || filename == "." || filename == ".." {
		http.Error(w, "Invalid thumbnail path", http.StatusBadRequest)
		return
	}
	if strings.HasPrefix(strings.ToLower(filename), "print_") {
		http.Error(w, "Thumbnail not available for print previews", http.StatusNotFound)
		return
	}

	width := 256
	if rawWidth := r.URL.Query().Get("w"); rawWidth != "" {
		parsed, err := strconv.Atoi(rawWidth)
		if err != nil || (parsed != 128 && parsed != 256 && parsed != 512) {
			http.Error(w, "Invalid thumbnail width", http.StatusBadRequest)
			return
		}
		width = parsed
	}

	result, err := deps.MediaSvc.EnsureThumbnail(r.Context(), "/local-image/"+filename, width)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidThumbnailWidth):
			http.Error(w, "Invalid thumbnail width", http.StatusBadRequest)
		case errors.Is(err, service.ErrThumbnailUnsupported):
			http.Error(w, "Unsupported image type for thumbnail", http.StatusUnsupportedMediaType)
		case errors.Is(err, service.ErrThumbnailTooLarge):
			http.Error(w, "Image too large for thumbnail", http.StatusRequestEntityTooLarge)
		case os.IsNotExist(err):
			http.Error(w, "Image not found", http.StatusNotFound)
		default:
			http.Error(w, "Failed to generate thumbnail", http.StatusInternalServerError)
		}
		return
	}

	f, err := os.Open(result.Path)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Thumbnail not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to open thumbnail", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		http.Error(w, "Failed to read thumbnail", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", result.ContentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
	http.ServeContent(w, r, filename, fi.ModTime(), f)
}

// writeScannerWarpJSONError خطأ عقد الماسح: رسالة عربية + كود SCN-WARP-* اختياري.
func writeScannerWarpJSONError(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	payload := map[string]string{"error": message}
	if code != "" {
		payload["code"] = code
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func (s *AssetServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") && !s.apiGuard.Authorize(w, r) {
		return
	}
	deps := s.deps

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

	if r.Method == http.MethodPost && r.URL.Path == "/api/scanner-warp" {
		// 🧭 استعدال ماسح المستندات في Go (المرحلة 1 من خطة الترحيل) —
		// جسم JSON صغير حصراً (لا بايتات صور): مسار الوسائط + الأركان + الأهداف.
		const maxScannerWarpBody = 64 * 1024
		body, readErr := io.ReadAll(io.LimitReader(r.Body, maxScannerWarpBody+1))
		if readErr != nil || len(body) > maxScannerWarpBody {
			writeScannerWarpJSONError(w, http.StatusBadRequest, "جسم الطلب يتجاوز الحد المسموح", "")
			return
		}
		var req service.ScannerWarpRequest
		if err := json.Unmarshal(body, &req); err != nil {
			writeScannerWarpJSONError(w, http.StatusBadRequest, "جسم الطلب ليس JSON صالحاً", "")
			return
		}
		if deps.ScannerWarp == nil {
			http.Error(w, "Scanner warp service unavailable", http.StatusServiceUnavailable)
			return
		}

		result, err := deps.ScannerWarp.WarpFromMedia(req)
		if err != nil {
			var warpErr *service.ScannerWarpError
			if errors.As(err, &warpErr) {
				writeScannerWarpJSONError(w, http.StatusBadRequest, warpErr.Message, warpErr.Code)
				return
			}
			http.Error(w, "Scanner warp failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "success",
			"url":    result.URL,
			"width":  result.Width,
			"height": result.Height,
		})
		return
	}

	if r.Method == http.MethodPost && r.URL.Path == "/api/scanner-detect" {
		const maxScannerDetectBody = 16 * 1024
		body, readErr := io.ReadAll(io.LimitReader(r.Body, maxScannerDetectBody+1))
		if readErr != nil || len(body) > maxScannerDetectBody {
			http.Error(w, "Request body exceeds size limit", http.StatusBadRequest)
			return
		}
		var req struct {
			SourceURL string `json:"sourceUrl"`
		}
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}
		if deps.ScannerDetector == nil {
			http.Error(w, "Scanner detector service unavailable", http.StatusServiceUnavailable)
			return
		}
		result, err := deps.ScannerDetector.DetectDocumentCorners(req.SourceURL)
		if err != nil {
			if strings.Contains(err.Error(), "only supported on Windows") || strings.Contains(err.Error(), "not available") {
				http.Error(w, "Scanner detect unavailable: "+err.Error(), http.StatusServiceUnavailable)
				return
			}
			http.Error(w, "Scanner detect failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":     "success",
			"corners":    result.Corners,
			"confidence": result.Confidence,
			"width":      result.Width,
			"height":     result.Height,
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
			var filters []domain.FileFilter
			if ext == ".png" {
				filters = []domain.FileFilter{
					{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
				}
			} else if ext == ".tif" || ext == ".tiff" {
				// 🖨️ CMYK يُصدَّر TIFF افتراضياً — كانت البوابة تقتصر على PNG/JPEG
				// فيُحفظ ملف TIFF بفلتر خاطئ (لا يظهر في حوار الحفظ).
				filters = []domain.FileFilter{
					{DisplayName: "TIFF Image (*.tif;*.tiff)", Pattern: "*.tif;*.tiff"},
				}
			} else {
				filters = []domain.FileFilter{
					{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"},
				}
			}

			var err error
			filePath, err = s.runtime.SaveFileDialog("Save Image", filename, filters)
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

		// 🚀 مسار النسخ المباشر على القرص لمخرجات CMYK/Print الجاهزة في مجلد Exports
		// (يتفادى تنزيل ملفات TIFF الضخمة إلى WebView2 ثم إعادة رفعها في الذاكرة)
		if sourceName := r.URL.Query().Get("source"); sourceName != "" {
			cleanSource := filepath.Base(filepath.Clean(sourceName))
			if cleanSource == "." || cleanSource == "/" || !strings.HasPrefix(cleanSource, "print_") {
				http.Error(w, "Invalid export source filename", http.StatusBadRequest)
				return
			}
			exportsDir := filepath.Join(utils.GetAppDir(), "Exports")
			srcPath := filepath.Join(exportsDir, cleanSource)
			srcFile, openErr := os.Open(srcPath)
			if openErr != nil {
				http.Error(w, "Failed to open source export: "+openErr.Error(), http.StatusNotFound)
				return
			}
			_, copyErr := io.Copy(af, srcFile)
			_ = srcFile.Close()
			if copyErr != nil {
				http.Error(w, "Failed to copy source export: "+copyErr.Error(), http.StatusInternalServerError)
				return
			}
			if err := af.Commit(); err != nil {
				http.Error(w, "Failed to finalize file: "+err.Error(), http.StatusInternalServerError)
				return
			}
			_ = os.Remove(srcPath)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "success", "path": filePath})
			return
		}

		dpi := parseDPI(r.URL.Query().Get("dpi"))
		if dpi == 0 {
			// 🚀 بث مباشر إلى الملف الذري عندما لا يلزم حقن ترويسة DPI في الذاكرة
			written, copyErr := io.Copy(af, io.LimitReader(r.Body, service.MaxFileSize+1))
			if copyErr != nil {
				http.Error(w, "Failed to stream file: "+copyErr.Error(), http.StatusInternalServerError)
				return
			}
			if written > service.MaxFileSize {
				http.Error(w, "File exceeds size limit", http.StatusRequestEntityTooLarge)
				return
			}
		} else {
			// 🖨️ الجسم يُقرأ كاملاً في الذاكرة بحد+1: أي تجاوز يعني body
			// ناقصاً أو مفرطاً يُجهض بـ 413 بدل ملف مبتور ناجح ظاهرياً،
			// ويتيح ذلك نافذة لحقن بيانات الكثافة قبل الالتزام الذري.
			body, readErr := io.ReadAll(io.LimitReader(r.Body, service.MaxFileSize+1))
			if readErr != nil {
				http.Error(w, "Failed to read file: "+readErr.Error(), http.StatusInternalServerError)
				return
			}
			if len(body) > service.MaxFileSize {
				http.Error(w, "File exceeds size limit", http.StatusRequestEntityTooLarge)
				return
			}

			// 🖨️ كثافة الطباعة: مسار RGB كان يكتب PNG/JPEG كما وردته الواجهة
			// تماماً بلا بيانات كثافة، فيفترض أدوات الطباعة الخارجية 72/96
			// DPI وقد تُخرج مقاساً فيزيائياً خاطئاً. الحقن يتم هنا على البايتات
			// (pHYs لـ PNG / JFIF لـ JPEG) بلا أي إعادة ترميز أو تغيير بكسل.
			body = patchImageDPI(body, strings.ToLower(filepath.Ext(filePath)), dpi)

			if _, err := af.Write(body); err != nil {
				http.Error(w, "Failed to write file: "+err.Error(), http.StatusInternalServerError)
				return
			}
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

		imageSrc := "/local-image/" + filename
		var width, height int
		var aspectRatio float64 = 1.0

		if dims, err := deps.MediaSvc.GetImageDimensions(imageSrc); err == nil && dims.Width > 0 && dims.Height > 0 {
			width = dims.Width
			height = dims.Height
			if dims.IsRotated {
				aspectRatio = float64(dims.Height) / float64(dims.Width)
			} else {
				aspectRatio = float64(dims.Width) / float64(dims.Height)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":      "success",
			"imageSrc":    imageSrc,
			"width":       width,
			"height":      height,
			"aspectRatio": aspectRatio,
		})
		return
	}

	if strings.HasPrefix(r.URL.Path, "/local-image/thumb/") {
		s.serveThumbnail(w, r)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/local-image/") {
		filePath := strings.TrimPrefix(r.URL.Path, "/local-image/")
		filename := filepath.Base(filepath.Clean(filePath))
		if filename == "." || filename == ".." || filename == "" || strings.TrimSpace(filePath) == "" {
			http.Error(w, "Invalid image path", http.StatusBadRequest)
			return
		}

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

		stat, err := os.Stat(absPath)
		if err != nil {
			http.Error(w, "Image not found on disk", http.StatusNotFound)
			return
		}
		if stat.IsDir() {
			http.Error(w, "Access denied", http.StatusForbidden)
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
		if !strings.HasPrefix(resolvedPath, filepath.Clean(baseDir)+string(filepath.Separator)) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		w.Header().Set("X-Content-Type-Options", "nosniff")
		// 🛡️ الصور القابلة لإعادة الكتابة بنفس الاسم (تحرير داخل التطبيق)
		// لا يجوز كاشها immutable لسنة — نعتمد revalidation مشروطاً عبر
		// Last-Modified (ServeFile) مع كاش قصير و stale-while-revalidate.
		w.Header().Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

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
}
