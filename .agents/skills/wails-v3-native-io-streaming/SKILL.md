---
name: wails-v3-native-io-streaming
description: دليل مهارة تدفق البيانات الثنائية والميديا وحماية مسارات AssetServer في Wails v3
---

# 🚀 مهارة تدفق البيانات الثنائية وحماية الميديا (Wails v3 Native I/O Streaming)

يقدم هذا الدليل المعايير المعتمدة لنقل الصور الضخمة والميديا بين Go والواجهة بأمان وأقصى سرعة ممكنة.

---

## 🛡️ 1. الحماية من ثغرات مسارات الصور (Symlink Path Traversal)

```go
func AssetServerHandler(allowedRoot string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        relPath := r.URL.Query().Get("file")
        resolved, err := filepath.EvalSymlinks(filepath.Clean(relPath))
        if err != nil || !strings.HasPrefix(resolved, allowedRoot) {
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
