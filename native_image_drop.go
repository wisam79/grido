package main

import (
	"strconv"
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

// processNativeImageDrop captures the request before media I/O and always releases
// it afterward. Coordinates are already CSS/webview coordinates supplied by Wails.
func processNativeImageDrop(
	paths []string,
	coordinates *nativeImageDropCoordinates,
	process func([]string) ([]string, error),
	emit func(any),
) error {
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

	processed, err := process(paths)
	if err == nil && processed != nil {
		images = processed
	}
	return err
}
