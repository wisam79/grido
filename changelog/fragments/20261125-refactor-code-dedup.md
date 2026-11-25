---
type: refactor
scope: infra
related_files:
  - internal/service/auth_flows.go:1
  - internal/server/dpi_patch.go:1
  - internal/server/asset_server.go:1
  - frontend/src/lib/templates/grid-utils.ts:1
  - frontend/src/components/editor/document-scanner/core/filters.ts:1
  - frontend/src/components/editor/document-scanner/hooks/use-scanner-detection.ts:1
  - frontend/src/components/editor/properties/element/shared/image-filter-sliders.tsx:45
  - frontend/src/components/editor/properties/panels/image-properties.tsx:126
  - frontend/src/components/editor/properties/slot-properties.tsx:1
  - frontend/src/components/editor/properties/panels/shape-properties.tsx:59
  - frontend/src/components/editor/dialogs/account/account-error-alert.tsx:1
  - frontend/src/lib/phone-bridge-store.ts:1
  - frontend/src/components/editor/system/desktop-menu-bar.tsx:78
  - frontend/src/components/editor/toolbar/toolbar-items.tsx:1
  - frontend/test/toolbar-height-uniformity.test.ts:1
  - frontend/test/toolbar-transfer-to-collage.test.tsx:1
---
تنظيف وإزالة التكرار عبر الباك إند والواجهة: توحيد طلبات Supabase Auth وتقليص `asset_server.go` و`dpi_patch.go` وتوحيد محاذاة `grid-utils.ts` وفلاتر الماسح، واستخراج مكونات `ImageFilterSliders` و`ButtonProgressBar` و`AccountErrorAlert` و`PresetButtonGroup` و`MenuBarDropdown` و`syncPhoneBridgeStatus`، وحذف المكوّن الميت `toolbar-ai-tools.tsx` وتحديث اختباراته دون تغيير السلوك.
