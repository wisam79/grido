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
	defer zipfile.Close()

	archive := zip.NewWriter(zipfile)
	defer archive.Close()

	return filepath.WalkDir(source, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
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
}