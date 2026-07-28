$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Grido Studio Local Build & Packaging Workflow" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$envPath = ".env"
$supabaseUrl = ""
$supabaseAnonKey = ""
$modalAiKey = ""

if (Test-Path $envPath) {
    foreach ($line in Get-Content $envPath) {
        if ($line -match '^SUPABASE_URL=(.*)$') {
            $supabaseUrl = $matches[1].Trim()
        }
        if ($line -match '^SUPABASE_ANON_KEY=(.*)$') {
            $supabaseAnonKey = $matches[1].Trim()
        }
        if ($line -match '^GRIDO_AI_SECRET_KEY=(.*)$' -or $line -match '^MODAL_AI_KEY=(.*)$') {
            $modalAiKey = $matches[1].Trim()
        }
    }
}

if ($modalAiKey -eq "") {
    $modalAiKey = $env:MODAL_AI_KEY
}
if ($modalAiKey -eq "") {
    $modalAiKey = $env:GRIDO_AI_SECRET_KEY
}

if ($modalAiKey -eq "") {
    Write-Host "ERROR: MODAL_AI_KEY / GRIDO_AI_SECRET_KEY not found in .env or environment." -ForegroundColor Red
    Write-Host "Set it in .env (see .env.example) or as an environment variable before building." -ForegroundColor Yellow
    exit 1
}

Write-Host " [1/3] Generating NSIS installer image assets..." -ForegroundColor Green
$pythonScript = "build/windows/installer/generate_installer_assets.py"
if (Test-Path $pythonScript) {
    try {
        python $pythonScript
    } catch {
        Write-Host "WARNING: Python asset generation skipped or failed. Continuing build." -ForegroundColor Yellow
    }
}

$appVersion = (git describe --tags --abbrev=0 2>$null)
if (-not $appVersion) {
    $appVersion = "v1.2.3"
}

Write-Host " [2/3] Building Wails Desktop App & NSIS Installer ($appVersion)..." -ForegroundColor Green
$ldflags = "-s -w -X grido/internal/service.AppVersion=$appVersion -X grido/internal/service.SupabaseURL=$supabaseUrl -X grido/internal/service.SupabaseAnonKey=$supabaseAnonKey -X grido/internal/service.ModalAIKey=$modalAiKey"

wails build -nsis -clean -ldflags $ldflags

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🎉 Build completed successfully! Executable saved to build\bin\" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
