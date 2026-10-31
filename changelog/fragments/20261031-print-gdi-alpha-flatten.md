---
type: fix
scope: print
related_files:
  - internal/service/printer_gdi_windows.go:190
  - internal/service/printer_gdi_windows_test.go:173
---
تسطيح الشفافية على الأبيض في تحويل DIB لمسار GDI المباشر: BI_RGB يتجاهل قناة الألفا فكان البكسل الشفاف كلياً يُطبع أسوداً (RGB=0 في المخزن) وشبه الشفاف أغمق من أصله — الآن يُدمج كل بكسل a<255 فوق أبيض الورقة بنفس معادلة مسار CMYK في المسارات الثلاثة (RGBA المضروب مسبقاً وNRGBA والاحتياطي العام).
