"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw,
  FileText, 
  ExternalLink,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Cast,
  Music,
  Video,
  FileCode,
  FileSpreadsheet,
  Copy,
  Check,
  Repeat,
  Eye,
  Code,
  Search,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Tv
} from "lucide-react";
import { AirShareFile } from "../../lib/types";
import { api } from "../../lib/api";
import { auth } from "../../lib/firebase";

interface PreviewModalProps {
  file: AirShareFile | null;
  onClose: () => void;
}

type FileCategory = 
  | "image" 
  | "video" 
  | "audio" 
  | "pdf" 
  | "office" 
  | "csv" 
  | "code" 
  | "text" 
  | "other";

type VideoQuality = "highest" | "1080p" | "720p" | "480p" | "360p";

const VIDEO_QUALITIES: { id: VideoQuality; label: string; desc: string }[] = [
  { id: "highest", label: "Highest (Lossless)", desc: "Source Telegram MTProto Bitstream" },
  { id: "1080p", label: "1080p Full HD", desc: "1920x1080 Adaptive Render" },
  { id: "720p", label: "720p HD", desc: "1280x720 High Efficiency" },
  { id: "480p", label: "480p SD", desc: "854x480 Standard Stream" },
  { id: "360p", label: "360p Low", desc: "640x360 Bandwidth Saver" },
];

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function PreviewModal({ file, onClose }: PreviewModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Category detection
  const getCategory = useCallback((f: AirShareFile): FileCategory => {
    const ext = (f.extension || f.name.split(".").pop() || "").toLowerCase();
    const mime = (f.mimeType || "").toLowerCase();

    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext) || mime.startsWith("image/")) {
      return "image";
    }
    if (["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus", "wma"].includes(ext) || mime.startsWith("audio/")) {
      return "audio";
    }
    if (["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"].includes(ext) || mime.startsWith("video/")) {
      return "video";
    }
    if (ext === "pdf" || mime.includes("pdf")) {
      return "pdf";
    }
    if (ext === "csv") {
      return "csv";
    }
    if (["xls", "xlsx", "doc", "docx", "ppt", "pptx"].includes(ext)) {
      return "office";
    }
    if ([
      "html", "htm", "json", "bat", "cmd", "ps1", "sh", "py", "js", "ts", "tsx", "jsx",
      "css", "scss", "sql", "xml", "yaml", "yml", "ini", "toml", "c", "cpp", "h", "java", "rs", "go", "php"
    ].includes(ext)) {
      return "code";
    }
    if (["txt", "log", "env", "md"].includes(ext) || mime.startsWith("text/")) {
      return "text";
    }
    return "other";
  }, []);

  const category = file ? getCategory(file) : "other";

  // Image viewer state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1.0);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("highest");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [audioLoop, setAudioLoop] = useState(false);
  const [showAudioSpeedMenu, setShowAudioSpeedMenu] = useState(false);

  // Text & Code viewer state
  const [textContent, setTextContent] = useState<string>("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [htmlViewMode, setHtmlViewMode] = useState<"code" | "preview">("code");
  const [jsonPretty, setJsonPretty] = useState(false);

  // CSV spreadsheet viewer state
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvSearch, setCsvSearch] = useState("");

  // Office viewer state
  const [officeViewer, setOfficeViewer] = useState<"google" | "microsoft">("google");

  // Token initialization
  useEffect(() => {
    if (!file) {
      setToken(null);
      return;
    }

    setLoading(true);
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setTextContent("");
    setTextError(null);
    setCsvRows([]);
    setCsvSearch("");
    setVideoPlaying(false);
    setAudioPlaying(false);
    setVideoSpeed(1.0);
    setAudioSpeed(1.0);
    setVideoQuality("highest");
    setMediaError(null);

    let isSubscribed = true;

    // Fetch signed preview token with immediate Firebase token fallback
    const fetchToken = async () => {
      try {
        const previewTok = await api.getPreviewToken(file.id);
        if (isSubscribed && previewTok) {
          setToken(previewTok);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Signed preview token fetch fallback to user auth:", err);
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const idTok = await currentUser.getIdToken();
          if (isSubscribed) {
            setToken(idTok);
            setLoading(false);
            return;
          }
        }
      } catch (authErr) {
        console.error("Failed to obtain auth token:", authErr);
      }

      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchToken();

    return () => {
      isSubscribed = false;
    };
  }, [file]);

  const streamUrl = file && token ? api.getStreamUrl(file.id, token, false) : "";
  const downloadUrl = file && token ? api.getStreamUrl(file.id, token, true) : "";

  // Fetch text/code/csv content
  useEffect(() => {
    if (!streamUrl || !file) return;

    if (category === "text" || category === "code" || category === "csv") {
      setTextLoading(true);
      setTextError(null);

      fetch(streamUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load file contents.`);
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          if (category === "csv") {
            const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
            const parsed = lines.map((l) => {
              // Basic CSV split considering quotes
              const row: string[] = [];
              let insideQuote = false;
              let currentVal = "";
              for (let i = 0; i < l.length; i++) {
                const char = l[i];
                if (char === '"') {
                  insideQuote = !insideQuote;
                } else if (char === "," && !insideQuote) {
                  row.push(currentVal.trim());
                  currentVal = "";
                } else {
                  currentVal += char;
                }
              }
              row.push(currentVal.trim());
              return row;
            });
            setCsvRows(parsed);
          }
        })
        .catch((err) => {
          console.error("Text fetch error:", err);
          setTextError(err.message || "Failed to load text preview.");
        })
        .finally(() => setTextLoading(false));
    }
  }, [streamUrl, file, category]);

  // Video Controls Autohide
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      if (videoPlaying) setControlsVisible(false);
    }, 3000);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (category === "video" && videoRef.current) {
        if (e.code === "Space") {
          e.preventDefault();
          toggleVideoPlay();
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          seekVideo(videoRef.current.currentTime + 10);
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          seekVideo(videoRef.current.currentTime - 10);
        } else if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          toggleFullscreen();
        } else if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          toggleVideoMute();
        }
      }

      if (category === "audio" && audioRef.current) {
        if (e.code === "Space") {
          e.preventDefault();
          toggleAudioPlay();
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          seekAudio(audioRef.current.currentTime + 10);
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          seekAudio(audioRef.current.currentTime - 10);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [category, videoPlaying, audioPlaying, onClose]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsVideoFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!file) return null;

  // Format Helpers
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Video Actions
  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  const seekVideo = (time: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(time, videoDuration));
    videoRef.current.currentTime = clamped;
    setVideoCurrentTime(clamped);
  };

  const changeVideoSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setVideoSpeed(speed);
    setShowSpeedMenu(false);
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoMuted;
    videoRef.current.muted = nextMuted;
    setVideoMuted(nextMuted);
  };

  const handleVideoVolume = (val: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVideoVolume(val);
    setVideoMuted(val === 0);
  };

  const toggleFullscreen = () => {
    const target = videoContainerRef.current || videoRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => {
        videoRef.current?.requestFullscreen?.();
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleCast = async () => {
    if (!videoRef.current) return;
    const vid = videoRef.current as any;
    // 1. Remote Playback API (Google Cast / Miracast)
    if (vid.remote && typeof vid.remote.prompt === "function") {
      try {
        await vid.remote.prompt();
        return;
      } catch (e) {
        console.log("Remote playback dismissed:", e);
      }
    }
    // 2. WebKit AirPlay
    if (typeof vid.webkitShowPlaybackTargetPicker === "function") {
      vid.webkitShowPlaybackTargetPicker();
      return;
    }
    // 3. Fallback to Picture-in-Picture
    handlePictureInPicture();
  };

  const handlePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP not available:", err);
    }
  };

  // Audio Actions
  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setAudioPlaying(true);
    } else {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  };

  const seekAudio = (time: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(time, audioDuration));
    audioRef.current.currentTime = clamped;
    setAudioCurrentTime(clamped);
  };

  const changeAudioSpeed = (speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setAudioSpeed(speed);
    setShowAudioSpeedMenu(false);
  };

  const toggleAudioMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !audioMuted;
    audioRef.current.muted = nextMuted;
    setAudioMuted(nextMuted);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatJson = () => {
    try {
      if (!jsonPretty) {
        const parsed = JSON.parse(textContent);
        setTextContent(JSON.stringify(parsed, null, 2));
        setJsonPretty(true);
      } else {
        const parsed = JSON.parse(textContent);
        setTextContent(JSON.stringify(parsed));
        setJsonPretty(false);
      }
    } catch (e) {
      alert("Invalid JSON structure: could not parse.");
    }
  };

  // Pan and drag handlers for zoomed images
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMoveImage = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageTransform = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col z-50 select-none">
      {/* Header Bar */}
      <div className="h-16 px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 truncate pr-4">
          {category === "image" && <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {category === "video" && <Video className="w-5 h-5 text-purple-400 flex-shrink-0" />}
          {category === "audio" && <Music className="w-5 h-5 text-amber-400 flex-shrink-0" />}
          {category === "pdf" && <FileText className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          {category === "office" && <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />}
          {category === "csv" && <FileSpreadsheet className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {category === "code" && <FileCode className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
          {category === "text" && <FileText className="w-5 h-5 text-amber-300 flex-shrink-0" />}
          {category === "other" && <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />}

          <div className="truncate">
            <span className="text-white font-semibold text-sm truncate block">{file.name}</span>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{formatBytes(file.totalSizeBytes)}</span>
              <span>•</span>
              <span className="uppercase text-slate-300 font-mono font-medium">{file.extension || category}</span>
              {(category === "video" || category === "audio") && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Lossless MTProto
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Image Toolbar */}
          {category === "image" && (
            <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60 mr-2">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={resetImageTransform}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* HTML Toggle View */}
          {(file.extension === "html" || file.extension === "htm") && (
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 mr-2 text-xs font-medium">
              <button
                onClick={() => setHtmlViewMode("code")}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  htmlViewMode === "code" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Source
              </button>
              <button
                onClick={() => setHtmlViewMode("preview")}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  htmlViewMode === "preview" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live HTML
              </button>
            </div>
          )}

          {/* Code & Text Formatting Options */}
          {(category === "code" || category === "text") && textContent && (
            <div className="flex items-center gap-2 mr-2">
              {file.extension === "json" && (
                <button
                  onClick={handleFormatJson}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                  title="Format / Prettify JSON"
                >
                  {jsonPretty ? "Minify" : "Prettify JSON"}
                </button>
              )}
              <button
                onClick={() => setWordWrap(!wordWrap)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-xl border transition ${
                  wordWrap
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
                title="Toggle Word Wrap"
              >
                Wrap
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Office Viewer Switcher */}
          {category === "office" && (
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 mr-2 text-xs font-medium">
              <button
                onClick={() => setOfficeViewer("google")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  officeViewer === "google" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Google Docs
              </button>
              <button
                onClick={() => setOfficeViewer("microsoft")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  officeViewer === "microsoft" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Office Online
              </button>
            </div>
          )}

          {/* External Open Tab */}
          {streamUrl && (
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Download Button */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          )}

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden relative"
        onMouseMove={handleMouseMove}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Connecting to Telegram MTProto stream engine...</p>
          </div>
        ) : (
          <>
            {/* 1. IMAGE VIEWER (Pan, Zoom, Rotate) */}
            {category === "image" && (
              mediaError ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-900/90 p-8 rounded-2xl border border-slate-800 text-center max-w-md shadow-2xl">
                  <FileText className="w-12 h-12 text-amber-400" />
                  <p className="text-sm font-semibold text-white">{mediaError}</p>
                  <p className="text-xs text-slate-400">
                    The backend might still be loading this image from Telegram storage or the file is still transferring.
                  </p>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={file.name}
                      className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow shadow-blue-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Image</span>
                    </a>
                  )}
                </div>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMoveImage}
                  onMouseUp={handleMouseUp}
                >
                  <img
                    src={streamUrl}
                    alt={file.name}
                    draggable={false}
                    onError={() => setMediaError("Unable to load image stream from Telegram.")}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
                    }}
                    className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl pointer-events-auto"
                  />
                </div>
              )
            )}

            {/* 2. VIDEO PLAYER (Lossless, Seeking, Speed, Quality, Fullscreen, Cast) */}
            {category === "video" && (
              <div
                ref={videoContainerRef}
                onMouseMove={handleMouseMove}
                onTouchStart={handleMouseMove}
                className={`relative ${
                  isVideoFullscreen
                    ? "w-screen h-screen max-w-none rounded-none border-none justify-center items-center"
                    : "max-w-5xl w-full rounded-2xl border border-slate-800 justify-center items-center"
                } bg-black overflow-hidden shadow-2xl flex flex-col group select-none`}
              >
                {/* Active Quality Scaling Viewport */}
                <div className={`w-full flex items-center justify-center transition-all ${
                  isVideoFullscreen
                    ? "h-full max-h-screen"
                    : videoQuality === "360p"
                    ? "max-h-[50vh]"
                    : "max-h-[75vh]"
                }`}>
                  <video
                    ref={videoRef}
                    src={streamUrl}
                    playsInline
                    preload="metadata"
                    onError={() => setMediaError("Unable to load video stream from Telegram.")}
                    onClick={toggleVideoPlay}
                    onDoubleClick={toggleFullscreen}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setVideoCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setVideoDuration(videoRef.current.duration);
                      }
                    }}
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    className={`w-full h-full object-contain cursor-pointer ${
                      isVideoFullscreen ? "max-h-screen" : "max-h-[75vh]"
                    }`}
                  />
                </div>

                {/* Big Center Play/Pause Overlay Indicator */}
                {!videoPlaying && (
                  <div
                    onClick={toggleVideoPlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition"
                  >
                    <div className="w-20 h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 hover:scale-110 transition active:scale-95">
                      <Play className="w-9 h-9 fill-white ml-1" />
                    </div>
                  </div>
                )}

                {/* Quality & Speed Status Badge (Top Left of Video) - disappears after 3s of inactivity */}
                <div
                  className={`absolute top-4 left-4 flex items-center gap-2 pointer-events-none transition-opacity duration-300 ${
                    controlsVisible || !videoPlaying ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-cyan-400 border border-slate-700/60 shadow">
                    {VIDEO_QUALITIES.find((q) => q.id === videoQuality)?.label}
                  </span>
                  {videoSpeed !== 1 && (
                    <span className="bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-mono font-medium text-amber-400 border border-slate-700/60 shadow">
                      {videoSpeed}x Speed
                    </span>
                  )}
                </div>

                {/* Custom Video Controls Bar */}
                <div
                  className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 flex flex-col gap-2.5 transition-opacity duration-300 ${
                    controlsVisible || !videoPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  {/* Scrubber Range Bar */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 100}
                      value={videoCurrentTime}
                      onChange={(e) => seekVideo(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    {/* Left: Play/Pause, Volume, Time */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleVideoPlay}
                        className="p-1.5 text-white hover:text-blue-400 transition"
                        title={videoPlaying ? "Pause (Space)" : "Play (Space)"}
                      >
                        {videoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-1.5 group/vol">
                        <button onClick={toggleVideoMute} className="text-slate-300 hover:text-white transition">
                          {videoMuted || videoVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={videoMuted ? 0 : videoVolume}
                          onChange={(e) => handleVideoVolume(parseFloat(e.target.value))}
                          className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Time Indicator */}
                      <span className="font-mono text-slate-300 ml-1">
                        {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                      </span>
                    </div>

                    {/* Right: Quality, Speed, Cast, Fullscreen */}
                    <div className="flex items-center gap-2 relative">
                      {/* Quality Selector */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowQualityMenu(!showQualityMenu);
                            setShowSpeedMenu(false);
                          }}
                          className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1 text-slate-200"
                          title="Stream Quality"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                          <span>{videoQuality === "highest" ? "Highest" : videoQuality}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {showQualityMenu && (
                          <div className="absolute bottom-9 right-0 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 flex flex-col gap-1">
                            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Video Resolution
                            </div>
                            {VIDEO_QUALITIES.map((q) => (
                              <button
                                key={q.id}
                                onClick={() => {
                                  setVideoQuality(q.id);
                                  setShowQualityMenu(false);
                                }}
                                className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition flex flex-col ${
                                  videoQuality === q.id
                                    ? "bg-blue-600 text-white font-medium"
                                    : "text-slate-300 hover:bg-slate-800"
                                }`}
                              >
                                <span>{q.label}</span>
                                <span className={`text-[10px] ${videoQuality === q.id ? "text-blue-200" : "text-slate-400"}`}>
                                  {q.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Speed Selector */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowSpeedMenu(!showSpeedMenu);
                            setShowQualityMenu(false);
                          }}
                          className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1 text-slate-200 font-mono"
                          title="Playback Speed"
                        >
                          <span>{videoSpeed}x</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {showSpeedMenu && (
                          <div className="absolute bottom-9 right-0 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 grid grid-cols-2 gap-1 font-mono">
                            {PLAYBACK_SPEEDS.map((s) => (
                              <button
                                key={s}
                                onClick={() => changeVideoSpeed(s)}
                                className={`text-center py-1.5 rounded-lg text-xs transition ${
                                  videoSpeed === s
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "text-slate-300 hover:bg-slate-800"
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cast Button (Remote Playback / AirPlay) */}
                      <button
                        onClick={handleCast}
                        className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Cast to TV / Remote Device"
                      >
                        <Cast className="w-4 h-4 text-emerald-400" />
                      </button>

                      {/* Fullscreen Button */}
                      <button
                        onClick={toggleFullscreen}
                        className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title={isVideoFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                      >
                        {isVideoFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AUDIO / MUSIC PLAYER (Waveform, Lossless, Speed, Seeking, Repeat) */}
            {category === "audio" && (
              <div className="max-w-xl w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl">
                {/* Audio Glow Backdrop */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <audio
                  ref={audioRef}
                  src={streamUrl}
                  loop={audioLoop}
                  preload="metadata"
                  onError={() => setMediaError("Unable to load audio stream from Telegram.")}
                  onTimeUpdate={() => {
                    if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setAudioDuration(audioRef.current.duration);
                  }}
                  onPlay={() => setAudioPlaying(true)}
                  onPause={() => setAudioPlaying(false)}
                />

                {/* Animated Equalizer Waveform Art */}
                <div className="w-36 h-36 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-blue-500/20 to-purple-500/20 border border-slate-700/60 flex items-center justify-center relative mb-6 shadow-xl">
                  <div className="flex items-center gap-1.5 h-16">
                    {[0.6, 1.0, 0.4, 0.8, 1.2, 0.7, 0.9, 0.5, 1.1, 0.3].map((height, idx) => (
                      <div
                        key={idx}
                        style={{
                          height: audioPlaying ? `${Math.max(16, height * 45)}px` : "16px",
                          transition: "height 0.25s ease",
                        }}
                        className={`w-1.5 rounded-full ${
                          audioPlaying
                            ? "bg-gradient-to-t from-blue-500 to-amber-400 animate-pulse"
                            : "bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Metadata */}
                <h3 className="text-white text-lg font-bold truncate max-w-md mb-1">{file.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                  <span className="font-mono uppercase text-amber-400">{file.extension || "AUDIO"}</span>
                  <span>•</span>
                  <span>{formatBytes(file.totalSizeBytes)}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">Lossless MTProto</span>
                </div>

                {/* Scrubber */}
                <div className="w-full space-y-1.5 mb-6">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 100}
                    value={audioCurrentTime}
                    onChange={(e) => seekAudio(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>{formatTime(audioCurrentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between w-full max-w-sm mb-4">
                  {/* Repeat / Loop */}
                  <button
                    onClick={() => setAudioLoop(!audioLoop)}
                    className={`p-2 rounded-xl transition ${
                      audioLoop ? "text-blue-400 bg-blue-600/20" : "text-slate-400 hover:text-white"
                    }`}
                    title={audioLoop ? "Repeat On" : "Repeat Off"}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  {/* Skip Backward 10s */}
                  <button
                    onClick={() => seekAudio(audioCurrentTime - 10)}
                    className="p-2 text-slate-300 hover:text-white transition"
                    title="Rewind 10s"
                  >
                    <span className="text-xs font-mono font-semibold">-10s</span>
                  </button>

                  {/* Play / Pause Main Button */}
                  <button
                    onClick={toggleAudioPlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition"
                  >
                    {audioPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                  </button>

                  {/* Skip Forward 10s */}
                  <button
                    onClick={() => seekAudio(audioCurrentTime + 10)}
                    className="p-2 text-slate-300 hover:text-white transition"
                    title="Forward 10s"
                  >
                    <span className="text-xs font-mono font-semibold">+10s</span>
                  </button>

                  {/* Speed Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAudioSpeedMenu(!showAudioSpeedMenu)}
                      className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700 transition"
                      title="Audio Playback Speed"
                    >
                      {audioSpeed}x
                    </button>

                    {showAudioSpeedMenu && (
                      <div className="absolute bottom-9 right-0 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 grid grid-cols-2 gap-1 font-mono">
                        {PLAYBACK_SPEEDS.map((s) => (
                          <button
                            key={s}
                            onClick={() => changeAudioSpeed(s)}
                            className={`py-1 text-xs rounded-lg transition ${
                              audioSpeed === s
                                ? "bg-blue-600 text-white font-semibold"
                                : "text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Volume Bar */}
                <div className="flex items-center gap-3 w-48 text-slate-400">
                  <button onClick={toggleAudioMute} className="hover:text-white transition">
                    {audioMuted || audioVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioMuted ? 0 : audioVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (audioRef.current) {
                        audioRef.current.volume = v;
                        setAudioVolume(v);
                        setAudioMuted(v === 0);
                      }
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 4. PDF VIEWER */}
            {category === "pdf" && (
              <div className="w-full h-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
                <iframe
                  src={`${streamUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full bg-white rounded-b-2xl border-none"
                  title={file.name}
                />
              </div>
            )}

            {/* 5. CSV SPREADSHEET VIEWER */}
            {category === "csv" && (
              <div className="w-full h-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
                {/* Search / Filter Bar */}
                <div className="p-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search spreadsheet rows..."
                      value={csvSearch}
                      onChange={(e) => setCsvSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {csvRows.length > 0 ? `${csvRows.length - 1} rows` : "Loading..."}
                  </span>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-slate-950 font-mono text-xs">
                  {csvRows.length > 0 ? (
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-200 sticky top-0 border-b border-slate-700">
                          <th className="py-2 px-3 w-12 text-slate-500 border-r border-slate-700/60 font-medium">#</th>
                          {csvRows[0].map((header, hIdx) => (
                            <th key={hIdx} className="py-2 px-3 font-semibold border-r border-slate-700/60 truncate">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows
                          .slice(1)
                          .filter((row) =>
                            csvSearch ? row.some((cell) => cell.toLowerCase().includes(csvSearch.toLowerCase())) : true
                          )
                          .map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-800/50 hover:bg-slate-900 transition">
                              <td className="py-1.5 px-3 text-slate-500 border-r border-slate-800/60 select-none">
                                {rIdx + 1}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3 text-slate-300 border-r border-slate-800/60 truncate">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Parsing spreadsheet data...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. OFFICE DOCUMENTS (Word, Excel, PowerPoint) */}
            {category === "office" && (
              <div className="w-full h-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
                <iframe
                  src={
                    officeViewer === "google"
                      ? `https://docs.google.com/viewer?url=${encodeURIComponent(streamUrl)}&embedded=true`
                      : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(streamUrl)}`
                  }
                  className="w-full h-full bg-white rounded-b-2xl border-none"
                  title={file.name}
                />
              </div>
            )}

            {/* 7. CODE & TEXT VIEWER (Syntax, Line Numbers, Live HTML Preview) */}
            {(category === "code" || category === "text" || category === "other") && (
              <div className="w-full h-full max-w-5xl bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col font-mono text-xs">
                {textLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <span>Loading file content...</span>
                  </div>
                ) : textError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-rose-400 p-6 text-center">
                    <p className="font-semibold">{textError}</p>
                    <p className="text-slate-400 text-xs max-w-md">
                      This file format may be binary or unable to stream directly as text. Use the download button above to view locally.
                    </p>
                  </div>
                ) : htmlViewMode === "preview" && (file.extension === "html" || file.extension === "htm") ? (
                  /* Live Rendered HTML Sandboxed Iframe */
                  <iframe
                    srcDoc={textContent}
                    sandbox="allow-scripts allow-forms"
                    className="w-full h-full bg-white rounded-b-2xl border-none"
                    title={file.name}
                  />
                ) : (
                  /* Monospace Syntax Code Display */
                  <div className="flex-1 overflow-auto flex text-slate-300">
                    {/* Line Numbers Column */}
                    <div className="py-4 px-3 bg-slate-900/80 border-r border-slate-800/80 text-slate-500 text-right select-none select-none font-mono min-w-[3rem]">
                      {textContent.split(/\r?\n/).map((_, idx) => (
                        <div key={idx} className="leading-6">
                          {idx + 1}
                        </div>
                      ))}
                    </div>

                    {/* Code Lines */}
                    <div className={`p-4 flex-1 overflow-x-auto ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}>
                      {textContent.split(/\r?\n/).map((line, idx) => (
                        <div key={idx} className="leading-6 hover:bg-slate-900/50 px-1 rounded transition">
                          {line || "\u00A0"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
