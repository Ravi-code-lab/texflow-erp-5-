export async function commitImage(file: any, sizeOrDirectory?: any, targetEntityId?: string): Promise<string> {
    if (file instanceof File) return URL.createObjectURL(file);
    return file as string;
}

export async function processImageUpload(file: File): Promise<string> {
    return URL.createObjectURL(file);
}

export async function compressImage(dataUrl: any, sizeOrQuality?: number, quality?: number): Promise<string> {
    if (dataUrl instanceof File) return URL.createObjectURL(dataUrl);
    return dataUrl as string;
}

