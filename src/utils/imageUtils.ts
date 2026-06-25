/**
 * imageUtils.ts
 * Converts uploaded files to base64 data-URLs for durable localStorage persistence.
 * blob: URLs from URL.createObjectURL() are session-only and die on reload.
 */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Resize + convert to base64 JPEG.
 * @param file      File object or existing data-URL string (passed through unchanged)
 * @param maxSize   Max width/height in px (default 600). Larger images are downscaled.
 */
export async function commitImage(
  file: File | string,
  maxSize: number = 600,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _targetEntityId?: string,
): Promise<string> {
  // Already a data-URL or remote URL — pass through unchanged
  if (typeof file === 'string') return file;

  // Convert to base64, then resize via canvas
  const dataUrl = await fileToBase64(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function processImageUpload(file: File): Promise<string> {
  return commitImage(file, 800);
}

export async function compressImage(
  dataUrl: File | string,
  maxSize: number = 600,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quality?: number,
): Promise<string> {
  return commitImage(dataUrl, maxSize);
}
