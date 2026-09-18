//go:build !windows

package service

func (s *DesktopService) initDesktop() error {
	return nil
}

func (s *DesktopService) shutdownDesktop() error {
	return nil
}

func (s *DesktopService) SetTaskbarProgress(percent int, state string) error {
	return nil
}

func (s *DesktopService) ShowInFolder(filePath string) error {
	return nil
}

func (s *DesktopService) OpenFolder(folderPath string) error {
	return nil
}

func (s *DesktopService) SendToast(title, body, imagePath string) error {
	return nil
}
