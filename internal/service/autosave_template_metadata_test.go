package service

import (
	"strings"
	"testing"

	"grido/internal/core/domain"
	"grido/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newMetadataTestService(t *testing.T) *AutosaveService {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&domain.CustomTemplate{}); err != nil {
		t.Fatalf("failed to migrate custom templates: %v", err)
	}
	return NewAutosaveService(repository.NewCustomTemplateRepository(db))
}

func TestSaveCustomTemplateWithMetadata_RoundTrip(t *testing.T) {
	svc := newMetadataTestService(t)
	metadata := `{"version":1,"kind":"freeform","paperWidthMM":100,"paperHeightMM":150,"showCutLines":true}`
	tmpl, err := svc.SaveCustomTemplateWithMetadata("شيت تجريبي", 4, `[{"x":0,"y":0,"w":0.5,"h":0.5}]`, metadata)
	if err != nil {
		t.Fatalf("expected metadata save to succeed: %v", err)
	}
	if !strings.Contains(string(tmpl.Metadata), `"kind":"freeform"`) {
		t.Errorf("expected metadata persisted, got %q", tmpl.Metadata)
	}

	found, err := svc.GetCustomTemplates()
	if err != nil {
		t.Fatalf("failed to list templates: %v", err)
	}
	if len(found) != 1 || !strings.Contains(string(found[0].Metadata), `"paperWidthMM":100`) {
		t.Errorf("expected persisted metadata to round-trip, got %+v", found)
	}
}

func TestSaveCustomTemplateWithMetadata_RejectsInvalid(t *testing.T) {
	svc := newMetadataTestService(t)
	cases := []struct {
		name     string
		metadata string
	}{
		{"corrupt json", "{not-json"},
		{"unknown kind", `{"version":1,"kind":"scrapbook","paperWidthMM":100,"paperHeightMM":150}`},
		{"wrong version", `{"version":2,"kind":"grid","paperWidthMM":100,"paperHeightMM":150}`},
		{"zero paper", `{"version":1,"kind":"grid","paperWidthMM":0,"paperHeightMM":150}`},
		{"huge paper", `{"version":1,"kind":"grid","paperWidthMM":5000,"paperHeightMM":150}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := svc.SaveCustomTemplateWithMetadata("ق", 1, `[]`, tc.metadata); err == nil {
				t.Errorf("expected metadata %q to be rejected", tc.metadata)
			}
		})
	}
}

func TestSaveCustomTemplate_LegacyPathStillWorks(t *testing.T) {
	svc := newMetadataTestService(t)
	tmpl, err := svc.SaveCustomTemplate("بدون metadata", 2, `[]`)
	if err != nil {
		t.Fatalf("legacy save should not fail: %v", err)
	}
	if string(tmpl.Metadata) != "" {
		t.Errorf("legacy save should leave metadata empty, got %q", tmpl.Metadata)
	}
}

func TestProjectEditorState_FieldPresent(t *testing.T) {
	p := domain.Project{ID: "p-editor", EditorState: domain.JSONText(`{"version":1,"collagePendingImages":["/local-image/a.jpg"]}`)}
	if !strings.Contains(string(p.EditorState), "collagePendingImages") {
		t.Fatal("editorState should carry pending images")
	}
}
