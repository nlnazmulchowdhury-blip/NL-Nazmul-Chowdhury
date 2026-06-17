import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Upload, Download, Loader2, CheckCircle2, XCircle, FileText,
  Image as ImageIcon, QrCode, FileDown, Eraser, Zap, ArrowLeft,
  AlertCircle, Info, Crop, Braces, Shield, Sparkles, Palette,
  PictureInPicture2, Maximize2, ZoomIn, Globe, Frame
} from 'lucide-react';
import { getTool, convertFile } from '../api';
import AdBanner from '../components/AdBanner';
import MyBidAdSlot from '../components/MyBidAdSlot';
import {
  imageToJpg,
  imageToJpgFFmpeg,
  imageToPng,
  imageToWebp,
  resizeImage,
  imageToIcon,
  compressImage,
  cropImage,
  generateQRCode,
  pdfToJpg,
  formatJSON,
  preloadFFmpeg,
  onFFmpegStatusChange,
  getFFmpegStatus,
  preloadPDFjs,
  onPDFjsStatusChange,
  getPDFjsStatus,
} from '../utils/clientConverters';

const toolIcons = {
  'image-to-jpg': ImageIcon,
  'image-to-png': ImageIcon,
  'image-to-webp': Globe,
  'resize-image': Maximize2,
  'image-to-icon': Frame,
  'background-remove': Eraser,
  'compress-image': Zap,
  'qr-generator': QrCode,
  'pdf-to-jpg': FileText,
  'image-cropper': Crop,
  'json-formatter': Braces,
};

export default function ToolPage() {
  const { slug } = useParams();
  const inputRef = useRef(null);
  const lastPreviewUrlRef = useRef(null);

  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [qrText, setQrText] = useState('');
  const [cropWidth, setCropWidth] = useState('');
  const [cropHeight, setCropHeight] = useState('');
  const [selectedAspect, setSelectedAspect] = useState('1:1');
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [resizePercentage, setResizePercentage] = useState('50');
  const [resizeMode, setResizeMode] = useState('percentage'); // 'percentage' | 'dimensions'
  const [jsonInput, setJsonInput] = useState('');
  const [jsonMode, setJsonMode] = useState('format');
  const [formattedOutput, setFormattedOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [resultPreviewUrl, setResultPreviewUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultFilename, setResultFilename] = useState('');
  const [ffmpegStatus, setFfmpegStatus] = useState(getFFmpegStatus());
  const [pdfjsStatus, setPdfjsStatus] = useState(getPDFjsStatus());

  // ─── Rewarded Download state ──────────────────────────────────────
  const [rewardedState, setRewardedState] = useState('none');
  const [adCountdown, setAdCountdown] = useState(30);
  const [isProUser, setIsProUser] = useState(() => localStorage.getItem('proUser') === 'true');

  // ─── Workspace state for background-remove ────────────────────────
  const workspaceRef = useRef(null);
  const [subjectPos, setSubjectPos] = useState({ x: 0, y: 0 });
  const [subjectSize, setSubjectSize] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState(null);
  const dragStartRef = useRef(null);
  const resizeStartRef = useRef(null);
  const subjectSizeRef = useRef(null);

  // Initialize subject position/size when result arrives for background-remove
  useEffect(() => {
    if (slug === 'background-remove' && resultPreviewUrl && result?.meta_data?.width) {
      const origW = result.meta_data.width;
      const origH = result.meta_data.height;
      // Scale to fit within workspace (~60% of 500px canvas)
      const maxDim = 320;
      const scale = Math.min(maxDim / origW, maxDim / origH, 1);
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);
      setSubjectSize({ width: w, height: h });
      subjectSizeRef.current = { width: w, height: h };
      // Center in the 500x500 workspace
      setSubjectPos({ x: 250 - w / 2, y: 250 - h / 2 });
    }
  }, [slug, resultPreviewUrl, result?.meta_data?.width, result?.meta_data?.height]);

  // Global mouse/touch move and up handlers for drag & resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e) => {
      if (isDragging && dragStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.mouseX) / zoomLevel;
        const dy = (e.clientY - dragStartRef.current.mouseY) / zoomLevel;
        const newX = dragStartRef.current.startX + dx;
        const newY = dragStartRef.current.startY + dy;
        // Clamp within workspace
        const ws = workspaceRef.current;
        if (ws) {
          const rect = ws.getBoundingClientRect();
          const wsW = rect.width;
          const wsH = rect.height;
          const sz = subjectSizeRef.current;
          if (sz) {
            setSubjectPos({
              x: Math.max(0, Math.min(newX, wsW - sz.width)),
              y: Math.max(0, Math.min(newY, wsH - sz.height)),
            });
            return;
          }
        }
        setSubjectPos({ x: newX, y: newY });
      }

      if (isResizing && resizeStartRef.current) {
        const dx = (e.clientX - resizeStartRef.current.mouseX) / zoomLevel;
        const dy = (e.clientY - resizeStartRef.current.mouseY) / zoomLevel;
        const handle = activeResizeHandle;
        const startSize = resizeStartRef.current.startSize;
        const startPos = resizeStartRef.current.startPos;
        const aspect = startSize.width / startSize.height;
        let newW = startSize.width;
        let newH = startSize.height;
        let newX = startPos.x;
        let newY = startPos.y;

        if (handle.includes('e')) newW = Math.max(50, startSize.width + dx);
        if (handle.includes('w')) {
          newW = Math.max(50, startSize.width - dx);
          newX = startPos.x + (startSize.width - newW);
        }
        if (handle.includes('s')) newH = Math.max(50, startSize.height + dy);
        if (handle.includes('n')) {
          newH = Math.max(50, startSize.height - dy);
          newY = startPos.y + (startSize.height - newH);
        }

        // Maintain aspect ratio for corner handles
        if (handle.length === 2) {
          // Use the larger dimension change to determine new size
          const ratioDeltaW = Math.abs(newW - startSize.width) / startSize.width;
          const ratioDeltaH = Math.abs(newH - startSize.height) / startSize.height;
          if (ratioDeltaW >= ratioDeltaH) {
            newH = newW / aspect;
          } else {
            newW = newH * aspect;
          }
          if (handle.includes('w')) newX = startPos.x + (startSize.width - newW);
          if (handle.includes('n')) newY = startPos.y + (startSize.height - newH);
        }

        setSubjectSize({ width: Math.round(newW), height: Math.round(newH) });
        subjectSizeRef.current = { width: Math.round(newW), height: Math.round(newH) };
        setSubjectPos({ x: newX, y: newY });
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMouseMove(touch);
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveResizeHandle(null);
      dragStartRef.current = null;
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, activeResizeHandle]);

  // ─── Keyboard shortcuts for workspace (nudge / reset) ────────────
  useEffect(() => {
    // Only register when background-remove workspace is visible
    if (slug !== 'background-remove' || !subjectSize) return;

    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in an input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        // ─── Zoom shortcuts (Ctrl+Plus / Ctrl+Minus / Ctrl+0) ──────
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoomLevel(z => { const n = +(z + 0.25).toFixed(2); return Math.min(3, n); });
          setFitToWindow(false);
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          setZoomLevel(z => { const n = +(z - 0.25).toFixed(2); return Math.max(0.25, n); });
          setFitToWindow(false);
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1.0);
          setFitToWindow(false);
          return;
        }
      }

      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key) && e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'r' && e.key !== 'R') return;

      e.preventDefault();

      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'r' || e.key === 'R') {
        // Reset subject to center of workspace
        const ws = workspaceRef.current;
        if (ws && subjectSizeRef.current) {
          const wsW = ws.offsetWidth;
          const wsH = ws.offsetHeight;
          const sz = subjectSizeRef.current;
          setSubjectPos({
            x: Math.max(0, (wsW - sz.width) / 2),
            y: Math.max(0, (wsH - sz.height) / 2),
          });
        }
        return;
      }

      // Nudge amount: 1px (Shift), 5px (normal), 10px (Ctrl — but Ctrl may conflict with zoom, so skip ctrl for arrows)
      let nudge = e.shiftKey ? 1 : 5;

      setSubjectPos(prev => {
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -nudge;
        if (e.key === 'ArrowDown') dy = nudge;
        if (e.key === 'ArrowLeft') dx = -nudge;
        if (e.key === 'ArrowRight') dx = nudge;

        const ws = workspaceRef.current;
        const sz = subjectSizeRef.current;
        if (ws && sz) {
          const wsW = ws.offsetWidth;
          const wsH = ws.offsetHeight;
          return {
            x: Math.max(0, Math.min(prev.x + dx, wsW - sz.width)),
            y: Math.max(0, Math.min(prev.y + dy, wsH - sz.height)),
          };
        }
        return { x: prev.x + dx, y: prev.y + dy };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slug, !!subjectSize]);

  // ─── Scroll-wheel zoom on the workspace canvas ───────────────────
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el || slug !== 'background-remove' || !subjectSize) return;

    const handleWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      // Zoom by 10% per tick, with finer control for slow scrolling
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(z => {
        const next = +(z + delta).toFixed(2);
        return Math.max(0.25, Math.min(3, next));
      });
      setFitToWindow(false);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [slug, !!subjectSize]);

  const handleDragStart = (e) => {
    e.preventDefault();
    const pos = e.type.startsWith('touch') ? e.touches[0] : e;
    dragStartRef.current = {
      mouseX: pos.clientX,
      mouseY: pos.clientY,
      startX: subjectPos.x,
      startY: subjectPos.y,
    };
    setIsDragging(true);
  };

  const handleResizeStart = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = e.type.startsWith('touch') ? e.touches[0] : e;
    resizeStartRef.current = {
      mouseX: pos.clientX,
      mouseY: pos.clientY,
      startSize: { ...subjectSize },
      startPos: { ...subjectPos },
    };
    setActiveResizeHandle(handle);
    setIsResizing(true);
  };

  // Reset workspace state
  // ─── Workspace background state (solid color / image / AI) ──────
  const [bgType, setBgType] = useState('none'); // 'none' | 'solid' | 'image' | 'ai'
  const [bgColor, setBgColor] = useState('#6366f1');
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const bgImageUrlRef = useRef(null);
  const bgInputRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiGradients, setAiGradients] = useState([]);

  // ─── Zoom state for workspace ─────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [fitToWindow, setFitToWindow] = useState(false);

  // Close color picker & AI panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Extract dominant colors from subject (AI background) ────────
  const extractColorsFromImage = useCallback((imageUrl) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Sample from a grid of points across the image
      const sampleSize = 20;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

      // Quantize colors into buckets
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        // Skip near-black and near-white
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      // Sort by frequency, take top 4
      const sorted = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number);
          return `rgb(${r + 16},${g + 16},${b + 16})`;
        });

      if (sorted.length < 2) {
        // Fallback gradients if we couldn't extract enough colors
        setAiGradients([
          { name: 'Sunset', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
          { name: 'Ocean', gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
          { name: 'Forest', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
          { name: 'Bloom', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        ]);
        return;
      }

      // Generate gradient variations from the extracted colors
      const gradients = [
        { name: 'Extracted 1', gradient: `linear-gradient(135deg, ${sorted[0]} 0%, ${sorted[1] || sorted[0]} 100%)` },
        { name: 'Extracted 2', gradient: `linear-gradient(45deg, ${sorted[0]} 0%, ${sorted[2] || sorted[1]} 100%)` },
        { name: 'Extracted 3', gradient: `linear-gradient(180deg, ${sorted[1]} 0%, ${sorted[3] || sorted[0]} 100%)` },
        { name: 'Extracted 4', gradient: `radial-gradient(circle at 30% 50%, ${sorted[0]} 0%, ${sorted[2] || sorted[1]} 100%)` },
        // Also offer some premium presets as alternatives
        { name: 'Twilight', gradient: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
        { name: 'Warm Glow', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
      ];
      setAiGradients(gradients);
    };
    img.onerror = () => {
      // Fallback
      setAiGradients([
        { name: 'Sunset', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { name: 'Ocean', gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
        { name: 'Bloom', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      ]);
    };
    img.src = imageUrl;
  }, []);

  // Extract colors when AI panel opens
  useEffect(() => {
    if (showAiPanel && resultPreviewUrl && aiGradients.length === 0) {
      extractColorsFromImage(resultPreviewUrl);
    }
  }, [showAiPanel, resultPreviewUrl, aiGradients.length, extractColorsFromImage]);

  // ─── Color presets for solid color picker ─────────────────────────
  const colorPresets = [
    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6',
    '#ff6b6b', '#f06595', '#cc5de8', '#845ef7',
    '#5c7cfa', '#339af0', '#22b8cf', '#20c997',
    '#51cf66', '#94d82d', '#fcc419', '#ff922b',
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#0f172a', '#1e293b', '#334155', '#475569',
  ];

  // ─── Apply background to workspace ────────────────────────────────
  const applyBg = useCallback((type, value) => {
    setBgType(type);
    if (type === 'solid') setBgColor(value);
    if (type === 'image') setBgImageUrl(value);
    if (type === 'ai') setBgImageUrl(value); // Store as CSS background-image
    setShowColorPicker(false);
    setShowAiPanel(false);
  }, []);

  // ─── Handle background image upload ───────────────────────────────
  const handleBgImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous blob URL to avoid memory leak
    if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(bgImageUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    bgImageUrlRef.current = url;
    setBgImageUrl(url);
    setBgType('image');
    e.target.value = '';
  }, []);

  const resetWorkspace = useCallback(() => {
    setSubjectPos({ x: 0, y: 0 });
    setSubjectSize(null);
    setIsDragging(false);
    setIsResizing(false);
    setActiveResizeHandle(null);
    dragStartRef.current = null;
    resizeStartRef.current = null;
    // Revoke background image blob URL
    if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(bgImageUrlRef.current);
      bgImageUrlRef.current = null;
    }
    setBgType('none');
    setBgColor('#6366f1');
    setBgImageUrl(null);
    setShowColorPicker(false);
    setShowAiPanel(false);
    setAiGradients([]);
    setZoomLevel(1.0);
    setFitToWindow(false);
  }, []);

  // Preload FFmpeg.wasm on mount for image-to-jpg
  useEffect(() => {
    if (slug === 'image-to-jpg') {
      const unsub = onFFmpegStatusChange(setFfmpegStatus);
      setFfmpegStatus(getFFmpegStatus());
      preloadFFmpeg();
      return unsub;
    }
  }, [slug]);

  // Preload PDF.js worker on mount for pdf-to-jpg
  useEffect(() => {
    if (slug === 'pdf-to-jpg') {
      const unsub = onPDFjsStatusChange(setPdfjsStatus);
      setPdfjsStatus(getPDFjsStatus());
      preloadPDFjs();
      return unsub;
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setResultPreviewUrl(null);
    setResultBlob(null);

    getTool(slug)
      .then((data) => {
        setTool(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError('Tool not found');
      });
  }, [slug]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
      if (resultPreviewUrl && resultPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resultPreviewUrl);
      }
      if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(bgImageUrlRef.current);
      }
    };
  }, [preview, resultPreviewUrl]);

  // ─── Check for Pro user on mount and storage changes ─────────────
  useEffect(() => {
    const checkPro = () => setIsProUser(localStorage.getItem('proUser') === 'true');
    checkPro();
    window.addEventListener('storage', checkPro);
    return () => window.removeEventListener('storage', checkPro);
  }, []);

  // ─── Ad countdown timer ──────────────────────────────────────────
  useEffect(() => {
    if (rewardedState !== 'watching-ad') return;
    if (adCountdown <= 0) {
      triggerDownloadAfterReward();
      return;
    }
    const timer = setTimeout(() => setAdCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [rewardedState, adCountdown]);

  // ─── Check for Stripe payment return ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      localStorage.setItem('proUser', 'true');
      localStorage.setItem('proEmail', params.get('email') || 'pro@user.com');
      setIsProUser(true);
      window.history.replaceState({}, '', window.location.pathname);
      if (resultBlob) {
        setTimeout(() => triggerDownloadAfterReward(), 500);
      }
    }
  }, []);

  const handleFileChange = useCallback((selectedFile) => {
    if (!selectedFile) return;
    // Revoke previous preview URL
    if (lastPreviewUrlRef.current) {
      URL.revokeObjectURL(lastPreviewUrlRef.current);
      lastPreviewUrlRef.current = null;
    }
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setResultPreviewUrl(null);
    setResultBlob(null);
    setRewardedState('none');
    setAdCountdown(30);

    // For .txt files in QR mode, read the content
    if (slug === 'qr-generator' && selectedFile.type === 'text/plain') {
      selectedFile.text().then((content) => {
        setQrText(content);
      });
    }

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      lastPreviewUrlRef.current = url;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [slug]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  }, [handleFileChange]);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Client-side conversion handler ─────────────────────────────────

  const handleConvert = async () => {
    if (!file && slug !== 'qr-generator' && slug !== 'json-formatter') return;
    setError(null);
    setResult(null);
    setResultPreviewUrl(null);
    setResultBlob(null);
    setConverting(true);

    try {
      let output;

      switch (slug) {
        case 'image-to-jpg': {
          // Try ffmpeg.wasm first, falls back to Canvas API
          output = await imageToJpgFFmpeg(file);
          break;
        }
        case 'image-to-png': {
          output = await imageToPng(file);
          break;
        }
        case 'image-to-webp': {
          output = await imageToWebp(file, 0.8);
          break;
        }
        case 'resize-image': {
          const options = {};
          if (resizePercentage) {
            options.percentage = parseInt(resizePercentage);
          }
          if (resizeWidth) options.width = parseInt(resizeWidth);
          if (resizeHeight) options.height = parseInt(resizeHeight);
          output = await resizeImage(file, options);
          break;
        }
        case 'image-to-icon': {
          output = await imageToIcon(file);
          break;
        }
        case 'compress-image': {
          output = await compressImage(file, 0.7);
          break;
        }
        case 'image-cropper': {
          const options = {};
          if (selectedAspect === 'custom') {
            if (cropWidth) options.width = parseInt(cropWidth);
            if (cropHeight) options.height = parseInt(cropHeight);
          } else {
            options.aspect_ratio = selectedAspect;
          }
          output = await cropImage(file, options);
          break;
        }
        case 'qr-generator': {
          output = await generateQRCode(qrText);
          break;
        }
        case 'pdf-to-jpg': {
          output = await pdfToJpg(file);
          break;
        }
        case 'json-formatter': {
          output = await formatJSON(file, jsonInput, jsonMode, 2);
          setFormattedOutput(output.formattedText || '');
          // For JSON, we don't set resultPreviewUrl since we show formatted text
          setResultBlob(output.blob);
          setResultFilename(output.filename);
          // Set a mock meta for display
          setResult({
            meta_data: output.meta,
            // For JSON no download_url since we handle download separately
          });
          setConverting(false);
          return;
        }
        case 'background-remove': {
          // Use backend AI (rembg) for background removal
          const apiResult = await convertFile('background-remove', file);
          // Fetch the processed image blob from the server
          const imgResponse = await fetch(apiResult.download_url);
          const imgBlob = await imgResponse.blob();
          const objectUrl = URL.createObjectURL(imgBlob);
          setResultPreviewUrl(objectUrl);
          setResultBlob(imgBlob);
          setResultFilename(apiResult.original_filename.replace(/\.[^.]+$/, '') + '_no_bg.png');
          setResult({
            meta_data: apiResult.meta_data,
          });
          // Initialize workspace subject size based on original dimensions
          if (apiResult.meta_data?.width && apiResult.meta_data?.height) {
            const origW = apiResult.meta_data.width;
            const origH = apiResult.meta_data.height;
            const maxDim = 320;
            const scale = Math.min(maxDim / origW, maxDim / origH, 1);
            const w = Math.round(origW * scale);
            const h = Math.round(origH * scale);
            setSubjectSize({ width: w, height: h });
            subjectSizeRef.current = { width: w, height: h };
            setSubjectPos({ x: 250 - w / 2, y: 250 - h / 2 });
          }
          setConverting(false);
          return;
        }
        default: {
          // Fallback / generic handler tries image-to-jpg for unknown image tools
          if (file?.type?.startsWith('image/')) {
            output = await imageToJpg(file, 0.92);
          } else {
            throw new Error(`Client-side conversion not yet available for this tool`);
          }
        }
      }

      // Create preview and download for image results
      const objectUrl = URL.createObjectURL(output.blob);
      setResultPreviewUrl(objectUrl);
      setResultBlob(output.blob);
      setResultFilename(output.filename);
      setResult({
        meta_data: output.meta,
      });
    } catch (err) {
      setError(err.message || 'Conversion failed. Please check your file and try again.');
    } finally {
      setConverting(false);
    }
  };

  // ─── Rewarded Download helpers ─────────────────────────────────────

  const triggerDownloadAfterReward = () => {
    setRewardedState('completed');
    setTimeout(() => handleDownload(), 500);
  };

  const handleWatchAd = () => {
    setRewardedState('watching-ad');
    setAdCountdown(30);
    try {
      window.dispatchEvent(new CustomEvent('mbid:showRewarded', {
        detail: { bannerId: '2023322' }
      }));
    } catch (e) {
      // MyBid event dispatch — counted down naturally
    }
  };

  const simulateProPurchase = () => {
    localStorage.setItem('proUser', 'true');
    localStorage.setItem('proEmail', 'pro@user.com');
    setIsProUser(true);
    triggerDownloadAfterReward();
  };

  const handleBuyPro = async () => {
    setRewardedState('pro-checkout');
    try {
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripePubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX';
      const stripe = await loadStripe(stripePubKey);
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          lineItems: [{ price: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_XXXXXXXXXXXXXXXXXXXXXXXX', quantity: 1 }],
          mode: 'payment',
          successUrl: `${window.location.origin}${window.location.pathname}?payment=success&slug=${slug}`,
          cancelUrl: `${window.location.origin}${window.location.pathname}?payment=cancelled&slug=${slug}`,
        });
        if (error) {
          console.error('Stripe Checkout error:', error);
          simulateProPurchase();
        }
      } else {
        simulateProPurchase();
      }
    } catch (e) {
      console.warn('Stripe not configured, using simulated payment', e);
      simulateProPurchase();
    }
  };

  // ─── Client-side download ───────────────────────────────────────────

  const handleDownload = async () => {
    if (!resultBlob) return;

    // For background-remove with a background applied, composite subject onto background
    if (slug === 'background-remove' && bgType !== 'none' && resultPreviewUrl) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Load the subject image
        const subjectImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = resultPreviewUrl;
        });

        // Use original dimensions from metadata
        const w = result?.meta_data?.width || subjectImg.width;
        const h = result?.meta_data?.height || subjectImg.height;
        canvas.width = w;
        canvas.height = h;

        // Draw background
        if (bgType === 'solid') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        } else if (bgType === 'image' && bgImageUrl) {
          const bgImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = bgImageUrl;
          });
          // Cover the canvas maintaining aspect ratio
          const scale = Math.max(w / bgImg.width, h / bgImg.height);
          const bw = bgImg.width * scale;
          const bh = bgImg.height * scale;
          ctx.drawImage(bgImg, (w - bw) / 2, (h - bh) / 2, bw, bh);
        } else if (bgType === 'ai' && bgImageUrl) {
          // AI backgrounds are CSS gradients stored in bgImageUrl
          // We can't easily paint CSS gradients on canvas, so draw solid fallback
          // Better approach: use a temporary div to render the gradient
          const tempDiv = document.createElement('div');
          tempDiv.style.background = bgImageUrl;
          tempDiv.style.width = '1px';
          tempDiv.style.height = '1px';
          tempDiv.style.position = 'absolute';
          tempDiv.style.top = '-9999px';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);

          const computedStyle = getComputedStyle(tempDiv);
          const gradientValue = computedStyle.backgroundImage || bgImageUrl;
          document.body.removeChild(tempDiv);

          // Use canvas gradient API
          const gradient = ctx.createLinearGradient(0, 0, w, h);
          // Parse the gradient stops — simplified: use the bgColor for now
          ctx.fillStyle = bgColor || '#6366f1';
          ctx.fillRect(0, 0, w, h);

          // Draw subject on top
          ctx.drawImage(subjectImg, 0, 0, w, h);
        }

        // Draw subject on top
        ctx.drawImage(subjectImg, 0, 0, w, h);

        // Export canvas as blob
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create image');

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resultFilename || 'download';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        return;
      } catch (err) {
        console.error('Download compositing failed, falling back to transparent download', err);
      }
    }

    // Default download (transparent PNG or other tools)
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFilename || 'download';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Reset everything ───────────────────────────────────────────────

  const handleReset = () => {
    setResult(null);
    setFile(null);
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(null);
    setQrText('');
    setJsonInput('');
    setFormattedOutput('');
    setResizeWidth('');
    setResizeHeight('');
    setResizePercentage('50');
    setResizeMode('percentage');
    setError(null);
    setResultPreviewUrl(null);
    setResultBlob(null);
    setResultFilename('');
    setRewardedState('none');
    setAdCountdown(30);
    resetWorkspace();
  };  // ─── Determine which result UI to show ──────────────────────────────
  const showBackgroundWorkspace = slug === 'background-remove' && resultPreviewUrl && subjectSize;
  const showStandardPreview = slug !== 'background-remove' && (resultPreviewUrl || isJson);

  let resultContent = null;
  if (showBackgroundWorkspace) {
    resultContent = (
      /* Break out of the card padding for full-width editor */
      <div className="-mx-6 sm:-mx-8 -mb-6 sm:-mb-8 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
        {/* Step indicator */}
        <div className="px-6 sm:px-8 pt-6 pb-2">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {[
              { label: 'Upload', icon: 'Upload' },
              { label: 'Process', icon: 'Zap' },
              { label: 'Edit', icon: 'Eraser' },
              { label: 'Download', icon: 'Download' },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-300 ${
                  i < 3 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  i === 3 ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                  'bg-gray-50 text-gray-400 border border-gray-200'
                }`}>
                  {i === 0 && <Upload size={12} />}
                  {i === 1 && <Zap size={12} />}
                  {i === 2 && <Eraser size={12} />}
                  {i === 3 && <Download size={12} />}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < 3 && <div className="w-4 sm:w-8 h-px bg-gradient-to-r from-emerald-200 to-indigo-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[400px] lg:min-h-[520px]">
          {/* ─── Sidebar — Background Editor (LEFT) ─── */}
          <div className="order-2 lg:order-1 lg:sticky lg:top-4 lg:self-start p-4 sm:p-5 lg:p-6 xl:p-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  <Palette size={14} className="text-indigo-500" />
                </div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Background Editor
                </h3>
              </div>

              {/* Hidden file input for background image upload */}
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgImageUpload}
                className="hidden"
              />

              {/* ─── Current background indicator ────── */}
              <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-gray-200 shadow-sm shrink-0 overflow-hidden"
                    style={{
                      background: bgType === 'solid'
                        ? bgColor
                        : bgType === 'ai' && bgImageUrl
                          ? bgImageUrl
                          : bgType === 'image' && bgImageUrl
                            ? `url(${bgImageUrl}) center/cover no-repeat`
                            : undefined,
                    }}
                  >
                    {bgType === 'none' && (
                      <div className="w-full h-full bg-checkerboard-sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700">
                      {bgType === 'none' && 'Transparent'}
                      {bgType === 'solid' && 'Solid Color'}
                      {bgType === 'image' && 'Custom Image'}
                      {bgType === 'ai' && 'AI Gradient'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Current background</p>
                  </div>
                  {bgType !== 'none' && (
                    <button
                      onClick={() => {
                        if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith('blob:')) {
                          URL.revokeObjectURL(bgImageUrlRef.current);
                          bgImageUrlRef.current = null;
                        }
                        setBgType('none');
                        setBgImageUrl(null);
                        setShowColorPicker(false);
                        setShowAiPanel(false);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Reset to transparent"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Add an AI background ─────────────── */}
              <div className="relative mb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAiPanel(prev => !prev);
                    setShowColorPicker(false);
                  }}
                  className={`card-shine relative overflow-hidden w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border transition-all duration-200 text-left group ${
                    showAiPanel
                      ? 'border-indigo-300 shadow-sm bg-indigo-50/50'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <Sparkles size={17} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">AI Background</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Smart gradient suggestions</p>
                  </div>
                  {bgType === 'ai' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-600">ACTIVE</span>
                  )}
                </button>

                {/* AI Backgrounds Panel */}
                {showAiPanel && (
                  <div className="mt-2 p-3 rounded-xl bg-white border border-gray-200 shadow-lg animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Choose a gradient</span>
                      <Sparkles size={12} className="text-indigo-400" />
                    </div>
                    {aiGradients.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {aiGradients.map((bg, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => applyBg('ai', bg.gradient)}
                            className={`relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.04] hover:shadow-md ${
                              bgType === 'ai' && bgImageUrl === bg.gradient
                                ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="w-full h-full" style={{ background: bg.gradient }} />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-2 py-1.5">
                              <span className="text-[9px] font-bold text-white drop-shadow-sm">{bg.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-6 text-gray-400">
                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                        <span className="text-xs">Analyzing image colors...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Add image as background ──────────── */}
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className={`card-shine relative overflow-hidden w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border transition-all duration-200 mb-2.5 text-left group ${
                  bgType === 'image'
                    ? 'border-emerald-300 shadow-sm bg-emerald-50/50'
                    : 'border-gray-200 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                  <ImageIcon size={17} className="text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">Custom Image</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Upload a photo as background</p>
                  </div>
                  {bgType === 'image' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-600">ACTIVE</span>
                  )}
              </button>

              {/* ─── Add a solid color ────────────────── */}
              <div className="relative" ref={colorPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPicker(prev => !prev);
                    setShowAiPanel(false);
                  }}
                  className={`card-shine relative overflow-hidden w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border transition-all duration-200 text-left group ${
                    showColorPicker
                      ? 'border-amber-300 shadow-sm bg-amber-50/50'
                      : 'border-gray-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <Palette size={17} className="text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">Solid Color</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pick from presets or custom</p>
                  </div>
                  {bgType === 'solid' && (
                    <div
                      className="w-6 h-6 rounded-xl border-2 border-white shadow-md shrink-0"
                      style={{ backgroundColor: bgColor }}
                    />
                  )}
                </button>

                {/* Color Picker Popover */}
                {showColorPicker && (
                  <div className="mt-2 p-4 rounded-xl bg-white border border-gray-200 shadow-lg animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Color presets</span>
                      <Palette size={12} className="text-amber-400" />
                    </div>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => applyBg('solid', color)}
                          className={`w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 hover:shadow-md ${
                            bgType === 'solid' && bgColor === color
                              ? 'border-indigo-500 ring-2 ring-indigo-200 scale-110 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                      <label className="text-[10px] font-medium text-gray-400 shrink-0">Custom</label>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => applyBg('solid', e.target.value)}
                        className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 shadow-sm"
                      />
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{bgColor}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/50">
                <p className="text-[10px] text-indigo-500 font-medium leading-relaxed">
                  💡 Drag to reposition &middot; Resize handles to scale &middot; Arrow keys to nudge
                </p>
              </div>
            </div>
          </div>

          {/* ─── Workspace Canvas (RIGHT) ─────────────── */}
          <div className="order-1 lg:order-2 flex items-center justify-center p-4 sm:p-5 lg:p-6 xl:p-8">
            <div className="w-full max-w-[620px]">
              {/* Canvas label */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                    <PictureInPicture2 size={13} className="text-indigo-500" />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">Preview Canvas</span>
                </div>
                {result.meta_data?.width > 0 && (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    {result.meta_data.width} &times; {result.meta_data.height}px
                  </span>
                )}
              </div>

              <div
                ref={workspaceRef}
                className="relative rounded-2xl border-2 border-gray-200/80 shadow-lg shadow-gray-200/30 overflow-hidden"
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: bgType === 'solid'
                    ? bgColor
                    : bgType === 'ai' && bgImageUrl
                      ? bgImageUrl
                      : bgType === 'image' && bgImageUrl
                        ? `url(${bgImageUrl}) center/cover no-repeat`
                        : undefined,
                }}
              >
                {/* Inner shadow */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_12px_rgba(0,0,0,0.06)] z-10 rounded-2xl" />

                {/* Zoom-scaled container */}
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    width: `${100 / zoomLevel}%`,
                    height: `${100 / zoomLevel}%`,
                    left: `${50 - 50 / zoomLevel}%`,
                    top: `${50 - 50 / zoomLevel}%`,
                  }}
                >
                  {/* Checkerboard overlay when NO background is selected (shows transparency) */}
                  {bgType === 'none' && (
                    <div className="absolute inset-0 bg-checkerboard pointer-events-none" />
                  )}

                  {/* Subject image — draggable & resizable */}
                  {subjectSize && (
                    <div
                      className="absolute cursor-grab active:cursor-grabbing select-none"
                      style={{
                        left: subjectPos.x,
                        top: subjectPos.y,
                        width: subjectSize.width,
                        height: subjectSize.height,
                      }}
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                    >
                      <img
                        src={resultPreviewUrl}
                        alt="Subject"
                        draggable={false}
                        className="w-full h-full pointer-events-none"
                        style={{
                          objectFit: 'contain',
                          filter: isDragging ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
                          transition: !isDragging && !isResizing ? 'filter 0.3s ease' : 'none',
                        }}
                      />
                      {/* Resize handles */}
                      {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((h) => (
                        <div
                          key={h}
                          className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-500 rounded-full shadow-md hover:scale-125 transition-transform z-10 hover:shadow-lg"
                          style={{
                            [h.includes('n') ? 'top' : 'bottom']: h.includes('n') ? '-6px' : '-6px',
                            [h.includes('e') ? 'right' : 'left']: h.includes('e') ? '-6px' : '-6px',
                            cursor: h === 'nw' || h === 'se' ? 'nwse-resize' :
                                    h === 'ne' || h === 'sw' ? 'nesw-resize' :
                                    h === 'n' || h === 's' ? 'ns-resize' : 'ew-resize',
                          }}
                          onMouseDown={(e) => handleResizeStart(e, h)}
                          onTouchStart={(e) => handleResizeStart(e, h)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Workspace overlay hints */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 glass rounded-full shadow-xs text-[10px] text-gray-500 font-medium whitespace-nowrap">
                    Drag to move &middot; Handles to resize &middot; R to reset &middot; Ctrl+Scroll to zoom
                  </div>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
                    setFitToWindow(false);
                  }}
                  disabled={zoomLevel <= 0.25}
                  title="Zoom out (Ctrl+-)"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all text-lg font-bold"
                >
                   &minus;
                </button>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1 border border-gray-100">
                  <input
                    type="range"
                    min="25"
                    max="300"
                    value={Math.round(zoomLevel * 100)}
                    onChange={(e) => {
                      const val = +(e.target.value / 100).toFixed(2);
                      setZoomLevel(val);
                      setFitToWindow(false);
                    }}
                    className="w-28 sm:w-36 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500 [&::-moz-range-thumb]:shadow-sm"
                  />
                  <span
                    title="Reset zoom (Ctrl+0)"
                    onClick={() => {
                      setZoomLevel(1.0);
                      setFitToWindow(false);
                    }}
                    className="text-xs font-semibold text-gray-500 min-w-[3rem] text-center tabular-nums cursor-pointer hover:text-indigo-600 transition-colors select-none"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(z => Math.min(3, +(z + 0.25).toFixed(2)));
                    setFitToWindow(false);
                  }}
                  disabled={zoomLevel >= 3}
                  title="Zoom in (Ctrl++)"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ZoomIn size={16} />
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    if (fitToWindow) {
                      setZoomLevel(1.0);
                      setFitToWindow(false);
                    } else {
                      setFitToWindow(true);
                      // Calculate zoom to fit subject comfortably within workspace
                      if (subjectSize && workspaceRef.current) {
                        const wsW = workspaceRef.current.offsetWidth;
                        const wsH = workspaceRef.current.offsetHeight;
                        const fitScale = Math.min(
                          (wsW * 0.85) / subjectSize.width,
                          (wsH * 0.85) / subjectSize.height
                        );
                        setZoomLevel(+(Math.max(0.25, Math.min(3, fitScale)).toFixed(2)));
                      }
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    fitToWindow
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <Maximize2 size={13} />
                  Fit
                </button>
              </div>

              {/* Meta badges below workspace */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {result.meta_data?.width > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 rounded-xl border border-indigo-100/80">
                    <Maximize2 size={11} className="text-indigo-400" />
                    <span className="text-[11px] font-semibold text-indigo-600">
                      {result.meta_data.width}&times;{result.meta_data.height}
                    </span>
                  </div>
                )}
                {result.meta_data?.size_bytes > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/80 rounded-xl border border-purple-100/80">
                    <FileDown size={11} className="text-purple-400" />
                    <span className="text-[11px] font-semibold text-purple-600">
                      {formatSize(result.meta_data.size_bytes)}
                    </span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 rounded-xl border border-emerald-100/80">
                  <Eraser size={11} className="text-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-600">AI Removed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (showStandardPreview) {
    resultContent = (
      <div className="text-center space-y-6">
        {/* Success icon with ring */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center animate-success-pop">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <div className="absolute -inset-1 rounded-full border-2 border-green-100 animate-ping-slow opacity-60" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900">
            {isJson ? 'JSON Valid &amp; Formatted!' : 'Conversion Complete!'}
          </h3>
          <p className="text-gray-500 mt-1.5">
            {resultFilename || 'Your file is ready for download'}
          </p>
        </div>

        {/* Image Preview - premium card */}
        <div className="flex justify-center">
          <div className="relative group rounded-3xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/50 overflow-hidden max-w-sm w-full transition-shadow duration-300 hover:shadow-xl hover:shadow-gray-200/60">
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] z-10 rounded-3xl" />
            <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
              <img
                src={resultPreviewUrl}
                alt="Converted"
                className="w-full h-52 object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200" />
          </div>
        </div>

        {/* Meta info - premium cards */}
        {result.meta_data && (
          <div className="flex justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-sm">
              {result.meta_data.compression_ratio !== undefined && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-2xl p-4 border border-green-100/60 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Compression</p>
                  <p className="text-lg font-bold text-green-600">{result.meta_data.compression_ratio}%</p>
                </div>
              )}
              {result.meta_data.width > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-4 border border-indigo-100/60 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Dimensions</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {result.meta_data.width}&times;{result.meta_data.height}
                  </p>
                </div>
              )}
              {result.meta_data.size_bytes > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-2xl p-4 border border-purple-100/60 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">File Size</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatSize(result.meta_data.size_bytes)}
                  </p>
                </div>
              )}
              {result.meta_data.pages > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-4 border border-amber-100/60 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Pages</p>
                  <p className="text-lg font-bold text-amber-600">{result.meta_data.pages}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JSON Meta - premium cards */}
        {result.meta_data && isJson && (
          <div className="flex justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
              {result.meta_data.type && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-4 border border-indigo-100/60 shadow-sm text-center">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Type</p>
                  <p className="text-sm font-bold text-indigo-600 capitalize">{result.meta_data.type}</p>
                </div>
              )}
              {result.meta_data.keys_count !== undefined && result.meta_data.keys_count !== null && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-2xl p-4 border border-green-100/60 shadow-sm text-center">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Keys</p>
                  <p className="text-sm font-bold text-green-600">{result.meta_data.keys_count}</p>
                </div>
              )}
              {result.meta_data.items_count !== undefined && result.meta_data.items_count !== null && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-2xl p-4 border border-purple-100/60 shadow-sm text-center">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Items</p>
                  <p className="text-sm font-bold text-purple-600">{result.meta_data.items_count}</p>
                </div>
              )}
              {result.meta_data.size_change !== undefined && (
                <div className={`rounded-2xl p-4 border shadow-sm text-center ${
                  result.meta_data.size_change <= 0
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-100/60'
                    : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-100/60'
                }`}>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Size &Delta;</p>
                  <p className={`text-sm font-bold ${
                    result.meta_data.size_change <= 0 ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {result.meta_data.size_change > 0 ? '+' : ''}
                    {result.meta_data.size_change} B
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formatted JSON Output */}
        {isJson && formattedOutput && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <Braces size={15} className="text-indigo-500" />
                <span className="text-xs font-semibold text-gray-600">Formatted Output</span>
              </div>
              <button onClick={() => handleCopy(formattedOutput)}
                className={`text-xs font-semibold px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  copied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                }`}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-5 overflow-auto max-h-80 text-sm font-mono leading-relaxed bg-[#0d1117] text-[#e6edf3] m-0">
              <code>{formattedOutput}</code>
            </pre>
          </div>
        )}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading tool...</p>
      </div>
    );
  }

  if (error && !tool) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tool Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    );
  }

  const Icon = toolIcons[slug] || FileDown;
  const isQr = slug === 'qr-generator';
  const isJson = slug === 'json-formatter';
  const acceptedTypes = isQr
    ? '.txt'
    : slug === 'pdf-to-jpg'
      ? '.pdf'
      : 'image/*';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
        <span>/</span>
        {tool?.category && (
          <>
            <Link to={`/category/${tool.category.slug}`} className="hover:text-indigo-600 transition-colors">
              {tool.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-600 font-medium">{tool?.name}</span>
      </nav>

      {/* FFmpeg Loading Spinner */}
      {slug === 'image-to-jpg' && ffmpegStatus === 'loading' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Loader2 size={18} className="text-amber-600 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Preparing FFmpeg Engine</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Downloading the conversion engine (~30MB) to your browser. One-time setup — please wait...
            </p>
            <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 absolute inset-0 animate-ffmpeg-load" />
            </div>
          </div>
        </div>
      )}

      {/* FFmpeg Error Banner */}
      {slug === 'image-to-jpg' && ffmpegStatus === 'error' && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-800">FFmpeg Fallback Active</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Could not load FFmpeg engine. Falling back to Canvas API — conversion will still work.
            </p>
          </div>
        </div>
      )}

      {/* PDF.js Loading Spinner */}
      {slug === 'pdf-to-jpg' && pdfjsStatus === 'loading' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Loader2 size={18} className="text-blue-600 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Preparing PDF Engine</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Downloading the PDF rendering engine to your browser. One-time setup — please wait...
            </p>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 absolute inset-0 animate-ffmpeg-load" />
            </div>
          </div>
        </div>
      )}

      {/* PDF.js Error Banner */}
      {slug === 'pdf-to-jpg' && pdfjsStatus === 'error' && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-800">PDF Worker Load Issue</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Could not preload PDF worker. It will load on first use instead.
            </p>
          </div>
        </div>
      )}              {/* Privacy / AI Processing Banner */}
      {slug === 'background-remove' ? (
        <div className="mb-6 overflow-hidden relative bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border border-indigo-100/70 rounded-2xl flex items-start gap-4 p-5 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 shadow-sm relative">
            <Zap size={20} className="text-indigo-600" />
          </div>
          <div className="relative">
            <p className="text-sm font-bold text-indigo-900">AI-Powered Background Removal</p>
            <p className="text-xs text-indigo-600/80 mt-0.5 leading-relaxed">
              Your image is processed through our AI server. It is not stored permanently. Results are accurate and fast.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">100% Private &amp; Secure</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              File never leaves your computer. All processing happens entirely in your browser.
            </p>
          </div>
        </div>
      )}

      {/* Tool Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${tool?.color || '#6366f1'}18, ${tool?.color || '#6366f1'}08)`,
            color: tool?.color || '#6366f1',
          }}
        >
          <Icon size={28} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tool?.name}</h1>
          <p className="text-gray-500 mt-1">{tool?.description}</p>
          {tool?.max_file_size_mb && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <Info size={12} />
              Max file size: {tool.max_file_size_mb}MB
            </p>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 sm:p-8">
          {/* Upload Area */}
          {!result && (
            <>
              {/* QR Generator Text Input */}
              {isQr && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter text or URL for QR Code
                  </label>
                  <textarea
                    value={qrText}
                    onChange={(e) => setQrText(e.target.value)}
                    placeholder="https://example.com or any text..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Or upload a .txt file below</p>
                </div>
              )}

              {/* JSON Formatter Input */}
              {isJson && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste your JSON below
                    </label>
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='{"name": "ProConverterBD", "version": 1, "features": ["convert", "format"]}'
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none font-mono text-sm"
                      rows={10}
                      spellCheck={false}
                    />
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setJsonMode('format')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        jsonMode === 'format'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      Pretty Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setJsonMode('minify')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        jsonMode === 'minify'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      Minify
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setJsonInput(
                          '{\n  "sample": "data",\n  "array": [1, 2, 3],\n  "nested": {\n    "key": "value"\n  }\n}'
                        )
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      Sample
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Or upload a .json file using the upload area below</p>
                </div>
              )}

              {/* File Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                className={`upload-zone relative rounded-2xl p-8 sm:p-12 text-center cursor-pointer overflow-hidden transition-all duration-300 ${dragOver ? 'dragover' : ''}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={acceptedTypes}
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="hidden"
                />

                {/* Drag overlay */}
                <div
                  className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl transition-all duration-300 ${
                    dragOver
                      ? 'opacity-100 scale-100 pointer-events-auto'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  {/* Animated ring backdrop */}
                  <div className="absolute inset-0 bg-indigo-600/10 rounded-2xl" />
                  <div className="absolute inset-3 border-2 border-dashed border-indigo-400/60 rounded-xl animate-drag-pulse" />
                  <div className="absolute inset-6 border-2 border-dashed border-indigo-300/40 rounded-lg animate-drag-pulse" style={{ animationDelay: '0.3s' }} />

                  {/* Icon + text */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center animate-drag-bounce shadow-lg shadow-indigo-200/50">
                      <Upload size={30} className="text-indigo-600" />
                    </div>
                    <p className="text-lg font-bold text-indigo-700">Drop your file here</p>
                    <p className="text-sm text-indigo-500">Release to start processing</p>
                  </div>
                </div>

                {preview ? (
                  <div className={`space-y-5 transition-all duration-200 ${dragOver ? 'blur-sm opacity-40' : ''}`}>
                    {/* Image preview card */}
                    <div className="relative bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-4 group">
                      <div className="relative overflow-hidden rounded-lg bg-white shadow-sm">
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-52 w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      {/* File extension badge */}
                      <div className="absolute top-6 right-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 shadow-sm">
                          {file?.name?.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* File info row */}
                    <div className="flex items-center justify-between gap-4 px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <ImageIcon size={18} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                            {file?.name}
                          </p>
                          <p className="text-xs text-gray-400">{formatSize(file?.size)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 shadow-sm"
                      >
                        <Upload size={15} />
                        Change file
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm"
                      >
                        <XCircle size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : file && slug === 'pdf-to-jpg' ? (
                  <div className={`space-y-5 transition-all duration-200 ${dragOver ? 'blur-sm opacity-40' : ''}`}>
                    {/* PDF preview card */}
                    <div className="relative bg-gradient-to-b from-red-50 to-white rounded-xl border border-red-200 p-8 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <FileText size={36} className="text-red-500" />
                      </div>
                      <p className="text-sm text-gray-500">
                        PDF file ready for conversion
                      </p>
                      {/* File extension badge */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 shadow-sm">
                          PDF
                        </span>
                      </div>
                    </div>

                    {/* File info row */}
                    <div className="flex items-center justify-between gap-4 px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 shadow-sm"
                      >
                        <Upload size={15} />
                        Change file
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm"
                      >
                        <XCircle size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`space-y-4 transition-all duration-200 ${dragOver ? 'blur-sm opacity-40' : ''}`}>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto shadow-sm">
                      <Upload size={28} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-700">
                        {isQr
                          ? 'Upload a .txt file'
                          : isJson
                            ? 'Upload a .json file'
                            : slug === 'pdf-to-jpg'
                              ? 'Upload a PDF file'
                              : 'Drop your image here or click to browse'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1.5">
                        {isQr
                          ? 'Or enter text above'
                          : isJson
                            ? 'Or paste JSON in the editor above'
                            : slug === 'background-remove'
                              ? 'Supports PNG, JPG, WEBP, BMP &middot; Max 10MB'
                              : 'Supports PNG, JPG, WEBP, BMP, GIF'}
                      </p>
                    </div>
                    {slug === 'background-remove' && !file && (
                      <div className="flex items-center justify-center gap-6 pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3E%3Cpolyline points='7 10 12 15 17 10'/%3E%3Cline x1='12' y1='15' x2='12' y2='3'/%3E%3C/svg%3E" alt="upload" className="w-3.5 h-3.5" />
                          Drag & drop
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E" alt="fast" className="w-3.5 h-3.5" />
                          AI-powered
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='11' width='18' height='11' rx='2' ry='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3C/svg%3E" alt="secure" className="w-3.5 h-3.5" />
                          Secure
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resize Image Controls */}
              {slug === 'resize-image' && file && (
                <div className="mt-6 p-4 bg-gray-50/60 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Maximize2 size={16} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">Resize Settings</span>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setResizeMode('percentage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        resizeMode === 'percentage'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      By Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setResizeMode('dimensions')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        resizeMode === 'dimensions'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      Exact Dimensions
                    </button>
                  </div>

                  {resizeMode === 'percentage' ? (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">Scale Percentage</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="10"
                          max="200"
                          value={resizePercentage || 50}
                          onChange={(e) => setResizePercentage(e.target.value)}
                          className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-sm font-semibold text-indigo-600 min-w-[3rem] text-center">
                          {resizePercentage || 50}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                        <span>10%</span>
                        <span>50%</span>
                        <span>100%</span>
                        <span>200%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Width (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={resizeWidth}
                          onChange={(e) => setResizeWidth(e.target.value)}
                          placeholder="e.g. 800"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Height (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={resizeHeight}
                          onChange={(e) => setResizeHeight(e.target.value)}
                          placeholder="e.g. 600"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                  {file && (
                    <div className="mt-3 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                      <p className="text-[11px] text-indigo-500 font-medium">
                        💡 Leave a field empty to auto-calculate based on aspect ratio
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Image Cropper Controls */}
              {slug === 'image-cropper' && file && (
                <div className="mt-6 p-4 bg-gray-50/60 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Crop size={16} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">Crop Settings</span>
                  </div>

                  {/* Aspect Ratio Presets */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 mb-2 block">Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Square', value: '1:1' },
                        { label: '4:3', value: '4:3' },
                        { label: '16:9', value: '16:9' },
                        { label: '3:2', value: '3:2' },
                        { label: '21:9', value: '21:9' },
                        { label: 'Custom', value: 'custom' },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setSelectedAspect(preset.value);
                            if (preset.value !== 'custom') {
                              setCropWidth('');
                              setCropHeight('');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedAspect === preset.value
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Dimensions */}
                  {selectedAspect === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Width (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={cropWidth}
                          onChange={(e) => setCropWidth(e.target.value)}
                          placeholder="e.g. 800"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Height (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={cropHeight}
                          onChange={(e) => setCropHeight(e.target.value)}
                          placeholder="e.g. 600"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={converting || (!file && !(isQr && qrText) && !(isJson && jsonInput))}
                className={`w-full mt-6 flex items-center justify-center gap-2.5 text-base py-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg ${
                  converting
                    ? 'bg-gradient-to-r from-indigo-400 to-purple-400 cursor-wait opacity-80'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-lg`}
              >
                {converting ? (
                  <>
                    <div className="relative">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                    <span>{isJson ? 'Processing...' : slug === 'background-remove' ? 'AI is Removing Background...' : 'Converting...'}</span>
                  </>
                ) : (
                  <>
                    {slug === 'background-remove' ? (
                      <><Eraser size={20} /> Remove Background</>
                    ) : (
                      <><FileDown size={18} />
                      {isJson ? (jsonMode === 'format' ? 'Format JSON' : 'Minify JSON') : 'Convert Now'}</>
                    )}
                  </>
                )}
              </button>

              {/* Processing indicator */}
              {converting && (
                <div className="mt-6">
                  {slug === 'background-remove' ? (
                    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-2xl border border-indigo-100/70 p-6 shadow-sm">
                      {/* Animated scan line */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent animate-ai-scan" />
                      </div>
                      <div className="relative flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                            <Eraser size={28} className="text-indigo-600" />
                          </div>
                          <div className="absolute -inset-2 rounded-2xl border-2 border-indigo-200/50 animate-ai-pulse-ring" />
                          <div className="absolute -inset-4 rounded-2xl border border-indigo-100/30 animate-ai-pulse-ring" style={{ animationDelay: '0.5s' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-indigo-900">AI Processing Your Image</p>
                          <p className="text-xs text-indigo-500 mt-1 max-w-xs mx-auto">
                            Our AI model is analyzing and removing the background. This takes a few seconds...
                          </p>
                        </div>
                        <div className="w-full max-w-xs mx-auto bg-white/80 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-3/4 mx-auto" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-full" />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Processing in your browser...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Result */}
          {result && !converting && (
            <div className={`animate-fade-in ${isJson ? 'space-y-6' : ''}`}>
              {/* ─── Background Remover Workspace ──────────────────── */}
              {resultContent}

              {/* Download Section — rewarded for bg-remove, default for others */}
              {slug === 'background-remove' ? (
                isProUser ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mt-6 mb-2">
                      <Shield size={16} className="text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">
                        You own Pro. Enjoy ad-free forever!
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 sm:pt-4">
                      <button
                        onClick={handleDownload}
                        className="btn-premium-primary flex items-center justify-center gap-2.5 text-base px-8 py-3.5"
                      >
                        <Download size={18} />
                        Download File
                      </button>
                      <button
                        onClick={handleReset}
                        className="btn-premium-secondary flex items-center justify-center gap-2.5 text-base px-8 py-3.5"
                      >
                        <FileDown size={18} />
                        Convert Another
                      </button>
                    </div>
                  </>
                ) : rewardedState === 'none' || rewardedState === 'choosing' ? (
                  <>
                    <div className="relative mt-6 mb-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 py-1.5 bg-white text-xs font-semibold text-gray-400 border border-gray-200 rounded-full">
                          Ready to Download
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                      <button
                        onClick={handleWatchAd}
                        className="card-shine relative overflow-hidden group bg-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 p-6 sm:p-7 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="absolute -top-8 -right-8 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-[3] transition-transform duration-500 opacity-60" />
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                            <span className="text-2xl">&#127916;</span>
                          </div>
                          <p className="text-base font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">Watch 30s Ad</p>
                          <p className="text-sm text-gray-400 mt-1">Free Download</p>
                          <ul className="mt-4 space-y-2">
                            <li className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              Watch a short ad
                            </li>
                            <li className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              Download immediately
                            </li>
                          </ul>
                          <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl text-sm font-bold text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors shadow-sm">
                            <Download size={15} />
                            Free Download
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={handleBuyPro}
                        className="card-shine relative overflow-hidden group bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl border-2 border-amber-200 hover:border-amber-400 p-6 sm:p-7 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="absolute -top-2.5 -right-2.5 z-10">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200/50">
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            BEST VALUE
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                            <span className="text-2xl">&#128142;</span>
                          </div>
                          <p className="text-base font-bold text-gray-800 group-hover:text-amber-600 transition-colors">Buy Pro &mdash; $0.99</p>
                          <p className="text-sm text-gray-400 mt-1">Instant Download, No Ads, Lifetime</p>
                          <ul className="mt-4 space-y-2">
                            <li className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              Instant download
                            </li>
                            <li className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              No ads forever
                            </li>
                            <li className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              Lifetime access
                            </li>
                          </ul>
                          <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl text-sm font-bold text-white shadow-md shadow-amber-200/50 group-hover:shadow-lg group-hover:from-amber-500 group-hover:to-orange-500 transition-all">
                            <Shield size={15} />
                            $0.99 &mdash; Lifetime
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                ) : rewardedState === 'watching-ad' ? (
                  <div className="max-w-md mx-auto text-center mt-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 rounded-2xl border border-indigo-100/70 p-8 shadow-lg">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                      <div className="relative">
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-lg">
                              <span className="text-3xl animate-pulse">&#127916;</span>
                            </div>
                            <div className="absolute -inset-2 rounded-2xl border-2 border-indigo-200/50 animate-ai-pulse-ring" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-800">Ad Playing...</p>
                        <p className="text-sm text-gray-500 mt-1.5">Please wait while your ad completes</p>
                        <div className="mt-6 max-w-xs mx-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-indigo-600">
                              <span className="tabular-nums">{adCountdown}s</span> remaining
                            </span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full tabular-nums">
                              {Math.round((30 - adCountdown) / 30 * 100)}%
                            </span>
                          </div>
                          <div className="overflow-hidden h-3 rounded-full bg-indigo-100 shadow-inner">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear shadow-sm"
                              style={{ width: `${(30 - adCountdown) / 30 * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-5">Download will start automatically after the ad</p>
                      </div>
                    </div>
                  </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 sm:pt-8">
                  <button
                    onClick={handleDownload}
                    className="btn-premium-primary flex items-center justify-center gap-2.5 text-base px-8 py-3.5"
                  >
                    <Download size={18} />
                    Download File
                  </button>
                  <button
                    onClick={handleReset}
                    className="btn-premium-secondary flex items-center justify-center gap-2.5 text-base px-8 py-3.5"
                  >
                    <FileDown size={18} />
                    {isJson ? 'Format Another' : 'Convert Another'}
                  </button>
                </div>
              )) : null}

              {/* MyBid Banner Ad — neatly centered below action buttons */}
              <div className="mt-5 flex justify-center">
                <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/60 p-0 shadow-sm">
                  <MyBidAdSlot bannerId="2023322" className="w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ad Banner Below Convert */}
      <div className="mt-8">
        <AdBanner position="bottom" />
      </div>
    </div>
  );
}
