package main

import (
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
)

var nativeImageDropSequence atomic.Uint64

type nativeImageDropCoordinates struct {
	X int
	Y int
}

type nativeImageDropStart struct {
	Phase  string `json:"phase"`
	DropID string `json:"dropId"`
	X      *int   `json:"x,omitempty"`
	Y      *int   `json:"y,omitempty"`
}

type nativeImageDropComplete struct {
	Phase  string   `json:"phase"`
	DropID string   `json:"dropId"`
	Images []string `json:"images"`
}

// isImageFilePath يفحص امتدادات الصور المدعومة — مصدر وحيد لكل مداخل فتح
// الصور (وسائط CLI، إطلاق مثيل ثانٍ، السحب والإفلات) لمنع تفرّع قوائم
// الامتدادات في ثلاثة مواضع (حظر ازدواجية المنطق).
func isImageFilePath(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg":
		return true
	default:
		return false
	}
}

// processNativeImageDrop captures the request before media I/O and always releases
// it afterward. Coordinates are already CSS/webview coordinates supplied by Wails.
func processNativeImageDrop(
	paths []string,
	coordinates *nativeImageDropCoordinates,
	process func([]string) ([]string, error),
	emit func(any),
) error {
	var validPaths []string
	for _, p := range paths {
		if isImageFilePath(p) {
			validPaths = append(validPaths, p)
		}
	}
	if len(validPaths) == 0 {
		return nil
	}

	dropID := "native-drop-" + strconv.FormatUint(nativeImageDropSequence.Add(1), 10)
	start := nativeImageDropStart{Phase: "start", DropID: dropID}
	if coordinates != nil {
		start.X, start.Y = &coordinates.X, &coordinates.Y
	}
	emit(start)

	images := []string{}
	defer func() {
		emit(nativeImageDropComplete{Phase: "complete", DropID: dropID, Images: images})
	}()

	processed, err := process(validPaths)
	if err == nil && processed != nil {
		images = processed
	}
	return err
}
