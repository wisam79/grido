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
    $modalAiKey = "grido_sec_ai_live_8f3d9b4c2e1a70562e84d9c0a1b3f5e76812c9d4a0b6f8e235d7c9a1e4f6b802"
}

$ldflags = "-s -w -X grido/internal/service.SupabaseURL=$supabaseUrl -X grido/internal/service.SupabaseAnonKey=$supabaseAnonKey -X grido/internal/service.ModalAIKey=$modalAiKey"

wails build -nsis -clean -upx -ldflags $ldflags
