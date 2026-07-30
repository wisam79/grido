# Changelog

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.38] - 2026-07-25

### Fixed
- Canvas filter disappearance flash during element movement resolved by preserving atomic node cache in `image-node.tsx` and `collage-image.tsx`
- Brevo SMTP transactional authentication and email verification integration hardened

## [v1.2.11] - 2026-07-31

### Security
- Auto-updater verifies the installer's SHA-256 before launch (`grido-checksums.txt` fingerprint served by `/api/version`, fail-closed); `runAsAdmin` split behind build tags for cross-platform compiles
- AI enhance requires sign-in — removed the dead `X-Grido-Api-Key` path; daily quota is now derived server-side from the user's plan (free 5 / pro 15 / enterprise 50)
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
- Gradient angle slider (0–360°) for linear gradients in shape/text properties
- Rulers can toggle between mm and px units (preference persisted via `grido_ruler_unit`)
- `HistoryEntry` type for typed undo/redo history
- Shared `withHiddenOverlays` and `captureStageDataUrl` helpers in `konva-export-utils.ts` — eliminates ~60 lines of duplicated Konva overlay hide/show/cache logic between `export-utils.ts` and `print-dialog.tsx`
- `ErrorBoundary` now wraps `EditorCanvas` to prevent canvas render errors from crashing the entire app
- `ErrUnauthorized` sentinel error in Go backend — replaces fragile `strings.Contains(err.Error(), "401")` with `errors.Is`
- `LICENSE` file (MIT)
- `CHANGELOG.md`

### Fixed
- Event listener leak in `use-bg-removal.ts` — anonymous `beforeunload` handler replaced with named function
- Stale comment in `main.tsx` referencing removed canvas prototype override
- Manual export fallback (`export-image.ts`) now renders gradient fills, shadows, blend modes, vector `path` shapes (viewBox-scaled), image `cornerRadius` clipping, and text stroke/underline/line-through — matching Konva parity
- Collage slots: flip (H/V) and 90° rotate now render in Konva and properties panel; full `flipY` parity for canvas elements
- Ready-made vector shapes (`VECTOR_SHAPES`) now render with correct viewBox scaling
- Undo/redo snapshots now include canvas size, background and collage settings — undo actually restores them
- Magnetic snapping during resize (`boundBoxFunc`), monotonic `nextZIndex()`, unified `grido.log` (lumberjack), autosave now watches grid settings
- Text elements render `textBgColor` in Konva, editing overlay and export
- Print dialog: copies-per-sheet distribution bar (copies, repeat mode, gap, cut marks)
- Background removal runs in a real Web Worker with instant hard-cancel (`terminate`) and measured durations
- Landing page redesigned: dynamic version from `/api/version`, SEO (canonical/og:url/robots/JSON-LD/og-image), pricing + testimonials sections, ARIA tabs, `prefers-reduced-motion`, dead assets/Three.js deps removed, spell check (`الطرق اليدوية`), fonts dedup (Cairo removed, AlYamama once)
- AI background removal: "ModuleFactory not set" regression fixed — WASM glue synced to `@mediapipe/tasks-vision` v0.10.35, `forVisionTasks(base, true)` uses the ESM module loader that registers `globalThis.ModuleFactory`; verified on a real ID photo (49.6% foreground, clean edges)

### Removed
- Dead assets: `esrgan-slim` TFJS models, unused `ai-enhance` Supabase Edge Function, orphan `nunito-v16-latin-regular.woff2` font

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
- AI background removal (`selfie_multiclass` via MediaPipe in Web Worker)
- AI image enhancement (CodeFormer + Real-ESRGAN via Modal)
- High-DPI print sheet generation with cut lines
- Supabase-based licensing and authentication
- Offline Arabic font bundle (12 woff2 families)
- Custom collage templates
- Undo/redo history (capped at 30 entries)
- Autosave with `requestIdleCallback`
