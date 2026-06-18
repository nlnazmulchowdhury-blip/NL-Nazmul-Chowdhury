import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────

interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  tool_count: number;
}

interface ToolDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  accepts_multiple_files: boolean;
  max_file_size_mb: number;
  category: CategorySummary;
}

// ─── Mock Data ─────────────────────────────────────────────────────────

const tools: ToolDetail[] = [
  // ─── Image Tools ──────────────────────────────────────────────────
  {
    id: 1,
    name: "Image to JPG",
    slug: "image-to-jpg",
    description:
      "Convert any image format (PNG, WEBP, BMP, GIF) to high-quality JPG with adjustable compression.",
    icon: "image",
    color: "#6366f1",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 2,
    name: "Background Remover",
    slug: "background-remove",
    description:
      "Remove background from images automatically. Perfect for product photos, portraits, and graphics.",
    icon: "eraser",
    color: "#ec4899",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 15,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 3,
    name: "Compress Image",
    slug: "compress-image",
    description:
      "Reduce image file size while maintaining quality. Optimize for web and email.",
    icon: "zap",
    color: "#f59e0b",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 4,
    name: "Resize Image",
    slug: "resize-image",
    description: "Resize images to exact dimensions or scale by percentage.",
    icon: "maximize",
    color: "#10b981",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 5,
    name: "Image to PNG",
    slug: "image-to-png",
    description:
      "Convert images to PNG format with transparency support.",
    icon: "file-image",
    color: "#8b5cf6",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 6,
    name: "Image to WEBP",
    slug: "image-to-webp",
    description:
      "Convert images to modern WEBP format for better web performance.",
    icon: "globe",
    color: "#06b6d4",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 7,
    name: "Image to Icon",
    slug: "image-to-icon",
    description:
      "Convert images to ICO icon format for websites and applications.",
    icon: "frame",
    color: "#a855f7",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 10,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },
  {
    id: 8,
    name: "Image Cropper",
    slug: "image-cropper",
    description:
      "Crop images to custom dimensions or preset aspect ratios.",
    icon: "crop",
    color: "#14b8a6",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 20,
    category: { id: 1, name: "Image", slug: "image", icon: "image", description: "Convert and optimize images", order: 1, tool_count: 8 },
  },

  // ─── PDF Tools ────────────────────────────────────────────────────
  {
    id: 9,
    name: "PDF to JPG",
    slug: "pdf-to-jpg",
    description:
      "Convert PDF pages to high-quality JPG images. Extract pages as individual images.",
    icon: "file-output",
    color: "#ef4444",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 10,
    name: "PDF Merge",
    slug: "pdf-merge",
    description:
      "Combine multiple PDF files into a single document seamlessly.",
    icon: "files",
    color: "#f97316",
    is_active: true,
    accepts_multiple_files: true,
    max_file_size_mb: 50,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 11,
    name: "PDF Compress",
    slug: "pdf-compress",
    description:
      "Reduce PDF file size while preserving quality for easier sharing.",
    icon: "file-down",
    color: "#84cc16",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 12,
    name: "Word to PDF",
    slug: "word-to-pdf",
    description:
      "Convert Microsoft Word documents to PDF format.",
    icon: "file-text",
    color: "#2563eb",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 13,
    name: "Excel to PDF",
    slug: "excel-to-pdf",
    description:
      "Convert Excel spreadsheets to PDF format.",
    icon: "file-spreadsheet",
    color: "#16a34a",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 14,
    name: "PowerPoint to PDF",
    slug: "ppt-to-pdf",
    description:
      "Convert PowerPoint presentations to PDF format.",
    icon: "presentation",
    color: "#dc2626",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 15,
    name: "PDF to Word",
    slug: "pdf-to-word",
    description:
      "Convert PDF files to editable Microsoft Word documents.",
    icon: "file-type",
    color: "#2563eb",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },
  {
    id: 16,
    name: "PDF to Excel",
    slug: "pdf-to-excel",
    description:
      "Extract data from PDF tables and convert to Excel spreadsheets.",
    icon: "table",
    color: "#16a34a",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 30,
    category: { id: 2, name: "PDF", slug: "pdf", icon: "file-text", description: "Convert and edit PDF files", order: 2, tool_count: 8 },
  },

  // ─── File Tools ───────────────────────────────────────────────────
  {
    id: 17,
    name: "File Converter",
    slug: "file-converter",
    description:
      "Convert between various document and archive formats.",
    icon: "refresh-cw",
    color: "#7c3aed",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 25,
    category: { id: 3, name: "File", slug: "file", icon: "folder", description: "Convert between file formats", order: 3, tool_count: 5 },
  },
  {
    id: 18,
    name: "Text to Speech",
    slug: "text-to-speech",
    description:
      "Convert written text into natural-sounding speech audio.",
    icon: "volume-2",
    color: "#0891b2",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 10,
    category: { id: 3, name: "File", slug: "file", icon: "folder", description: "Convert between file formats", order: 3, tool_count: 5 },
  },
  {
    id: 19,
    name: "Archive Extractor",
    slug: "archive-extractor",
    description:
      "Extract files from ZIP, RAR, and 7z archives.",
    icon: "archive",
    color: "#d97706",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 50,
    category: { id: 3, name: "File", slug: "file", icon: "folder", description: "Convert between file formats", order: 3, tool_count: 5 },
  },
  {
    id: 20,
    name: "JSON Formatter",
    slug: "json-formatter",
    description:
      "Format, validate, and beautify JSON data for better readability.",
    icon: "braces",
    color: "#f59e0b",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 3, name: "File", slug: "file", icon: "folder", description: "Convert between file formats", order: 3, tool_count: 5 },
  },
  {
    id: 21,
    name: "CSV to JSON",
    slug: "csv-to-json",
    description:
      "Convert CSV spreadsheet data to JSON format for APIs and web apps.",
    icon: "file-json",
    color: "#8b5cf6",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 10,
    category: { id: 3, name: "File", slug: "file", icon: "folder", description: "Convert between file formats", order: 3, tool_count: 5 },
  },

  // ─── Text Tools ───────────────────────────────────────────────────
  {
    id: 22,
    name: "Text Case Converter",
    slug: "text-case-converter",
    description:
      "Convert text between uppercase, lowercase, title case, and more.",
    icon: "case-lower",
    color: "#0d9488",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },
  {
    id: 23,
    name: "Word Counter",
    slug: "word-counter",
    description:
      "Count words, characters, sentences, and paragraphs in your text.",
    icon: "calculator",
    color: "#4f46e5",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },
  {
    id: 24,
    name: "QR Generator",
    slug: "qr-generator",
    description:
      "Generate custom QR codes with URLs, text, or contact information.",
    icon: "qr-code",
    color: "#9333ea",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },
  {
    id: 25,
    name: "Text Diff Checker",
    slug: "text-diff-checker",
    description:
      "Compare two texts and highlight the differences between them.",
    icon: "diff",
    color: "#ec4899",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },
  {
    id: 26,
    name: "Lorem Ipsum Generator",
    slug: "lorem-ipsum-generator",
    description:
      "Generate placeholder text for design mockups and wireframes.",
    icon: "text-cursor",
    color: "#06b6d4",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 1,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },
  {
    id: 27,
    name: "Text Repeater",
    slug: "text-repeater",
    description:
      "Repeat text content a specified number of times with optional separators.",
    icon: "copy",
    color: "#10b981",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 5,
    category: { id: 4, name: "Text", slug: "text", icon: "type", description: "Text transformation tools", order: 4, tool_count: 6 },
  },

  // ─── Color Tools ──────────────────────────────────────────────────
  {
    id: 28,
    name: "Color Converter",
    slug: "color-converter",
    description:
      "Convert colors between HEX, RGB, HSL, and CMYK formats.",
    icon: "palette",
    color: "#e11d48",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 1,
    category: { id: 5, name: "Color", slug: "color", icon: "palette", description: "Color conversion tools", order: 5, tool_count: 4 },
  },
  {
    id: 29,
    name: "Image Color Picker",
    slug: "image-color-picker",
    description:
      "Extract colors from images and get their hex codes.",
    icon: "eyedropper",
    color: "#c026d3",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 10,
    category: { id: 5, name: "Color", slug: "color", icon: "palette", description: "Color conversion tools", order: 5, tool_count: 4 },
  },
  {
    id: 30,
    name: "Gradient Generator",
    slug: "gradient-generator",
    description:
      "Create beautiful CSS gradients with custom colors and angles.",
    icon: "droplets",
    color: "#a855f7",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 1,
    category: { id: 5, name: "Color", slug: "color", icon: "palette", description: "Color conversion tools", order: 5, tool_count: 4 },
  },
  {
    id: 31,
    name: "Color Palette Generator",
    slug: "color-palette-generator",
    description:
      "Generate harmonious color palettes from any starting color.",
    icon: "palette",
    color: "#f97316",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 1,
    category: { id: 5, name: "Color", slug: "color", icon: "palette", description: "Color conversion tools", order: 5, tool_count: 4 },
  },

  // ─── Media Tools ──────────────────────────────────────────────────
  {
    id: 32,
    name: "Video to GIF",
    slug: "video-to-gif",
    description:
      "Convert video clips to animated GIF images.",
    icon: "video",
    color: "#eab308",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 50,
    category: { id: 6, name: "Media", slug: "media", icon: "music", description: "Audio and video tools", order: 6, tool_count: 4 },
  },
  {
    id: 33,
    name: "Audio Converter",
    slug: "audio-converter",
    description:
      "Convert audio files between MP3, WAV, AAC, and OGG formats.",
    icon: "music",
    color: "#14b8a6",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 50,
    category: { id: 6, name: "Media", slug: "media", icon: "music", description: "Audio and video tools", order: 6, tool_count: 4 },
  },
  {
    id: 34,
    name: "Video Compressor",
    slug: "video-compressor",
    description:
      "Reduce video file size while maintaining acceptable quality.",
    icon: "film",
    color: "#eab308",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 100,
    category: { id: 6, name: "Media", slug: "media", icon: "music", description: "Audio and video tools", order: 6, tool_count: 4 },
  },
  {
    id: 35,
    name: "Audio Extractor",
    slug: "audio-extractor",
    description:
      "Extract audio tracks from video files in MP3 or WAV format.",
    icon: "headphones",
    color: "#22c55e",
    is_active: true,
    accepts_multiple_files: false,
    max_file_size_mb: 100,
    category: { id: 6, name: "Media", slug: "media", icon: "music", description: "Audio and video tools", order: 6, tool_count: 4 },
  },
];

// ─── CORS Headers ─────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── Route Handlers ───────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    return NextResponse.json(
      { error: "Tool not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json(tool, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
