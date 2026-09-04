# download-models.ps1
# تنزيل نماذج جوجل MediaPipe وملفات WASM لتشغيل ميزات عزل الخلفية وتأطير الوجه محلياً 100% بدون إنترنت

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

# 1. تنزيل نموذج selfie_multiclass.tflite (عزل الخلفية - حوالي 16 ميغابايت)
$SelfieUrl = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
$SelfiePath = "$ModelsDir\selfie_multiclass.tflite"

if (!(Test-Path $SelfiePath)) {
    Write-Host "Downloading Google Selfie Multiclass Model (16MB)..."
    Invoke-WebRequest -Uri $SelfieUrl -OutFile $SelfiePath -UserAgent "Mozilla/5.0"
} else {
    Write-Host "Google Selfie Multiclass Model already exists."
}

# 2. تنزيل نموذج face_landmarker.task (تأطير وكشف الوجه - حوالي 3.7 ميغابايت)
$FaceUrl = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
$FacePath = "$ModelsDir\face_landmarker.task"

if (!(Test-Path $FacePath)) {
    Write-Host "Downloading Google Face Landmarker Model (3.7MB)..."
    Invoke-WebRequest -Uri $FaceUrl -OutFile $FacePath -UserAgent "Mozilla/5.0"
} else {
    Write-Host "Google Face Landmarker Model already exists."
}

# 3. تنزيل ملفات WASM الخاصة بـ MediaPipe Tasks-Vision v0.10.35 (نسخة Module الحديثة المستخدمة في الـ Workers)
$WasmBaseUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
$WasmFiles = @(
    "vision_wasm_module_internal.js",
    "vision_wasm_module_internal.wasm"
)

foreach ($file in $WasmFiles) {
    $filePath = "$WasmDir\$file"
    if (!(Test-Path $filePath)) {
        $fileUrl = "$WasmBaseUrl/$file"
        Write-Host "Downloading $file..."
        Invoke-WebRequest -Uri $fileUrl -OutFile $filePath -UserAgent "Mozilla/5.0"
    } else {
        Write-Host "$file already exists."
    }
}

Write-Host "Download complete! Google MediaPipe models and WASM runtimes are now bundled locally."
