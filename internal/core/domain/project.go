package domain

import (
	"time"
)

type Project struct {
	ID                  string    `gorm:"primaryKey" json:"id"`
	Name                string    `json:"name"`
	Mode                string    `json:"mode"`
	CanvasWidth         int       `json:"canvasWidth"`
	CanvasHeight        int       `json:"canvasHeight"`
	BackgroundColor     string    `json:"backgroundColor"`
	Elements            string    `gorm:"type:text" json:"elements"` // JSON string representation of elements
	Slots               string    `gorm:"type:text" json:"slots"`    // JSON string representation of slots
	Template            string    `gorm:"type:text" json:"template"` // JSON string
	CollageTemplate     string    `gorm:"type:text" json:"collageTemplate"`
	PrintSettings       string    `gorm:"type:text" json:"printSettings"`
	ShowGrid            bool      `json:"showGrid"`
	GridSize            int       `json:"gridSize"`
	GridColor           string    `json:"gridColor"`
	GridType            string    `json:"gridType"`
	SnapToGrid          bool      `json:"snapToGrid"`
	CollageGap          int       `json:"collageGap"`
	CollageMargin       int       `json:"collageMargin"`
	CollageRadius       int       `json:"collageRadius"`
	CollageShowCutLines bool      `json:"collageShowCutLines"`
	CollageStrokeWidth  int       `json:"collageStrokeWidth"`
	CollageStrokeColor  string    `json:"collageStrokeColor"`
	CreatedAt           time.Time `json:"-"` // مخفي من Wails bindings لتفادي خطأ time.Time
	UpdatedAt           time.Time `json:"-"`
	CreatedAtStr        string    `gorm:"-" json:"createdAt"` // حقل محسوب للتسلسل
	UpdatedAtStr        string    `gorm:"-" json:"updatedAt"`
}

type ProjectRepository interface {
	Save(project *Project) error
	FindByID(id string) (*Project, error)
	FindAll() ([]Project, error)
	Delete(id string) error
	ImportProjects(projects []Project, overwrite bool) error
}
