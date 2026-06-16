/**
 * googleDriveService.ts
 * Placeholder for Google Drive integration.
 * Implement OAuth2 + Drive API calls here when ready.
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

export async function uploadToDrive(_blob: Blob, _filename: string): Promise<string | null> {
  console.warn('[googleDriveService] Google Drive integration not yet configured.');
  return null;
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  console.warn('[googleDriveService] Google Drive integration not yet configured.');
  return [];
}

export async function downloadFromDrive(_fileId: string): Promise<Blob | null> {
  console.warn('[googleDriveService] Google Drive integration not yet configured.');
  return null;
}
