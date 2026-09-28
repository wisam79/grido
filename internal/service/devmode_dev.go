//go:build dev

package service

// serviceDevBuild صحيح عند البناء بوضع التطوير (wails3 dev يمرر وسم dev).
// يُستخدَم لتفعيل سلوكيات التطوير المحلي فقط — مثل قراءة `.env` من مجلد العمل
// الحالي — ومنعها في بناء الإنتاج (انظر loadEnvConfigFile في license_service.go).
const serviceDevBuild = true
