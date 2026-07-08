package domain

import (
	"database/sql/driver"
	"errors"
)

// JSONText يمثل نص JSON في قاعدة البيانات مع دعم المسح التلقائي والحفظ
type JSONText string

// Scan يقوم بقراءة القيمة من قاعدة البيانات وتحويلها إلى نوع JSONText
func (j *JSONText) Scan(value interface{}) error {
	if value == nil {
		*j = ""
		return nil
	}
	switch v := value.(type) {
	case string:
		*j = JSONText(v)
	case []byte:
		*j = JSONText(v)
	default:
		return errors.New("failed to scan value as JSONText")
	}
	return nil
}

// Value يقوم بتحويل القيمة إلى نص جاهز للحفظ بقاعدة البيانات
func (j JSONText) Value() (driver.Value, error) {
	return string(j), nil
}
