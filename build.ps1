$envPath = ".env"
$supabaseUrl = ""
$supabaseAnonKey = ""

if (Test-Path $envPath) {
    foreach ($line in Get-Content $envPath) {
        if ($line -match '^SUPABASE_URL=(.*)$') {
            $supabaseUrl = $matches[1].Trim()
        }
        if ($line -match '^SUPABASE_ANON_KEY=(.*)$') {
            $supabaseAnonKey = $matches[1].Trim()
        }
    }
}

$ldflags = "-s -w -X grido/internal/service.SupabaseURL=$supabaseUrl -X grido/internal/service.SupabaseAnonKey=$supabaseAnonKey"

wails build -nsis -clean -upx -ldflags $ldflags
