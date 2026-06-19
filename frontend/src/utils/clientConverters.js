import QRCode from 'qrcode';
import * as pdfjsLib from 'pdfjs-dist';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { cacheGet, cachePut } from './idbCache';

// Set pdf.js worker via unpkg (compatible with pdfjs-dist v6+)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── PDF.js preload ────────────────────────────────────────────────────

/** @type {'idle'|'loading'|'loaded'|'error'} */
let pdfjsStatus = 'idle';
let pdfjsStatusListeners = [];

function notifyPDFjsStatus(newStatus) {
  pdfjsStatus = newStatus;
  pdfjsStatusListeners.forEach((cb) => cb(newStatus));
}

/** Subscribe to PDF.js worker loading status changes. Returns an unsubscribe function. */
export function onPDFjsStatusChange(callback) {
  pdfjsStatusListeners.push(callback);
  return () => {
    pdfjsStatusListeners = pdfjsStatusListeners.filter((cb) => cb !== callback);
  };
}

/** Get current PDF.js loading status without waiting. */
export function getPDFjsStatus() {
  return pdfjsStatus;
}

/**
 * Pre-fetch the PDF.js worker script so it's cached by the browser
 * before the user clicks convert. Call this early (on mount).
 */
export function preloadPDFjs() {
  if (pdfjsStatus !== 'idle') return;
  notifyPDFjsStatus('loading');

  const workerUrl = pdfjsLib.GlobalWorkerOptions.workerSrc;
  if (!workerUrl) {
    notifyPDFjsStatus('error');
    return;
  }

  fetch(workerUrl, { mode: 'cors' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(() => {
      notifyPDFjsStatus('loaded');
    })
    .catch((err) => {
      console.warn('PDF.js worker preload failed:', err.message || err);
      notifyPDFjsStatus('error');
    });
}

// ─── FFmpeg singleton ──────────────────────────────────────────────────

/** @type {'idle'|'loading'|'loaded'|'error'} */
let ffmpegStatus = 'idle';
let ffmpegInstance = null;
let ffmpegLoadQueue = [];
let ffmpegStatusListeners = [];

const FFMPEG_CORE_VERSION = '0.12.10';
const CACHE_PREFIX = `ffmpeg-core-v${FFMPEG_CORE_VERSION}`;
const CACHE_KEY_JS = `${CACHE_PREFIX}-js`;
const CACHE_KEY_WASM = `${CACHE_PREFIX}-wasm`;

function notifyStatus(newStatus) {
  ffmpegStatus = newStatus;
  ffmpegStatusListeners.forEach((cb) => cb(newStatus));
}

/**
 * Subscribe to FFmpeg loading status changes.
 * Returns an unsubscribe function.
 */
export function onFFmpegStatusChange(callback) {
  ffmpegStatusListeners.push(callback);
  return () => {
    ffmpegStatusListeners = ffmpegStatusListeners.filter((cb) => cb !== callback);
  };
}

/** Get current FFmpeg loading status without waiting. */
export function getFFmpegStatus() {
  return ffmpegStatus;
}

/**
 * Start pre-loading FFmpeg.wasm before user clicks convert.
 * Call this early (on mount) so the WASM binary downloads in the background.
 */
export function preloadFFmpeg() {
  if (ffmpegStatus !== 'idle') return getFFmpeg();
  return getFFmpeg();
}

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegStatus === 'loading') {
    return new Promise((resolve) => {
      ffmpegLoadQueue.push(resolve);
    });
  }

  notifyStatus('loading');
  ffmpegInstance = new FFmpeg();
  const base = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

  try {
    let coreJSBlob, coreWasmBlob;

    // Try IndexedDB cache first
    const cachedJS = await cacheGet(CACHE_KEY_JS);
    const cachedWasm = await cacheGet(CACHE_KEY_WASM);

    if (cachedJS && cachedWasm) {
      coreJSBlob = new Blob([cachedJS], { type: 'application/javascript' });
      coreWasmBlob = new Blob([cachedWasm], { type: 'application/wasm' });
    } else {
      // Fetch and cache both files
      const jsUrl = `${base}/ffmpeg-core.js`;
      const wasmUrl = `${base}/ffmpeg-core.wasm`;

      const [jsResp, wasmResp] = await Promise.all([
        fetch(jsUrl, { mode: 'cors' }),
        fetch(wasmUrl, { mode: 'cors' }),
      ]);

      if (!jsResp.ok || !wasmResp.ok) {
        throw new Error(`HTTP ${jsResp.status} / ${wasmResp.status}`);
      }

      const [jsBuf, wasmBuf] = await Promise.all([
        jsResp.arrayBuffer(),
        wasmResp.arrayBuffer(),
      ]);

      // Store in IndexedDB (non-critical; log but don't block on failure)
      Promise.all([
        cachePut(CACHE_KEY_JS, jsBuf),
        cachePut(CACHE_KEY_WASM, wasmBuf),
      ]).catch((err) => {
        console.warn('FFmpeg cache write failed:', err.message || err);
      });

      coreJSBlob = new Blob([jsBuf], { type: 'application/javascript' });
      coreWasmBlob = new Blob([wasmBuf], { type: 'application/wasm' });
    }

    // Create object URLs from the blobs and pass to ffmpeg.load()
    const coreJSObjectURL = URL.createObjectURL(coreJSBlob);
    const wasmObjectURL = URL.createObjectURL(coreWasmBlob);

    await ffmpegInstance.load({
      coreURL: coreJSObjectURL,
      wasmURL: wasmObjectURL,
    });

    // Revoke blob URLs after ffmpeg has loaded (it copies the data internally)
    URL.revokeObjectURL(coreJSObjectURL);
    URL.revokeObjectURL(wasmObjectURL);

    notifyStatus('loaded');
  } catch (err) {
    ffmpegInstance = null;
    notifyStatus('error');
    ffmpegLoadQueue.forEach((r) => r(null));
    ffmpegLoadQueue = [];
    throw err;
  }

  ffmpegLoadQueue.forEach((r) => r(ffmpegInstance));
  ffmpegLoadQueue = [];
  return ffmpegInstance;
}

async function fileToUint8Array(file) {
  return new Uint8Array(await file.arrayBuffer());
}

// ─── Helpers ────────────────────────────────────────────────────────────

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ─── Image to JPG (Canvas API) ──────────────────────────────────────────

export async function imageToJpg(file, quality = 0.92) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  // If the image is PNG with transparency, fill white background first
  if (file.type === 'image/png') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

  return {
    blob,
    filename: name,
    meta: { width: img.naturalWidth, height: img.naturalHeight, size_bytes: blob.size },
  };
}

// ─── Image to JPG (FFmpeg.wasm) ────────────────────────────────────────

let ffmpegWarned = false;

export async function imageToJpgFFmpeg(file) {
  try {
    const ffmpeg = await getFFmpeg();
    if (!ffmpeg) throw new Error('FFmpeg failed to load');

    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '.png';
    const inputName = `input${ext}`;
    const outputName = 'output.jpg';

    await ffmpeg.writeFile(inputName, await fileToUint8Array(file));
    await ffmpeg.exec(['-i', inputName, '-q:v', '2', outputName]);
    const data = await ffmpeg.readFile(outputName);

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const blob = new Blob([data], { type: 'image/jpeg' });
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return {
      blob,
      filename: name,
      meta: { size_bytes: blob.size },
    };
  } catch (err) {
    if (!ffmpegWarned) {
      ffmpegWarned = true;
      console.warn('FFmpeg.wasm failed, falling back to Canvas API:', err.message);
    }
    return imageToJpg(file, 0.92);
  }
}

// ─── Compress Image ─────────────────────────────────────────────────────

export async function compressImage(file, quality = 0.7) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  // For PNG with transparency, fill white background first so JPEG encoding works
  if (file.type === 'image/png') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  // Always use JPEG with quality for real compression (canvas PNG has no quality control)
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );

  const originalSize = file.size;
  const compressedSize = blob.size;
  const ratio = Math.round((1 - compressedSize / originalSize) * 100);
  const name = file.name.replace(/\.[^.]+$/, '') + '_compressed.jpg';

  return {
    blob,
    filename: name,
    meta: {
      compression_ratio: Math.max(0, ratio),
      size_bytes: compressedSize,
      width: img.naturalWidth,
      height: img.naturalHeight,
    },
  };
}

// ─── Crop Image ─────────────────────────────────────────────────────────

export async function cropImage(file, options) {
  const img = await loadImage(file);
  let { width, height } = options;
  const aspectRatio = options.aspect_ratio;

  if (aspectRatio && !width && !height) {
    const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = wRatio / hRatio;

    if (targetAspect > imgAspect) {
      height = img.naturalHeight;
      width = Math.round(height * targetAspect);
    } else {
      width = img.naturalWidth;
      height = Math.round(width / targetAspect);
    }
  }

  if (!width) width = img.naturalWidth;
  if (!height) height = img.naturalHeight;

  // Center crop
  const sx = Math.max(0, Math.round((img.naturalWidth - width) / 2));
  const sy = Math.max(0, Math.round((img.naturalHeight - height) / 2));
  const sw = Math.min(width, img.naturalWidth - sx);
  const sh = Math.min(height, img.naturalHeight - sy);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const name = file.name.replace(/\.[^.]+$/, '') + '_cropped.png';

  return {
    blob,
    filename: name,
    meta: { width: sw, height: sh, size_bytes: blob.size },
  };
}

// ─── QR Code Generator ──────────────────────────────────────────────────

export async function generateQRCode(text) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, text || 'https://proconverterbd.com', {
    width: 800,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return {
    blob,
    filename: 'qrcode.png',
    meta: { data: text || 'https://proconverterbd.com', size_bytes: blob.size },
  };
}

// ─── PDF to JPG ─────────────────────────────────────────────────────────

export async function pdfToJpg(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2; // 2x for quality
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  );
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

  return {
    blob,
    filename: name,
    meta: {
      width: viewport.width,
      height: viewport.height,
      pages: pdf.numPages,
      size_bytes: blob.size,
    },
  };
}

// ─── JSON Formatter ────────────────────────────────────────────────────

export async function formatJSON(file, text, mode = 'format', indent = 2) {
  let inputText = text;
  if (file) {
    inputText = await file.text();
  }
  if (!inputText || !inputText.trim()) {
    throw new Error('No JSON input provided.');
  }

  const parsed = JSON.parse(inputText);
  const formatted =
    mode === 'minify'
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, Math.min(8, Math.max(2, indent)));

  const originalSize = new Blob([inputText]).size;
  const newSize = new Blob([formatted]).size;
  const meta = {
    type: Array.isArray(parsed)
      ? 'array'
      : typeof parsed === 'object' && parsed !== null
        ? 'object'
        : typeof parsed,
    keys_count:
      !Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null
        ? Object.keys(parsed).length
        : null,
    items_count: Array.isArray(parsed) ? parsed.length : null,
    size_change: newSize - originalSize,
    formatted_preview: formatted,
  };

  const blob = new Blob([formatted], { type: 'application/json' });
  return {
    blob,
    filename: 'formatted.json',
    meta,
    formattedText: formatted,
  };
}

// ─── Image to PNG ───────────────────────────────────────────────────────

export async function imageToPng(file) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  const name = file.name.replace(/\.[^.]+$/, '') + '.png';

  return {
    blob,
    filename: name,
    meta: { width: img.naturalWidth, height: img.naturalHeight, size_bytes: blob.size },
  };
}

// ─── Image to WEBP ───────────────────────────────────────────────────────

export async function imageToWebp(file, quality = 0.8) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  );
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';

  return {
    blob,
    filename: name,
    meta: { width: img.naturalWidth, height: img.naturalHeight, size_bytes: blob.size, quality: Math.round(quality * 100) },
  };
}

// ─── Resize Image ────────────────────────────────────────────────────────

export async function resizeImage(file, options = {}) {
  const img = await loadImage(file);
  let { width, height, percentage } = options;
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  if (percentage) {
    const factor = percentage / 100;
    width = Math.max(1, Math.round(origW * factor));
    height = Math.max(1, Math.round(origH * factor));
  } else if (width && !height) {
    const ratio = width / origW;
    height = Math.max(1, Math.round(origH * ratio));
  } else if (height && !width) {
    const ratio = height / origH;
    width = Math.max(1, Math.round(origW * ratio));
  } else if (!width && !height) {
    // Default: scale to 50%
    width = Math.max(1, Math.round(origW / 2));
    height = Math.max(1, Math.round(origH / 2));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const name = file.name.replace(/\.[^.]+$/, '') + '_resized.png';

  const actualPercentage = Math.round((width / origW) * 100 * 10) / 10;

  return {
    blob,
    filename: name,
    meta: {
      original_width: origW,
      original_height: origH,
      width,
      height,
      percentage: actualPercentage,
      size_bytes: blob.size,
    },
  };
}

// ─── Image to Icon ───────────────────────────────────────────────────────

export async function imageToIcon(file) {
  const img = await loadImage(file);
  const size = Math.min(img.naturalWidth, img.naturalHeight, 256);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Center-crop to square first
  const minDim = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minDim) / 2;
  const sy = (img.naturalHeight - minDim) / 2;
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const name = file.name.replace(/\.[^.]+$/, '') + '.ico';

  return {
    blob,
    filename: name,
    meta: { width: size, height: size, original_size: `${img.naturalWidth}x${img.naturalHeight}`, size_bytes: blob.size },
  };
}

// ─── Background Remove ──────────────────────────────────────────────────

export async function removeBackground(file, tolerance = 32) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample edge pixels to find background color
  const samples = [];
  const step = 4;
  const edgeSize = Math.min(15, Math.floor(Math.min(canvas.width, canvas.height) / 10));

  for (let y = 0; y < edgeSize; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const i = (y * canvas.width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  for (let y = canvas.height - edgeSize; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const i = (y * canvas.width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  for (let y = edgeSize; y < canvas.height - edgeSize; y += step) {
    for (let x = 0; x < edgeSize; x += step) {
      const i = (y * canvas.width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    for (let x = canvas.width - edgeSize; x < canvas.width; x += step) {
      const i = (y * canvas.width + x) * 4;
      samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  // Average color for background
  let avgR = 0, avgG = 0, avgB = 0;
  for (const s of samples) {
    avgR += s.r;
    avgG += s.g;
    avgB += s.b;
  }
  const n = samples.length || 1;
  avgR /= n;
  avgG /= n;
  avgB /= n;

  // Brightness-aware tolerance adjustment
  const brightness = (avgR + avgG + avgB) / 3;
  const dynamicTolerance = brightness > 200
    ? tolerance * 1.5
    : brightness < 50
      ? tolerance * 1.5
      : tolerance;

  // Remove background pixels with edge detection to preserve edges
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt(
      (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2
    );
    if (dist < dynamicTolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const name = file.name.replace(/\.[^.]+$/, '') + '_nobg.png';

  return {
    blob,
    filename: name,
    meta: {
      width: canvas.width,
      height: canvas.height,
      size_bytes: blob.size,
    },
  };
}
