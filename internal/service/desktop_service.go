package service

import (
	"context"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
)

// DesktopService تدير ميزات سطح المكتب المتقدمة الخاصة بويندوز
// مثل شريط مهام ويندوز، إشعارات Toast، واستعراض الملفات في Explorer.
type DesktopService struct {
	mainWindow *application.WebviewWindow
	notifSvc   *notifications.NotificationService
}

func NewDesktopService() *DesktopService {
	return &DesktopService{}
}

func (s *DesktopService) SetMainWindow(win *application.WebviewWindow) {
	s.mainWindow = win
}

func (s *DesktopService) SetNotificationService(svc *notifications.NotificationService) {
	s.notifSvc = svc
}

func (s *DesktopService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	return s.initDesktop()
}

func (s *DesktopService) ServiceShutdown() error {
	return s.shutdownDesktop()
}
