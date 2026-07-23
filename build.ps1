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
    Write-Host "ERROR: MODAL_AI_KEY / GRIDO_AI_SECRET_KEY not found in .env or environment." -ForegroundColor Red
    Write-Host "Set it in .env (see .env.example) or as an environment variable before building." -ForegroundColor Yellow
    exit 1
}

$appVersion = (git describe --tags --abbrev=0 2>$null)
if (-not $appVersion) {
    $appVersion = "v1.0.2"
}

$ldflags = "-s -w -X 'grido/internal/service.AppVersion=$appVersion' -X 'grido/internal/service.SupabaseURL=$supabaseUrl' -X 'grido/internal/service.SupabaseAnonKey=$supabaseAnonKey' -X 'grido/internal/service.ModalAIKey=$modalAiKey'"

wails build -nsis -clean -upx -ldflags $ldflags
