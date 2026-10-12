//go:build !windows

package service

import (
	"errors"
)

// BgRemovalService provides a non-Windows fallback stub.
type BgRemovalService struct {
	imageProc    *ImageProcessorService
	mediaService *MediaService
}

func NewBgRemovalService(imageProc *ImageProcessorService, mediaService *MediaService) *BgRemovalService {
	return &BgRemovalService{
		imageProc:    imageProc,
		mediaService: mediaService,
	}
}

func (s *BgRemovalService) Warmup() error {
	return nil
}

func (s *BgRemovalService) RemoveBackground(imageSrc string) (string, error) {
	return "", errors.New("native AI background removal is currently only supported on Windows")
}

func (s *BgRemovalService) Close() error {
	return nil
}
