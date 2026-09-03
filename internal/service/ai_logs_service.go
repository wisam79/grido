package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"grido/internal/utils"
)

// AiLogsService يخزن سجلات استخدام الذكاء الاصطناعي في ملف JSON داخل
// مجلد بيانات التطبيق (AppData) بدل localStorage — تنظيف المتصفح أو
// إعادة تثبيت WebView2 لم يعد يمحو سجل حصص المستخدم.
//
// أمان التزامن: مثل AutosaveService — writeMu يسلسل دورة الكتابة الذرية
// (create → write → fsync → rename) ضد نداءات Wails المتوازية.
type AiLogsService struct {
	writeMu sync.Mutex
}

func NewAiLogsService() *AiLogsService {
	return &AiLogsService{}
}

func (s *AiLogsService) getFilePath() string {
	return filepath.Join(utils.GetAppDir(), "ai_usage_logs.json")
}

// LoadAiUsageLogs يعيد محتوى ملف السجلات كسلسلة JSON، أو سلسلة فارغة
// إذا لم يوجد الملف بعد (أول تشغيل).
func (s *AiLogsService) LoadAiUsageLogs() (string, error) {
	bytes, err := os.ReadFile(s.getFilePath())
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("failed to read AI usage logs: %w", err)
	}
	return string(bytes), nil
}

// SaveAiUsageLogs يستبدل محتوى ملف السجلات بشكل ذري. التحقق من الصحة
// يتم على المستدعي — الملف مقصور على مصفوفة سجلات صغيرة (< 2MB).
func (s *AiLogsService) SaveAiUsageLogs(jsonData string) error {
	if !json.Valid([]byte(jsonData)) {
		return fmt.Errorf("invalid JSON payload for AI usage logs")
	}
	if len(jsonData) > 2*1024*1024 { // 2MB limit
		return fmt.Errorf("AI logs payload too large: %d bytes (limit 2MB)", len(jsonData))
	}

	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	path := s.getFilePath()
	tmpPath := path + ".tmp"

	defer os.Remove(tmpPath)

	f, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create tmp AI logs file: %w", err)
	}
	if _, err := f.Write([]byte(jsonData)); err != nil {
		f.Close()
		return fmt.Errorf("failed to write tmp AI logs file: %w", err)
	}
	if err := f.Sync(); err != nil {
		f.Close()
		return fmt.Errorf("failed to sync tmp AI logs file: %w", err)
	}
	f.Close()

	return os.Rename(tmpPath, path)
}
