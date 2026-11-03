package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"grido/internal/core/domain"
)

// bridgeSmallTestJPEG صورة JPEG سليمة أصغر من 512 بايت (حجم رأس الفحص) — نفس
// بايتات اختبار Endpoints لضمان سلوك DetectContentType المعروف (image/jpeg)
var bridgeSmallTestJPEG = []byte{
	0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
	0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
	0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0A, 0x07,
	0x07, 0x06, 0x08, 0x0C, 0x0A, 0x0C, 0x0C, 0x0B, 0x0A, 0x0B, 0x0B, 0x0D, 0x0E, 0x12, 0x10, 0x0D,
	0x0E, 0x11, 0x0E, 0x0B, 0x0B, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0C, 0x0F,
	0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
	0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xFF, 0xDA, 0x00, 0x08,
	0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9,
}

// phoneEventRecorder يجسّر بثّ الأحداث المسجّل لفحص ترتيب أحداث phone:status
// (اسم مختلف عن recordingBridge الخاص باختبارات المحدّث في updater_test.go)
type phoneEventRecorder struct {
	domain.NoopRuntimeBridge
	mu     sync.Mutex
	events []phoneRecordedEvent
}

type phoneRecordedEvent struct {
	name string
	data map[string]interface{}
}

func (b *phoneEventRecorder) Emit(name string, data ...any) {
	b.mu.Lock()
	defer b.mu.Unlock()
	ev := phoneRecordedEvent{name: name}
	if len(data) > 0 {
		if m, ok := data[0].(map[string]interface{}); ok {
			ev.data = m
		}
	}
	b.events = append(b.events, ev)
}

func (b *phoneEventRecorder) snapshot() []phoneRecordedEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]phoneRecordedEvent(nil), b.events...)
}

// bridgeEventIsRunning يستخرج (وجودها، قيمتها) من حدث phone:status
func bridgeEventIsRunning(ev phoneRecordedEvent) (bool, bool) {
	if ev.name != "phone:status" || ev.data == nil {
		return false, false
	}
	v, ok := ev.data["isRunning"].(bool)
	return ok, v
}

func TestPhoneBridgeService_StartStop(t *testing.T) {
	// Use isolated app directory for test
	tempDir, err := os.MkdirTemp("", "grido-bridge-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)

	info, err := bridgeSvc.Start()
	if err != nil {
		t.Fatalf("bridge start failed: %v", err)
	}

	if info == nil || !info.IsRunning || info.Port == 0 || info.Token == "" {
		t.Errorf("invalid bridge info returned: %+v", info)
	}

	status := bridgeSvc.GetStatus()
	if !status.IsRunning {
		t.Errorf("expected status to be running, got: %+v", status)
	}

	// Test second start call returns existing info without error
	info2, err := bridgeSvc.Start()
	if err != nil {
		t.Errorf("second start returned error: %v", err)
	}
	if info2.Port != info.Port || info2.Token != info.Token {
		t.Errorf("expected idempotent info, got %+v vs %+v", info2, info)
	}

	// Stop server
	if err := bridgeSvc.Stop(); err != nil {
		t.Fatalf("bridge stop failed: %v", err)
	}

	statusAfter := bridgeSvc.GetStatus()
	if statusAfter.IsRunning {
		t.Errorf("expected status not running after stop")
	}
}

func TestPhoneBridgeService_Endpoints(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-bridge-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)
	bridgeSvc.token = "test-secret-token"

	// 1. Test GET / (Mobile Page)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	bridgeSvc.handleMobilePage(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("GET / expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Grido Studio") {
		t.Errorf("GET / response missing 'Grido Studio'")
	}

	// 2. Test GET /ping
	reqPing := httptest.NewRequest(http.MethodGet, "/ping", nil)
	recPing := httptest.NewRecorder()
	bridgeSvc.handlePing(recPing, reqPing)

	if recPing.Code != http.StatusOK {
		t.Errorf("GET /ping expected status 200, got %d", recPing.Code)
	}

	// 2b. Test GET /manifest.json
	reqManifest := httptest.NewRequest(http.MethodGet, "/manifest.json", nil)
	recManifest := httptest.NewRecorder()
	bridgeSvc.handleManifest(recManifest, reqManifest)

	if recManifest.Code != http.StatusOK {
		t.Errorf("GET /manifest.json expected status 200, got %d", recManifest.Code)
	}
	if !strings.Contains(recManifest.Body.String(), "Grido Studio Camera") {
		t.Errorf("GET /manifest.json missing expected name")
	}

	// 3. Test POST /upload with invalid token -> 401
	reqUnauth := httptest.NewRequest(http.MethodPost, "/upload?token=wrong-token", nil)
	recUnauth := httptest.NewRecorder()
	bridgeSvc.handlePhotoUpload(recUnauth, reqUnauth)

	if recUnauth.Code != http.StatusUnauthorized {
		t.Errorf("POST /upload invalid token expected 401, got %d", recUnauth.Code)
	}

	// 4. Test POST /upload with valid token and JPEG image -> 200 Success
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("photo", "camera.jpg")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	// Minimal 1x1 JPEG bytes
	dummyJPEG := []byte{
		0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
		0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
		0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0A, 0x07,
		0x07, 0x06, 0x08, 0x0C, 0x0A, 0x0C, 0x0C, 0x0B, 0x0A, 0x0B, 0x0B, 0x0D, 0x0E, 0x12, 0x10, 0x0D,
		0x0E, 0x11, 0x0E, 0x0B, 0x0B, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0C, 0x0F,
		0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
		0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xFF, 0xDA, 0x00, 0x08,
		0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9,
	}
	if _, err := io.Copy(part, bytes.NewReader(dummyJPEG)); err != nil {
		t.Fatalf("failed to copy dummy jpeg: %v", err)
	}
	_ = writer.Close()

	reqUpload := httptest.NewRequest(http.MethodPost, "/upload?token=test-secret-token", body)
	reqUpload.Header.Set("Content-Type", writer.FormDataContentType())
	recUpload := httptest.NewRecorder()

	bridgeSvc.handlePhotoUpload(recUpload, reqUpload)

	if recUpload.Code != http.StatusOK {
		t.Errorf("POST /upload expected 200 OK, got %d: %s", recUpload.Code, recUpload.Body.String())
	}
	if !strings.Contains(recUpload.Body.String(), "/local-image/img_") {
		t.Errorf("POST /upload response missing image path: %s", recUpload.Body.String())
	}

	// Verify file exists on disk in media dir
	mediaDir := mediaSvc.GetMediaDir()
	files, err := os.ReadDir(mediaDir)
	if err != nil || len(files) == 0 {
		t.Fatalf("expected uploaded file to exist in media dir: %v", err)
	}

	foundImage := false
	for _, f := range files {
		if strings.HasPrefix(f.Name(), "img_") && filepath.Ext(f.Name()) == ".jpg" {
			foundImage = true
			break
		}
	}
	if !foundImage {
		t.Errorf("uploaded file not found with expected format in %s", mediaDir)
	}
}

func TestPhoneBridgeService_DiscoverLocalIP(t *testing.T) {
	bridgeSvc := NewPhoneBridgeService(NewMediaService())
	ip, err := bridgeSvc.discoverLocalIP()
	if err != nil {
		t.Fatalf("discoverLocalIP returned error: %v", err)
	}
	if ip == "" {
		t.Error("expected non-empty IP string")
	}
	// IP should be a valid IPv4 representation
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		t.Errorf("expected IPv4 address, got %q", ip)
	}
}

func TestPhoneBridgeService_CloudURLFormatting(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-bridge-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)

	// Case 1: unauthenticated (no Supabase session) -> CloudURL must be empty
	info, err := bridgeSvc.Start()
	if err != nil {
		t.Fatalf("bridge start failed: %v", err)
	}
	defer func() { _ = bridgeSvc.Stop() }()

	if info.CloudURL != "" {
		t.Errorf("expected empty CloudURL when unauthenticated, got %q", info.CloudURL)
	}

	// Case 2: when cloud session is present, prefix must embed <uid>/<token>
	bridgeSvc.mu.Lock()
	bridgeSvc.cloudUserID = "user-uuid-1234"
	bridgeSvc.cloudAccessToken = "jwt-token-5678"
	bridgeSvc.cloudURL = fmt.Sprintf("https://grido.cloud-ip.cc/cam#session=%s/%s", bridgeSvc.cloudUserID, bridgeSvc.token)
	prefix := bridgeSvc.cloudObjectPrefixLocked()
	bridgeSvc.mu.Unlock()

	expectedPrefix := "user-uuid-1234/" + bridgeSvc.token
	if prefix != expectedPrefix {
		t.Errorf("expected object prefix %q, got %q", expectedPrefix, prefix)
	}

	expectedURL := fmt.Sprintf("https://grido.cloud-ip.cc/cam#session=user-uuid-1234/%s", bridgeSvc.token)
	status := bridgeSvc.GetStatus()
	if status.CloudURL != expectedURL {
		t.Errorf("expected status.CloudURL %q, got %q", expectedURL, status.CloudURL)
	}
}

// ─── RV-Bridge-01: انقطاع التنزيل السحابي كان يحذف الصورة الأصلية — الآن خطأ
// القراءة (أو جسم فارغ/مقطوع) يعيد خطأً دون حذف، والحذف يبقى حصريًا لجسمٍ كامل
// تم التحقق أنه ليس صورة، والصور الصغيرة السليمة (<512B) ما زالت تنجح ───
func TestPhoneBridgeService_CloudDownloadTruncatedNotDeleted(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-bridge-cloud-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)

	var mu sync.Mutex
	deletes := make(map[string]int)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			var payload struct {
				Prefixes []string `json:"prefixes"`
			}
			_ = json.NewDecoder(io.LimitReader(r.Body, 64*1024)).Decode(&payload)
			mu.Lock()
			for _, p := range payload.Prefixes {
				deletes[p]++
			}
			mu.Unlock()
			w.WriteHeader(http.StatusNoContent)
			return
		}
		// GET — المسار الكامل: /storage/v1/object/phone-bridge/<objectPath>
		switch {
		case strings.HasSuffix(r.URL.Path, "/truncated.jpg"):
			// ترويسات تعد بـ 10000 بايت ثم ينقطع الاتصال بعد 10 بايت:
			// محاكاة إعادة ضبط الاتصال بعد 200 (السيناريو الذي كان يمسح الأصل)
			w.Header().Set("Content-Type", "image/jpeg")
			w.Header().Set("Content-Length", "10000")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(bytes.Repeat([]byte{0xFF, 0xD8}, 5))
		case strings.HasSuffix(r.URL.Path, "/small.jpg"):
			// صورة سليمة كاملة أصغر من 512 بايت — مسار io.EOF/ErrUnexpectedEOF الشرعي
			w.Header().Set("Content-Type", "image/jpeg")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", len(bridgeSmallTestJPEG)))
			_, _ = w.Write(bridgeSmallTestJPEG)
		case strings.HasSuffix(r.URL.Path, "/big.txt"):
			// جسم كامل غير صوري (≥512B) — يُقرأ كاملًا فيُحذف مقصودًا
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write(bytes.Repeat([]byte{'A'}, 600))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	origURL, origKey := SupabaseURL, SupabaseAnonKey
	SupabaseURL = srv.URL
	SupabaseAnonKey = "test-anon-key"
	defer func() {
		SupabaseURL = origURL
		SupabaseAnonKey = origKey
	}()

	ctx := context.Background()
	deleteCount := func(key string) int {
		mu.Lock()
		defer mu.Unlock()
		return deletes[key]
	}
	waitForDelete := func(key string, want int) {
		deadline := time.Now().Add(4 * time.Second)
		for time.Now().Before(deadline) {
			if deleteCount(key) >= want {
				return
			}
			time.Sleep(25 * time.Millisecond)
		}
	}

	// 1) جسم مقطوع: خطأ يُعاد والكائن السحابي **لا يُحذف** (يُعاد سحبه لاحقًا)
	err = bridgeSvc.downloadAndSaveCloudPhoto(ctx, "uid-1/tok-1/truncated.jpg", "jwt-test")
	if err == nil {
		t.Fatalf("expected error for truncated download, got nil")
	}
	if n := deleteCount("uid-1/tok-1/truncated.jpg"); n != 0 {
		t.Errorf("truncated download must NOT delete the cloud object, got %d deletes", n)
	}

	// 2) جسم كامل غير صوري: الحذف المقصود محفوظ (نية التنظيف الأصلية)
	err = bridgeSvc.downloadAndSaveCloudPhoto(ctx, "uid-1/tok-1/big.txt", "jwt-test")
	if err == nil || !strings.Contains(err.Error(), "not an image") {
		t.Fatalf("expected 'not an image' error for full text object, got: %v", err)
	}
	waitForDelete("uid-1/tok-1/big.txt", 1)
	if n := deleteCount("uid-1/tok-1/big.txt"); n != 1 {
		t.Errorf("verified non-image object should be deleted exactly once, got %d", n)
	}

	// 3) صورة صغيرة سليمة (<512B): تنجح وتُحفظ محليًا ثم تُحذف من السحابة
	err = bridgeSvc.downloadAndSaveCloudPhoto(ctx, "uid-1/tok-1/small.jpg", "jwt-test")
	if err != nil {
		t.Fatalf("small legitimate image must download successfully, got: %v", err)
	}
	mediaDir := mediaSvc.GetMediaDir()
	saved := false
	entries, _ := os.ReadDir(mediaDir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "cloud_") && filepath.Ext(e.Name()) == ".jpg" {
			saved = true
			break
		}
	}
	if !saved {
		t.Errorf("small image not saved to media dir %s", mediaDir)
	}
	waitForDelete("uid-1/tok-1/small.jpg", 1)
	if n := deleteCount("uid-1/tok-1/small.jpg"); n != 1 {
		t.Errorf("saved image should be deleted from cloud exactly once, got %d", n)
	}
}

// ─── RV-Bridge-02: Stop أثناء رفع جارٍ كان ينعكس قفله مع tokenMatches فيتجمد
// ثوانٍ ويعيد "context deadline exceeded" بينما المعالج الناجي يبثّ لاحقًا
// {isRunning:true} بعد {isRunning:false} — الآن Stop يعد سريعًا بلا خطأ، ولا
// يُلتزم ولا يُبثّ أي شيء من معالج التقط جيل جلسة منتهي ───
func TestPhoneBridgeService_StopDuringInFlightUpload(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-bridge-stop-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)
	rec := &phoneEventRecorder{}
	bridgeSvc.SetRuntimeBridge(rec)

	info, err := bridgeSvc.Start()
	if err != nil {
		t.Fatalf("bridge start failed: %v", err)
	}
	defer func() { _ = bridgeSvc.Stop() }()

	// ⚠️ المستمع مربوط على عنوان LAN المكتشف (RV-Bridge-03) — الاتصال بنفس العنوان
	addr := net.JoinHostPort(info.IP, strconv.Itoa(info.Port))

	var full bytes.Buffer
	writer := multipart.NewWriter(&full)
	part, err := writer.CreateFormFile("photo", "cam.jpg")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	if _, err := part.Write(bridgeSmallTestJPEG); err != nil {
		t.Fatalf("failed to write jpeg part: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}
	payload := full.Bytes()

	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatalf("dial bridge %s: %v", addr, err)
	}
	defer conn.Close()

	reqHead := fmt.Sprintf(
		"POST /upload?token=%s HTTP/1.1\r\nHost: %s\r\nContent-Type: %s\r\nContent-Length: %d\r\nConnection: close\r\n\r\n",
		info.Token, addr, writer.FormDataContentType(), len(payload))
	if _, err := conn.Write([]byte(reqHead)); err != nil {
		t.Fatalf("failed to write request head: %v", err)
	}
	// نصف الجسم فقط: المعالج يعلق الآن في قراءة الجسم (رفع أثناء الطيران)
	if _, err := conn.Write(payload[:len(payload)/2]); err != nil {
		t.Fatalf("failed to write partial body: %v", err)
	}

	time.Sleep(300 * time.Millisecond) // اترك المعالج عالقًا في قراءة الجسم

	stopDone := make(chan error, 1)
	stopStart := time.Now()
	go func() { stopDone <- bridgeSvc.Stop() }()

	time.Sleep(150 * time.Millisecond) // اترك Stop يقلب الحالة ويدخل Shutdown خارج القفل

	// أكمل الجسم: المعالج يستيقظ على جلسة ميتة (جيل باطل) — لا التزام ولا بثّ
	if _, err := conn.Write(payload[len(payload)/2:]); err != nil {
		t.Fatalf("failed to complete body: %v", err)
	}
	_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	_, _ = io.Copy(io.Discard, conn)

	if err := <-stopDone; err != nil {
		t.Fatalf("Stop returned error during in-flight upload (deadlock regression?): %v", err)
	}
	if elapsed := time.Since(stopStart); elapsed > time.Second {
		t.Errorf("Stop took %v during in-flight upload (>1s) — lock inversion regression?", elapsed)
	}

	// لا بثّ {isRunning:true} بعد أول {isRunning:false} من Stop (لا إحياء حالة زائفة)
	sawStopFalse := false
	for _, ev := range rec.snapshot() {
		ok, running := bridgeEventIsRunning(ev)
		if !ok {
			continue
		}
		if !running {
			sawStopFalse = true
			continue
		}
		if sawStopFalse {
			t.Errorf("phone:status {isRunning:true} emitted after Stop — stale UI resurrection (RV-Bridge-02)")
		}
	}

	if status := bridgeSvc.GetStatus(); status.IsRunning {
		t.Errorf("GetStatus still reports running after stop")
	}

	// جلسة جديدة بعد الإيقاف أثناء رفع: تعمل بجيل جديد وتعيد معلومات سليمة
	info2, err := bridgeSvc.Start()
	if err != nil {
		t.Fatalf("restart after stop failed: %v", err)
	}
	if info2 == nil || !info2.IsRunning || info2.Token == "" {
		t.Errorf("invalid bridge info after restart: %+v", info2)
	}
}
