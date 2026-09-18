//go:build windows

package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/services/notifications"
	"github.com/wailsapp/wails/v3/pkg/w32"
)

const (
	TBPF_NOPROGRESS    uint32 = 0x00000000
	TBPF_INDETERMINATE uint32 = 0x00000001
	TBPF_NORMAL        uint32 = 0x00000002
	TBPF_ERROR         uint32 = 0x00000004
	TBPF_PAUSED        uint32 = 0x00000008
)

type taskbarVtbl struct {
	QueryInterface        uintptr
	AddRef                uintptr
	Release               uintptr
	HrInit                uintptr
	AddTab                uintptr
	DeleteTab             uintptr
	ActivateTab           uintptr
	SetActiveAlt          uintptr
	MarkFullscreenWindow  uintptr
	SetProgressValue      uintptr
	SetProgressState      uintptr
	RegisterTab           uintptr
	UnregisterTab         uintptr
	SetTabOrder           uintptr
	SetTabActive          uintptr
	ThumbBarAddButtons    uintptr
	ThumbBarUpdateButtons uintptr
	ThumbBarSetImageList  uintptr
	SetOverlayIcon        uintptr
	SetThumbnailTooltip   uintptr
	SetThumbnailClip      uintptr
}

type taskbarCOM struct {
	lpVtbl *taskbarVtbl
}

func (t *taskbarCOM) setProgressValue(hwnd uintptr, ullCompleted, ullTotal uint64) error {
	ret, _, _ := syscall.SyscallN(
		t.lpVtbl.SetProgressValue,
		uintptr(unsafe.Pointer(t)),
		hwnd,
		uintptr(ullCompleted),
		uintptr(ullTotal),
	)
	if ret != 0 {
		return syscall.Errno(ret)
	}
	return nil
}

func (t *taskbarCOM) setProgressState(hwnd uintptr, tbpFlags uint32) error {
	ret, _, _ := syscall.SyscallN(
		t.lpVtbl.SetProgressState,
		uintptr(unsafe.Pointer(t)),
		hwnd,
		uintptr(tbpFlags),
	)
	if ret != 0 {
		return syscall.Errno(ret)
	}
	return nil
}

type desktopWindowsState struct {
	taskbar *taskbarCOM
}

var winState desktopWindowsState

func (s *DesktopService) initDesktop() error {
	return nil
}

func (s *DesktopService) shutdownDesktop() error {
	if winState.taskbar != nil {
		raw := (*w32.ITaskbarList3)(unsafe.Pointer(winState.taskbar))
		raw.Release()
		winState.taskbar = nil
	}
	return nil
}

func (s *DesktopService) getHWND() uintptr {
	if s.mainWindow != nil {
		if native := s.mainWindow.NativeWindow(); native != nil {
			return uintptr(native)
		}
	}
	app := application.Get()
	if app != nil {
		if curr := app.Window.Current(); curr != nil {
			if native := curr.NativeWindow(); native != nil {
				return uintptr(native)
			}
		}
	}
	return 0
}

// SetTaskbarProgress يعين حالة وقيمة شريط التقدم على أيقونة التطبيق في شريط مهام ويندوز
// الحالات المدعومة: "normal", "indeterminate", "error", "paused", "none"
func (s *DesktopService) SetTaskbarProgress(percent int, state string) error {
	return application.InvokeSyncWithError(func() error {
		if winState.taskbar == nil {
			tb, err := w32.NewTaskbarList3()
			if err != nil {
				return err
			}
			winState.taskbar = (*taskbarCOM)(unsafe.Pointer(tb))
		}

		hwnd := s.getHWND()
		if hwnd == 0 {
			return nil
		}

		cleanState := strings.ToLower(strings.TrimSpace(state))
		var flags uint32 = TBPF_NORMAL

		switch cleanState {
		case "none", "clear", "stop":
			flags = TBPF_NOPROGRESS
		case "indeterminate", "busy", "loading":
			flags = TBPF_INDETERMINATE
		case "error", "failed":
			flags = TBPF_ERROR
		case "paused", "pause":
			flags = TBPF_PAUSED
		default:
			if percent <= 0 && cleanState == "" {
				flags = TBPF_NOPROGRESS
			} else {
				flags = TBPF_NORMAL
			}
		}

		if err := winState.taskbar.setProgressState(hwnd, flags); err != nil {
			return err
		}

		if flags != TBPF_NOPROGRESS && flags != TBPF_INDETERMINATE {
			p := percent
			if p < 0 {
				p = 0
			} else if p > 100 {
				p = 100
			}
			if err := winState.taskbar.setProgressValue(hwnd, uint64(p), 100); err != nil {
				return err
			}
		}
		return nil
	})
}

// ShowInFolder يفتح مجلد الملف في مستكشف ويندوز مع تحديد وتظليل الملف
func (s *DesktopService) ShowInFolder(filePath string) error {
	cleanPath := filepath.Clean(filePath)
	if _, err := os.Stat(cleanPath); err != nil {
		return fmt.Errorf("file does not exist: %w", err)
	}
	return exec.Command("explorer.exe", "/select,", cleanPath).Start()
}

// OpenFolder يفتح مجلداً معيناً في مستكشف ويندوز
func (s *DesktopService) OpenFolder(folderPath string) error {
	cleanPath := filepath.Clean(folderPath)
	if _, err := os.Stat(cleanPath); err != nil {
		return fmt.Errorf("folder does not exist: %w", err)
	}
	return exec.Command("explorer.exe", cleanPath).Start()
}

// SendToast يرسل إشعار Toast رسمي بنظام ويندوز مع إمكانية تضمين صورة مصغرة
func (s *DesktopService) SendToast(title, body, imagePath string) error {
	notif := s.notifSvc
	if notif == nil {
		notif = notifications.New()
	}
	opts := notifications.NotificationOptions{
		ID:    fmt.Sprintf("grido_%d", time.Now().UnixNano()),
		Title: title,
		Body:  body,
	}
	if imagePath != "" {
		if fi, err := os.Stat(imagePath); err == nil && !fi.IsDir() {
			opts.Attachments = []notifications.NotificationAttachment{
				{
					Path: imagePath,
					Type: "hero",
				},
			}
			opts.Data = map[string]interface{}{
				"filePath": imagePath,
			}
		}
	}
	return notif.SendNotification(opts)
}
