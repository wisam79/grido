# download-models.ps1
# تنزيل نماذج جوجل MediaPipe وملفات WASM لتشغيل ميزات عزل الخلفية وتأطير الوجه محلياً 100% بدون إنترنت

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PublicDir = Join-Path $ScriptDir "..\public"
$ModelsDir = Join-Path $PublicDir "models"
$WasmDir = Join-Path $PublicDir "wasm"

if (!(Test-Path $ModelsDir)) {
    New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null
}
if (!(Test-Path $WasmDir)) {
    New-Item -ItemType Directory -Force -Path $WasmDir | Out-Null
}

function Invoke-DownloadWithRetry {
    param(
        [string]$Uri,
        [string]$OutFile,
        [int]$MaxRetries = 3
    )
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UserAgent "Mozilla/5.0" -UseBasicParsing
            # تحقق أساسي: الملف موجود وحجمه > 0
            $size = (Get-Item $OutFile).Length
            if ($size -eq 0) { throw "Downloaded file is empty (0 bytes)" }
            return $true
        } catch {
            Write-Warning "Attempt $attempt/$MaxRetries failed for $Uri : $_"
            if (Test-Path $OutFile) { Remove-Item $OutFile -Force -ErrorAction SilentlyContinue }
            if ($attempt -eq $MaxRetries) { throw "Failed to download $Uri after $MaxRetries attempts: $_" }
            Start-Sleep -Seconds (2 * $attempt)
        }
    }
    return $false
}

# 1. تنزيل نموذج selfie_multiclass.tflite (عزل الخلفية - حوالي 16 ميغابايت)
$SelfieUrl = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
$SelfiePath = "$ModelsDir\selfie_multiclass.tflite"

if (!(Test-Path $SelfiePath)) {
    Write-Host "Downloading Google Selfie Multiclass Model (16MB)..."
    Invoke-DownloadWithRetry -Uri $SelfieUrl -OutFile $SelfiePath
} else {
    Write-Host "Google Selfie Multiclass Model already exists."
}

# 2. تنزيل نموذج face_landmarker.task (تأطير وكشف الوجه - حوالي 3.7 ميغابايت)
$FaceUrl = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
$FacePath = "$ModelsDir\face_landmarker.task"

if (!(Test-Path $FacePath)) {
    Write-Host "Downloading Google Face Landmarker Model (3.7MB)..."
    Invoke-DownloadWithRetry -Uri $FaceUrl -OutFile $FacePath
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
        Invoke-DownloadWithRetry -Uri $fileUrl -OutFile $filePath
    } else {
        Write-Host "$file already exists."
    }
}

Write-Host "Download complete! Google MediaPipe models and WASM runtimes are now bundled locally."
