
const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';
const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;

/**
 * Compresses an image file to a lower quality JPEG Base64 string.
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Commits an image to the physical storage (Electron) or local state (Browser).
 * Returns the URL (media:// or base64) to be stored in the database.
 */
export const commitImage = async (file: File, maxWidth = 800): Promise<string> => {
    const compressed = await compressImage(file, maxWidth, 0.7);
    
    if (isElectron && ipc) {
        const result = await ipc.invoke('file:save', { base64Data: compressed });
        if (result?.success) {
            return result.url;
        }
        throw new Error(result?.error || "Physical write failed");
    }
    
    // Web fallback (just return base64)
    return compressed;
};
