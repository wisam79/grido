---
type: fix
scope: build
related_files:
  - .github/workflows/ci.yml:515
  - internal/service/phone_bridge_service.go:36
---

إصلاح سببَي فشل CI على `8d2b9ed`: خطوة تثبيت Wails3 على ويندوز كانت تعمل بـ`shell: powershell` (PowerShell 5.1 يقرأ السكربت بترميز ANSI فيكسر النص العربي: `ParserError: Unexpected token`) — صارت `shell: pwsh` مع رسالة ASCII، و`staticcheck` كان يسقط بـST1005 على رسالتَي جسر الهاتف العربيتين لانتهائهما بنقطة.
