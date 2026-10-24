#!/usr/bin/env python3
"""توليد fixtures توسيمات EXIF 1-8 لماسح المستندات — المرحلة 0 من خطة الترحيل.

docs/plans/neural-scanner-warp-migration-spec.md (§5.2 — توازي EXIF):
8 صور JPEG اصطناعية بتوسيمات EXIF كاملة، نمطها البصري (ربع أحمر أعلى-يسار
وربع أخضر أسفل-يمين + تدرجات) يجعل أي خطأ في تطبيق الاتجاه يظهر بكسلياً
فوراً عند مقارنة مخرج Go مع سلوك createImageBitmap({imageOrientation:'from-image'}).

التشغيل: python scripts/generate-scanner-exif-fixtures.py
المخرجات: internal/service/testdata/scanner_warp/exif/orientation_{1..8}.jpg
"""

from pathlib import Path

from PIL import Image

W, H = 64, 48
OUT_DIR = Path(__file__).resolve().parents[1] / "internal" / "service" / "testdata" / "scanner_warp" / "exif"


def build_image() -> Image.Image:
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            r, g, b = 40 + x * 3, 30 + y * 4, 200 - ((x + y) // 2)
            if x < W // 4 and y < H // 4:
                r, g, b = 255, 0, 0
            if x >= (W * 3) // 4 and y >= (H * 3) // 4:
                r, g, b = 0, 255, 0
            px[x, y] = (r, g, b)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for orientation in range(1, 9):
        img = build_image()
        exif = Image.Exif()
        exif[0x0112] = orientation  # Orientation tag
        path = OUT_DIR / f"orientation_{orientation}.jpg"
        img.save(path, "JPEG", quality=95, exif=exif)
        print(f"wrote {path} (orientation={orientation}, {path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
