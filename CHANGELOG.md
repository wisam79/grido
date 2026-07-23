# Changelog

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Removed hardcoded fallback Modal AI key from `license_service.go` and `build.ps1`
- Removed plaintext API key from `opencode.json` (replaced with env var reference)
- Added `opencode.json`, `CodeFormer-temp/`, and `scratch/` to `.gitignore`
- `build.ps1` now fails fast if `MODAL_AI_KEY` is missing instead of falling back to a baked-in secret

### Changed
- Zustand store slices (`core`, `element`, `history`, `license`) are now fully typed — eliminated ~30 `any` usages at the data layer
- All `catch (err: any)` blocks in frontend replaced with `catch (err: unknown)` and proper `instanceof Error` narrowing
- ESLint `@typescript-eslint/no-explicit-any` upgraded from `off` to `warn`
- ESLint `jsx-a11y` plugin enabled for accessibility linting
- `tsconfig.json` now enforces `noImplicitReturns` and `noFallthroughCasesInSwitch`
- Vitest coverage thresholds raised from 29/25% to 40/35%

### Added
- `HistoryEntry` type for typed undo/redo history
- Shared `withHiddenOverlays` and `captureStageDataUrl` helpers in `konva-export-utils.ts` — eliminates ~60 lines of duplicated Konva overlay hide/show/cache logic between `export-utils.ts` and `print-dialog.tsx`
- `ErrorBoundary` now wraps `EditorCanvas` to prevent canvas render errors from crashing the entire app
- `ErrUnauthorized` sentinel error in Go backend — replaces fragile `strings.Contains(err.Error(), "401")` with `errors.Is`
- `LICENSE` file (MIT)
- `CHANGELOG.md`

### Fixed
- Event listener leak in `use-bg-removal.ts` — anonymous `beforeunload` handler replaced with named function
- Stale comment in `main.tsx` referencing removed canvas prototype override

## [v1.0.2] - 2026-07-20

### Added
- Automatic update checker service (`internal/service/updater.go`)
- Secure serverless download proxy for private repo releases (Netlify function)
- App version injected dynamically via ldflags in `build.ps1` and `release.yml`
- NSIS installer generation in GitHub release pipeline

### Changed
- Landing page hero headline rewritten to focus on speed and studio workflow
- AI enhance pipeline secured with per-plan daily quotas via Supabase RPC

### Fixed
- Image upload no longer forces collage mode in free edit mode
- SQLite lock contention between background cleanup and saves
- Master key derivation hardened (no plaintext key file)
- Canvas performance optimizations (FastLayer, batchDraw, rAF throttling)

## [v1.0.0] - 2026-07-11

### Added
- Initial release of Grido Studio
- Collage and single-mode editor with Konva canvas
- AI background removal (RMBG-1.4 via MediaPipe in Web Worker)
- AI image enhancement (CodeFormer + Real-ESRGAN via Modal)
- High-DPI print sheet generation with cut lines
- Supabase-based licensing and authentication
- Offline Arabic font bundle (26 woff2 families)
- Custom collage templates
- Undo/redo history (capped at 20 entries)
- Autosave with `requestIdleCallback`
