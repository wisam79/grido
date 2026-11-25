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
		// 🖼️ 2048px مشتق العرض الكامل (عرض فقط — القص والتصدير والطباعة على الأصل الكامل)
		if err != nil || (parsed != 128 && parsed != 256 && parsed != 512 && parsed != 1024 && parsed != 2048) {
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if status != http.StatusOK {
		w.WriteHeader(status)
	}
	_ = json.NewEncoder(w).Encode(payload)
}

// writeScannerWarpJSONError خطأ عقد الماسح: رسالة عربية + كود SCN-WARP-* اختياري.
func writeScannerWarpJSONError(w http.ResponseWriter, status int, message, code string) {
	payload := map[string]string{"error": message}
	if code != "" {
		payload["code"] = code
	}
	writeJSON(w, status, payload)
}

// uploadSpec يصف ما يختلف بين مساري رفع الصور (المجلد، بادئة الاسم، حد
// الحجم، رسالة التجاوز، ومصدر الامتداد) بينما تتشارك المسارات القراءة
// والفحص والكتابة الذرية في saveUploadedImage.
type uploadSpec struct {
	dir          string
	prefix       string
	limit        int64
	limitMessage string
	extFor       func(detectedMime string) string
	allowSVG     bool
}

// saveUploadedImage يقرأ الجسم كصورة، يرفض ما يتجاوز spec.limit، ويكتبه
// ذرّياً في spec.dir. عند الفشل يكتب رد HTTP المناسب ويعيد ok=false.
func saveUploadedImage(w http.ResponseWriter, r *http.Request, spec uploadSpec) (string, bool) {
	var uploadBody io.Reader = r.Body
	var uploadedFilename string
	contentType := strings.ToLower(r.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		mr, err := r.MultipartReader()
		if err != nil {
			http.Error(w, "Invalid multipart upload", http.StatusBadRequest)
			return "", false
		}
		var filePart io.ReadCloser
		for {
			part, partErr := mr.NextPart()
			if partErr == io.EOF {
				break
			}
			if partErr != nil {
				http.Error(w, "Failed to read multipart part", http.StatusBadRequest)
				return "", false
			}
			if part.FileName() != "" || part.FormName() == "file" {
				uploadedFilename = part.FileName()
				filePart = part
				break
			}
			_ = part.Close()
		}
		if filePart == nil {
			http.Error(w, "Missing uploaded file part", http.StatusBadRequest)
			return "", false
		}
		defer filePart.Close()
		uploadBody = filePart
	}

	// +1 بايت: القارئ الأول كان يقصّ عند الحد تماماً فيخفي التجاوز عن العدّ اللاحق.
	limitReader := io.LimitReader(uploadBody, spec.limit+1)
	sniffBuf := make([]byte, 4096)
	n, sniffErr := io.ReadFull(limitReader, sniffBuf)
	if sniffErr != nil && sniffErr != io.ErrUnexpectedEOF && sniffErr != io.EOF {
		http.Error(w, "Failed to read upload body", http.StatusBadRequest)
		return "", false
	}
	sniffBuf = sniffBuf[:n]
	if len(sniffBuf) == 0 {
		http.Error(w, "Uploaded content is not an image", http.StatusBadRequest)
		return "", false
	}
	detectedMime := http.DetectContentType(sniffBuf)
	isRasterImage := strings.HasPrefix(detectedMime, "image/")
	isSVG := !isRasterImage && spec.allowSVG &&
		(service.LooksLikeSVG(sniffBuf) || strings.EqualFold(filepath.Ext(uploadedFilename), ".svg"))
	if !isRasterImage && !isSVG {
		http.Error(w, "Uploaded content is not an image", http.StatusBadRequest)
		return "", false
	}

	if isSVG {
		svgCap := int64(service.MaxSVGFileSize)
		if spec.limit < svgCap {
			svgCap = spec.limit
		}
		combined := io.MultiReader(bytes.NewReader(sniffBuf), limitReader)
		rawSVG, err := io.ReadAll(io.LimitReader(combined, svgCap+1))
		if err != nil {
			http.Error(w, "Failed to read uploaded SVG", http.StatusInternalServerError)
			return "", false
		}
		if int64(len(rawSVG)) > svgCap {
			http.Error(w, spec.limitMessage, http.StatusRequestEntityTooLarge)
			return "", false
		}
		cleanSVG, sanitizeErr := service.SanitizeSVGBytes(rawSVG)
		if sanitizeErr != nil {
			http.Error(w, "Invalid or unsafe SVG content", http.StatusBadRequest)
			return "", false
		}
		filename := fmt.Sprintf("%s%d.svg", spec.prefix, time.Now().UnixNano())
		absPath := filepath.Join(spec.dir, filename)
		if err := utils.AtomicWriteFile(absPath, cleanSVG, 0o644); err != nil {
			http.Error(w, "Failed to save SVG file", http.StatusInternalServerError)
			return "", false
		}
		return filename, true
	}

	filename := fmt.Sprintf("%s%d%s", spec.prefix, time.Now().UnixNano(), spec.extFor(detectedMime))
	absPath := filepath.Join(spec.dir, filename)

	af, afErr := utils.CreateAtomic(absPath, 0o644)
	if afErr != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return "", false
	}
	defer af.Abort()

	combined := io.MultiReader(bytes.NewReader(sniffBuf), limitReader)
	// 🖨️ كشف الاقتطاع (RV-Print-09): LimitReader وحده يصمت عن القص —
	// ننسخ بحد+1 فأي زيادة بايت واحد تعني ملفاً ناقصاً يُجهض بـ 413
	// بدل حفظ تالف وإرجاع success (كان يسمّم خط الطباعة لاحقاً).
	written, err := io.Copy(af, io.LimitReader(combined, spec.limit+1))
	if err != nil {
		http.Error(w, "Failed to write file", http.StatusInternalServerError)
		return "", false
	}
	if written > spec.limit {
		http.Error(w, spec.limitMessage, http.StatusRequestEntityTooLarge)
		return "", false
	}
	if err := af.Commit(); err != nil {
		http.Error(w, "Failed to finalize file", http.StatusInternalServerError)
		return "", false
	}
	return filename, true
}

func (s *AssetServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") && !s.apiGuard.Authorize(w, r) {
		return
	}

	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/api/trim-memory":
		s.handleTrimMemory(w)
	case r.Method == http.MethodPost && r.URL.Path == "/api/apply-mask":
		s.handleApplyMask(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/scanner-warp":
		s.handleScannerWarp(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/scanner-detect":
		s.handleScannerDetect(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/save-file":
		s.handleSaveFile(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/upload-print-image":
		s.handleUploadPrintImage(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/upload-media":
		s.handleUploadMedia(w, r)
	case strings.HasPrefix(r.URL.Path, "/local-image/thumb/"):
		s.serveThumbnail(w, r)
	case strings.HasPrefix(r.URL.Path, "/local-image/"):
		s.serveLocalImage(w, r)
	case s.deps.FileServer != nil:
		s.deps.FileServer.ServeHTTP(w, r)
	}
}

func (s *AssetServer) handleTrimMemory(w http.ResponseWriter) {
	if s.deps.MemorySvc != nil {
		s.deps.MemorySvc.TrimNow()
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *AssetServer) handleApplyMask(w http.ResponseWriter, r *http.Request) {
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
	if s.deps.ImageProc == nil {
		http.Error(w, "Image processor unavailable", http.StatusInternalServerError)
		return
	}

	localPath, err := s.deps.ImageProc.ApplyMaskRaw(src, maskBytes, maskW, maskH)
	if err != nil {
		http.Error(w, "Failed to apply mask: "+err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status":   "success",
		"imageSrc": localPath,
	})
}

func (s *AssetServer) handleScannerWarp(w http.ResponseWriter, r *http.Request) {
	// 🧭 استعدال ماسح المستندات في Go — جسم JSON صغير حصراً (لا بايتات صور).
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
	if s.deps.ScannerWarp == nil {
		http.Error(w, "Scanner warp service unavailable", http.StatusServiceUnavailable)
		return
	}

	result, err := s.deps.ScannerWarp.WarpFromMediaContext(r.Context(), req)
	if err != nil {
		var warpErr *service.ScannerWarpError
		if errors.As(err, &warpErr) {
			writeScannerWarpJSONError(w, http.StatusBadRequest, warpErr.Message, warpErr.Code)
			return
		}
		http.Error(w, "Scanner warp failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"url":    result.URL,
		"width":  result.Width,
		"height": result.Height,
	})
}

func (s *AssetServer) handleScannerDetect(w http.ResponseWriter, r *http.Request) {
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
	if s.deps.ScannerDetector == nil {
		http.Error(w, "Scanner detector service unavailable", http.StatusServiceUnavailable)
		return
	}
	result, err := s.deps.ScannerDetector.DetectDocumentCorners(req.SourceURL)
	if err != nil {
		if strings.Contains(err.Error(), "only supported on Windows") || strings.Contains(err.Error(), "not available") {
			http.Error(w, "Scanner detect unavailable: "+err.Error(), http.StatusServiceUnavailable)
			return
		}
		http.Error(w, "Scanner detect failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":     "success",
		"corners":    result.Corners,
		"confidence": result.Confidence,
		"width":      result.Width,
		"height":     result.Height,
	})
}

func (s *AssetServer) resolveSaveFilePath(w http.ResponseWriter, r *http.Request) (string, bool) {
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		filename = "exported_photo.png"
	}
	filename = filepath.Base(filepath.Clean(filename))

	if dir := r.URL.Query().Get("dir"); dir != "" {
		exportsDir := utils.GetExportsDir()
		cleanDir := filepath.Clean(dir)
		if fi, err := os.Stat(cleanDir); err == nil && fi.IsDir() {
			if resolvedDir, err := filepath.EvalSymlinks(cleanDir); err == nil {
				cleanDir = resolvedDir
			}
			resolvedExports := exportsDir
			if resolvedBase, err := filepath.EvalSymlinks(exportsDir); err == nil {
				resolvedExports = resolvedBase
			}
			if utils.PathWithinDir(cleanDir, resolvedExports) {
				return filepath.Join(cleanDir, filename), true
			}
		}
	}

	ext := strings.ToLower(filepath.Ext(filename))
	var filters []domain.FileFilter
	switch ext {
	case ".png":
		filters = []domain.FileFilter{{DisplayName: "PNG Image (*.png)", Pattern: "*.png"}}
	case ".tif", ".tiff":
		filters = []domain.FileFilter{{DisplayName: "TIFF Image (*.tif;*.tiff)", Pattern: "*.tif;*.tiff"}}
	default:
		filters = []domain.FileFilter{{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"}}
	}

	filePath, err := s.runtime.SaveFileDialog("Save Image", filename, filters)
	if err != nil {
		http.Error(w, "Dialog error: "+err.Error(), http.StatusInternalServerError)
		return "", false
	}
	if filePath == "" {
		w.WriteHeader(http.StatusNoContent)
		return "", false
	}
	return filePath, true
}

func (s *AssetServer) handleSaveFile(w http.ResponseWriter, r *http.Request) {
	filePath, ok := s.resolveSaveFilePath(w, r)
	if !ok {
		return
	}

	af, err := utils.CreateAtomic(filePath, 0o644)
	if err != nil {
		http.Error(w, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer af.Abort()

	// 🚀 مسار النسخ المباشر على القرص لمخرجات CMYK/Print الجاهزة في مجلد Exports
	if sourceName := r.URL.Query().Get("source"); sourceName != "" {
		cleanSource := filepath.Base(filepath.Clean(sourceName))
		if cleanSource == "." || cleanSource == "/" || !strings.HasPrefix(cleanSource, "print_") {
			http.Error(w, "Invalid export source filename", http.StatusBadRequest)
			return
		}
		srcPath := filepath.Join(utils.GetExportsDir(), cleanSource)
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
		writeJSON(w, http.StatusOK, map[string]string{"status": "success", "path": filePath})
		return
	}

	// 🖨️ newDPIStreamWriter يعيد nopDPIStreamWriter عند dpi <= 0 ومحقن DPI عند dpi > 0؛
	// والجسم محدود بحد+1 لإجهاض أي تجاوز بـ 413 بدل حفظ ملف ناقص.
	dpi := parseDPI(r.URL.Query().Get("dpi"))
	injector := newDPIStreamWriter(af, strings.ToLower(filepath.Ext(filePath)), dpi)
	written, copyErr := io.Copy(injector, io.LimitReader(r.Body, service.MaxFileSize+1))
	if cerr := injector.Close(); cerr != nil && copyErr == nil {
		copyErr = cerr
	}
	if copyErr != nil {
		http.Error(w, "Failed to stream file: "+copyErr.Error(), http.StatusInternalServerError)
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

	writeJSON(w, http.StatusOK, map[string]string{"status": "success", "path": filePath})
}

func (s *AssetServer) handleUploadPrintImage(w http.ResponseWriter, r *http.Request) {
	exportsDir := utils.GetExportsDir()
	if err := os.MkdirAll(exportsDir, 0o755); err != nil {
		http.Error(w, "Failed to create exports dir", http.StatusInternalServerError)
		return
	}

	const printUploadLimit = int64(60 * 1024 * 1024)
	filename, ok := saveUploadedImage(w, r, uploadSpec{
		dir:          exportsDir,
		prefix:       "print_upload_",
		limit:        printUploadLimit,
		limitMessage: "Uploaded image exceeds 60MB limit",
		extFor: func(detectedMime string) string {
			if strings.HasPrefix(detectedMime, "image/jpeg") {
				return ".jpg"
			}
			return ".png"
		},
	})
	if !ok {
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":   "success",
		"imageSrc": "/local-image/" + filename,
	})
}

func (s *AssetServer) handleUploadMedia(w http.ResponseWriter, r *http.Request) {
	deps := s.deps
	if deps.MediaSvc == nil {
		http.Error(w, "Media service unavailable", http.StatusInternalServerError)
		return
	}
	mediaDir := deps.MediaSvc.GetMediaDir()
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		http.Error(w, "Failed to create media dir", http.StatusInternalServerError)
		return
	}

	filename, ok := saveUploadedImage(w, r, uploadSpec{
		dir:          mediaDir,
		prefix:       "img_",
		limit:        service.MaxFileSize,
		limitMessage: "Uploaded media exceeds size limit",
		extFor:       deps.MediaSvc.GetExtensionFromMime,
		allowSVG:     true,
	})
	if !ok {
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

	writeJSON(w, http.StatusOK, map[string]any{
		"status":      "success",
		"imageSrc":    imageSrc,
		"width":       width,
		"height":      height,
		"aspectRatio": aspectRatio,
	})
}

func (s *AssetServer) serveLocalImage(w http.ResponseWriter, r *http.Request) {
	filePath := strings.TrimPrefix(r.URL.Path, "/local-image/")
	filename := filepath.Base(filepath.Clean(filePath))
	if filename == "." || filename == ".." || filename == "" || strings.TrimSpace(filePath) == "" {
		http.Error(w, "Invalid image path", http.StatusBadRequest)
		return
	}

	var baseDir string
	if strings.HasPrefix(filename, "print_") {
		baseDir = utils.GetExportsDir()
	} else {
		if s.deps.MediaSvc == nil {
			http.Error(w, "Media service unavailable", http.StatusInternalServerError)
			return
		}
		baseDir = s.deps.MediaSvc.GetMediaDir()
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
	if !utils.PathWithinDir(resolvedPath, baseDir) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

	ext := strings.ToLower(filepath.Ext(filename))
	contentType := mime.TypeByExtension(ext)
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
		w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'")
		w.Header().Set("Content-Disposition", `inline; filename="`+filename+`"`)
	}

	http.ServeFile(w, r, absPath)
}
