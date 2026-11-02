import { getFirebaseIdToken } from "./firebase";
import { AirShareFile, AirShareFolder, AirShareShare } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getFirebaseIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok && response.status === 401) {
    // Optionally trigger auth refresh
    console.error("Unauthorized request to Cloud Run backend");
  }

  return response;
}

export const api = {
  // User Profile
  async syncUser() {
    const res = await fetchWithAuth("/users/sync", { method: "POST" });
    if (!res.ok) throw new Error("Failed to sync user profile");
    return res.json();
  },

  // Folders
  async listFolders(parentFolderId: string | null = null): Promise<AirShareFolder[]> {
    const query = parentFolderId ? `?parent_folder_id=${encodeURIComponent(parentFolderId)}` : "";
    const res = await fetchWithAuth(`/folders${query}`);
    if (!res.ok) throw new Error("Failed to fetch folders");
    const data = await res.json();
    return data.folders;
  },

  async createFolder(name: string, parentFolderId: string | null = null): Promise<AirShareFolder> {
    const res = await fetchWithAuth("/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentFolderId }),
    });
    if (!res.ok) throw new Error("Failed to create folder");
    const data = await res.json();
    return data.folder;
  },

  async updateFolder(folderId: string, updates: Partial<AirShareFolder>) {
    const res = await fetchWithAuth(`/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async trashFolder(folderId: string) {
    const res = await fetchWithAuth(`/folders/${folderId}`, { method: "DELETE" });
    return res.json();
  },

  async getFolderPreviewToken(folderId: string): Promise<string> {
    const res = await fetchWithAuth(`/folders/${folderId}/preview-token`);
    if (!res.ok) throw new Error("Failed to get folder token");
    const data = await res.json();
    return data.token;
  },

  getFolderZipUrl(folderId: string, token?: string): string {
    const url = new URL(`${API_BASE_URL}/folders/${folderId}/zip`);
    if (token) url.searchParams.append("token", token);
    return url.toString();
  },

  // Files
  async listFiles(folderId: string | null = null, starred?: boolean): Promise<AirShareFile[]> {
    const params = new URLSearchParams();
    if (folderId) params.append("folder_id", folderId);
    if (starred !== undefined) params.append("starred", String(starred));

    const res = await fetchWithAuth(`/files?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch files");
    const data = await res.json();
    return data.files;
  },

  async initFileUpload(payload: {
    name: string;
    totalSizeBytes: number;
    folderId: string | null;
    mimeType?: string;
  }) {
    const res = await fetchWithAuth("/files/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to initialize file upload");
    return res.json();
  },

  async updateFile(fileId: string, updates: Partial<AirShareFile>) {
    const res = await fetchWithAuth(`/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async trashFile(fileId: string) {
    const res = await fetchWithAuth(`/files/${fileId}`, { method: "DELETE" });
    return res.json();
  },

  async getPreviewToken(fileId: string): Promise<string> {
    try {
      const res = await fetchWithAuth(`/files/${fileId}/preview-token`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) return data.token;
      }
    } catch (e) {
      console.warn("getPreviewToken endpoint failed, falling back to Firebase token", e);
    }
    const token = await getFirebaseIdToken();
    return token || "";
  },

  getStreamUrl(fileId: string, token?: string, download: boolean = false): string {
    const url = new URL(`${API_BASE_URL}/files/${fileId}/stream`);
    if (token) url.searchParams.append("token", token);
    if (download) url.searchParams.append("download", "true");
    return url.toString();
  },

  // Trash
  async getTrash() {
    const res = await fetchWithAuth("/trash");
    if (!res.ok) throw new Error("Failed to fetch trash");
    return res.json();
  },

  async restoreItem(targetType: "file" | "folder", targetId: string) {
    const res = await fetchWithAuth(`/trash/restore/${targetType}/${targetId}`, { method: "POST" });
    return res.json();
  },

  async permanentDeleteItem(targetType: "file" | "folder", targetId: string) {
    const res = await fetchWithAuth(`/trash/permanent/${targetType}/${targetId}`, { method: "DELETE" });
    return res.json();
  },

  // Shares
  async createShare(payload: {
    targetType: "file" | "folder";
    targetId: string;
    isPublic: boolean;
    accessLevel: "viewer" | "commenter" | "editor";
    allowDownload: boolean;
    sharedWithEmails?: string[];
  }): Promise<{ share: AirShareShare }> {
    const res = await fetchWithAuth("/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create share");
    return res.json();
  },

  async getSharedWithMe() {
    const res = await fetchWithAuth("/shares/shared-with-me");
    if (!res.ok) throw new Error("Failed to fetch shared items");
    return res.json();
  },
};
