/**
 * Copies a PNG base64 Data URL directly to clipboard as an Image Blob.
 */
export async function copyPngDataUrlToClipboard(pngDataUrl: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return false;
    }
    const res = await fetch(pngDataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error("Failed to copy image blob to clipboard:", err);
    return false;
  }
}
