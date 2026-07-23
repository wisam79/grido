# download-models.ps1
# تنزيل نموذج جوجل MediaPipe وملفات WASM لتشغيل ميزة قص الخلفية محلياً 100% بدون إنترنت

# تحديد المسار بالنسبة لمكان تشغيل السكريبت
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PublicDir = Join-Path $ScriptDir "..\public"
$ModelsDir = Join-Path $PublicDir "models"
$WasmDir = Join-Path $PublicDir "wasm"

# إنشاء المجلدات إذا لم تكن موجودة
if (!(Test-Path $ModelsDir)) {
    New-Item -ItemType Directory -Force -Path $ModelsDir
}
if (!(Test-Path $WasmDir)) {
    New-Item -ItemType Directory -Force -Path $WasmDir
}

# 1. تنزيل نموذج selfie_multiclass.tflite (حوالي 16 ميغابايت)
$ModelUrl = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
$ModelPath = "$ModelsDir\selfie_multiclass.tflite"

Write-Host "Downloading Google Selfie Multiclass Model (16MB)..."
Invoke-WebRequest -Uri $ModelUrl -OutFile $ModelPath -UserAgent "Mozilla/5.0"

# 2. تنزيل ملفات WASM الخاصة بـ MediaPipe Tasks-Vision (لتشغيل المعالجة محلياً)
$WasmBaseUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
$WasmFiles = @(
    "vision_wasm_internal.js",
    "vision_wasm_internal.wasm"
)

foreach ($file in $WasmFiles) {
    $fileUrl = "$WasmBaseUrl/$file"
    $filePath = "$WasmDir\$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $fileUrl -OutFile $filePath -UserAgent "Mozilla/5.0"
}

Write-Host "Download complete! Google MediaPipe models and WASM runtimes are now bundled locally."
