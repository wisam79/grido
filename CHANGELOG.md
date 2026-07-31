# Changelog

All notable changes to Grido Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.2.14] - 2026-07-31

### Fixed & Security
- Modal AI connectivity: URL trailing slash normalization prevents duplicate slashes (`//`) that trigger 404/405 routing errors on Modal endpoints.
- User-Agent header `GridoStudio-Desktop/1.2.14` added to AI HTTP requests to prevent CDN/Cloudflare automated request blocks.
- Extended frontend AI enhance timeout to 120 seconds to accommodate cold-start GPU container boots on Modal AI.
- Added comprehensive unit tests in `ai_service_test.go` covering endpoint connection, payload structure, rate-limit rollback, and HTTP error handling.

## [v1.2.13] - 2026-07-31

### Performance & Changed
- Landing page (`admin-web`): Throttled 3D parallax mockup mousemove and page scroll listeners with `requestAnimationFrame` and state guards to prevent unnecessary React re-renders.
- Cached floating HUD chip DOM references in `AppMockup.tsx` to eliminate layout thrashing during mouse movement.
- Enabled GPU hardware acceleration layers (`will-change: transform`, `translate3d`, `backface-visibility: hidden`) across 3D mockup, aurora glow, and floating chips in `index.css`.
- Unobserved revealed scroll elements in `IntersectionObserver` to reduce browser engine overhead during long page scrolling.

## [v1.2.12] - 2026-07-31

### Fixed
- Drag in free mode now uses logical coordinates (divided by stage scale) so elements track the pointer exactly at any zoom; dropping a photo onto a collage slot uses the same coordinate law, and dragging inside a slot inverts the absolute transform (P0-1 / P1-10 / P1-11)
- Locked elements are excluded from group drag, multi-delete, double-click and context-menu delete (P0-4 / P0-5 / P0-6 / P1-9)
- Undo/redo history seed on project load now contains valid elements only (P0-7); X/Y property fields are guarded to a sane logical range (P0-8)
- Offline license check failure keeps the session instead of locking the user out (P0-2)
- Concurrent background removal from toolbar and properties panel now shares one Worker with a request map instead of clobbering callbacks (P0-12)
- Daily AI quota counter uses a unified `sv-SE` date stamp so it resets correctly at midnight UTC+3 (P0-11)
- Alt+drag reset restores the original position on blur/visibility change with proper listener cleanup (P0-9); Ctrl/Cmd+wheel no longer double-zooms over slots (P0-10)
- Print dialog: preview iframe removed via `afterprint` with a 60s safety timeout (P1-2), Enter ignored inside input/select fields (P1-7), stale captured preview cleared on close (P1-6), last non-zero margin restored when re-enabling margins (P1-3), copy count formula accounts for the gap (P1-4), cut marks aligned on a centered origin in both preview and export (P1-5)
- Export: mirrored edge/corner bleed strips drawn inside the bleed area (P1-14); more accurate file-size estimate with a "(تقريبي)" label (P1-15)
- Replacing or cropping a photo now surfaces clear error toasts (P1-8)
- Text editing overlay uses box-shadow instead of border/padding so the editor overlays the text exactly (P2-3); Escape now commits the typed text like blur does — no more silent data loss (P2-4)
- Context menu re-measures when its content changes while open (P2-9); zero-size crop shows "حدد منطقة قص صالحة" (P2-8)
- Account/license modal re-derives the initial tab on every open (P2-11)
- Canvas dimensions: DPI changes recompute from store values rather than partial fields, and mm inputs are capped at 2000 (P2-15)
- Collage template switch now asks for confirmation when it would drop existing photos or clear free-mode elements (P2-14)

### Changed
- Multi-select properties broadcast style keys to all selected elements; positional keys (x/y/locked) apply only to the displayed element (P1-17)
- Multi-select alignment aligns to the group's bounding box (P1-18)
- Ruler cursor markers are re-queried every rAF frame instead of cached refs (P1-12)
- Replacing a slot image with a different aspect ratio resets drag/zoom while keeping flip/rotation (P1-13)
- Quick bar shows the PRO/AI badge on background removal while the free tier keeps 5 AI enhances/day (P1-16)

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
