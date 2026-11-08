import { auth, db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  increment
} from "firebase/firestore";
import { AirShareFile, AirShareFolder, AirShareShare, AirShareUser } from "./types";

const WORKER_URL = (
  process.env.NEXT_PUBLIC_WORKER_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  "https://airshare-storage.ashikkhaninc.workers.dev"
).replace(/\/$/, "");

export function detectFileType(mime: string = "", name: string = ""): AirShareFile["fileType"] {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const m = mime.toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext)) {
    return "image";
  }
  if (m.startsWith("video/") || ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"].includes(ext)) {
    return "video";
  }
  if (m.startsWith("audio/") || ["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"].includes(ext)) {
    return "audio";
  }
  if (ext === "pdf" || m.includes("pdf")) {
    return "pdf";
  }
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext)) {
    return "office";
  }
  if (["txt", "log", "md", "json", "js", "ts", "py", "html", "css", "sql"].includes(ext)) {
    return "text";
  }
  return "other";
}

export const api = {
  // ─────────────────────────────────────────────────────────────
  // USER PROFILE
  // ─────────────────────────────────────────────────────────────
  async syncUser(): Promise<{ user: AirShareUser } | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const now = Date.now();
    if (snap.exists()) {
      await updateDoc(userRef, {
        displayName: user.displayName || "User",
        photoURL: user.photoURL || "",
        lastLoginAt: now,
      });
      return { user: { ...snap.data(), lastLoginAt: now } as AirShareUser };
    } else {
      const newUser: AirShareUser = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "User",
        photoURL: user.photoURL || "",
        storageUsedBytes: 0,
        createdAt: now,
        lastLoginAt: now,
      };
      await setDoc(userRef, newUser);
      return { user: newUser };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // FOLDERS
  // ─────────────────────────────────────────────────────────────
  async listFolders(parentFolderId: string | null = null): Promise<AirShareFolder[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
      collection(db, "folders"),
      where("ownerUid", "==", user.uid),
      where("isTrash", "==", false),
      where("parentFolderId", "==", parentFolderId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as AirShareFolder);
  },

  async createFolder(name: string, parentFolderId: string | null = null): Promise<AirShareFolder> {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const folderId = crypto.randomUUID();
    const now = Date.now();

    let path = `/${name}`;
    if (parentFolderId) {
      const parentDoc = await getDoc(doc(db, "folders", parentFolderId));
      if (parentDoc.exists()) {
        path = `${parentDoc.data().path || ""}/${name}`;
      }
    }

    const folderData: AirShareFolder = {
      id: folderId,
      name,
      parentFolderId,
      ownerUid: user.uid,
      path,
      isStarred: false,
      isTrash: false,
      deletedAt: null,
      deletedByUid: null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, "folders", folderId), folderData);
    return folderData;
  },

  async updateFolder(folderId: string, updates: Partial<AirShareFolder>) {
    const folderRef = doc(db, "folders", folderId);
    await updateDoc(folderRef, {
      ...updates,
      updatedAt: Date.now(),
    });
    return { status: "success" };
  },

  async trashFolder(folderId: string) {
    const user = auth.currentUser;
    const folderRef = doc(db, "folders", folderId);
    await updateDoc(folderRef, {
      isTrash: true,
      deletedAt: Date.now(),
      deletedByUid: user?.uid || null,
      updatedAt: Date.now(),
    });
    return { status: "success" };
  },

  async getFolderPreviewToken(folderId: string): Promise<string> {
    return folderId;
  },

  getFolderZipUrl(folderId: string, token?: string): string {
    return `${WORKER_URL}/api/stream/${folderId}`;
  },

  // ─────────────────────────────────────────────────────────────
  // FILES
  // ─────────────────────────────────────────────────────────────
  async listFiles(folderId: string | null = null, starred?: boolean): Promise<AirShareFile[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const constraints = [
      where("ownerUid", "==", user.uid),
      where("isTrash", "==", false),
    ];

    if (folderId !== null && folderId !== undefined) {
      constraints.push(where("folderId", "==", folderId));
    }
    if (starred !== undefined) {
      constraints.push(where("isStarred", "==", starred));
    }

    const q = query(collection(db, "files"), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as AirShareFile);
  },

  async getRecentFiles(): Promise<AirShareFile[]> {
    const files = await this.listFiles(null);
    return files.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async initFileUpload(payload: {
    name: string;
    totalSizeBytes: number;
    folderId: string | null;
    mimeType?: string;
  }) {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const fileId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = Date.now();
    const ext = (payload.name.split(".").pop() || "").toLowerCase();
    const mime = payload.mimeType || "application/octet-stream";
    const fType = detectFileType(mime, payload.name);

    // 19.5 MB per chunk for safe Telegram Bot API streaming
    const CHUNK_SIZE = 19 * 1024 * 1024;
    const totalChunks = Math.max(1, Math.ceil(payload.totalSizeBytes / CHUNK_SIZE));

    const fileData: AirShareFile = {
      id: fileId,
      name: payload.name,
      extension: ext,
      mimeType: mime,
      fileType: fType,
      totalSizeBytes: payload.totalSizeBytes,
      folderId: payload.folderId,
      ownerUid: user.uid,
      activeVersionId: versionId,
      totalChunks,
      isStarred: false,
      isTrash: false,
      deletedAt: null,
      deletedByUid: null,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      preview: {
        hasThumbnail: false,
        thumbnailMsgId: null,
        thumbnailChannelId: null,
      },
    };

    await setDoc(doc(db, "files", fileId), fileData);

    // Increment user storage
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { storageUsedBytes: increment(payload.totalSizeBytes) }, { merge: true });

    return {
      file: fileData,
      maxChunkSizeBytes: CHUNK_SIZE,
      totalChunks,
    };
  },

  async updateFile(fileId: string, updates: Partial<AirShareFile>) {
    const fileRef = doc(db, "files", fileId);
    await updateDoc(fileRef, {
      ...updates,
      updatedAt: Date.now(),
    });
    return { status: "success" };
  },

  async trashFile(fileId: string) {
    const user = auth.currentUser;
    const fileRef = doc(db, "files", fileId);
    await updateDoc(fileRef, {
      isTrash: true,
      deletedAt: Date.now(),
      deletedByUid: user?.uid || null,
      updatedAt: Date.now(),
    });
    return { status: "success" };
  },

  async getFile(fileId: string): Promise<AirShareFile | null> {
    const snap = await getDoc(doc(db, "files", fileId));
    if (!snap.exists()) return null;
    return snap.data() as AirShareFile;
  },

  async getPreviewToken(fileId: string): Promise<string> {
    return fileId;
  },

  getStreamUrl(fileOrId: AirShareFile | string, token?: string, download: boolean = false): string {
    if (typeof fileOrId === "object" && fileOrId !== null) {
      const file = fileOrId;
      // Multi-chunk files: stream via unified edge concatenation endpoint
      if (file.chunks && file.chunks.length > 1) {
        const sorted = [...file.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
        const chunkIds = sorted.map((c) => c.telegramFileId).filter(Boolean).join(",");
        const params = new URLSearchParams({
          chunks: chunkIds,
          name: file.name,
          mime: file.mimeType || "",
        });
        if (download) params.set("download", "1");
        return `${WORKER_URL}/api/stream-file?${params.toString()}`;
      }

      // Single chunk file
      const tgId = file.telegramFileId || file.chunks?.[0]?.telegramFileId || file.id;
      const params = new URLSearchParams({
        name: file.name,
        mime: file.mimeType || "",
      });
      if (download) params.set("download", "1");
      return `${WORKER_URL}/api/stream/${tgId}?${params.toString()}`;
    }

    // Direct string ID
    return `${WORKER_URL}/api/stream/${fileOrId}${download ? "?download=1" : ""}`;
  },

  async downloadFile(file: AirShareFile, onProgress?: (percent: number) => void): Promise<void> {
    try {
      // 1. Single chunk file download via Blob (guarantees correct filename across origins)
      if (!file.chunks || file.chunks.length <= 1) {
        const tgId = file.telegramFileId || file.chunks?.[0]?.telegramFileId || file.id;
        const streamUrl = `${WORKER_URL}/api/stream/${tgId}?name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType || "")}&download=1`;
        
        onProgress?.(10);
        const res = await fetch(streamUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download file from edge.`);
        
        onProgress?.(70);
        const blob = await res.blob();
        onProgress?.(100);

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        return;
      }

      // 2. Multi-chunk file download with sequential progress & reassembly
      const chunks = [...file.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
      const chunkBlobs: Blob[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const res = await fetch(`${WORKER_URL}/api/stream/${chunk.telegramFileId}?name=${encodeURIComponent(file.name)}`);
        if (!res.ok) throw new Error(`Failed to download part ${i + 1}/${chunks.length}`);
        const blob = await res.blob();
        chunkBlobs.push(blob);
        if (onProgress) {
          onProgress(Math.round(((i + 1) / chunks.length) * 100));
        }
      }

      const fullBlob = new Blob(chunkBlobs, { type: file.mimeType || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(fullBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      console.error("In-browser download error, falling back to direct URL:", err);
      // Fallback to direct window link
      const directUrl = this.getStreamUrl(file, undefined, true);
      const a = document.createElement("a");
      a.href = directUrl;
      a.download = file.name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // TRASH
  // ─────────────────────────────────────────────────────────────
  async getTrash(): Promise<{ files: AirShareFile[]; folders: AirShareFolder[] }> {
    const user = auth.currentUser;
    if (!user) return { files: [], folders: [] };

    const qFiles = query(
      collection(db, "files"),
      where("ownerUid", "==", user.uid),
      where("isTrash", "==", true)
    );
    const qFolders = query(
      collection(db, "folders"),
      where("ownerUid", "==", user.uid),
      where("isTrash", "==", true)
    );

    const [fSnap, foSnap] = await Promise.all([getDocs(qFiles), getDocs(qFolders)]);
    return {
      files: fSnap.docs.map((d) => d.data() as AirShareFile),
      folders: foSnap.docs.map((d) => d.data() as AirShareFolder),
    };
  },

  async restoreItem(targetType: "file" | "folder", targetId: string) {
    const collName = targetType === "file" ? "files" : "folders";
    await updateDoc(doc(db, collName, targetId), {
      isTrash: false,
      deletedAt: null,
      deletedByUid: null,
      updatedAt: Date.now(),
    });
    return { status: "success" };
  },

  async permanentDeleteItem(targetType: "file" | "folder", targetId: string) {
    const collName = targetType === "file" ? "files" : "folders";
    await deleteDoc(doc(db, collName, targetId));
    return { status: "success" };
  },

  // ─────────────────────────────────────────────────────────────
  // SHARES
  // ─────────────────────────────────────────────────────────────
  async createShare(payload: {
    targetType: "file" | "folder";
    targetId: string;
    isPublic: boolean;
    accessLevel: "viewer" | "commenter" | "editor";
    allowDownload: boolean;
    sharedWithEmails?: string[];
  }): Promise<{ share: AirShareShare }> {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const shareId = crypto.randomUUID();
    const shareData: AirShareShare = {
      id: shareId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      ownerUid: user.uid,
      isPublic: payload.isPublic,
      accessLevel: payload.accessLevel,
      allowDownload: payload.allowDownload,
      sharedWithEmails: payload.sharedWithEmails || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, "shares", shareId), shareData);
    return { share: shareData };
  },

  async getSharedWithMe() {
    const user = auth.currentUser;
    if (!user || !user.email) return { files: [], folders: [] };

    const q = query(
      collection(db, "shares"),
      where("sharedWithEmails", "array-contains", user.email)
    );
    const snap = await getDocs(q);
    const shares = snap.docs.map((d) => d.data() as AirShareShare);

    const fileIds = shares.filter((s) => s.targetType === "file").map((s) => s.targetId);
    const folderIds = shares.filter((s) => s.targetType === "folder").map((s) => s.targetId);

    const files: AirShareFile[] = [];
    for (const id of fileIds) {
      const d = await getDoc(doc(db, "files", id));
      if (d.exists()) files.push(d.data() as AirShareFile);
    }

    const folders: AirShareFolder[] = [];
    for (const id of folderIds) {
      const d = await getDoc(doc(db, "folders", id));
      if (d.exists()) folders.push(d.data() as AirShareFolder);
    }

    return { files, folders };
  },
};
