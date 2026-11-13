//go:build windows

package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"sort"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
	"unsafe"

	"github.com/fogleman/gg"
	"golang.org/x/sys/windows"

	"grido/internal/core/domain"
)

const (
	printPerfReportEnv = "GRIDO_PRINT_PERF_REPORT"
	printPerfAppDirEnv = "GRIDO_PRINT_PERF_APP_DIR"
)

type printPerfEnvironment struct {
	TimestampUTC string `json:"timestampUtc"`
	GOOS         string `json:"goos"`
	GOARCH       string `json:"goarch"`
	GoVersion    string `json:"goVersion"`
	Compiler     string `json:"compiler"`
	CGOEnabled   string `json:"cgoEnabled"`
	NumCPU       int    `json:"numCPU"`
	GOMAXPROCS   int    `json:"gomaxprocs"`
	Toolchain    string `json:"toolchain"`
	RunnerOS     string `json:"runnerOS,omitempty"`
	RunnerArch   string `json:"runnerArch,omitempty"`
	RunnerName   string `json:"runnerName,omitempty"`
	RunnerImage  string `json:"runnerImage,omitempty"`
	CPUModel     string `json:"cpuModel,omitempty"`
	PeakRSSKind  string `json:"peakRssKind"`
}

type printPerfMetrics struct {
	WallDurationNS       int64  `json:"wallDurationNs"`
	Mallocs              uint64 `json:"mallocs"`
	TotalAllocBytes      uint64 `json:"totalAllocBytes"`
	HeapAllocBeforeBytes uint64 `json:"heapAllocBeforeBytes"`
	HeapAllocAfterBytes  uint64 `json:"heapAllocAfterBytes"`
	HeapAllocDeltaBytes  int64  `json:"heapAllocDeltaBytes"`
	HeapInuseBeforeBytes uint64 `json:"heapInuseBeforeBytes"`
	HeapInuseAfterBytes  uint64 `json:"heapInuseAfterBytes"`
	HeapInuseDeltaBytes  int64  `json:"heapInuseDeltaBytes"`
	NumGC                uint32 `json:"numGC"`
	PauseTotalNS         uint64 `json:"pauseTotalNs"`
	OutputBytes          int64  `json:"outputBytes"`
	OutputSHA256         string `json:"outputSha256"`
	WorkingSetBefore     uint64 `json:"workingSetBeforeBytes,omitempty"`
	WorkingSetAfter      uint64 `json:"workingSetAfterBytes,omitempty"`
	PeakWorkingSetBytes  uint64 `json:"peakWorkingSetBytes,omitempty"`
	PeakRSSBytes         uint64 `json:"peakRssBytes,omitempty"`
}

type printPerfScenarioResult struct {
	Name       string           `json:"name"`
	Kind       string           `json:"kind"`
	Status     string           `json:"status"`
	OutputFile string           `json:"outputFile,omitempty"`
	Notes      []string         `json:"notes,omitempty"`
	Metrics    printPerfMetrics `json:"metrics"`
}

type printPerfReport struct {
	SchemaVersion int                       `json:"schemaVersion"`
	ReportOnly    bool                      `json:"reportOnly"`
	Environment   printPerfEnvironment      `json:"environment"`
	Scenarios     []printPerfScenarioResult `json:"scenarios"`
}

type printPerfScenario struct {
	name string
	kind string
	run  func(*testing.T, string) (string, []byte, []string)
}

// TestPrintPerfBaselineReport is an opt-in, report-only performance probe. It
// records observed measurements without asserting timing or memory thresholds.
// The CI job enables it explicitly; normal `go test` runs skip immediately.
func TestPrintPerfBaselineReport(t *testing.T) {
	if os.Getenv(printPerfReportEnv) != "1" {
		t.Skip("set GRIDO_PRINT_PERF_REPORT=1 to collect the print performance baseline")
	}

	reportDir := strings.TrimSpace(os.Getenv(printPerfAppDirEnv))
	if reportDir == "" {
		reportDir = t.TempDir()
	}
	if err := os.MkdirAll(reportDir, 0o755); err != nil {
		t.Fatalf("create report directory: %v", err)
	}
	appDir := filepath.Join(reportDir, "app")
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		t.Fatalf("create isolated app directory: %v", err)
	}
	t.Setenv("GRIDO_APP_DIR", appDir)

	scenarios := []printPerfScenario{
		{name: "a4_300_srgb_jpeg", kind: "full-pipeline", run: runPrintPerfA4JPEG},
		{name: "a4_300_srgb_png", kind: "full-pipeline", run: runPrintPerfA4PNG},
		{name: "a4_300_cmyk_tiff", kind: "production-encoder", run: runPrintPerfCMYKTIFF},
		{name: "filtered_multi_cell", kind: "full-pipeline", run: runPrintPerfFilteredMultiCell},
		{name: "repeated_copies", kind: "full-pipeline", run: runPrintPerfRepeatedCopies},
		{name: "cancellation", kind: "control-path", run: runPrintPerfCancellation},
	}
	if runtime.GOOS == "windows" {
		scenarios = append(scenarios, printPerfScenario{name: "windows_dib", kind: "gdi-pure", run: runPrintPerfDIB})
	}

	report := printPerfReport{
		SchemaVersion: 1,
		ReportOnly:    true,
		Environment:   collectPrintPerfEnvironment(),
		Scenarios:     make([]printPerfScenarioResult, 0, len(scenarios)),
	}
	for _, scenario := range scenarios {
		scenario := scenario
		t.Run(scenario.name, func(t *testing.T) {
			result := measurePrintPerfScenario(t, reportDir, scenario)
			report.Scenarios = append(report.Scenarios, result)
		})
	}

	if len(report.Scenarios) != len(scenarios) {
		t.Fatalf("missing scenario metrics: got %d, want %d", len(report.Scenarios), len(scenarios))
	}
	writePrintPerfArtifacts(t, reportDir, report)
}

func measurePrintPerfScenario(t *testing.T, reportDir string, scenario printPerfScenario) printPerfScenarioResult {
	t.Helper()
	runtime.GC()
	debug.FreeOSMemory()

	var before, after runtime.MemStats
	runtime.ReadMemStats(&before)
	wsBefore, peakBefore, _ := currentProcessWorkingSet()

	started := time.Now()
	outputPath, outputBytes, notes := scenario.run(t, reportDir)
	wall := time.Since(started)

	runtime.ReadMemStats(&after)
	wsAfter, peakAfter, _ := currentProcessWorkingSet()
	peakWorkingSet := peakAfter
	if peakBefore > peakWorkingSet {
		peakWorkingSet = peakBefore
	}
	if wsBefore > peakWorkingSet {
		peakWorkingSet = wsBefore
	}
	if wsAfter > peakWorkingSet {
		peakWorkingSet = wsAfter
	}

	if outputPath != "" && len(outputBytes) == 0 {
		var err error
		outputBytes, err = os.ReadFile(outputPath)
		if err != nil {
			t.Fatalf("read scenario output %s: %v", outputPath, err)
		}
	}
	if len(outputBytes) == 0 {
		t.Fatalf("scenario %s did not produce measurable output", scenario.name)
	}
	sum := sha256.Sum256(outputBytes)

	wallNS := wall.Nanoseconds()
	if wallNS < 1 {
		wallNS = 1 // الإلغاء قد ينتهي تحت دقة مؤقت Windows؛ يبقى القياس موجوداً.
	}
	metrics := printPerfMetrics{
		WallDurationNS:       wallNS,
		Mallocs:              after.Mallocs - before.Mallocs,
		TotalAllocBytes:      after.TotalAlloc - before.TotalAlloc,
		HeapAllocBeforeBytes: before.HeapAlloc,
		HeapAllocAfterBytes:  after.HeapAlloc,
		HeapAllocDeltaBytes:  signedUint64Delta(after.HeapAlloc, before.HeapAlloc),
		HeapInuseBeforeBytes: before.HeapInuse,
		HeapInuseAfterBytes:  after.HeapInuse,
		HeapInuseDeltaBytes:  signedUint64Delta(after.HeapInuse, before.HeapInuse),
		NumGC:                after.NumGC - before.NumGC,
		PauseTotalNS:         after.PauseTotalNs - before.PauseTotalNs,
		OutputBytes:          int64(len(outputBytes)),
		OutputSHA256:         hex.EncodeToString(sum[:]),
		WorkingSetBefore:     wsBefore,
		WorkingSetAfter:      wsAfter,
		PeakWorkingSetBytes:  peakWorkingSet,
		PeakRSSBytes:         peakWorkingSet,
	}
	assertPrintPerfMetricsPresent(t, scenario.name, metrics)
	result := printPerfScenarioResult{
		Name:    scenario.name,
		Kind:    scenario.kind,
		Status:  "ok",
		Notes:   notes,
		Metrics: metrics,
	}
	if outputPath != "" {
		result.OutputFile = filepath.Base(outputPath)
	}
	return result
}

func assertPrintPerfMetricsPresent(t *testing.T, name string, metrics printPerfMetrics) {
	t.Helper()
	if metrics.WallDurationNS <= 0 {
		t.Fatalf("scenario %s missing wall duration", name)
	}
	if metrics.OutputBytes <= 0 || len(metrics.OutputSHA256) != sha256.Size*2 {
		t.Fatalf("scenario %s missing output bytes/hash", name)
	}
	if metrics.Mallocs == 0 || metrics.TotalAllocBytes == 0 {
		t.Fatalf("scenario %s missing allocation metrics", name)
	}
	if metrics.HeapAllocBeforeBytes == 0 || metrics.HeapAllocAfterBytes == 0 ||
		metrics.HeapInuseBeforeBytes == 0 || metrics.HeapInuseAfterBytes == 0 {
		t.Fatalf("scenario %s missing heap metrics", name)
	}
	if runtime.GOOS == "windows" && (metrics.WorkingSetBefore == 0 || metrics.WorkingSetAfter == 0 || metrics.PeakWorkingSetBytes == 0) {
		t.Fatalf("scenario %s missing Windows working-set metrics", name)
	}
}

func runPrintPerfA4JPEG(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	svc := NewPrintService()
	dc := newPrintPerfContext(2480, 3508)
	path, htmlDoc, err := svc.saveOutput(dc, domain.PrintRequest{
		PaperWidthMM: 210, PaperHeightMM: 297, DPI: 300,
		BackgroundColor: "#ffffff", ColorSpace: "sRGB", ExportFormat: "jpeg",
	})
	if err != nil {
		t.Fatalf("A4 JPEG export: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Fatal("A4 JPEG export missing print HTML")
	}
	return path, nil, []string{"A4 210x297 mm at 300 DPI", "sRGB JPEG production writer"}
}

func runPrintPerfA4PNG(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	svc := NewPrintService()
	dc := newPrintPerfContext(2480, 3508)
	path, htmlDoc, err := svc.saveOutput(dc, domain.PrintRequest{
		PaperWidthMM: 210, PaperHeightMM: 297, DPI: 300,
		BackgroundColor: "#ffffff", ColorSpace: "sRGB", ExportFormat: "png",
	})
	if err != nil {
		t.Fatalf("A4 PNG export: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Fatal("A4 PNG export missing print HTML")
	}
	return path, nil, []string{"A4 210x297 mm at 300 DPI", "sRGB PNG production writer"}
}

func runPrintPerfCMYKTIFF(t *testing.T, reportDir string) (string, []byte, []string) {
	t.Helper()
	const width, height = 2480, 3508
	img := image.NewCMYK(image.Rect(0, 0, width, height))
	fillPrintPerfCMYK(img)
	path := filepath.Join(reportDir, "print_perf_a4_300_cmyk.tif")
	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("create CMYK TIFF output: %v", err)
	}
	if err := encodeCMYKTIFFToWriter(img, 300, file); err != nil {
		_ = file.Close()
		t.Fatalf("encode production CMYK TIFF: %v", err)
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		t.Fatalf("sync CMYK TIFF output: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close CMYK TIFF output: %v", err)
	}
	assertPrintPerfCMYKTIFF(t, path, width, height)
	return path, nil, []string{"A4 210x297 mm at 300 DPI", "true separated CMYK TIFF production encoder"}
}

func runPrintPerfFilteredMultiCell(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	appDir := os.Getenv("GRIDO_APP_DIR")
	sources := []string{
		writePrintPerfSource(t, appDir, "perf-filter-a.png", 480, 640, 1),
		writePrintPerfSource(t, appDir, "perf-filter-b.png", 640, 480, 2),
		writePrintPerfSource(t, appDir, "perf-filter-c.png", 600, 600, 3),
		writePrintPerfSource(t, appDir, "perf-filter-d.png", 480, 720, 4),
	}
	filters := []string{"enhance", "skinGlow", "clarity", "monoPro"}
	items := make([]domain.PrintItem, 0, 12)
	for row := 0; row < 3; row++ {
		for col := 0; col < 4; col++ {
			idx := row*4 + col
			items = append(items, domain.PrintItem{
				ImageSrc: sources[idx%len(sources)], X: 8 + float64(col)*50, Y: 8 + float64(row)*91,
				W: 44, H: 82, Filter: filters[idx%len(filters)],
				Brightness: 104 + float64(idx%3), Contrast: 106, Saturation: 108,
				SlotAspect: 44.0 / 82.0, Zoom: 1.08, DragX: float64(idx%3 - 1), DragY: float64(idx % 2),
			})
		}
	}
	path, htmlDoc, err := NewPrintService().GeneratePrintSheet(domain.PrintRequest{
		JobID: "perf-filtered-multi-cell", PaperWidthMM: 210, PaperHeightMM: 297, DPI: 300,
		BackgroundColor: "#f7f7f7", ColorSpace: "sRGB", ExportFormat: "jpeg", Items: items,
	})
	if err != nil {
		t.Fatalf("filtered multi-cell generation: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Fatal("filtered multi-cell output missing print HTML")
	}
	return path, nil, []string{"12 cells", "catalog filters plus user adjustments"}
}

func runPrintPerfRepeatedCopies(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	source := writePrintPerfSource(t, os.Getenv("GRIDO_APP_DIR"), "perf-repeat.png", 420, 560, 9)
	path, htmlDoc, err := NewPrintService().GeneratePrintSheet(domain.PrintRequest{
		JobID: "perf-repeated-copies", PaperWidthMM: 210, PaperHeightMM: 297, DPI: 300,
		BackgroundColor: "#ffffff", ColorSpace: "sRGB", ExportFormat: "jpeg",
		Items: []domain.PrintItem{{
			ImageSrc: source, X: 6, Y: 6, W: 31, H: 43, Filter: "none",
			Brightness: 100, Contrast: 100, Saturation: 100, SlotAspect: 31.0 / 43.0, Zoom: 1,
			Copies: 30, CopyCols: 5, CopyStepX: 41, CopyStepY: 48,
		}},
	})
	if err != nil {
		t.Fatalf("repeated-copy generation: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Fatal("repeated-copy output missing print HTML")
	}
	return path, nil, []string{"30 copies expanded from one template", "shared processed-image cache path"}
}

func runPrintPerfCancellation(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	exportsDir := filepath.Join(os.Getenv("GRIDO_APP_DIR"), "Exports")
	before := map[string]struct{}{}
	if entries, err := os.ReadDir(exportsDir); err == nil {
		for _, entry := range entries {
			before[entry.Name()] = struct{}{}
		}
	}
	const jobID = "perf-cancellation"
	reached := make(chan struct{})
	release := make(chan struct{})
	var once sync.Once
	barrier := func(stage printGenerationStage, _ int) {
		if stage != printStageSaveBefore {
			return
		}
		once.Do(func() { close(reached) })
		<-release
	}
	done := make(chan error, 1)
	go func() {
		_, _, err := NewPrintService().generatePrintSheet(context.Background(), domain.PrintRequest{
			JobID: jobID, PaperWidthMM: 60, PaperHeightMM: 60, DPI: 100,
			BackgroundColor: "#ffffff", ExportFormat: "png",
			Items: []domain.PrintItem{{X: 5, Y: 5, W: 20, H: 20, BgColor: "#123456"}},
		}, barrier)
		done <- err
	}()

	select {
	case <-reached:
	case <-time.After(10 * time.Second):
		t.Fatal("cancellation scenario did not reach save barrier")
	}
	if err := CancelPrintJob(jobID); err != nil {
		close(release)
		t.Fatalf("cancel print job: %v", err)
	}
	close(release)
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("cancellation scenario error = %v, want context.Canceled", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("cancellation scenario did not stop")
	}
	if entries, err := os.ReadDir(exportsDir); err == nil {
		for _, entry := range entries {
			if _, existed := before[entry.Name()]; existed {
				continue
			}
			if strings.HasPrefix(entry.Name(), "print_") || strings.HasSuffix(entry.Name(), ".tmp") {
				t.Fatalf("cancelled scenario left new output %s", entry.Name())
			}
		}
	}
	return "", []byte("context.Canceled:no-output"), []string{"cancelled at deterministic pre-save barrier", "no printer or output file used"}
}

func runPrintPerfDIB(t *testing.T, _ string) (string, []byte, []string) {
	t.Helper()
	const width, height = 2480, 3508
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		row := img.Pix[y*img.Stride:]
		for x := 0; x < width; x++ {
			off := x * 4
			row[off+0] = uint8((x*3 + y*5) & 0xff)
			row[off+1] = uint8((x*7 + y*11) & 0xff)
			row[off+2] = uint8((x*13 + y*17) & 0xff)
			row[off+3] = uint8(128 + ((x + y) & 0x7f))
		}
	}
	pixels, header := convertToBottomUpDIB(img)
	if len(pixels) != width*height*4 || int(header.BmiHeader.BiWidth) != width || int(header.BmiHeader.BiHeight) != height {
		t.Fatalf("DIB output invalid: bytes=%d dimensions=%dx%d", len(pixels), header.BmiHeader.BiWidth, header.BmiHeader.BiHeight)
	}
	return "", pixels, []string{"A4 300 DPI-sized NRGBA to bottom-up BGRA DIB", "pure conversion; no printer APIs"}
}

var (
	printPerfPSAPI                = windows.NewLazySystemDLL("psapi.dll")
	printPerfGetProcessMemoryInfo = printPerfPSAPI.NewProc("GetProcessMemoryInfo")
)

type printPerfProcessMemoryCounters struct {
	CB                         uint32
	PageFaultCount             uint32
	PeakWorkingSetSize         uintptr
	WorkingSetSize             uintptr
	QuotaPeakPagedPoolUsage    uintptr
	QuotaPagedPoolUsage        uintptr
	QuotaPeakNonPagedPoolUsage uintptr
	QuotaNonPagedPoolUsage     uintptr
	PagefileUsage              uintptr
	PeakPagefileUsage          uintptr
}

func currentProcessWorkingSet() (workingSet, peakWorkingSet uint64, err error) {
	counters := printPerfProcessMemoryCounters{CB: uint32(unsafe.Sizeof(printPerfProcessMemoryCounters{}))}
	ret, _, callErr := printPerfGetProcessMemoryInfo.Call(
		uintptr(windows.CurrentProcess()),
		uintptr(unsafe.Pointer(&counters)),
		uintptr(counters.CB),
	)
	if ret == 0 {
		if callErr == nil || errors.Is(callErr, syscall.Errno(0)) {
			callErr = errors.New("GetProcessMemoryInfo returned zero")
		}
		return 0, 0, callErr
	}
	return uint64(counters.WorkingSetSize), uint64(counters.PeakWorkingSetSize), nil
}

func newPrintPerfContext(width, height int) *gg.Context {
	dc := gg.NewContext(width, height)
	dc.SetColor(color.White)
	dc.Clear()
	for y := 0; y < height; y += 48 {
		for x := 0; x < width; x += 48 {
			seed := uint32(x*73856093) ^ uint32(y*19349663)
			dc.SetColor(color.RGBA{
				R: uint8(seed >> 16), G: uint8(seed >> 8), B: uint8(seed), A: 255,
			})
			dc.DrawRectangle(float64(x), float64(y), 48, 48)
			dc.Fill()
		}
	}
	return dc
}

func fillPrintPerfCMYK(img *image.CMYK) {
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		row := img.Pix[img.PixOffset(bounds.Min.X, y):]
		for x := 0; x < bounds.Dx(); x++ {
			off := x * 4
			row[off+0] = uint8((x*13 + y*3) & 0xff)
			row[off+1] = uint8((x*5 + y*11) & 0xff)
			row[off+2] = uint8((x*7 + y*17) & 0xff)
			row[off+3] = uint8((x/32 + y/32) & 0x3f)
		}
	}
}

func assertPrintPerfCMYKTIFF(t *testing.T, path string, width, height int) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read CMYK TIFF: %v", err)
	}
	singles, rationals, _ := parseTIFFFirstIFD(t, data)
	if singles[tiffTagImageWidth] != uint32(width) || singles[tiffTagImageLength] != uint32(height) {
		t.Fatalf("CMYK TIFF dimensions = %dx%d, want %dx%d", singles[tiffTagImageWidth], singles[tiffTagImageLength], width, height)
	}
	if singles[tiffTagPhotometricInt] != 5 || singles[tiffTagSamplesPerPix] != 4 || singles[tiffTagInkSet] != 1 {
		t.Fatalf("CMYK TIFF separation tags invalid: photometric=%d samples=%d inkSet=%d",
			singles[tiffTagPhotometricInt], singles[tiffTagSamplesPerPix], singles[tiffTagInkSet])
	}
	if rationals[tiffTagXResolution] != [2]uint32{300, 1} || rationals[tiffTagYResolution] != [2]uint32{300, 1} {
		t.Fatalf("CMYK TIFF missing 300 DPI tags: x=%v y=%v", rationals[tiffTagXResolution], rationals[tiffTagYResolution])
	}
}

func writePrintPerfSource(t *testing.T, appDir, name string, width, height, seed int) string {
	t.Helper()
	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("create performance media directory: %v", err)
	}
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			off := img.PixOffset(x, y)
			img.Pix[off+0] = uint8((x*seed + y*3) & 0xff)
			img.Pix[off+1] = uint8((x*5 + y*seed) & 0xff)
			img.Pix[off+2] = uint8((x*7 + y*11 + seed*17) & 0xff)
			img.Pix[off+3] = 255
		}
	}
	path := filepath.Join(mediaDir, name)
	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("create performance source: %v", err)
	}
	var encodeErr error
	if strings.EqualFold(filepath.Ext(name), ".jpg") || strings.EqualFold(filepath.Ext(name), ".jpeg") {
		encodeErr = jpeg.Encode(file, img, &jpeg.Options{Quality: 92})
	} else {
		encodeErr = png.Encode(file, img)
	}
	if encodeErr != nil {
		_ = file.Close()
		t.Fatalf("encode performance source: %v", encodeErr)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close performance source: %v", err)
	}
	return "/local-image/" + name
}

func collectPrintPerfEnvironment() printPerfEnvironment {
	settings := map[string]string{}
	for _, setting := range buildSettings() {
		settings[setting.Key] = setting.Value
	}
	return printPerfEnvironment{
		TimestampUTC: time.Now().UTC().Format(time.RFC3339Nano),
		GOOS:         runtime.GOOS,
		GOARCH:       runtime.GOARCH,
		GoVersion:    runtime.Version(),
		Compiler:     runtime.Compiler,
		CGOEnabled:   settings["CGO_ENABLED"],
		NumCPU:       runtime.NumCPU(),
		GOMAXPROCS:   runtime.GOMAXPROCS(0),
		Toolchain:    strings.TrimSpace(runtime.Version() + " " + runtime.Compiler + " " + runtime.GOOS + "/" + runtime.GOARCH),
		RunnerOS:     os.Getenv("RUNNER_OS"),
		RunnerArch:   os.Getenv("RUNNER_ARCH"),
		RunnerName:   os.Getenv("RUNNER_NAME"),
		RunnerImage:  firstNonEmpty(os.Getenv("ImageOS"), os.Getenv("ImageVersion")),
		CPUModel:     detectCPUModel(),
		PeakRSSKind:  "process-lifetime peak working set sampled after each scenario",
	}
}

func buildSettings() []debug.BuildSetting {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return nil
	}
	return info.Settings
}

func detectCPUModel() string {
	keys := []string{"GRIDO_PRINT_PERF_CPU", "PROCESSOR_IDENTIFIER", "RUNNER_CPU_MODEL"}
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	for _, path := range []string{"/proc/cpuinfo", "/sys/devices/virtual/dmi/id/product_name"} {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(data), "\n") {
			if value, ok := strings.CutPrefix(strings.TrimSpace(line), "model name\t: "); ok && strings.TrimSpace(value) != "" {
				return strings.TrimSpace(value)
			}
			if path != "/proc/cpuinfo" && strings.TrimSpace(line) != "" {
				return strings.TrimSpace(line)
			}
		}
	}
	return "unknown"
}

func writePrintPerfArtifacts(t *testing.T, reportDir string, report printPerfReport) {
	t.Helper()
	sort.Slice(report.Scenarios, func(i, j int) bool { return report.Scenarios[i].Name < report.Scenarios[j].Name })
	jsonData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		t.Fatalf("marshal print performance report: %v", err)
	}
	jsonData = append(jsonData, '\n')
	if err := os.WriteFile(filepath.Join(reportDir, "print-bench.json"), jsonData, 0o644); err != nil {
		t.Fatalf("write print-bench.json: %v", err)
	}

	var text strings.Builder
	fmt.Fprintf(&text, "Grido print performance baseline (report-only)\n")
	fmt.Fprintf(&text, "timestamp_utc: %s\n", report.Environment.TimestampUTC)
	fmt.Fprintf(&text, "toolchain: %s\n", report.Environment.Toolchain)
	fmt.Fprintf(&text, "runner: %s/%s %s\n", report.Environment.RunnerOS, report.Environment.RunnerArch, report.Environment.RunnerImage)
	fmt.Fprintf(&text, "cpu: %s (%d logical CPUs, GOMAXPROCS=%d)\n", report.Environment.CPUModel, report.Environment.NumCPU, report.Environment.GOMAXPROCS)
	fmt.Fprintf(&text, "peak_rss_kind: %s\n\n", report.Environment.PeakRSSKind)
	for _, scenario := range report.Scenarios {
		m := scenario.Metrics
		fmt.Fprintf(&text, "%s [%s] status=%s wall=%s allocs=%d total_alloc=%d heap_delta=%d heap_inuse_delta=%d gc=%d pause=%s output=%d sha256=%s",
			scenario.Name, scenario.Kind, scenario.Status, time.Duration(m.WallDurationNS), m.Mallocs, m.TotalAllocBytes,
			m.HeapAllocDeltaBytes, m.HeapInuseDeltaBytes, m.NumGC, time.Duration(m.PauseTotalNS), m.OutputBytes, m.OutputSHA256)
		if m.PeakWorkingSetBytes > 0 {
			fmt.Fprintf(&text, " working_set_before=%d working_set_after=%d peak_working_set=%d", m.WorkingSetBefore, m.WorkingSetAfter, m.PeakWorkingSetBytes)
		}
		text.WriteByte('\n')
	}
	if err := os.WriteFile(filepath.Join(reportDir, "print-bench.txt"), []byte(text.String()), 0o644); err != nil {
		t.Fatalf("write print-bench.txt: %v", err)
	}

	environmentData, err := json.MarshalIndent(report.Environment, "", "  ")
	if err != nil {
		t.Fatalf("marshal print performance environment: %v", err)
	}
	environmentData = append(environmentData, '\n')
	if err := os.WriteFile(filepath.Join(reportDir, "print-environment.json"), environmentData, 0o644); err != nil {
		t.Fatalf("write print-environment.json: %v", err)
	}
	t.Logf("print performance artifacts: %s", reportDir)
}

func signedUint64Delta(after, before uint64) int64 {
	if after >= before {
		return int64(after - before)
	}
	return -int64(before - after)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
