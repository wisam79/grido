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
	"strings"
	"time"

	"github.com/disintegration/imaging"
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
	for y := 0; y < h; y++ {
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
	return dst
}

func BlurGray(src *image.Gray) *image.Gray {
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	dst := image.NewGray(image.Rect(0, 0, w, h))

	for y := 0; y < h; y++ {
		yStride := y * src.Stride
		dstStride := y * dst.Stride

		ym1 := (y - 1)
		if ym1 < 0 {
			ym1 = 0
		}
		ym1Stride := ym1 * src.Stride

		yp1 := (y + 1)
		if yp1 >= h {
			yp1 = h - 1
		}
		yp1Stride := yp1 * src.Stride

		for x := 0; x < w; x++ {
			xm1 := x - 1
			if xm1 < 0 {
				xm1 = 0
			}
			xp1 := x + 1
			if xp1 >= w {
				xp1 = w - 1
			}

			sum := uint32(src.Pix[yStride+x]) * 4

			sum += uint32(src.Pix[yStride+xm1]) * 2
			sum += uint32(src.Pix[yStride+xp1]) * 2
			sum += uint32(src.Pix[ym1Stride+x]) * 2
			sum += uint32(src.Pix[yp1Stride+x]) * 2

			sum += uint32(src.Pix[ym1Stride+xm1])
			sum += uint32(src.Pix[ym1Stride+xp1])
			sum += uint32(src.Pix[yp1Stride+xm1])
			sum += uint32(src.Pix[yp1Stride+xp1])

			dst.Pix[dstStride+x] = uint8(sum >> 4)
		}
	}
	return dst
}

func (s *ImageProcessorService) ApplyMaskToImage(localImagePath string, maskBase64 string, maskW int, maskH int) (string, error) {
	maskBytes, err := base64.StdEncoding.DecodeString(maskBase64)
	if err != nil {
		return "", fmt.Errorf("decode mask base64: %w", err)
	}

	// 🛡️ رفض أبعاد قناع غير منطقية أو فيض حسابي (maskW*maskH)
	if maskW <= 0 || maskH <= 0 {
		return "", fmt.Errorf("invalid mask dimensions: %dx%d", maskW, maskH)
	}
	const maxMaskPixels = 200 * 1024 * 1024 // 200 ميغابكسل كحد أقصى
	if int64(maskW)*int64(maskH) > maxMaskPixels {
		return "", fmt.Errorf("mask dimensions too large: %dx%d", maskW, maskH)
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

	if int64(len(maskBytes)) != int64(maskW)*int64(maskH) {
		return "", fmt.Errorf("mask bytes size mismatch: expected %d, got %d", maskW*maskH, len(maskBytes))
	}

	maskImg := &image.Gray{
		Pix:    maskBytes,
		Stride: maskW,
		Rect:   image.Rect(0, 0, maskW, maskH),
	}

	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

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

	outImg := image.NewNRGBA(image.Rect(0, 0, srcW, srcH))

	srcPix := srcNRGBA.Pix
	maskPix := finalMask.Pix
	outPix := outImg.Pix

	for y := 0; y < srcH; y++ {
		srcRowOffset := y * srcNRGBA.Stride
		maskRowOffset := y * finalMask.Stride
		outRowOffset := y * outImg.Stride

		for x := 0; x < srcW; x++ {
			srcIdx := srcRowOffset + x*4
			outIdx := outRowOffset + x*4
			maskIdx := maskRowOffset + x

			rawAlpha := float64(maskPix[maskIdx])

			// ✂️ منحنى تشذيب وتنعيم حواف القناع ومكافحة الهالة البيضاء حول الشعر (Alpha Remapping & Edge Defringe)
			var alpha uint8
			r := srcPix[srcIdx]
			g := srcPix[srcIdx+1]
			b := srcPix[srcIdx+2]

			if rawAlpha < 65 {
				alpha = 0
			} else if rawAlpha > 215 {
				alpha = 255
			} else {
				// منحنى Smoothstep التكعيبي s(v) = v^2 * (3 - 2v) للانتقال الطبيعي الحوافي
				v := (rawAlpha - 65.0) / 150.0
				smoothV := v * v * (3.0 - 2.0*v)
				alpha = uint8(math.Round(smoothV * 255.0))

				// 🛡️ مكافحة تسرب الضوء الحوافي الدقيقة للشعر (Hair Edge Spill Suppression):
				// للبكسلات الانتقالية الشبه شفافة وحواف الشعر المجعد القادمة من خلفيات فاتحة (lum > 130)،
				// نكبح السطوع الفائق لمنع تكون هالة بيضاء/رمادية نهائياً فوق الخلفيات الداكنة.
				lum := (uint32(r)*299 + uint32(g)*587 + uint32(b)*114) / 1000
				if lum > 130 {
					suppression := float64(lum-130) * (1.0 - smoothV) * 0.65
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
			}

			outPix[outIdx] = r
			outPix[outIdx+1] = g
			outPix[outIdx+2] = b
			outPix[outIdx+3] = alpha
		}
	}

	newName := fmt.Sprintf("img_%d.png", time.Now().UnixNano())
	newPath := filepath.Join(mediaDir, newName)

	f, err := os.Create(newPath)
	if err != nil {
		return "", fmt.Errorf("create file for saving: %w", err)
	}

	var encodeErr error
	defer func() {
		f.Close()
		if encodeErr != nil {
			os.Remove(newPath)
		}
	}()

	encoder := png.Encoder{CompressionLevel: png.BestSpeed}
	encodeErr = encoder.Encode(f, outImg)
	if encodeErr != nil {
		return "", fmt.Errorf("save final image: %w", encodeErr)
	}

	return "/local-image/" + newName, nil
}
