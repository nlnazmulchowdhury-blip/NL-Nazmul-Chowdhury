import os
import io
import json
import uuid
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile

from PIL import Image, ImageFilter
import qrcode


def process_conversion(tool_slug, uploaded_file, options=None):
    """Route to the appropriate conversion handler based on tool slug."""
    options = options or {}
    handlers = {
        "image-to-jpg": convert_image_to_jpg,
        "image-to-png": convert_image_to_png,
        "image-to-webp": convert_image_to_webp,
        "resize-image": resize_image,
        "image-to-icon": convert_image_to_icon,
        "background-remove": remove_background,
        "pdf-to-jpg": convert_pdf_to_jpg,
        "compress-image": compress_image,
        "qr-generator": generate_qr_code,
        "image-cropper": crop_image,
        "json-formatter": format_json,
    }

    handler = handlers.get(tool_slug)
    if not handler:
        raise ValueError(f"Unknown tool: {tool_slug}")

    return handler(uploaded_file, options)


def convert_image_to_jpg(uploaded_file, options=None):
    """Convert any image to JPG format."""
    img = Image.open(uploaded_file)
    if img.mode in ("RGBA", "LA", "P"):
        rgb_img = Image.new("RGB", img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = rgb_img
    elif img.mode != "RGB":
        img = img.convert("RGB")

    quality = options.get("quality", 92)
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)

    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}.jpg"

    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "width": img.width,
        "height": img.height,
        "size_bytes": output.tell(),
    }


def remove_background(uploaded_file, options=None):
    """
    AI-powered background removal using rembg (u2net model).
    Removes backgrounds from images with state-of-the-art accuracy.
    Output image preserves the exact original width, height, and aspect ratio.
    """
    try:
        from rembg import remove
        import logging
        logger = logging.getLogger(__name__)

        # Read the uploaded file bytes
        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)

        # Open the original image first to capture its exact dimensions
        original_img = Image.open(io.BytesIO(file_bytes))
        original_width, original_height = original_img.size
        logger.info(
            f"Processing background removal for {uploaded_file.name} "
            f"({original_width}x{original_height})"
        )

        # Get the AI-generated alpha mask from rembg (only_mask=True returns just
        # the mask, avoiding any auto-crop or resize that rembg might apply to
        # the composited result).
        mask_bytes = remove(
            file_bytes,
            alpha_matting=options.get("alpha_matting", True),
            alpha_matting_foreground_threshold=options.get("fg_threshold", 100),
            alpha_matting_background_threshold=options.get("bg_threshold", 30),
            alpha_matting_erode_size=options.get("erode_size", 5),
            post_process_mask=options.get("post_process_mask", True),
            only_mask=True,
        )

        # Load the mask
        mask_img = Image.open(io.BytesIO(mask_bytes))

        # Ensure mask matches original dimensions exactly
        if mask_img.size != (original_width, original_height):
            logger.info(f"Mask size {mask_img.size} differs from original, resizing")
            mask_img = mask_img.resize((original_width, original_height), Image.LANCZOS)

        # Convert mask to grayscale ('L' mode) for alpha channel use
        if mask_img.mode != "L":
            mask_img = mask_img.convert("L")

        # Convert original image to RGBA (preserving all original pixel data)
        if original_img.mode != "RGBA":
            original_img = original_img.convert("RGBA")

        # Apply mask to the alpha channel — this preserves 100% of the original
        # pixel colours and dimensions, only changing transparency
        r, g, b, _ = original_img.split()
        result_img = Image.merge("RGBA", (r, g, b, mask_img))

        # Save the result
        output = io.BytesIO()
        result_img.save(output, format="PNG")
        output_bytes = output.getvalue()

        base_name = Path(uploaded_file.name).stem
        output_name = f"{base_name}_no_bg.png"

        return ContentFile(output_bytes), output_name, {
            "original_format": uploaded_file.content_type or "image",
            "width": original_width,
            "height": original_height,
            "size_bytes": len(output_bytes),
            "model": "rembg-u2net",
            "alpha_matte": options.get("alpha_matting", True),
        }
    except ImportError:
        # Fallback to PIL-based approach if rembg is not installed
        import warnings
        warnings.warn("rembg not installed. Falling back to PIL-based background removal.")
        return _remove_background_pil_fallback(uploaded_file, options)


def _remove_background_pil_fallback(uploaded_file, options=None):
    """
    Fallback background removal using PIL color-based approach.
    Used when rembg is not available.
    """
    img = Image.open(uploaded_file).convert("RGBA")
    rgb_img = img.convert("RGB")

    # Get the corner colors to determine background
    corners = [
        rgb_img.getpixel((0, 0)),
        rgb_img.getpixel((rgb_img.width - 1, 0)),
        rgb_img.getpixel((0, rgb_img.height - 1)),
        rgb_img.getpixel((rgb_img.width - 1, rgb_img.height - 1)),
    ]

    # Average corner color as background color estimate
    bg_color = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    # Create a mask based on color difference
    threshold = options.get("threshold", 60) if options else 60
    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            dist = sum(abs(c - bg) for c, bg in zip((r, g, b), bg_color))
            if dist < threshold:
                pixels[x, y] = (r, g, b, 0)

    output = io.BytesIO()
    img.save(output, format="PNG")

    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}_no_bg.png"

    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "width": width,
        "height": height,
        "size_bytes": output.tell(),
        "model": "pil-fallback",
    }


def convert_pdf_to_jpg(uploaded_file, options=None):
    """
    Convert PDF first page to JPG.
    Note: For full PDF support, install pdf2image which requires poppler.
    This handles image-based PDFs with PIL as a basic implementation.
    """
    import io as _io

    # Try to read the file content
    content = uploaded_file.read()
    uploaded_file.seek(0)

    try:
        # Attempt to open as image (handles single-page image-based PDFs)
        img = Image.open(uploaded_file)
        if img.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
    except Exception:
        # Create a placeholder image indicating PDF was received
        img = Image.new("RGB", (800, 600), (255, 255, 255))
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        draw.text((400, 300), f"PDF: {uploaded_file.name}\n(poppler/pdf2image required\nfor full PDF rendering)",
                  fill=(100, 100, 100), anchor="mm")

    quality = options.get("quality", 85)
    output = _io.BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)

    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}_page_1.jpg"

    return ContentFile(output.getvalue()), output_name, {
        "original_format": "application/pdf",
        "width": img.width,
        "height": img.height,
        "size_bytes": output.tell(),
    }


def compress_image(uploaded_file, options=None):
    """Compress image by reducing quality and optimizing."""
    img = Image.open(uploaded_file)

    # Preserve original mode, convert RGBA to RGB if saving as JPEG
    quality = options.get("quality", 60)
    max_width = options.get("max_width", 1920)
    max_height = options.get("max_height", 1920)

    # Resize if larger than max dimensions
    if img.width > max_width or img.height > max_height:
        img.thumbnail((max_width, max_height), Image.LANCZOS)

    # Choose output format
    original_format = img.format or "JPEG"
    output_format = options.get("output_format", original_format)

    if output_format.upper() in ("JPG", "JPEG") and img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = bg
        output_format = "JPEG"

    output = io.BytesIO()
    img.save(output, format=output_format, quality=quality, optimize=True)

    base_name = Path(uploaded_file.name).stem
    ext = output_format.lower()
    output_name = f"{base_name}_compressed.{ext}"

    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "compression_quality": quality,
        "width": img.width,
        "height": img.height,
        "original_size": uploaded_file.size,
        "compressed_size": output.tell(),
        "compression_ratio": round((1 - output.tell() / max(uploaded_file.size, 1)) * 100, 1),
    }


def crop_image(uploaded_file, options=None):
    """Crop an image to specified dimensions."""
    img = Image.open(uploaded_file)

    width = options.get("width")
    height = options.get("height")
    x = options.get("x", 0)
    y = options.get("y", 0)
    aspect_ratio = options.get("aspect_ratio")

    # If no specific dimensions, use the full image
    if not width and not height and not aspect_ratio:
        # Center-crop to a square by default
        min_dim = min(img.width, img.height)
        x = (img.width - min_dim) // 2
        y = (img.height - min_dim) // 2
        cropped = img.crop((x, y, x + min_dim, y + min_dim))
        output_width = min_dim
        output_height = min_dim
    elif aspect_ratio:
        # Parse aspect ratio like "16:9", "4:3", "1:1"
        try:
            ratio_parts = aspect_ratio.split(":")
            ratio_w = float(ratio_parts[0])
            ratio_h = float(ratio_parts[1])
            if ratio_w <= 0 or ratio_h <= 0:
                raise ValueError("Aspect ratio values must be positive")
        except (ValueError, IndexError):
            raise ValueError(f"Invalid aspect ratio format: {aspect_ratio}. Use '16:9', '4:3', etc.")

        # Calculate crop box that fits within the image at this aspect ratio
        target_ratio = ratio_w / ratio_h
        img_ratio = img.width / img.height

        if img_ratio > target_ratio:
            # Image is wider - crop sides
            new_width = int(img.height * target_ratio)
            x = (img.width - new_width) // 2
            cropped = img.crop((x, 0, x + new_width, img.height))
            output_width = new_width
            output_height = img.height
        else:
            # Image is taller - crop top/bottom
            new_height = int(img.width / target_ratio)
            y = (img.height - new_height) // 2
            cropped = img.crop((0, y, img.width, y + new_height))
            output_width = img.width
            output_height = new_height
    else:
        # Custom dimensions
        width = max(1, int(width)) if width else img.width
        height = max(1, int(height)) if height else img.height
        x = max(0, int(x)) if x else 0
        y = max(0, int(y)) if y else 0

        # Clamp values to image boundaries
        x = min(x, max(0, img.width - 1))
        y = min(y, max(0, img.height - 1))
        width = min(width, max(1, img.width - x))
        height = min(height, max(1, img.height - y))

        cropped = img.crop((x, y, x + width, y + height))
        output_width = width
        output_height = height

    # Preserve original format if possible
    original_format = img.format or "PNG"
    output_format = options.get("output_format", original_format)

    if output_format.upper() in ("JPG", "JPEG") and cropped.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", cropped.size, (255, 255, 255))
        bg.paste(cropped, mask=cropped.split()[-1] if cropped.mode == "RGBA" else None)
        cropped = bg
        output_format = "JPEG"

    output = io.BytesIO()
    save_kwargs = {"format": output_format, "optimize": True}
    if output_format.upper() in ("JPEG", "JPG"):
        save_kwargs["quality"] = options.get("quality", 92)
    cropped.save(output, **save_kwargs)

    base_name = Path(uploaded_file.name).stem
    ext = output_format.lower().replace("jpeg", "jpg")
    output_name = f"{base_name}_cropped.{ext}"

    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "original_width": img.width,
        "original_height": img.height,
        "width": output_width,
        "height": output_height,
        "aspect_ratio": aspect_ratio or f"{output_width}:{output_height}",
        "size_bytes": output.tell(),
        "x_offset": x if not aspect_ratio else None,
        "y_offset": y if not aspect_ratio else None,
    }


def format_json(uploaded_file, options=None):
    """Validate and format JSON with pretty-printing or minification."""
    mode = options.get("mode", "format")  # 'format' or 'minify'
    indent = options.get("indent", 2)

    # Read JSON from uploaded file or options
    if uploaded_file:
        try:
            raw = uploaded_file.read().decode("utf-8").strip()
        except UnicodeDecodeError:
            raw = options.get("text", "")
    else:
        raw = options.get("text", "")

    if not raw:
        raise ValueError("No JSON input provided. Paste JSON text or upload a .json file.")

    # Parse to validate
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        # Get context around the error position
        lines = raw[: e.pos].split("\n")
        line_no = len(lines)
        col_no = len(lines[-1]) if lines else 0
        context_start = max(0, e.pos - 40)
        context_end = min(len(raw), e.pos + 40)
        snippet = raw[context_start:context_end]
        error_msg = str(e)
        if line_no > 0:
            error_msg += f" at line {line_no}, column {col_no}"

        raise ValueError(json.dumps({
            "error": "Invalid JSON",
            "detail": str(e).replace("'", "'"),
            "line": line_no,
            "column": col_no,
            "position": e.pos,
            "snippet": snippet,
        }))

    # Format or minify
    if mode == "minify":
        formatted = json.dumps(parsed, separators=(",", ":"), ensure_ascii=False)
        output_filename = "formatted.min.json"
    else:
        formatted = json.dumps(parsed, indent=indent, ensure_ascii=False) + "\n"
        output_filename = "formatted.json"

    # Also create a downloadable file
    output = io.BytesIO(formatted.encode("utf-8"))

    # Count stats
    raw_size = len(raw.encode("utf-8"))
    formatted_size = len(formatted.encode("utf-8"))
    raw_type = type(parsed).__name__

    return ContentFile(output.getvalue()), output_filename, {
        "valid": True,
        "type": raw_type,
        "mode": mode,
        "indent": indent if mode == "format" else None,
        "original_size": raw_size,
        "formatted_size": formatted_size,
        "size_change": formatted_size - raw_size,
        "keys_count": len(parsed) if isinstance(parsed, dict) else None,
        "items_count": len(parsed) if isinstance(parsed, list) else None,
        "formatted_preview": formatted[:100000],
    }


def convert_image_to_png(uploaded_file, options=None):
    """Convert any image to PNG format with transparency support."""
    img = Image.open(uploaded_file)
    
    # Preserve RGBA if already present
    if img.mode not in ("RGBA", "RGB", "P", "LA"):
        img = img.convert("RGBA")
    elif img.mode == "P" or img.mode == "LA":
        img = img.convert("RGBA")
    
    output = io.BytesIO()
    img.save(output, format="PNG", optimize=True)
    
    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}.png"
    
    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "width": img.width,
        "height": img.height,
        "size_bytes": output.tell(),
        "has_transparency": img.mode == "RGBA",
    }


def convert_image_to_webp(uploaded_file, options=None):
    """Convert any image to WEBP format for better web performance."""
    img = Image.open(uploaded_file)
    
    quality = options.get("quality", 80)
    
    # WEBP supports transparency, so preserve RGBA
    if img.mode not in ("RGBA", "RGB", "P"):
        img = img.convert("RGBA")
    elif img.mode == "P":
        img = img.convert("RGBA")
    
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, optimize=True)
    
    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}.webp"
    
    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "width": img.width,
        "height": img.height,
        "size_bytes": output.tell(),
        "quality": quality,
    }


def resize_image(uploaded_file, options=None):
    """Resize images to exact dimensions or scale by percentage."""
    img = Image.open(uploaded_file)
    orig_w, orig_h = img.size
    
    width = options.get("width")
    height = options.get("height")
    percentage = options.get("percentage")
    maintain_aspect = options.get("maintain_aspect", True)
    
    if percentage:
        # Scale by percentage
        factor = float(percentage) / 100
        new_w = max(1, int(orig_w * factor))
        new_h = max(1, int(orig_h * factor))
    elif width and height:
        new_w = int(width)
        new_h = int(height)
        if maintain_aspect:
            # Fit within given dimensions maintaining aspect ratio
            img.thumbnail((new_w, new_h), Image.LANCZOS)
            new_w, new_h = img.size
        else:
            img = img.resize((new_w, new_h), Image.LANCZOS)
    elif width:
        # Width specified, height auto
        ratio = int(width) / orig_w
        new_w = int(width)
        new_h = max(1, int(orig_h * ratio))
        img = img.resize((new_w, new_h), Image.LANCZOS)
    elif height:
        # Height specified, width auto
        ratio = int(height) / orig_h
        new_h = int(height)
        new_w = max(1, int(orig_w * ratio))
        img = img.resize((new_w, new_h), Image.LANCZOS)
    else:
        # Default: scale to 50%
        new_w = max(1, orig_w // 2)
        new_h = max(1, orig_h // 2)
        img = img.resize((new_w, new_h), Image.LANCZOS)
    
    # Preserve original mode
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
    output_format = options.get("output_format", "PNG")
    
    output = io.BytesIO()
    save_kwargs = {"format": output_format, "optimize": True}
    if output_format.upper() in ("JPEG", "JPG"):
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        save_kwargs["quality"] = options.get("quality", 85)
    img.save(output, **save_kwargs)
    
    ext = output_format.lower().replace("jpeg", "jpg")
    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}_resized.{ext}"
    
    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "original_width": orig_w,
        "original_height": orig_h,
        "width": new_w,
        "height": new_h,
        "percentage": percentage or round((new_w / orig_w) * 100, 1),
        "size_bytes": output.tell(),
    }


def convert_image_to_icon(uploaded_file, options=None):
    """Convert images to ICO icon format."""
    img = Image.open(uploaded_file)
    
    # ICO format typically uses square sizes
    sizes = options.get("sizes", [16, 32, 48, 64, 128, 256])
    
    # Convert to RGBA for transparency support
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    
    # Resize to the largest requested size first
    max_size = max(sizes)
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    
    output = io.BytesIO()
    img.save(output, format="ICO", sizes=[(s, s) for s in sizes if s <= max(img.width, img.height)])
    
    base_name = Path(uploaded_file.name).stem
    output_name = f"{base_name}.ico"
    
    return ContentFile(output.getvalue()), output_name, {
        "original_format": uploaded_file.content_type or "image",
        "original_width": img.width,
        "original_height": img.height,
        "sizes": [s for s in sizes if s <= max(img.width, img.height)],
        "size_bytes": output.tell(),
    }


def generate_qr_code(uploaded_file, options=None):
    """Generate QR code from text/URL data."""
    # If a file is uploaded, read its content as text
    if uploaded_file:
        try:
            data = uploaded_file.read().decode("utf-8").strip()
        except UnicodeDecodeError:
            data = uploaded_file.name
    else:
        data = options.get("text", "https://proconverterbd.com")

    if not data:
        data = "https://proconverterbd.com"

    # Generate QR code
    qr = qrcode.QRCode(
        version=options.get("version", 1),
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=options.get("box_size", 10),
        border=options.get("border", 4),
    )
    qr.add_data(data)
    qr.make(fit=True)

    fill_color = options.get("fill_color", "#000000")
    back_color = options.get("back_color", "#ffffff")

    img = qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGB")

    # Scale up for better quality
    scale = options.get("scale", 4)
    width, height = img.size
    img = img.resize((width * scale, height * scale), Image.NEAREST)

    output = io.BytesIO()
    img.save(output, format="PNG")

    output_name = f"qrcode_{uuid.uuid4().hex[:8]}.png"

    return ContentFile(output.getvalue()), output_name, {
        "data": data[:100],
        "data_length": len(data),
        "size_bytes": output.tell(),
        "version": qr.version,
    }
