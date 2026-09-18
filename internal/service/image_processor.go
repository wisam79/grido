package service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"

	"grido/internal/utils"
)

type ImageProcessorService struct {
	mediaService *MediaService
}

func NewImageProcessorService(mediaService *MediaService) *ImageProcessorService {
	return &ImageProcessorService{mediaService: mediaService}
}

func ResizeGrayLinear(src *image.Gray, w, h int) *image.Gray {
	dst := image.NewGray(image.Rect(0, 0, w, h))
	srcBounds := src.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()
	if srcW == 0 || srcH == 0 {
		return dst
	}

	workers := runtime.NumCPU()
	if workers > h {
		workers = h
	}
	if workers < 2 || h < 64 {
		resizeGrayLinearRows(src, dst, srcW, srcH, w, h, 0, h)
		return dst
	}

	rowsPerWorker := (h + workers - 1) / workers
	var wg sync.WaitGroup
	for worker := 0; worker < workers; worker++ {
		startY := worker * rowsPerWorker
		endY := startY + rowsPerWorker
		if endY > h {
			endY = h
		}
		if startY >= endY {
			continue
		}
		wg.Add(1)
		go func(sy, ey int) {
			defer wg.Done()
			resizeGrayLinearRows(src, dst, srcW, srcH, w, h, sy, ey)
		}(startY, endY)
	}
	wg.Wait()
	return dst
}

func resizeGrayLinearRows(src, dst *image.Gray, srcW, srcH, w, h, startY, endY int) {
	for y := startY; y < endY; y++ {
		srcY := float64(y) * float64(srcH) / float64(h)
		y0 := int(srcY)
		y1 := y0 + 1
		if y1 >= srcH {
			y1 = srcH - 1
		}
		dy := srcY - float64(y0)

		y0Stride := y0 * src.Stride
		y1Stride := y1 * src.Stride
		dstStride := y * dst.Stride

		for x := 0; x < w; x++ {
			srcX := float64(x) * float64(srcW) / float64(w)
			x0 := int(srcX)
			x1 := x0 + 1
			if x1 >= srcW {
				x1 = srcW - 1
			}
			dx := srcX - float64(x0)

			val00 := float64(src.Pix[y0Stride+x0])
			val10 := float64(src.Pix[y0Stride+x1])
			val01 := float64(src.Pix[y1Stride+x0])
			val11 := float64(src.Pix[y1Stride+x1])

			val := (1-dy)*((1-dx)*val00+dx*val10) + dy*((1-dx)*val01+dx*val11)
			dst.Pix[dstStride+x] = uint8(val)
		}
	}
}

var (
	lutAlpha       [256]uint8
	lutSpillFactor [256]float64
)

func init() {
	for i := 0; i < 256; i++ {
		if i < 65 {
			lutAlpha[i] = 0
			lutSpillFactor[i] = 0.65
		} else if i > 215 {
			lutAlpha[i] = 255
			lutSpillFactor[i] = 0.0
		} else {
			v := float64(i-65) / 150.0
			smoothV := v * v * (3.0 - 2.0*v)
			lutAlpha[i] = uint8(math.Round(smoothV * 255.0))
			lutSpillFactor[i] = (1.0 - smoothV) * 0.65
		}
	}
}

func compositeMaskParallel(srcNRGBA *image.NRGBA, mask *image.Gray, srcW, srcH int) {
	workers := runtime.NumCPU()
	if workers > srcH {
		workers = srcH
	}
	if workers < 2 || srcH < 64 {
		compositeMaskRows(srcNRGBA, mask, srcW, 0, srcH)
		return
	}

	rowsPerWorker := (srcH + workers - 1) / workers
	var wg sync.WaitGroup
	for worker := 0; worker < workers; worker++ {
		startY := worker * rowsPerWorker
		endY := startY + rowsPerWorker
		if endY > srcH {
			endY = srcH
		}
		if startY >= endY {
			continue
		}
		wg.Add(1)
		go func(sy, ey int) {
			defer wg.Done()
			compositeMaskRows(srcNRGBA, mask, srcW, sy, ey)
		}(startY, endY)
	}
	wg.Wait()
}

func compositeMaskRows(srcNRGBA *image.NRGBA, mask *image.Gray, srcW, startY, endY int) {
	pix := srcNRGBA.Pix
	maskPix := mask.Pix

	for y := startY; y < endY; y++ {
		srcRowOffset := y * srcNRGBA.Stride
		maskRowOffset := y * mask.Stride

		for x := 0; x < srcW; x++ {
			srcIdx := srcRowOffset + x*4
			maskIdx := maskRowOffset + x

			rawAlpha := maskPix[maskIdx]
			alpha := lutAlpha[rawAlpha]

			if alpha == 0 {
				pix[srcIdx+3] = 0
				continue
			}
			if alpha == 255 {
				pix[srcIdx+3] = 255
				continue
			}

			// ✂️ البكسلات الانتقالية الشبه شفافة (حواف الشعر والملابس):
			r := pix[srcIdx]
			g := pix[srcIdx+1]
			b := pix[srcIdx+2]

			spillFactor := lutSpillFactor[rawAlpha]

			// 1. مكافحة تسرب الهالة البيضاء/الفاتحة على حواف الشعر (Hair Edge Spill Suppression)
			lum := (uint32(r)*299 + uint32(g)*587 + uint32(b)*114) / 1000
			if lum > 125 {
				suppression := float64(lum-125) * spillFactor
				if float64(r) > suppression {
					r = uint8(float64(r) - suppression)
				} else {
					r = 0
				}
				if float64(g) > suppression {
					g = uint8(float64(g) - suppression)
				} else {
					g = 0
				}
				if float64(b) > suppression {
					b = uint8(float64(b) - suppression)
				} else {
					b = 0
				}
			}

			// 2. مكافحة تسرب ألوان خلفيات الاستوديو (Chroma Decontamination: Green/Blue Spill)
			// إزالة انعكاسات الشاشة الخضراء أو الزرقاء الشائعة على أطراف الشعر
			avgRB := (uint32(r) + uint32(b)) / 2
			if uint32(g) > avgRB+15 {
				excessG := float64(uint32(g)-avgRB) * spillFactor
				if float64(g) > excessG {
					g = uint8(float64(g) - excessG)
				}
			}
			avgRG := (uint32(r) + uint32(g)) / 2
			if uint32(b) > avgRG+15 {
				excessB := float64(uint32(b)-avgRG) * spillFactor
				if float64(b) > excessB {
					b = uint8(float64(b) - excessB)
				}
			}

			pix[srcIdx] = r
			pix[srcIdx+1] = g
			pix[srcIdx+2] = b
			pix[srcIdx+3] = alpha
		}
	}
}

// ApplyMaskRaw يطبق بايتات القناع الثنائية مباشرة بدون أي فك تشفير Base64 (Zero-Overhead)
func (s *ImageProcessorService) ApplyMaskRaw(localImagePath string, maskBytes []byte, maskW int, maskH int) (string, error) {
	// 🛡️ رفض أبعاد قناع غير منطقية أو فيض حسابي (maskW*maskH)
	if maskW <= 0 || maskH <= 0 {
		return "", fmt.Errorf("invalid mask dimensions: %dx%d", maskW, maskH)
	}
	// 32MP كحد أقصى (≈128MB NRGBA)
	const maxMaskPixels = int64(32 * 1024 * 1024)
	if int64(maskW)*int64(maskH) > maxMaskPixels {
		return "", fmt.Errorf("mask dimensions too large: %dx%d", maskW, maskH)
	}
	if int64(len(maskBytes)) != int64(maskW)*int64(maskH) {
		return "", fmt.Errorf("mask bytes size mismatch: expected %d, got %d", maskW*maskH, len(maskBytes))
	}

	var srcImg image.Image
	mediaDir := s.mediaService.GetMediaDir()

	if strings.HasPrefix(localImagePath, "data:image/") {
		decodedSrc, _, err := s.mediaService.DecodeBase64Image(localImagePath)
		if err != nil {
			return "", fmt.Errorf("decode source base64: %w", err)
		}
		srcImg, err = imaging.Decode(bytes.NewReader(decodedSrc))
		if err != nil {
			return "", fmt.Errorf("decode source image: %w", err)
		}
		decodedSrc = nil
	} else {
		fileName := filepath.Base(filepath.Clean(localImagePath))
		actualImagePath := filepath.Join(mediaDir, fileName)

		resolvedPath, err := filepath.EvalSymlinks(actualImagePath)
		if err != nil {
			return "", fmt.Errorf("eval symlink: %w", err)
		}
		resolvedMediaDir, err := filepath.EvalSymlinks(mediaDir)
		if err == nil {
			mediaDir = resolvedMediaDir
		}
		if !strings.HasPrefix(filepath.Clean(resolvedPath), filepath.Clean(mediaDir)+string(filepath.Separator)) {
			return "", fmt.Errorf("invalid image path: outside media directory")
		}

		if _, err := os.Stat(resolvedPath); err != nil {
			return "", fmt.Errorf("image file not found: %w", err)
		}

		srcImg, err = imaging.Open(resolvedPath)
		if err != nil {
			return "", fmt.Errorf("open original image: %w", err)
		}
	}

	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	// سقف المصدر قبل أي نسخة: يمنع تضخيم الذاكرة لصور ضخمة
	const maxSourcePixels = int64(50 * 1024 * 1024)
	if int64(srcW)*int64(srcH) > maxSourcePixels {
		return "", fmt.Errorf("source image too large: %dx%d", srcW, srcH)
	}

	maskImg := &image.Gray{
		Pix:    maskBytes,
		Stride: maskW,
		Rect:   image.Rect(0, 0, maskW, maskH),
	}

	var finalMask *image.Gray = maskImg
	if maskW != srcW || maskH != srcH {
		finalMask = ResizeGrayLinear(maskImg, srcW, srcH)
	}
	maskImg = nil

	srcNRGBA, ok := srcImg.(*image.NRGBA)
	if !ok {
		srcNRGBA = imaging.Clone(srcImg)
	}
	srcImg = nil

	// دمج القناع ومعالجة الحواف متوازياً عبر أنوية المعالج بالكامل
	compositeMaskParallel(srcNRGBA, finalMask, srcW, srcH)

	newName := fmt.Sprintf("img_%d.png", time.Now().UnixNano())
	newPath := filepath.Join(mediaDir, newName)

	// كتابة ذرية موحّدة (utils.AtomicFile) — الترميز يتدفق للقرص مباشرة
	af, err := utils.CreateAtomic(newPath, 0o644)
	if err != nil {
		return "", fmt.Errorf("create file for saving: %w", err)
	}
	defer af.Abort()

	encoder := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := encoder.Encode(af, srcNRGBA); err != nil {
		return "", fmt.Errorf("encode final image: %w", err)
	}
	if err := af.Commit(); err != nil {
		return "", fmt.Errorf("save final image: %w", err)
	}

	return "/local-image/" + newName, nil
}

// ApplyMaskToImage يحافظ على التوافقية العكسية باستقبال Base64 وتوجيهه لمحرك البايتات المتوازي
func (s *ImageProcessorService) ApplyMaskToImage(localImagePath string, maskBase64 string, maskW int, maskH int) (string, error) {
	const maxMaskPixels = int64(32 * 1024 * 1024)
	if int64(len(maskBase64)) > maxMaskPixels*4/3+16 {
		return "", fmt.Errorf("mask payload too large: %d bytes", len(maskBase64))
	}
	maskBytes, err := base64.StdEncoding.DecodeString(maskBase64)
	if err != nil {
		return "", fmt.Errorf("decode mask base64: %w", err)
	}
	return s.ApplyMaskRaw(localImagePath, maskBytes, maskW, maskH)
}
