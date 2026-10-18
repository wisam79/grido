/**
 * أدوات تحويل عامة بين Canvas/Blob/Data URL — مشتركة بين الماسح والملصقات.
 * المسار المفضّل دائماً Blob ثنائي؛ Data URL محصور عند حدود API قديمة فقط.
 */

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded = ''] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** يحوّل Blob إلى Data URL عند حدود API قديمة فقط (الحافظة/التوافق). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read Blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

/** يعتمد Canvas.toBlob ويتراجع إلى المسار الحرفي عبر toDataURL في المتصفحات القديمة. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob> {
  if (typeof canvas.toBlob !== 'function') {
    return Promise.resolve(dataUrlToBlob(canvas.toDataURL(type, quality)));
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas produced an empty Blob'));
      },
      type,
      quality,
    );
  });
}
