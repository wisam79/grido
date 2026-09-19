---
name: wails-v3-native-io-streaming
description: دليل مهارة تدفق البيانات الثنائية والميديا وحماية مسارات AssetServer في Wails v3
---

# 🚀 مهارة تدفق البيانات الثنائية وحماية الميديا (Wails v3 Native I/O Streaming)

يقدم هذا الدليل المعايير المعتمدة لنقل الصور الضخمة والميديا بين Go والواجهة بأمان وأقصى سرعة ممكنة.

---

## 🛡️ 1. الحماية من ثغرات مسارات الصور (Symlink Path Traversal)

> **النمط الإلزامي الموحد** (مطابق للتنفيذ الفعلي في `internal/service/media_service.go`):
> لا تمرّر مساراً كاملاً من العميل؛ استخرج اسم الملف فقط، ادمجه مع مجلد مسموح، وافحص الطرفين بـ `EvalSymlinks` وقارن بـ `filepath.Clean` على الطرفين مع `filepath.Separator` (لمنع تجاوز البادئة مثل `baseDir_evil`).

```go
func AssetServerHandler(allowedRoot string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // تطبيع الخطوط المائلة ثم استخراج اسم الملف فقط
        normalized := strings.ReplaceAll(r.URL.Query().Get("file"), "\\", "/")
        filename := filepath.Base(filepath.Clean(strings.TrimPrefix(normalized, "/local-image/")))
        fullPath := filepath.Join(allowedRoot, filename)

        resolved, err := filepath.EvalSymlinks(fullPath)
        if err != nil {
            resolved = fullPath
        }
        resolvedRoot, err := filepath.EvalSymlinks(allowedRoot)
        if err == nil {
            allowedRoot = resolvedRoot
        }
        if !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(allowedRoot)+string(filepath.Separator)) {
            http.Error(w, "Access Denied", http.StatusForbidden)
            return
        }

        w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
        w.Header().Set("X-Content-Type-Options", "nosniff")
        http.ServeFile(w, r, resolved)
    }
}
```

---

## ⚡ 2. تجنب Base64 للميديا الضخمة
* يُمنع تحويل صور الكاميرا أو المشاريع إلى Base64 لنقلها عبر RPC.
* يتم التعامل حصراً مع المسارات المحلية عبر معالج ميديا `wails://` أو التدفق الثنائي المباشر لحماية الذاكرة ومنع إجهاد الـ Garbage Collector.
