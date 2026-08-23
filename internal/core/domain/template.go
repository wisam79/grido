package domain

import (
	"time"
)

type CustomTemplate struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Slots     int       `json:"slots"`
	Cells     JSONText  `json:"cells" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CustomTemplateRepository يعرّف عقد طبقة الـ Persistence للقوالب المخصصة،
// مما يحافظ على انعكاس التبعية (Services لا تعرف GORM).
type CustomTemplateRepository interface {
	Create(tmpl *CustomTemplate) error
	FindAll() ([]CustomTemplate, error)
	Delete(id uint) error
}
