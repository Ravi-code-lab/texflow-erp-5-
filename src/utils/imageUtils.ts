export async function compressImage(file: File, maxWidthOrHeight: number = 1600, quality: number = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round(height * (maxWidthOrHeight / width));
            width = maxWidthOrHeight;
          } else {
            width = Math.round(width * (maxWidthOrHeight / height));
            height = maxWidthOrHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type || 'image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function commitImage(fileOrUrl: any, maxWidth = 1600): Promise<string> {
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl;
  }
  if (!fileOrUrl) return '';

  const base64 = await compressImage(fileOrUrl, maxWidth, 0.9);
  
  if (typeof window !== 'undefined' && (window as any).process?.type === 'renderer') {
      const ipc = (window as any).require('electron').ipcRenderer;
      try {
          const result = await ipc.invoke('file:save', { base64Data: base64 });
          if (result?.success) return result.url;
      } catch (e) {
          console.error("Failed to commit image to electron", e);
      }
  }
  
  return base64;
}

