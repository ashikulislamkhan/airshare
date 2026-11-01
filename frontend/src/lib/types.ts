export interface AirShareUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  storageUsedBytes: number;
  createdAt: number;
  lastLoginAt: number;
}

export interface AirShareFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  ownerUid: string;
  path: string;
  isStarred: boolean;
  isTrash: boolean;
  deletedAt: number | null;
  deletedByUid: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AirShareFile {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  fileType: "image" | "video" | "audio" | "pdf" | "office" | "text" | "code" | "other";
  totalSizeBytes: number;
  md5Checksum?: string;
  folderId: string | null;
  ownerUid: string;
  activeVersionId: string;
  totalChunks: number;
  isStarred: boolean;
  isTrash: boolean;
  deletedAt: number | null;
  deletedByUid: string | null;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  preview: {
    hasThumbnail: boolean;
    thumbnailMsgId: number | null;
    thumbnailChannelId: number | null;
  };
}

export interface AirShareChunk {
  id: string;
  fileId: string;
  versionId: string;
  chunkIndex: number;
  startByte: number;
  endByte: number;
  sizeBytes: number;
  telegramChannelId: number;
  telegramMessageId: number;
  telegramFileId: number;
  uploadStatus: "pending" | "completed" | "failed";
}

export interface AirShareShare {
  id: string;
  targetType: "file" | "folder";
  targetId: string;
  ownerUid: string;
  isPublic: boolean;
  publicToken?: string | null;
  accessLevel: "viewer" | "commenter" | "editor";
  allowDownload: boolean;
  sharedWithEmails: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UploadTask {
  id: string;
  file: File;
  folderId: string | null;
  progressPercent: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  status: "queued" | "uploading" | "paused" | "completed" | "error";
  errorMessage?: string;
  chunksTotal: number;
  chunksUploaded: number;
}

export interface DownloadTask {
  id: string;
  fileId: string;
  fileName: string;
  totalBytes: number;
  downloadedBytes: number;
  progressPercent: number;
  speedBytesPerSec: number;
  status: "downloading" | "paused" | "completed" | "error";
}
