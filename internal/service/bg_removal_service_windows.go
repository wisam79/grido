//go:build windows

package service

import (
	"bytes"
	"crypto/sha256"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/disintegration/imaging"
	ort "github.com/yalue/onnxruntime_go"

	"grido/internal/utils"
)

//go:embed ai_assets/onnxruntime.dll
var embeddedOnnxRuntimeDLL []byte

//go:embed ai_assets/modnet.onnx
var embeddedModnetModel []byte

// BgRemovalService executes studio-grade portrait background removal locally via ONNX Runtime & MODNet.
type BgRemovalService struct {
	imageProc    *ImageProcessorService
	mediaService *MediaService

	mu           sync.Mutex
	session      *ort.AdvancedSession
	inputTensor  *ort.Tensor[float32]
	outputTensor *ort.Tensor[float32]
	isReady      bool
	initAttempts int
	initErr      error
}

func NewBgRemovalService(imageProc *ImageProcessorService, mediaService *MediaService) *BgRemovalService {
	return &BgRemovalService{
		imageProc:    imageProc,
		mediaService: mediaService,
	}
}

// ensureInitialized must be called with s.mu held — all callers (Warmup, RemoveBackground) hold the lock.
// Caps retries at 3 to avoid hammering a corrupt model/DLL; expose last error to UI.
func (s *BgRemovalService) ensureInitialized() error {
	if s.isReady {
		return nil
	}
	if s.initErr != nil && s.initAttempts >= 3 {
		return s.initErr
	}
	if err := s.initEngine(); err != nil {
		s.initAttempts++
		s.initErr = err
		return err
	}
	s.initErr = nil
	return nil
}

func (s *BgRemovalService) initEngine() error {
	if len(embeddedOnnxRuntimeDLL) == 0 {
		return fmt.Errorf("embedded onnxruntime.dll is empty")
	}
	if len(embeddedModnetModel) == 0 {
		return fmt.Errorf("embedded modnet.onnx is empty")
	}

	// 1. Ensure onnxruntime.dll is extracted atomically to AppData/bin
	binDir := filepath.Join(utils.GetAppDir(), "bin")
	_ = os.MkdirAll(binDir, 0o755)
	targetDllPath := filepath.Join(binDir, "onnxruntime.dll")

	extractNeeded := true
	if fi, err := os.Stat(targetDllPath); err == nil && fi.Size() == int64(len(embeddedOnnxRuntimeDLL)) {
		if existing, err := os.ReadFile(targetDllPath); err == nil {
			expected := sha256.Sum256(embeddedOnnxRuntimeDLL)
			actual := sha256.Sum256(existing)
			if bytes.Equal(expected[:], actual[:]) {
				extractNeeded = false
			}
		}
	}

	if extractNeeded {
		if err := utils.AtomicWriteFile(targetDllPath, embeddedOnnxRuntimeDLL, 0o755); err != nil {
			return fmt.Errorf("failed to extract onnxruntime.dll: %w", err)
		}
	}

	// 2. Point ONNX Runtime to the shared library and initialize environment
	ort.SetSharedLibraryPath(targetDllPath)
	if !ort.IsInitialized() {
		if err := ort.InitializeEnvironment(); err != nil {
			return fmt.Errorf("failed to initialize onnxruntime environment: %w", err)
		}
	}

	// 3. Pre-allocate reusable input [1, 3, 512, 512] and output [1, 1, 512, 512] tensors
	inputShape := ort.NewShape(1, 3, 512, 512)
	inTensor, err := ort.NewEmptyTensor[float32](inputShape)
	if err != nil {
		return fmt.Errorf("failed to allocate input tensor: %w", err)
	}

	outputShape := ort.NewShape(1, 1, 512, 512)
	outTensor, err := ort.NewEmptyTensor[float32](outputShape)
	if err != nil {
		_ = inTensor.Destroy()
		return fmt.Errorf("failed to allocate output tensor: %w", err)
	}

	// 4. Create ONNX Advanced Session directly with embedded in-memory model data
	session, err := ort.NewAdvancedSessionWithONNXData(
		embeddedModnetModel,
		[]string{"input"},
		[]string{"output"},
		[]ort.Value{inTensor},
		[]ort.Value{outTensor},
		nil,
	)
	if err != nil {
		_ = inTensor.Destroy()
		_ = outTensor.Destroy()
		return fmt.Errorf("failed to create modnet session: %w", err)
	}

	s.inputTensor = inTensor
	s.outputTensor = outTensor
	s.session = session
	s.isReady = true
	s.initAttempts = 0
	s.initErr = nil
	return nil
}

// Warmup initializes the engine and model ahead of time during idle/startup.
func (s *BgRemovalService) Warmup() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.ensureInitialized()
}

// RemoveBackground executes high-speed local inference to separate foreground subject and composite transparent alpha.
func (s *BgRemovalService) RemoveBackground(imageSrc string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureInitialized(); err != nil {
		return "", fmt.Errorf("ai engine not available: %w", err)
	}

	srcImg, err := s.imageProc.LoadImage(imageSrc)
	if err != nil {
		return "", fmt.Errorf("load source image: %w", err)
	}

	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()
	if srcW <= 0 || srcH <= 0 {
		return "", fmt.Errorf("invalid image dimensions: %dx%d", srcW, srcH)
	}

	// 1. Resize input to 512x512
	resizedImg := imaging.Resize(srcImg, 512, 512, imaging.Linear)

	// 2. Prepare NCHW float32 tensor normalized to [-1.0, 1.0]
	inSlice := s.inputTensor.GetData()
	const planeSize = 512 * 512

	for y := 0; y < 512; y++ {
		rowOffset := y * 512
		for x := 0; x < 512; x++ {
			r, g, b, _ := resizedImg.At(x, y).RGBA()
			r8 := float32(r >> 8)
			g8 := float32(g >> 8)
			b8 := float32(b >> 8)

			pixelIdx := rowOffset + x
			inSlice[0*planeSize+pixelIdx] = (r8 / 127.5) - 1.0
			inSlice[1*planeSize+pixelIdx] = (g8 / 127.5) - 1.0
			inSlice[2*planeSize+pixelIdx] = (b8 / 127.5) - 1.0
		}
	}

	// 3. Execute inference forward pass
	if err := s.session.Run(); err != nil {
		return "", fmt.Errorf("inference error: %w", err)
	}

	// 4. Convert float32 output [1, 1, 512, 512] to uint8 alpha mask
	rawOutput := s.outputTensor.GetData()
	maskBytes := make([]byte, planeSize)
	for i, val := range rawOutput {
		if val <= 0 {
			maskBytes[i] = 0
		} else if val >= 1.0 {
			maskBytes[i] = 255
		} else {
			maskBytes[i] = uint8(val * 255.0)
		}
	}

	// 5. Delegate to ApplyMaskRaw for parallel compositing, spill suppression, and atomic persistence
	return s.imageProc.ApplyMaskRaw(imageSrc, maskBytes, 512, 512)
}

// Close frees all underlying ONNX tensors and sessions.
func (s *BgRemovalService) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.session != nil {
		_ = s.session.Destroy()
		s.session = nil
	}
	if s.inputTensor != nil {
		_ = s.inputTensor.Destroy()
		s.inputTensor = nil
	}
	if s.outputTensor != nil {
		_ = s.outputTensor.Destroy()
		s.outputTensor = nil
	}
	s.isReady = false
	s.initAttempts = 0
	s.initErr = nil
	return nil
}
