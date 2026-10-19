package service

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ZipDirectory creates a zip file of a directory
func ZipDirectory(source, target string) error {
	zipfile, err := os.Create(target)
	if err != nil {
		return err
	}

	archive := zip.NewWriter(zipfile)

	// 🛡️ استبعاد ملف الـ zip الهدف من المشي: لو وقع target داخل source
	// (أرشيف الدعم الذاتي) فسيُقرأ الأرشيف المتنامي داخل نفسه ⇒ نمو متسارع
	// حتى امتلاء القرص. المقارنة بمسارات مطلقة منظفة (abs + Clean).
	targetAbs, absErr := filepath.Abs(target)
	if absErr == nil {
		targetAbs = filepath.Clean(targetAbs)
	}

	walkErr := filepath.WalkDir(source, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if absErr == nil {
			if pathAbs, pathErr := filepath.Abs(path); pathErr == nil && filepath.Clean(pathAbs) == targetAbs {
				return nil // تجاهل ملف الـ zip الهدف نفسه
			}
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		// Prevent Symlink attacks (Path Traversal)
		if info.Mode()&os.ModeSymlink != 0 {
			return nil // Skip symlinks entirely
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		header.Name = strings.TrimPrefix(path, filepath.Dir(source)+"/")
		header.Name = strings.TrimPrefix(header.Name, filepath.Dir(source)+"\\")
		// Prevent any path traversal within zip paths
		header.Name = strings.ReplaceAll(header.Name, "..", "")

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(writer, file)
		file.Close()
		return copyErr
	})

	// 🔧 إغلاق صريح بترتيب صحيح: Close للأرشيف يكتب فهرس الـ zip النهائي،
	// ثم Close للملف الفعلي. الـ defer الصامت كان يبتلع فشل الضغط/الكتابة
	// فيُعاد نجاح كاذب مع ملف ناقص.
	closeErr := archive.Close()
	fileErr := zipfile.Close()
	if walkErr != nil {
		return walkErr
	}
	if closeErr != nil {
		return closeErr
	}
	return fileErr
}
