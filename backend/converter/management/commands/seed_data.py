from django.core.management.base import BaseCommand
from converter.models import Category, Tool


class Command(BaseCommand):
    help = "Seed the database with initial categories and tools"

    def handle(self, *args, **kwargs):
        self._create_categories()
        self._create_tools()
        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))

    def _create_categories(self):
        categories = [
            {"name": "Image", "slug": "image", "icon": "image", "description": "Convert and optimize images", "order": 1},
            {"name": "PDF", "slug": "pdf", "icon": "file-text", "description": "Convert and edit PDF files", "order": 2},
            {"name": "File", "slug": "file", "icon": "folder", "description": "Convert between file formats", "order": 3},
            {"name": "Text", "slug": "text", "icon": "type", "description": "Text transformation tools", "order": 4},
            {"name": "Color", "slug": "color", "icon": "palette", "description": "Color conversion tools", "order": 5},
            {"name": "Media", "slug": "media", "icon": "music", "description": "Audio and video tools", "order": 6},
        ]
        for cat_data in categories:
            Category.objects.get_or_create(slug=cat_data["slug"], defaults=cat_data)
        self.stdout.write(f"Created {len(categories)} categories")

    def _create_tools(self):
        tools = [
            {
                "name": "Image to JPG",
                "slug": "image-to-jpg",
                "description": "Convert any image format (PNG, WEBP, BMP, GIF) to high-quality JPG with adjustable compression.",
                "icon": "image",
                "color": "#6366f1",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "Background Remover",
                "slug": "background-remove",
                "description": "Remove background from images automatically. Perfect for product photos, portraits, and graphics.",
                "icon": "eraser",
                "color": "#ec4899",
                "category_slug": "image",
                "max_file_size_mb": 15,
            },
            {
                "name": "Compress Image",
                "slug": "compress-image",
                "description": "Reduce image file size while maintaining quality. Optimize for web and email.",
                "icon": "zap",
                "color": "#f59e0b",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "Resize Image",
                "slug": "resize-image",
                "description": "Resize images to exact dimensions or scale by percentage.",
                "icon": "maximize",
                "color": "#10b981",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "Image to PNG",
                "slug": "image-to-png",
                "description": "Convert images to PNG format with transparency support.",
                "icon": "file-image",
                "color": "#8b5cf6",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "Image to WEBP",
                "slug": "image-to-webp",
                "description": "Convert images to modern WEBP format for better web performance.",
                "icon": "globe",
                "color": "#06b6d4",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "PDF to JPG",
                "slug": "pdf-to-jpg",
                "description": "Convert PDF pages to high-quality JPG images. Extract pages as individual images.",
                "icon": "file-output",
                "color": "#ef4444",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "PDF Merge",
                "slug": "pdf-merge",
                "description": "Combine multiple PDF files into a single document seamlessly.",
                "icon": "files",
                "color": "#f97316",
                "category_slug": "pdf",
                "max_file_size_mb": 50,
            },
            {
                "name": "PDF Compress",
                "slug": "pdf-compress",
                "description": "Reduce PDF file size while preserving quality for easier sharing.",
                "icon": "file-down",
                "color": "#84cc16",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "Word to PDF",
                "slug": "word-to-pdf",
                "description": "Convert Microsoft Word documents to PDF format.",
                "icon": "file-text",
                "color": "#2563eb",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "Excel to PDF",
                "slug": "excel-to-pdf",
                "description": "Convert Excel spreadsheets to PDF format.",
                "icon": "file-spreadsheet",
                "color": "#16a34a",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "PowerPoint to PDF",
                "slug": "ppt-to-pdf",
                "description": "Convert PowerPoint presentations to PDF format.",
                "icon": "presentation",
                "color": "#dc2626",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "File Converter",
                "slug": "file-converter",
                "description": "Convert between various document and archive formats.",
                "icon": "refresh-cw",
                "color": "#7c3aed",
                "category_slug": "file",
                "max_file_size_mb": 25,
            },
            {
                "name": "Text to Speech",
                "slug": "text-to-speech",
                "description": "Convert written text into natural-sounding speech audio.",
                "icon": "volume-2",
                "color": "#0891b2",
                "category_slug": "file",
                "max_file_size_mb": 10,
            },
            {
                "name": "Archive Extractor",
                "slug": "archive-extractor",
                "description": "Extract files from ZIP, RAR, and 7z archives.",
                "icon": "archive",
                "color": "#d97706",
                "category_slug": "file",
                "max_file_size_mb": 50,
            },
            {
                "name": "Text Case Converter",
                "slug": "text-case-converter",
                "description": "Convert text between uppercase, lowercase, title case, and more.",
                "icon": "case-lower",
                "color": "#0d9488",
                "category_slug": "text",
                "max_file_size_mb": 5,
            },
            {
                "name": "Word Counter",
                "slug": "word-counter",
                "description": "Count words, characters, sentences, and paragraphs in your text.",
                "icon": "calculator",
                "color": "#4f46e5",
                "category_slug": "text",
                "max_file_size_mb": 5,
            },
            {
                "name": "QR Generator",
                "slug": "qr-generator",
                "description": "Generate custom QR codes with URLs, text, or contact information.",
                "icon": "qr-code",
                "color": "#9333ea",
                "category_slug": "text",
                "max_file_size_mb": 5,
            },
            {
                "name": "Color Converter",
                "slug": "color-converter",
                "description": "Convert colors between HEX, RGB, HSL, and CMYK formats.",
                "icon": "palette",
                "color": "#e11d48",
                "category_slug": "color",
                "max_file_size_mb": 1,
            },
            {
                "name": "Image Color Picker",
                "slug": "image-color-picker",
                "description": "Extract colors from images and get their hex codes.",
                "icon": "eyedropper",
                "color": "#c026d3",
                "category_slug": "color",
                "max_file_size_mb": 10,
            },
            {
                "name": "Video to GIF",
                "slug": "video-to-gif",
                "description": "Convert video clips to animated GIF images.",
                "icon": "video",
                "color": "#eab308",
                "category_slug": "media",
                "max_file_size_mb": 50,
            },
            {
                "name": "Audio Converter",
                "slug": "audio-converter",
                "description": "Convert audio files between MP3, WAV, AAC, and OGG formats.",
                "icon": "music",
                "color": "#14b8a6",
                "category_slug": "media",
                "max_file_size_mb": 50,
            },
            {
                "name": "Image to Icon",
                "slug": "image-to-icon",
                "description": "Convert images to ICO icon format for websites and applications.",
                "icon": "frame",
                "color": "#a855f7",
                "category_slug": "image",
                "max_file_size_mb": 10,
            },
            {
                "name": "Image Cropper",
                "slug": "image-cropper",
                "description": "Crop images to custom dimensions or preset aspect ratios.",
                "icon": "crop",
                "color": "#14b8a6",
                "category_slug": "image",
                "max_file_size_mb": 20,
            },
            {
                "name": "PDF to Word",
                "slug": "pdf-to-word",
                "description": "Convert PDF files to editable Microsoft Word documents.",
                "icon": "file-type",
                "color": "#2563eb",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "PDF to Excel",
                "slug": "pdf-to-excel",
                "description": "Extract data from PDF tables and convert to Excel spreadsheets.",
                "icon": "table",
                "color": "#16a34a",
                "category_slug": "pdf",
                "max_file_size_mb": 30,
            },
            {
                "name": "JSON Formatter",
                "slug": "json-formatter",
                "description": "Format, validate, and beautify JSON data for better readability.",
                "icon": "braces",
                "color": "#f59e0b",
                "category_slug": "file",
                "max_file_size_mb": 5,
            },
            {
                "name": "CSV to JSON",
                "slug": "csv-to-json",
                "description": "Convert CSV spreadsheet data to JSON format for APIs and web apps.",
                "icon": "file-json",
                "color": "#8b5cf6",
                "category_slug": "file",
                "max_file_size_mb": 10,
            },
            {
                "name": "Text Diff Checker",
                "slug": "text-diff-checker",
                "description": "Compare two texts and highlight the differences between them.",
                "icon": "diff",
                "color": "#ec4899",
                "category_slug": "text",
                "max_file_size_mb": 5,
            },
            {
                "name": "Lorem Ipsum Generator",
                "slug": "lorem-ipsum-generator",
                "description": "Generate placeholder text for design mockups and wireframes.",
                "icon": "text-cursor",
                "color": "#06b6d4",
                "category_slug": "text",
                "max_file_size_mb": 1,
            },
            {
                "name": "Text Repeater",
                "slug": "text-repeater",
                "description": "Repeat text content a specified number of times with optional separators.",
                "icon": "copy",
                "color": "#10b981",
                "category_slug": "text",
                "max_file_size_mb": 5,
            },
            {
                "name": "Gradient Generator",
                "slug": "gradient-generator",
                "description": "Create beautiful CSS gradients with custom colors and angles.",
                "icon": "droplets",
                "color": "#a855f7",
                "category_slug": "color",
                "max_file_size_mb": 1,
            },
            {
                "name": "Color Palette Generator",
                "slug": "color-palette-generator",
                "description": "Generate harmonious color palettes from any starting color.",
                "icon": "palette",
                "color": "#f97316",
                "category_slug": "color",
                "max_file_size_mb": 1,
            },
            {
                "name": "Video Compressor",
                "slug": "video-compressor",
                "description": "Reduce video file size while maintaining acceptable quality.",
                "icon": "film",
                "color": "#eab308",
                "category_slug": "media",
                "max_file_size_mb": 100,
            },
            {
                "name": "Audio Extractor",
                "slug": "audio-extractor",
                "description": "Extract audio tracks from video files in MP3 or WAV format.",
                "icon": "headphones",
                "color": "#22c55e",
                "category_slug": "media",
                "max_file_size_mb": 100,
            },
        ]

        created_count = 0
        for tool_data in tools:
            category_slug = tool_data.pop("category_slug")
            try:
                category = Category.objects.get(slug=category_slug)
                tool_data["category"] = category
                _, created = Tool.objects.get_or_create(slug=tool_data["slug"], defaults=tool_data)
                if created:
                    created_count += 1
            except Category.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Category '{category_slug}' not found, skipping tool '{tool_data['name']}'"))

        self.stdout.write(f"Created {created_count} tools (total: {Tool.objects.count()})")
