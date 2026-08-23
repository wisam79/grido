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
	Elements            JSONText  `gorm:"type:text" json:"elements"` // JSON string representation of elements
	Slots               JSONText  `gorm:"type:text" json:"slots"`    // JSON string representation of slots
	Template            JSONText  `gorm:"type:text" json:"template"` // JSON string
	CollageTemplate     JSONText  `gorm:"type:text" json:"collageTemplate"`
	PrintSettings       JSONText  `gorm:"type:text" json:"printSettings"`
	ShowGrid            bool      `json:"showGrid"`
	GridSize            int       `json:"gridSize"`
	GridColor           string    `json:"gridColor"`
	GridOpacity         float64   `json:"gridOpacity"`
	GridSubdivisions    int       `json:"gridSubdivisions"`
	GridType            string    `json:"gridType"`
	SnapToGrid          bool      `json:"snapToGrid"`
	ShowColumns         bool      `json:"showColumns"`
	ColumnsCount        int       `json:"columnsCount"`
	ColumnsColor        string    `json:"columnsColor"`
	ColumnsMargin       int       `json:"columnsMargin"`
	ColumnsGutter       int       `json:"columnsGutter"`
	CollageGap            int       `json:"collageGap"`
	CollageMargin         int       `json:"collageMargin"`
	CollageRadius         int       `json:"collageRadius"`
	CollageShowCutLines   bool      `json:"collageShowCutLines"`
	CollageShowEndCutLine bool      `json:"collageShowEndCutLine"`
	CollageStrokeWidth    int       `json:"collageStrokeWidth"`
	CollageStrokeColor    string    `json:"collageStrokeColor"`
	CreatedAt           time.Time `json:"-"` // مخفي من Wails bindings لتفادي خطأ time.Time
	UpdatedAt           time.Time `json:"-"`
	CreatedAtStr        string    `gorm:"-" json:"createdAt"` // حقل محسوب للتسلسل
	UpdatedAtStr        string    `gorm:"-" json:"updatedAt"`
}

type ProjectRepository interface {
	Save(project *Project) error
	FindByID(id string) (*Project, error)
	FindAll() ([]Project, error)
	Count() (int64, error)
	Delete(id string) error
	ImportProjects(projects []Project, overwrite bool) error
}
