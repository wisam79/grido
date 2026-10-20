package service

import (
	"context"
	"errors"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"

	"grido/internal/utils"
)

// ثوابت مصغرات الواجهة. لا نقبل أي عرض من العميل خارج هذه القائمة حتى لا
// نفتح باب توليد عدد غير محدود من الملفات/الأحجام على القرص.
const (
	thumbnailDirName = ".thumbs"
	// سقف أبعاد المصدر قبل فك الترميز الكامل (حماية من قنابل الصور).
	maxThumbnailSourcePixels = 120_000_000
	// جودة JPEG للمصغرات الفوتوغرافية.
	thumbnailJPEGQuality = 82
)

var (
	ErrInvalidThumbnailWidth = errors.New("invalid thumbnail width")
	ErrThumbnailUnsupported  = errors.New("unsupported thumbnail source")
	ErrThumbnailTooLarge     = errors.New("image too large for thumbnail")
)

var allowedThumbnailWidths = map[int]struct{}{
	128: {},
	256: {},
	512: {},
}

// ThumbnailResult نتيجة تجهيز مصغرة جاهزة للتقديم عبر HTTP.
type ThumbnailResult struct {
	Path        string
	ContentType string
}

// EnsureThumbnail تُرجع مسار مصغرة مخزنة (أو تُنشئها عند الطلب) لعرض محلي
// داخل Media. المصغرات ملفات مشتقة قابلة للحذف وإعادة التوليد، ولا تُسجَّل
// في مخطط المشروع أو autosave.
func (s *MediaService) EnsureThumbnail(
	ctx context.Context,
	localPath string,
	width int,
) (ThumbnailResult, error) {
	if _, ok := allowedThumbnailWidths[width]; !ok {
		return ThumbnailResult{}, ErrInvalidThumbnailWidth
	}

	resolved, err := s.ResolveLocalImagePath(localPath)
	if err != nil {
		return ThumbnailResult{}, err
	}
	filename := filepath.Base(resolved)
	if strings.HasPrefix(strings.ToLower(filename), "print_") {
		return ThumbnailResult{}, ErrThumbnailUnsupported
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if !isThumbnailableExtension(ext) {
		return ThumbnailResult{}, ErrThumbnailUnsupported
	}

	// فحص الترويسة فقط أولاً: يمنع تفكيك صورة ضخمة جداً لمجرد طلب مصغرة.
	cfg, err := readImageConfig(resolved)
	if err != nil {
		return ThumbnailResult{}, err
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return ThumbnailResult{}, ErrThumbnailUnsupported
	}
	if int64(cfg.Width)*int64(cfg.Height) > maxThumbnailSourcePixels {
		return ThumbnailResult{}, ErrThumbnailTooLarge
	}

	thumbExt := ".jpg"
	if ext != ".jpg" && ext != ".jpeg" {
		// PNG/GIF/WebP/BMP قد تحمل شفافية؛ PNG يحفظها بأمان.
		thumbExt = ".png"
	}
	thumbName := fmt.Sprintf("%s__w%d%s", filename, width, thumbExt)
	thumbDir := filepath.Join(s.GetMediaDir(), thumbnailDirName)
	thumbPath := filepath.Join(thumbDir, thumbName)

	if fi, statErr := os.Stat(thumbPath); statErr == nil && fi.Size() > 0 {
		return ThumbnailResult{Path: thumbPath, ContentType: thumbnailContentType(thumbExt)}, nil
	}

	// singleflight يمنع طلبين متزامنين من توليد نفس المصغرة مرتين. نعيد فحص
	// القرص داخل الدالة لأن الطلب الثاني قد يصل بعد اكتمال الأول مباشرة.
	v, err, _ := s.thumbnailGroup.Do(thumbPath, func() (any, error) {
		if fi, statErr := os.Stat(thumbPath); statErr == nil && fi.Size() > 0 {
			return ThumbnailResult{Path: thumbPath, ContentType: thumbnailContentType(thumbExt)}, nil
		}

		select {
		case <-ctx.Done():
			return ThumbnailResult{}, ctx.Err()
		default:
		}
		select {
		case s.thumbnailSem <- struct{}{}:
			defer func() { <-s.thumbnailSem }()
		case <-ctx.Done():
			return ThumbnailResult{}, ctx.Err()
		}

		if err := os.MkdirAll(thumbDir, 0o755); err != nil {
			return ThumbnailResult{}, fmt.Errorf("create thumbnail dir: %w", err)
		}

		img, err := imaging.Open(resolved, imaging.AutoOrientation(true))
		if err != nil {
			return ThumbnailResult{}, fmt.Errorf("open image for thumbnail: %w", err)
		}

		bounds := img.Bounds()
		srcW, srcH := bounds.Dx(), bounds.Dy()
		if srcW <= 0 || srcH <= 0 {
			return ThumbnailResult{}, ErrThumbnailUnsupported
		}
		// لا نكبّر الصور الصغيرة؛ المصغرة يجب ألا تتجاوز أبعاد الأصل.
		if max(srcW, srcH) > width {
			img = imaging.Fit(img, width, width, imaging.Linear)
		}

		af, err := utils.CreateAtomic(thumbPath, 0o644)
		if err != nil {
			return ThumbnailResult{}, fmt.Errorf("create thumbnail file: %w", err)
		}
		defer af.Abort()

		if thumbExt == ".jpg" {
			err = imaging.Encode(af, img, imaging.JPEG, imaging.JPEGQuality(thumbnailJPEGQuality))
		} else {
			encoder := png.Encoder{CompressionLevel: png.BestSpeed}
			err = encoder.Encode(af, img)
		}
		if err != nil {
			return ThumbnailResult{}, fmt.Errorf("encode thumbnail: %w", err)
		}
		if err := af.Commit(); err != nil {
			return ThumbnailResult{}, fmt.Errorf("commit thumbnail: %w", err)
		}
		return ThumbnailResult{Path: thumbPath, ContentType: thumbnailContentType(thumbExt)}, nil
	})
	if err != nil {
		return ThumbnailResult{}, err
	}
	return v.(ThumbnailResult), nil
}

func readImageConfig(path string) (image.Config, error) {
	f, err := os.Open(path)
	if err != nil {
		return image.Config{}, fmt.Errorf("open image: %w", err)
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return image.Config{}, fmt.Errorf("decode image config: %w", err)
	}
	return cfg, nil
}

func isThumbnailableExtension(ext string) bool {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	default:
		return false
	}
}

func thumbnailContentType(ext string) string {
	if ext == ".png" {
		return "image/png"
	}
	return "image/jpeg"
}
