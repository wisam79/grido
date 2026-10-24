//go:build windows

package service

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/disintegration/imaging"
	ort "github.com/yalue/onnxruntime_go"

	"grido/internal/utils"
)

//go:embed ai_assets/fastvit_sa24.onnx
var embeddedDocModel []byte

type ScannerDetectorService struct {
	imageProc    *ImageProcessorService
	mediaService *MediaService

	mu           sync.Mutex
	initOnce     sync.Once
	initErr      error
	session      *ort.AdvancedSession
	inputTensor  *ort.Tensor[float32]
	outputTensor *ort.Tensor[float32]
	isReady      bool
}

func NewScannerDetectorService(imageProc *ImageProcessorService, mediaService *MediaService) *ScannerDetectorService {
	return &ScannerDetectorService{
		imageProc:    imageProc,
		mediaService: mediaService,
	}
}

func (s *ScannerDetectorService) ensureInitialized() error {
	s.initOnce.Do(func() {
		s.initErr = s.initEngine()
	})
	return s.initErr
}

func (s *ScannerDetectorService) initEngine() error {
	if len(embeddedDocModel) == 0 {
		return fmt.Errorf("embedded fastvit_sa24.onnx is empty")
	}

	// 1. Ensure onnxruntime.dll is initialized (extracted by bg_removal or here)
	binDir := filepath.Join(utils.GetAppDir(), "bin")
	_ = os.MkdirAll(binDir, 0o755)
	targetDllPath := filepath.Join(binDir, "onnxruntime.dll")

	if len(embeddedOnnxRuntimeDLL) > 0 {
		extractNeeded := true
		if stat, err := os.Stat(targetDllPath); err == nil {
			if stat.Size() == int64(len(embeddedOnnxRuntimeDLL)) {
				extractNeeded = false
			}
		}
		if extractNeeded {
			_ = utils.AtomicWriteFile(targetDllPath, embeddedOnnxRuntimeDLL, 0o755)
		}
	}

	ort.SetSharedLibraryPath(targetDllPath)
	if !ort.IsInitialized() {
		if err := ort.InitializeEnvironment(); err != nil {
			return fmt.Errorf("failed to initialize onnxruntime environment: %w", err)
		}
	}

	// 2. Pre-allocate reusable input [1, 3, 256, 256] and output [1, 4, 128, 128] tensors
	inputShape := ort.NewShape(1, 3, 256, 256)
	inTensor, err := ort.NewEmptyTensor[float32](inputShape)
	if err != nil {
		return fmt.Errorf("failed to allocate doc detector input tensor: %w", err)
	}

	outputShape := ort.NewShape(1, 4, 128, 128)
	outTensor, err := ort.NewEmptyTensor[float32](outputShape)
	if err != nil {
		_ = inTensor.Destroy()
		return fmt.Errorf("failed to allocate doc detector output tensor: %w", err)
	}

	// 3. Create ONNX Advanced Session directly with embedded in-memory model data
	session, err := ort.NewAdvancedSessionWithONNXData(
		embeddedDocModel,
		[]string{"img"},
		[]string{"heatmap"},
		[]ort.Value{inTensor},
		[]ort.Value{outTensor},
		nil,
	)
	if err != nil {
		_ = inTensor.Destroy()
		_ = outTensor.Destroy()
		return fmt.Errorf("failed to create fastvit_sa24 session: %w", err)
	}

	s.inputTensor = inTensor
	s.outputTensor = outTensor
	s.session = session
	s.isReady = true
	return nil
}

type DetectedCorner struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type DetectCornersResult struct {
	Corners    []DetectedCorner `json:"corners"`
	Confidence float64          `json:"confidence"`
	Width      int              `json:"width"`
	Height     int              `json:"height"`
}

// DetectDocumentCorners detects 4 precise document corners from a local image path.
func (s *ScannerDetectorService) DetectDocumentCorners(imageSrc string) (*DetectCornersResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureInitialized(); err != nil {
		return nil, fmt.Errorf("scanner detector engine not available: %w", err)
	}

	srcImg, err := s.imageProc.LoadImage(imageSrc)
	if err != nil {
		return nil, fmt.Errorf("load source image: %w", err)
	}

	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()
	if srcW <= 0 || srcH <= 0 {
		return nil, fmt.Errorf("invalid image dimensions: %dx%d", srcW, srcH)
	}

	// 1. Resize input to 256x256 bilinear
	resizedImg := imaging.Resize(srcImg, 256, 256, imaging.Linear)

	// 2. Prepare NCHW float32 tensor normalized to [0.0, 1.0] (FastViT docaligner convention)
	inSlice := s.inputTensor.GetData()
	const planeSize = 256 * 256

	for y := 0; y < 256; y++ {
		rowOffset := y * 256
		for x := 0; x < 256; x++ {
			r, g, b, _ := resizedImg.At(x, y).RGBA()
			// r, g, b are in [0, 0xffff]
			inSlice[rowOffset+x] = float32(r>>8) / 255.0
			inSlice[planeSize+rowOffset+x] = float32(g>>8) / 255.0
			inSlice[planeSize*2+rowOffset+x] = float32(b>>8) / 255.0
		}
	}

	// 3. Run Inference
	if err := s.session.Run(); err != nil {
		return nil, fmt.Errorf("doc detector inference error: %w", err)
	}

	// 4. Output heatmap: [1, 4, 128, 128]
	outSlice := s.outputTensor.GetData()
	const hmPlane = 128 * 128

	scaleX := float64(srcW) / 128.0
	scaleY := float64(srcH) / 128.0

	corners := make([]DetectedCorner, 4)
	totalMaxVal := 0.0

	for c := 0; c < 4; c++ {
		planeOffset := c * hmPlane
		maxVal := float32(-1.0)
		bestX, bestY := 0, 0

		// Find peak in 128x128 heatmap
		for y := 0; y < 128; y++ {
			rowOff := planeOffset + y*128
			for x := 0; x < 128; x++ {
				val := outSlice[rowOff+x]
				if val > maxVal {
					maxVal = val
					bestX = x
					bestY = y
				}
			}
		}

		totalMaxVal += float64(maxVal)

		// Sub-pixel centroid around the peak (threshold at 50% of peak)
		thresh := maxVal * 0.5
		if thresh < 0.1 {
			thresh = 0.1
		}

		sumW := 0.0
		sumX := 0.0
		sumY := 0.0

		// Local window around peak to avoid distant noise
		minY := maxInt(0, bestY-8)
		maxY := minInt(127, bestY+8)
		minX := maxInt(0, bestX-8)
		maxX := minInt(127, bestX+8)

		for y := minY; y <= maxY; y++ {
			rowOff := planeOffset + y*128
			for x := minX; x <= maxX; x++ {
				val := outSlice[rowOff+x]
				if val >= thresh {
					w := float64(val)
					sumW += w
					sumX += float64(x) * w
					sumY += float64(y) * w
				}
			}
		}

		var cornerX, cornerY float64
		if sumW > 0 {
			cornerX = (sumX / sumW) * scaleX
			cornerY = (sumY / sumW) * scaleY
		} else {
			cornerX = float64(bestX) * scaleX
			cornerY = float64(bestY) * scaleY
		}

		// Clamp to image bounds
		if cornerX < 0 {
			cornerX = 0
		} else if cornerX >= float64(srcW) {
			cornerX = float64(srcW - 1)
		}
		if cornerY < 0 {
			cornerY = 0
		} else if cornerY >= float64(srcH) {
			cornerY = float64(srcH - 1)
		}

		corners[c] = DetectedCorner{X: cornerX, Y: cornerY}
	}

	confidence := totalMaxVal / 4.0
	if confidence > 1.0 {
		confidence = 1.0
	} else if confidence < 0.0 {
		confidence = 0.0
	}

	return &DetectCornersResult{
		Corners:    corners,
		Confidence: confidence,
		Width:      srcW,
		Height:     srcH,
	}, nil
}

func (s *ScannerDetectorService) Close() error {
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
	return nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
