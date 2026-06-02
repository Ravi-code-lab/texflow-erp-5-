/**
 * Google Drive integration — not yet implemented.
 * This stub exports the expected interface so any future import won't crash.
 */
export async function uploadFileToDrive(_file: File, _folderId?: string): Promise<string | null> {
  console.warn('[googleDriveService] Google Drive integration is not configured.');
  return null;
}

export async function listDriveFiles(_folderId?: string): Promise<any[]> {
  console.warn('[googleDriveService] Google Drive integration is not configured.');
  return [];
}
