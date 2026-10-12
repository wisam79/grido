package service

// BgRemover defines the interface for AI-powered human portrait background removal.
type BgRemover interface {
	RemoveBackground(imageSrc string) (string, error)
	Warmup() error
	Close() error
}
