export async function commitImage(fileOrUrl: any, ...args: any[]): Promise<string> {
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl;
  }
  return '';
}

export async function compressImage(file: any, ...args: any[]): Promise<any> {
  return file;
}

