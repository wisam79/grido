package main

import (
	"encoding/json"
	"errors"
	"reflect"
	"sync"
	"testing"
)

func TestNativeImageDropSequenceAndCoordinates(t *testing.T) {
	paths := []string{"photo.png"}
	images := []string{"/local-image/photo.png"}
	var steps []string
	var payloads []any
	err := processNativeImageDrop(paths, &nativeImageDropCoordinates{X: 0, Y: 215},
		func(received []string) ([]string, error) {
			steps = append(steps, "process")
			if !reflect.DeepEqual(received, paths) {
				t.Fatalf("paths = %v, want %v", received, paths)
			}
			return images, nil
		},
		func(payload any) {
			payloads = append(payloads, payload)
			switch payload.(type) {
			case nativeImageDropStart:
				steps = append(steps, "start")
			case nativeImageDropComplete:
				steps = append(steps, "complete")
			}
		})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(steps, []string{"start", "process", "complete"}) {
		t.Fatalf("steps = %v", steps)
	}
	start := payloads[0].(nativeImageDropStart)
	complete := payloads[1].(nativeImageDropComplete)
	if start.DropID == "" || complete.DropID != start.DropID {
		t.Fatalf("request IDs do not match: %q / %q", start.DropID, complete.DropID)
	}
	startJSON := nativeImageDropJSON(t, start)
	if startJSON["x"] != float64(0) || startJSON["y"] != float64(215) {
		t.Fatalf("CSS coordinates were not preserved: %v", startJSON)
	}
	if _, exists := startJSON["images"]; exists {
		t.Fatal("start must not contain images")
	}
	completeJSON := nativeImageDropJSON(t, complete)
	if _, exists := completeJSON["x"]; exists {
		t.Fatal("complete must not repeat coordinates")
	}
	if !reflect.DeepEqual(complete.Images, images) || completeJSON["phase"] != "complete" {
		t.Fatalf("complete = %v", completeJSON)
	}
}

func TestNativeImageDropAlwaysCompletesEmptyOrFailedProcessing(t *testing.T) {
	processingError := errors.New("cannot import")
	for _, test := range []struct {
		name   string
		images []string
		err    error
	}{
		{name: "nil images"},
		{name: "empty images", images: []string{}},
		{name: "error", err: processingError},
		{name: "partial error", images: []string{"partial"}, err: processingError},
	} {
		t.Run(test.name, func(t *testing.T) {
			var payloads []any
			err := processNativeImageDrop(nil, nil,
				func([]string) ([]string, error) { return test.images, test.err },
				func(payload any) { payloads = append(payloads, payload) })
			if !errors.Is(err, test.err) {
				t.Fatalf("error = %v, want %v", err, test.err)
			}
			if len(payloads) != 2 {
				t.Fatalf("got %d payloads, want start and complete", len(payloads))
			}
			start := nativeImageDropJSON(t, payloads[0])
			for _, key := range []string{"x", "y", "images"} {
				if _, exists := start[key]; exists {
					t.Fatalf("nil drop target must omit %s: %v", key, start)
				}
			}
			complete := nativeImageDropJSON(t, payloads[1])
			images, ok := complete["images"].([]any)
			if !ok || len(images) != 0 || complete["dropId"] != start["dropId"] {
				t.Fatalf("completion must release request with images:[]: %v", complete)
			}
		})
	}
}

func TestNativeImageDropCompletesOnProcessorPanic(t *testing.T) {
	var payloads []any
	func() {
		defer func() {
			if recover() == nil {
				t.Fatal("processor panic should not be swallowed")
			}
		}()
		_ = processNativeImageDrop(nil, nil,
			func([]string) ([]string, error) { panic("processor panic") },
			func(payload any) { payloads = append(payloads, payload) })
	}()
	if len(payloads) != 2 || payloads[1].(nativeImageDropComplete).Images == nil {
		t.Fatalf("panic must still release request: %v", payloads)
	}
}

func TestNativeImageDropIDsAreUniqueAcrossConcurrentRequests(t *testing.T) {
	const count = 64
	ids := make(chan string, count)
	var wg sync.WaitGroup
	for range count {
		wg.Go(func() {
			_ = processNativeImageDrop(nil, nil,
				func([]string) ([]string, error) { return nil, nil },
				func(payload any) {
					if start, ok := payload.(nativeImageDropStart); ok {
						ids <- start.DropID
					}
				})
		})
	}
	wg.Wait()
	close(ids)
	seen := make(map[string]bool, count)
	for id := range ids {
		if id == "" || seen[id] {
			t.Fatalf("duplicate or empty request ID: %q", id)
		}
		seen[id] = true
	}
}

func nativeImageDropJSON(t *testing.T, payload any) map[string]any {
	t.Helper()
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatal(err)
	}
	return decoded
}
