package server

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"grido/internal/service"
)

// اختبار عقد /api/scanner-warp عبر HTTP: حارس الجلسة + الردود الموحدة + الأخطاء المغلقة.

func newScannerWarpTestServer(t *testing.T) (*AssetServer, string) {
	t.Helper()
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := service.NewMediaService()
	srv := NewAssetServer(AssetServerDeps{
		SessionToken: "test-session-token-12345",
		MediaSvc:     mediaSvc,
		ScannerWarp:  service.NewScannerWarpService(mediaSvc),
	})
	return srv, mediaSvc.GetMediaDir()
}

func writeScannerWarpSourcePNG(t *testing.T, dir string) string {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, 96, 72))
	for y := 0; y < 72; y++ {
		for x := 0; x < 96; x++ {
			i := (y*96 + x) * 4
			img.Pix[i] = uint8(x * 2)
			img.Pix[i+1] = uint8(y * 3)
			img.Pix[i+2] = 120
			img.Pix[i+3] = 255
		}
	}
	name := "warp_http_source.png"
	file, err := os.Create(filepath.Join(dir, name))
	if err != nil {
		t.Fatalf("إنشاء المصدر: %v", err)
	}
	defer file.Close()
	if err := png.Encode(file, img); err != nil {
		t.Fatalf("ترميز المصدر: %v", err)
	}
	return name
}

func postScannerWarp(t *testing.T, srv *AssetServer, body string, withToken bool) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/scanner-warp", strings.NewReader(body))
	if withToken {
		req.Header.Set(service.LocalApiSessionHeader, "test-session-token-12345")
	}
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

func TestScannerWarpEndpointHappyPath(t *testing.T) {
	srv, mediaDir := newScannerWarpTestServer(t)
	srcName := writeScannerWarpSourcePNG(t, mediaDir)

	body, _ := json.Marshal(map[string]any{
		"sourceUrl": "/local-image/" + srcName,
		"corners":   []map[string]float64{{"x": 8, "y": 6}, {"x": 88, "y": 6}, {"x": 88, "y": 66}, {"x": 8, "y": 66}},
		"targetW":   48,
		"targetH":   36,
		"filter":    "original",
		"rotation":  0,
	})

	rec := postScannerWarp(t, srv, string(body), true)
	if rec.Code != http.StatusOK {
		t.Fatalf("توقّع 200 وحصل %d: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Status string `json:"status"`
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("فك الرد: %v", err)
	}
	if resp.Status != "success" || resp.Width != 48 || resp.Height != 36 {
		t.Fatalf("رد غير متوقع: %+v", resp)
	}
	if !strings.HasPrefix(resp.URL, "/local-image/scan_") || !strings.HasSuffix(resp.URL, ".png") {
		t.Fatalf("رابط المخرج غير متوقع: %s", resp.URL)
	}
	if _, err := os.Stat(filepath.Join(mediaDir, filepath.Base(resp.URL))); err != nil {
		t.Fatalf("ملف المخرج غير موجود: %v", err)
	}
}

func TestScannerWarpEndpointRequiresSession(t *testing.T) {
	srv, _ := newScannerWarpTestServer(t)
	rec := postScannerWarp(t, srv, `{"sourceUrl":"/local-image/x.png"}`, false)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("توقّع 403 بلا توكن وحصل %d", rec.Code)
	}
}

func TestScannerWarpEndpointFailClosedErrors(t *testing.T) {
	srv, mediaDir := newScannerWarpTestServer(t)
	srcName := writeScannerWarpSourcePNG(t, mediaDir)

	cases := []struct {
		name string
		body string
		code string
	}{
		{
			"أركان خارج الحدود",
			`{"sourceUrl":"/local-image/` + srcName + `","corners":[{"x":-9,"y":6},{"x":88,"y":6},{"x":88,"y":66},{"x":8,"y":66}],"targetW":48,"targetH":36,"filter":"original","rotation":0}`,
			"SCN-WARP-01",
		},
		{
			"تجاوز 50MP",
			`{"sourceUrl":"/local-image/` + srcName + `","corners":[{"x":8,"y":6},{"x":88,"y":6},{"x":88,"y":66},{"x":8,"y":66}],"targetW":9000,"targetH":9000,"filter":"original","rotation":0}`,
			"SCN-WARP-02",
		},
		{
			"مصدر data:",
			`{"sourceUrl":"data:image/png;base64,AAAA","corners":[{"x":8,"y":6},{"x":88,"y":6},{"x":88,"y":66},{"x":8,"y":66}],"targetW":48,"targetH":36,"filter":"original","rotation":0}`,
			"SCN-WARP-03",
		},
		{
			"فلتر غير معروف",
			`{"sourceUrl":"/local-image/` + srcName + `","corners":[{"x":8,"y":6},{"x":88,"y":6},{"x":88,"y":66},{"x":8,"y":66}],"targetW":48,"targetH":36,"filter":"neon","rotation":0}`,
			"SCN-WARP-04",
		},
		{
			"JSON تالف",
			`{not-json`,
			"",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := postScannerWarp(t, srv, tc.body, true)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("توقّع 400 وحصل %d: %s", rec.Code, rec.Body.String())
			}
			if tc.code != "" && !bytes.Contains(rec.Body.Bytes(), []byte(tc.code)) {
				t.Fatalf("الرد لا يحتوي الكود %s: %s", tc.code, rec.Body.String())
			}
		})
	}
}
