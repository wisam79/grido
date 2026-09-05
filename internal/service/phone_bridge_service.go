package service

import (
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
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
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
	IsRunning bool   `json:"isRunning"`
}

type BridgeStatus struct {
	IsRunning     bool   `json:"isRunning"`
	URL           string `json:"url"`
	ReceivedCount int    `json:"receivedCount"`
	LastReceived  string `json:"lastReceived"`
}

type PhoneBridgeService struct {
	mediaSvc      *MediaService
	ctx           context.Context
	server        *http.Server
	listener      net.Listener
	ip            string
	port          int
	token         string
	url           string
	receivedCount int
	lastReceived  string
	mu            sync.RWMutex
}

func NewPhoneBridgeService(mediaSvc *MediaService) *PhoneBridgeService {
	return &PhoneBridgeService{
		mediaSvc: mediaSvc,
	}
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
	go func() {
		slog.Info("Phone bridge server listening", "url", s.url)
		if serveErr := srv.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			slog.Error("Phone bridge server stopped unexpectedly", "error", serveErr)
		}
	}()

	return &BridgeInfo{
		IP:        s.ip,
		Port:      s.port,
		Token:     s.token,
		URL:       s.url,
		IsRunning: true,
	}, nil
}

func (s *PhoneBridgeService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.server == nil {
		return nil
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := s.server.Shutdown(shutdownCtx)
	s.server = nil
	s.listener = nil
	s.url = ""
	s.token = ""

	slog.Info("Phone bridge server stopped")
	return err
}

func (s *PhoneBridgeService) GetStatus() *BridgeStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return &BridgeStatus{
		IsRunning:     s.server != nil,
		URL:           s.url,
		ReceivedCount: s.receivedCount,
		LastReceived:  s.lastReceived,
	}
}

func (s *PhoneBridgeService) handleMobilePage(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	// Dynamic disk reload for development: check disk first so changes reflect instantly
	devPath := filepath.Join("internal", "service", "embedded", "phone_camera_page.html")
	if data, err := os.ReadFile(devPath); err == nil && len(data) > 0 {
		_, _ = w.Write(data)
		return
	}

	_, _ = w.Write(phoneCameraPageHTML)
}

func (s *PhoneBridgeService) handlePing(w http.ResponseWriter, r *http.Request) {
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
	reqToken := r.URL.Query().Get("token")
	if reqToken == "" {
		reqToken = r.Header.Get("X-Bridge-Token")
	}

	s.mu.RLock()
	activeToken := s.token
	s.mu.RUnlock()

	if activeToken == "" || subtle.ConstantTimeCompare([]byte(reqToken), []byte(activeToken)) != 1 {
		http.Error(w, "Unauthorized: invalid session token", http.StatusUnauthorized)
		return
	}

	// 2. Bound payload size (LimitReader for Unbounded IO rule)
	r.Body = http.MaxBytesReader(w, r.Body, MaxUploadSize)

	// 3. Parse multipart form
	if err := r.ParseMultipartForm(MaxUploadSize); err != nil {
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
	tmpPath := finalPath + ".tmp"

	defer func() {
		_ = os.Remove(tmpPath) // Cleanup abandoned tmp file rule
	}()

	tmpFile, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		slog.Error("Failed to create temporary upload file", "error", err)
		http.Error(w, "Internal server error creating file", http.StatusInternalServerError)
		return
	}

	if _, err := io.Copy(tmpFile, file); err != nil {
		_ = tmpFile.Close()
		slog.Error("Failed to write temporary upload file", "error", err)
		http.Error(w, "Failed writing file data", http.StatusInternalServerError)
		return
	}

	// Fsync before rename rule
	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		slog.Error("Failed to sync file buffer to disk", "error", err)
		http.Error(w, "Disk sync error", http.StatusInternalServerError)
		return
	}

	if err := tmpFile.Close(); err != nil {
		slog.Error("Failed to close temporary file", "error", err)
		http.Error(w, "File close error", http.StatusInternalServerError)
		return
	}

	if err := os.Rename(tmpPath, finalPath); err != nil {
		slog.Error("Failed to atomically rename temporary file", "error", err)
		http.Error(w, "Atomic rename error", http.StatusInternalServerError)
		return
	}

	virtualPath := "/local-image/" + filename

	// 6. Update counts and notify Frontend
	s.mu.Lock()
	s.receivedCount++
	s.lastReceived = time.Now().Format("15:04:05")
	currentCtx := s.ctx
	s.mu.Unlock()

	if currentCtx != nil {
		wailsruntime.EventsEmit(currentCtx, "phone:photo-received", map[string]string{
			"path": virtualPath,
		})
	}

	slog.Info("Phone bridge received photo successfully", "path", virtualPath)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Photo uploaded successfully",
		"path":    virtualPath,
	})
}

func (s *PhoneBridgeService) discoverLocalIP() (string, error) {
	// Attempt outbound UDP connection to determine primary routing interface
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		if udpAddr, ok := conn.LocalAddr().(*net.UDPAddr); ok {
			ip := udpAddr.IP.To4()
			if ip != nil && !ip.IsLoopback() {
				return ip.String(), nil
			}
		}
	}

	// Fallback: iterate network interface addresses
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
