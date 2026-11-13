package domain

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestPrintRequestContractJSONRoundTrip(t *testing.T) {
	want := PrintRequest{
		JobID:           "client-print-42",
		PaperWidthMM:    210,
		PaperHeightMM:   297,
		DPI:             300,
		BackgroundColor: "#ffffff",
		BackgroundBlocks: []PrintBackgroundBlock{
			{X: 5, Y: 7.5, W: 85, H: 55, Color: "#102030"},
			{X: 95, Y: 7.5, W: 85, H: 55, Color: "#405060", Color2: "#708090", Angle: 135},
		},
	}

	encoded, err := json.Marshal(want)
	if err != nil {
		t.Fatalf("marshal PrintRequest: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &raw); err != nil {
		t.Fatalf("unmarshal PrintRequest object: %v", err)
	}
	for _, key := range []string{"jobId", "backgroundBlocks", "paperWidthMM", "paperHeightMM"} {
		if _, ok := raw[key]; !ok {
			t.Errorf("PrintRequest JSON is missing %q: %s", key, encoded)
		}
	}
	if _, oldSpelling := raw["jobID"]; oldSpelling {
		t.Errorf("PrintRequest must use the existing lower-camel jobId spelling: %s", encoded)
	}

	var got PrintRequest
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("round-trip PrintRequest: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("PrintRequest round trip mismatch\n got: %#v\nwant: %#v", got, want)
	}
}

func TestPrintRequestContractLegacyJSONRemainsValid(t *testing.T) {
	legacy := []byte(`{"paperWidthMM":210,"paperHeightMM":297,"dpi":300,"backgroundColor":"#fff","showCutLines":false,"cutLines":[],"items":[]}`)

	var req PrintRequest
	if err := json.Unmarshal(legacy, &req); err != nil {
		t.Fatalf("unmarshal legacy PrintRequest: %v", err)
	}
	if req.JobID != "" || len(req.BackgroundBlocks) != 0 {
		t.Fatalf("new optional fields must default to zero values: %#v", req)
	}
}

func TestDirectPrintResultContractJSON(t *testing.T) {
	want := DirectPrintResult{
		Success:            true,
		JobID:              73,
		Status:             "Printed",
		Code:               "completed",
		Terminal:           true,
		RequestedFormName:  "4x6 Borderless",
		RequestedPaperID:   260,
		AppliedFormName:    "Photo 4x6",
		AppliedPaperID:     43,
		PaperWidthMM:       101.6,
		PaperHeightMM:      152.4,
		PrintableWidthMM:   100.8,
		PrintableHeightMM:  151.6,
		PrintableOffsetXMM: 0.4,
		PrintableOffsetYMM: 0.4,
		Scale:              0.992,
		FallbackReason:     "requested borderless form unavailable",
	}

	encoded, err := json.Marshal(want)
	if err != nil {
		t.Fatalf("marshal DirectPrintResult: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &raw); err != nil {
		t.Fatalf("unmarshal DirectPrintResult object: %v", err)
	}
	for _, key := range []string{
		"success", "jobId", "status", "code", "terminal", "requestedFormName", "requestedPaperId",
		"appliedFormName", "appliedPaperId", "paperWidthMM", "paperHeightMM",
		"printableWidthMM", "printableHeightMM", "printableOffsetXMM",
		"printableOffsetYMM", "scale", "fallbackReason",
	} {
		if _, ok := raw[key]; !ok {
			t.Errorf("DirectPrintResult JSON is missing %q: %s", key, encoded)
		}
	}

	var got DirectPrintResult
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("round-trip DirectPrintResult: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("DirectPrintResult round trip mismatch\n got: %#v\nwant: %#v", got, want)
	}
}

func TestPrinterPlanContractJSON(t *testing.T) {
	wantRequest := PrinterPlanRequest{
		PrinterName:   "Studio Printer",
		FormName:      "A4 Borderless",
		PaperID:       9,
		PaperWidthMM:  210,
		PaperHeightMM: 297,
		Orientation:   "portrait",
		Borderless:    true,
	}

	encoded, err := json.Marshal(wantRequest)
	if err != nil {
		t.Fatalf("marshal PrinterPlanRequest: %v", err)
	}

	var gotRequest PrinterPlanRequest
	if err := json.Unmarshal(encoded, &gotRequest); err != nil {
		t.Fatalf("round-trip PrinterPlanRequest: %v", err)
	}
	if !reflect.DeepEqual(gotRequest, wantRequest) {
		t.Fatalf("PrinterPlanRequest round trip mismatch\n got: %#v\nwant: %#v", gotRequest, wantRequest)
	}

	wantResult := PrinterPlanResult{
		Success:            true,
		Code:               "exact",
		RequestedFormName:  "A4 Borderless",
		RequestedPaperID:   9,
		AppliedFormName:    "A4",
		AppliedPaperID:     9,
		PaperWidthMM:       210,
		PaperHeightMM:      297,
		PrintableWidthMM:   203.2,
		PrintableHeightMM:  289.8,
		PrintableOffsetXMM: 3.4,
		PrintableOffsetYMM: 3.6,
		Scale:              0.968,
	}
	encoded, err = json.Marshal(wantResult)
	if err != nil {
		t.Fatalf("marshal PrinterPlanResult: %v", err)
	}
	var gotResult PrinterPlanResult
	if err := json.Unmarshal(encoded, &gotResult); err != nil {
		t.Fatalf("round-trip PrinterPlanResult: %v", err)
	}
	if !reflect.DeepEqual(gotResult, wantResult) {
		t.Fatalf("PrinterPlanResult round trip mismatch\n got: %#v\nwant: %#v", gotResult, wantResult)
	}
}
