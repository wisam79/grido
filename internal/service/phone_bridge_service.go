package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

//go:embed embedded/phone_camera_page.html
var phoneCameraPageHTML []byte

const (
	DefaultPhoneBridgePort = 8741
	MaxUploadSize          = 50 * 1024 * 1024 // 50MB
)

type BridgeInfo struct {
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	Token     string `json:"token"`
	URL       string `json:"url"`
	CloudURL  string `json:"cloudUrl"`
	IsRunning bool   `json:"isRunning"`
}

type BridgeStatus struct {
	IsRunning     bool   `json:"isRunning"`
	URL           string `json:"url"`
	CloudURL      string `json:"cloudUrl"`
	PairedDevice  string `json:"pairedDevice"`
	ReceivedCount int    `json:"receivedCount"`
	LastReceived  string `json:"lastReceived"`
}

type PhoneBridgeService struct {
	mediaSvc *MediaService
	// runtime جسر بث أحداث الواجهة (phone:photo-received) — منفذ قابل للاستبدال
	runtime       domain.RuntimeBridge
	ctx           context.Context
	server        *http.Server
	listener      net.Listener
	ip            string
	port          int
	token         string
	url           string
	cloudURL      string
	cloudCancel   context.CancelFunc
	pairedDevice  string
	receivedCount int
	lastReceived  string
	mu            sync.RWMutex
}

func NewPhoneBridgeService(mediaSvc *MediaService) *PhoneBridgeService {
	return &PhoneBridgeService{
		mediaSvc: mediaSvc,
		runtime:  NewWailsRuntimeBridge(),
	}
}

// SetRuntimeBridge يستبدل جسر بث الأحداث (اختبارات/بيئات أخرى) — nil يُتجاهل
func (s *PhoneBridgeService) SetRuntimeBridge(bridge domain.RuntimeBridge) {
	if s == nil || bridge == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.runtime = bridge
}

func (s *PhoneBridgeService) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

func (s *PhoneBridgeService) Start() (*BridgeInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If already running, return current info
	if s.server != nil && s.listener != nil {
		return &BridgeInfo{
			IP:        s.ip,
			Port:      s.port,
			Token:     s.token,
			URL:       s.url,
			CloudURL:  s.cloudURL,
			IsRunning: true,
		}, nil
	}

	// 1. Discover outbound local IP
	localIP, err := s.discoverLocalIP()
	if err != nil {
		localIP = "127.0.0.1"
	}
	s.ip = localIP

	// 2. Generate secure session token (16 bytes = 32 hex chars)
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("generate session token: %w", err)
	}
	s.token = hex.EncodeToString(tokenBytes)

	// 3. Listen on preferred port (8741) or fallback to dynamic port (:0)
	var listener net.Listener
	preferredAddr := fmt.Sprintf("0.0.0.0:%d", DefaultPhoneBridgePort)
	listener, err = net.Listen("tcp", preferredAddr)
	if err != nil {
		slog.Warn("Preferred phone bridge port unavailable, using dynamic port", "preferred", DefaultPhoneBridgePort, "error", err)
		listener, err = net.Listen("tcp", "0.0.0.0:0")
		if err != nil {
			return nil, fmt.Errorf("listen on network: %w", err)
		}
	}

	tcpAddr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		_ = listener.Close()
		return nil, errors.New("failed to acquire TCP listener address")
	}
	s.port = tcpAddr.Port
	s.url = fmt.Sprintf("http://%s:%d?token=%s", s.ip, s.port, s.token)
	s.cloudURL = fmt.Sprintf("https://grido.cloud-ip.cc/cam#session=%s", s.token)
	s.listener = listener

	// 4. Setup HTTP Mux
	mux := http.NewServeMux()
	mux.HandleFunc("/", s.handleMobilePage)
	mux.HandleFunc("/upload", s.handlePhotoUpload)
	mux.HandleFunc("/ping", s.handlePing)
	mux.HandleFunc("/manifest.json", s.handleManifest)

	s.server = &http.Server{
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	srv := s.server
	// ⚠️ لا نُسجّل s.url أبداً: يحتوي توكن الجلسة في سلسلة الاستعلام، وسجلّ
	// التطبيق ملف على القرص (تسريب توكن الجسر لكل من يقرأ السجلّات)
	listenAddress := fmt.Sprintf("%s:%d", s.ip, s.port)
	utils.SafeGo("phone-bridge.server", func() {
		slog.Info("Phone bridge server listening", "address", listenAddress)
		if serveErr := srv.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			slog.Error("Phone bridge server stopped unexpectedly", "error", serveErr)
		}
	})

	// 5. بدء مزامنة الجسر السحابي الذكي الفورية في الخلفية
	if s.cloudCancel != nil {
		s.cloudCancel()
	}
	cloudCtx, cancel := context.WithCancel(context.Background())
	s.cloudCancel = cancel
	tokenCopy := s.token
	utils.SafeGo("phone-bridge.cloud-sync", func() {
		s.pollCloudBridge(cloudCtx, tokenCopy)
	})

	return &BridgeInfo{
		IP:        s.ip,
		Port:      s.port,
		Token:     s.token,
		URL:       s.url,
		CloudURL:  s.cloudURL,
		IsRunning: true,
	}, nil
}

func (s *PhoneBridgeService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cloudCancel != nil {
		s.cloudCancel()
		s.cloudCancel = nil
	}

	tokenToClean := s.token

	if s.server == nil {
		if tokenToClean != "" {
			s.cleanCloudSession(tokenToClean)
		}
		return nil
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := s.server.Shutdown(shutdownCtx)
	s.server = nil
	s.listener = nil
	s.url = ""
	s.cloudURL = ""
	s.token = ""
	s.pairedDevice = ""

	if tokenToClean != "" {
		s.cleanCloudSession(tokenToClean)
	}

	slog.Info("Phone bridge server stopped")
	return err
}

func (s *PhoneBridgeService) GetStatus() *BridgeStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return &BridgeStatus{
		IsRunning:     s.server != nil,
		URL:           s.url,
		CloudURL:      s.cloudURL,
		PairedDevice:  s.pairedDevice,
		ReceivedCount: s.receivedCount,
		LastReceived:  s.lastReceived,
	}
}

// tokenMatches يتحقق من توكن جلسة الجسر (ترويسة X-Bridge-Token أو معامل
// استعلام) بمقارنة زمن ثابت. صفحة الهاتف تقرأ التوكن من رابط الـQR وتُرسله
// في الترويسة، لذا لا يمنع التحقّق أي مسار مشروع للاستخدام.
func (s *PhoneBridgeService) tokenMatches(r *http.Request) bool {
	reqToken := r.URL.Query().Get("token")
	if reqToken == "" {
		reqToken = r.Header.Get("X-Bridge-Token")
	}

	s.mu.RLock()
	activeToken := s.token
	s.mu.RUnlock()

	if activeToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(reqToken), []byte(activeToken)) == 1
}

func (s *PhoneBridgeService) handleMobilePage(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// ℹ️ الصفحة **مقصود** أن تكون عامة: الهاتف يفتح رابط الـQR أولاً ثم يقرأ
	// التوكن من سلسلة الاستعلام، ولا تحمل الصفحة أي سر (الرفع وحده محميّ
	// بتوكن زمن-ثابت). لا نضيف بوابة توكن هنا لأنها لا تحمي شيئاً وتمنع
	// الاستخدام اليدوي، والتوثيق في phone_bridge_service_test.go يشترط 200.

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	_, _ = w.Write(phoneCameraPageHTML)
}

func (s *PhoneBridgeService) handlePing(w http.ResponseWriter, r *http.Request) {
	// ℹ️ عام عن عمد: يُستخدم لاختبار الوصول من الهاتف قبل الاقتران، ولا يكشف
	// شيئاً غير "ok" (تعقّب الجهاز/إصدار التوكن يقع في GetStatus المحلي).
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"time":   time.Now().Unix(),
	})
}

func (s *PhoneBridgeService) handleManifest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/manifest+json")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	manifest := map[string]interface{}{
		"name":             "Grido Studio Camera",
		"short_name":       "Grido Cam",
		"start_url":        "/",
		"display":          "standalone",
		"orientation":      "portrait",
		"background_color": "#090b10",
		"theme_color":      "#090b10",
		"icons": []map[string]string{
			{
				"src":   "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%232563eb'/><text x='50' y='68' font-size='50' font-weight='bold' fill='white' text-anchor='middle'>G</text></svg>",
				"sizes": "192x192 512x512",
				"type":  "image/svg+xml",
			},
		},
	}
	_ = json.NewEncoder(w).Encode(manifest)
}

func (s *PhoneBridgeService) handlePhotoUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Verify token
	if !s.tokenMatches(r) {
		http.Error(w, "Unauthorized: invalid session token", http.StatusUnauthorized)
		return
	}

	// 2. Bound payload size (LimitReader for Unbounded IO rule)
	r.Body = http.MaxBytesReader(w, r.Body, MaxUploadSize)

	// 3. Parse multipart form — 10MB في RAM والباقي لملفات مؤقتة تلقائياً
	// (الحد الكلي ما زال MaxUploadSize عبر MaxBytesReader أعلاه)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File payload too large or invalid multipart form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("photo")
	if err != nil {
		file, _, err = r.FormFile("file")
		if err != nil {
			http.Error(w, "Missing photo file in request", http.StatusBadRequest)
			return
		}
	}
	defer file.Close()

	// 4. Sniff MIME header to ensure valid image
	headerBuf := make([]byte, 512)
	n, err := file.Read(headerBuf)
	if err != nil && err != io.EOF {
		http.Error(w, "Failed to read file header", http.StatusBadRequest)
		return
	}

	detectedMime := http.DetectContentType(headerBuf[:n])
	if !strings.HasPrefix(detectedMime, "image/") {
		http.Error(w, "Invalid content type: only images are accepted", http.StatusBadRequest)
		return
	}

	// Seek back to start
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		http.Error(w, "Failed to seek file buffer", http.StatusInternalServerError)
		return
	}

	// 5. Store atomically in Media directory
	mediaDir := s.mediaSvc.GetMediaDir()
	ext := s.mediaSvc.GetExtensionFromMime(detectedMime)
	filename := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	finalPath := filepath.Join(mediaDir, filename)

	// كتابة ذرية موحّدة (utils.AtomicFile): ملف مؤقت + fsync + rename
	af, err := utils.CreateAtomic(finalPath, 0o644)
	if err != nil {
		slog.Error("Failed to create temporary upload file", "error", err)
		http.Error(w, "Internal server error creating file", http.StatusInternalServerError)
		return
	}
	defer af.Abort()

	if _, err := io.Copy(af, file); err != nil {
		slog.Error("Failed to write temporary upload file", "error", err)
		http.Error(w, "Failed writing file data", http.StatusInternalServerError)
		return
	}

	if err := af.Commit(); err != nil {
		slog.Error("Failed to commit uploaded file", "error", err)
		http.Error(w, "Atomic rename error", http.StatusInternalServerError)
		return
	}

	virtualPath := "/local-image/" + filename

	// 6. Update counts and notify Frontend
	s.mu.Lock()
	s.receivedCount++
	s.lastReceived = time.Now().Format("15:04:05")
	s.mu.Unlock()

	s.runtime.Emit("phone:photo-received", map[string]string{
		"path": virtualPath,
	})

	slog.Info("Phone bridge received photo successfully", "path", virtualPath)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Photo uploaded successfully",
		"path":    virtualPath,
	})
}

func (s *PhoneBridgeService) discoverLocalIP() (string, error) {
	// 1. Attempt outbound UDP connection to determine primary routing interface
	conn, err := net.DialTimeout("udp", "8.8.8.8:80", 500*time.Millisecond)
	if err == nil {
		defer conn.Close()
		if udpAddr, ok := conn.LocalAddr().(*net.UDPAddr); ok {
			ip := udpAddr.IP.To4()
			if ip != nil && !ip.IsLoopback() {
				return ip.String(), nil
			}
		}
	}

	// 2. Intelligent physical interface scanning:
	// Prioritize active (UP), non-loopback physical network adapters (Wi-Fi, Ethernet).
	// On Windows, virtual adapters (WSL vEthernet, Hyper-V, Docker, VirtualBox, VMware)
	// frequently hijack fallback selection if InterfaceAddrs() is read naively.
	interfaces, ifErr := net.Interfaces()
	if ifErr == nil {
		var preferredIP string
		var fallbackIP string

		for _, ifi := range interfaces {
			// Must be UP and not Loopback
			if ifi.Flags&net.FlagUp == 0 || ifi.Flags&net.FlagLoopback != 0 {
				continue
			}

			nameLower := strings.ToLower(ifi.Name)
			// Skip known virtual / container / tunnel adapter names
			isVirtual := strings.Contains(nameLower, "vethernet") ||
				strings.Contains(nameLower, "wsl") ||
				strings.Contains(nameLower, "docker") ||
				strings.Contains(nameLower, "virtual") ||
				strings.Contains(nameLower, "vbox") ||
				strings.Contains(nameLower, "vmnet") ||
				strings.Contains(nameLower, "tailscale") ||
				strings.Contains(nameLower, "zerotier") ||
				strings.Contains(nameLower, "tap") ||
				strings.Contains(nameLower, "tun")

			addrs, err := ifi.Addrs()
			if err != nil {
				continue
			}

			for _, addr := range addrs {
				ipNet, ok := addr.(*net.IPNet)
				if !ok || ipNet.IP.IsLoopback() {
					continue
				}
				ipv4 := ipNet.IP.To4()
				if ipv4 == nil {
					continue
				}

				ipStr := ipv4.String()
				// Check for private subnet ranges (192.168.x.x, 10.x.x.x)
				isClassC := ipv4[0] == 192 && ipv4[1] == 168
				isClassA := ipv4[0] == 10

				if !isVirtual && (isClassC || isClassA) {
					// Physical Wi-Fi or LAN subnet: immediate best choice
					return ipStr, nil
				} else if !isVirtual && preferredIP == "" {
					preferredIP = ipStr
				} else if fallbackIP == "" {
					fallbackIP = ipStr
				}
			}
		}

		if preferredIP != "" {
			return preferredIP, nil
		}
		if fallbackIP != "" {
			return fallbackIP, nil
		}
	}

	// 3. Last-resort fallback: iterate network interface addresses
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1", err
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String(), nil
			}
		}
	}

	return "127.0.0.1", nil
}

type cloudStorageItem struct {
	Name string `json:"name"`
	Id   string `json:"id"`
}

// pollCloudBridge يقوم بالاستماع اللحظي إلى باكت Supabase Storage المؤقت، وسحب أي صورة
// تم التقاطها من هاتف المستخدم وحفظها محلياً فورياً ثم حذفها من السيرفر فوراً.
func (s *PhoneBridgeService) pollCloudBridge(ctx context.Context, sessionToken string) {
	if SupabaseURL == "" || SupabaseAnonKey == "" {
		slog.Debug("Supabase credentials not configured, skipping cloud bridge sync")
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	ticker := time.NewTicker(1500 * time.Millisecond)
	defer ticker.Stop()

	listURL := strings.TrimRight(SupabaseURL, "/") + "/storage/v1/object/list/phone-bridge"
	deleteURL := strings.TrimRight(SupabaseURL, "/") + "/storage/v1/object/phone-bridge"

	for {
		select {
		case <-ctx.Done():
			s.cleanCloudSession(sessionToken)
			return
		case <-ticker.C:
			s.mu.RLock()
			running := s.server != nil && s.token == sessionToken
			s.mu.RUnlock()
			if !running {
				s.cleanCloudSession(sessionToken)
				return
			}

			// 1. فحص وجود كائنات في المسار المؤقت لجلسة المستخدم الحالية
			listPayload, err := json.Marshal(map[string]interface{}{
				"prefix": sessionToken + "/",
				"limit":  10,
			})
			if err != nil {
				continue
			}

			req, err := http.NewRequestWithContext(ctx, "POST", listURL, bytes.NewBuffer(listPayload))
			if err != nil {
				continue
			}
			req.Header.Set("apikey", SupabaseAnonKey)
			req.Header.Set("Authorization", "Bearer "+SupabaseAnonKey)
			req.Header.Set("Content-Type", "application/json")

			resp, err := client.Do(req)
			if err != nil {
				continue
			}

			if resp.StatusCode != http.StatusOK {
				resp.Body.Close()
				continue
			}

			var items []cloudStorageItem
			decodeErr := json.NewDecoder(io.LimitReader(resp.Body, 256*1024)).Decode(&items)
			resp.Body.Close()
			if decodeErr != nil || len(items) == 0 {
				continue
			}

			// 2. سحب ومعالجة كل ملف وارد
			for _, item := range items {
				if item.Name == "" {
					continue
				}

				objectPath := sessionToken + "/" + item.Name

				// معالجة مصافحة اقتران الجهاز (Handshake)
				if strings.HasSuffix(item.Name, ".handshake.json") || strings.HasSuffix(item.Name, ".handshake") {
					downURL := strings.TrimRight(SupabaseURL, "/") + "/storage/v1/object/phone-bridge/" + objectPath
					downReq, _ := http.NewRequestWithContext(ctx, "GET", downURL, nil)
					if downReq != nil {
						downReq.Header.Set("apikey", SupabaseAnonKey)
						downReq.Header.Set("Authorization", "Bearer "+SupabaseAnonKey)
						if dResp, err := client.Do(downReq); err == nil && dResp.StatusCode == http.StatusOK {
							var hsData struct {
								Device string `json:"device"`
							}
							_ = json.NewDecoder(io.LimitReader(dResp.Body, 16*1024)).Decode(&hsData)
							dResp.Body.Close()
							if hsData.Device != "" {
								s.mu.Lock()
								s.pairedDevice = hsData.Device
								s.mu.Unlock()
								s.runtime.Emit("phone:paired", map[string]interface{}{
									"device": hsData.Device,
									"time":   time.Now().Format("15:04:05"),
								})
								slog.Info("Phone bridge paired with device", "device", hsData.Device)
							}
						}
					}
					s.deleteCloudObject(deleteURL, objectPath)
					continue
				}

				if strings.HasPrefix(item.Name, ".") {
					s.deleteCloudObject(deleteURL, objectPath)
					continue
				}

				downloadURL := strings.TrimRight(SupabaseURL, "/") + "/storage/v1/object/phone-bridge/" + objectPath

				downReq, dErr := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
				if dErr != nil {
					continue
				}
				downReq.Header.Set("apikey", SupabaseAnonKey)
				downReq.Header.Set("Authorization", "Bearer "+SupabaseAnonKey)

				downResp, dErr := client.Do(downReq)
				if dErr != nil || downResp.StatusCode != http.StatusOK {
					if downResp != nil {
						downResp.Body.Close()
					}
					continue
				}

				// التحقق من نوع المحتوى لضمان أنه صورة
				headerBuf := make([]byte, 512)
				n, _ := io.ReadFull(downResp.Body, headerBuf)
				detectedMime := http.DetectContentType(headerBuf[:n])

				if !strings.HasPrefix(detectedMime, "image/") {
					downResp.Body.Close()
					s.deleteCloudObject(deleteURL, objectPath)
					continue
				}

				fullReader := io.MultiReader(bytes.NewReader(headerBuf[:n]), downResp.Body)

				mediaDir := s.mediaSvc.GetMediaDir()
				ext := s.mediaSvc.GetExtensionFromMime(detectedMime)
				filename := fmt.Sprintf("cloud_%d%s", time.Now().UnixNano(), ext)
				finalPath := filepath.Join(mediaDir, filename)

				af, createErr := utils.CreateAtomic(finalPath, 0o644)
				if createErr != nil {
					downResp.Body.Close()
					continue
				}

				_, copyErr := io.Copy(af, io.LimitReader(fullReader, MaxUploadSize))
				downResp.Body.Close()

				if copyErr != nil {
					af.Abort()
					continue
				}

				if commitErr := af.Commit(); commitErr != nil {
					continue
				}

				virtualPath := "/local-image/" + filename

				s.mu.Lock()
				s.receivedCount++
				s.lastReceived = time.Now().Format("15:04:05")
				s.mu.Unlock()

				s.runtime.Emit("phone:photo-received", map[string]string{
					"path": virtualPath,
				})

				slog.Info("Phone bridge received cloud photo successfully", "path", virtualPath)

				// 3. الحذف الفوري (Instant Purge) من السيرفر السحابي لحماية الخصوصية ومساحة التخزين
				s.deleteCloudObject(deleteURL, objectPath)
			}
		}
	}
}

// deleteCloudObject يحذف الملف من باكت التخزين السحابي فوراً
func (s *PhoneBridgeService) deleteCloudObject(deleteURL, objectPath string) {
	if SupabaseURL == "" || SupabaseAnonKey == "" {
		return
	}
	delPayload, err := json.Marshal(map[string]interface{}{
		"prefixes": []string{objectPath},
	})
	if err != nil {
		return
	}
	req, err := http.NewRequest("DELETE", deleteURL, bytes.NewBuffer(delPayload))
	if err != nil {
		return
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err == nil && resp != nil {
		resp.Body.Close()
	}
}

// cleanCloudSession ينظف كافة ملفات الجلسة السحابية عند إغلاق الجسر
func (s *PhoneBridgeService) cleanCloudSession(sessionToken string) {
	if sessionToken == "" || SupabaseURL == "" || SupabaseAnonKey == "" {
		return
	}
	deleteURL := strings.TrimRight(SupabaseURL, "/") + "/storage/v1/object/phone-bridge"
	s.deleteCloudObject(deleteURL, sessionToken)
}

