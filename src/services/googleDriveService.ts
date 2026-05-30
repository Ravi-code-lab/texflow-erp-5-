
// Only declare google for Identity Services (Auth)
declare const google: any;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'texflow_erp_db.json';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';

let tokenClient: any;
let accessToken: string | null = null;
let gisInited = false;

// We only need Client ID for Auth. API Key is not strictly needed for Drive REST calls with Bearer token,
// but kept in signature for compatibility.
export const initGoogleDrive = async (apiKey: string, clientId: string, callback: (success: boolean) => void) => {
  if (!clientId) {
    console.error("Client ID missing");
    callback(false);
    return;
  }

  // Wait for Google Script to load
  const checkGoogle = setInterval(() => {
    if (typeof google !== 'undefined' && google.accounts) {
      clearInterval(checkGoogle);
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error) {
              console.error("Auth Error:", resp);
              return;
            }
            accessToken = resp.access_token;
          },
        });
        gisInited = true;
        callback(true);
      } catch (error) {
        console.error("GIS Init Error", error);
        callback(false);
      }
    }
  }, 100);

  // Timeout fallback
  setTimeout(() => {
    if (!gisInited) {
      clearInterval(checkGoogle);
      console.error("Google Scripts timed out.");
      callback(false);
    }
  }, 10000);
};

export const signInToGoogle = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        reject(new Error("Token Client not initialized"));
        return;
      }

      // Override callback to capture the promise resolution for this specific sign-in attempt
      tokenClient.callback = (resp: any) => {
        if (resp.error) {
          reject(resp);
        } else {
          accessToken = resp.access_token;
          resolve(resp);
        }
      };

      // Request token
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
};

// --- Helper: Direct REST API Calls (No GAPI) ---

const findBackupFile = async (): Promise<string | null> => {
  if (!accessToken) throw new Error("Not authenticated");

  try {
    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const response = await fetch(`${FILES_URL}?q=${query}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) throw new Error(`Drive List Error: ${response.statusText}`);
    
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error("Error finding file", err);
    throw err;
  }
};

export const uploadBackup = async (data: any): Promise<void> => {
  if (!accessToken) throw new Error("Not authenticated");

  const fileContent = JSON.stringify(data, null, 2);
  const fileId = await findBackupFile();

  const file = new Blob([fileContent], { type: 'application/json' });
  const metadata = {
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let url = UPLOAD_URL;
  let method = 'POST';

  if (fileId) {
    // Update existing file
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method: method,
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upload Failed: ${errText}`);
  }
};

export const downloadBackup = async (): Promise<any> => {
  if (!accessToken) throw new Error("Not authenticated");

  const fileId = await findBackupFile();
  if (!fileId) {
    throw new Error("No backup file found on Drive.");
  }

  const response = await fetch(`${FILES_URL}/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) throw new Error("Download failed");

  return await response.json();
};
