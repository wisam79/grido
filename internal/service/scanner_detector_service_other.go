//go:build !windows

package service

import "errors"

type ScannerDetectorService struct {
	imageProc    *ImageProcessorService
	mediaService *MediaService
}

func NewScannerDetectorService(imageProc *ImageProcessorService, mediaService *MediaService) *ScannerDetectorService {
	return &ScannerDetectorService{
		imageProc:    imageProc,
		mediaService: mediaService,
	}
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

func (s *ScannerDetectorService) DetectDocumentCorners(imageSrc string) (*DetectCornersResult, error) {
	return nil, errors.New("native document corner detection is currently only supported on Windows")
}

func (s *ScannerDetectorService) Close() error {
	return nil
}
