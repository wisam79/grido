//go:build !dev

package main

// isDevBuild خاطئ في بناء الإنتاج (wails build يمرر production بلا dev).
const isDevBuild = false