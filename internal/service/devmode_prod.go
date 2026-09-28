//go:build !dev

package service

// serviceDevBuild خاطئ في بناء الإنتاج (wails3 build يمرر production بلا dev).
const serviceDevBuild = false
