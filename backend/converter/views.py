import os
import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Category, Tool, ConversionHistory
from .serializers import (
    CategorySerializer,
    ToolListSerializer,
    ToolDetailSerializer,
    ConversionHistorySerializer,
    ConvertRequestSerializer,
)
from .utils import process_conversion, generate_qr_code, format_json

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = "slug"


class ToolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tool.objects.filter(is_active=True)
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return ToolListSerializer
        return ToolDetailSerializer

    def get_queryset(self):
        queryset = self.queryset
        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        return queryset


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def convert_file(request):
    """Handle file conversion requests."""
    serializer = ConvertRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    tool_slug = serializer.validated_data["tool_slug"]
    uploaded_file = serializer.validated_data["file"]
    options = serializer.validated_data.get("options", {})

    tool = get_object_or_404(Tool, slug=tool_slug, is_active=True)

    # Check file size
    max_bytes = tool.max_file_size_mb * 1024 * 1024
    if uploaded_file.size > max_bytes:
        return Response(
            {"error": f"File too large. Maximum size is {tool.max_file_size_mb}MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create conversion history record
    conversion = ConversionHistory.objects.create(
        tool=tool,
        original_file=uploaded_file,
        original_filename=uploaded_file.name,
        file_size=uploaded_file.size,
        status="processing",
        ip_address=request.META.get("REMOTE_ADDR", ""),
    )

    try:
        # Reset file stream — it was consumed by the history record save above
        uploaded_file.seek(0)

        # Process the conversion
        result_file, output_filename, meta = process_conversion(tool_slug, uploaded_file, options)

        # Save the converted file
        conversion.converted_file.save(output_filename, result_file, save=False)
        conversion.status = "completed"
        conversion.meta_data = meta
        conversion.save()

        # Build response
        response_serializer = ConversionHistorySerializer(conversion)
        result = response_serializer.data
        result["download_url"] = request.build_absolute_uri(conversion.converted_file.url)
        result["meta_data"] = meta

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Conversion failed for {tool_slug}")
        conversion.status = "failed"
        conversion.error_message = str(e)
        conversion.save()

        return Response(
            {"error": f"Conversion failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def generate_qr(request):
    """Generate QR code. Can accept text input or file."""
    data = request.data.get("text", "")
    options = {}

    # Simulate upload for QR generator
    from django.core.files.base import ContentFile

    class FakeUploadedFile:
        name = "qr_data.txt"
        size = len(data)
        content_type = "text/plain"
        def __init__(self, data):
            self.data = data.encode("utf-8") if isinstance(data, str) else data
        def read(self, size=-1):
            return self.data
        def seek(self, offset):
            pass

    uploaded_file = FakeUploadedFile(data) if data else None
    options = request.data.dict()
    options.pop("text", None)
    options.pop("tool_slug", None)

    try:
        result_file, output_filename, meta = generate_qr_code(uploaded_file, options)

        # Save to conversion history
        tool = get_object_or_404(Tool, slug="qr-generator")
        conversion = ConversionHistory.objects.create(
            tool=tool,
            original_filename=f"qr_data_{meta['data'][:20]}.txt",
            file_size=len(data) if data else 0,
            status="completed",
            meta_data=meta,
        )
        conversion.converted_file.save(output_filename, result_file, save=False)
        conversion.save()

        response_data = ConversionHistorySerializer(conversion).data
        response_data["download_url"] = request.build_absolute_uri(conversion.converted_file.url)
        response_data["meta_data"] = meta

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def format_json_view(request):
    """Validate and format JSON text."""
    import json

    text = request.data.get("text", "")
    mode = request.data.get("mode", "format")
    try:
        indent = min(8, max(2, int(request.data.get("indent", 2))))
    except (ValueError, TypeError):
        indent = 2

    # Also accept file upload
    uploaded_file = request.FILES.get("file")

    if not text and not uploaded_file:
        return Response(
            {"error": "No JSON input provided. Paste JSON text or upload a .json file."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Simulate uploaded file for the utility function
    class TextAsFile:
        name = "input.json"
        size = len(text.encode("utf-8")) if text else 0
        content_type = "text/plain"
        def __init__(self, data):
            self.data = data.encode("utf-8") if isinstance(data, str) else data
        def read(self, size=-1):
            return self.data
        def seek(self, offset):
            pass

    fake_file = TextAsFile(text) if text else uploaded_file

    options = {
        "text": text,
        "mode": mode,
        "indent": int(indent) if str(indent).isdigit() else 2,
    }

    try:
        result_file, output_filename, meta = format_json(fake_file, options)

        # Save to conversion history
        tool = get_object_or_404(Tool, slug="json-formatter")
        conversion = ConversionHistory.objects.create(
            tool=tool,
            original_file=result_file if isinstance(result_file, str) else None,
            original_filename="input.json",
            file_size=len(text) if text else 0,
            status="completed",
            meta_data=meta,
        )
        conversion.converted_file.save(output_filename, result_file, save=False)
        conversion.save()

        response_data = ConversionHistorySerializer(conversion).data
        response_data["download_url"] = request.build_absolute_uri(conversion.converted_file.url)
        response_data["meta_data"] = meta
        response_data["formatted_text"] = meta.get("formatted_preview", "")

        return Response(response_data, status=status.HTTP_200_OK)

    except ValueError as e:
        # Try to parse the error as JSON if it came from format_json
        try:
            err_data = json.loads(str(e))
            return Response(err_data, status=status.HTTP_400_BAD_REQUEST)
        except (_json.JSONDecodeError, TypeError):
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConversionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ConversionHistory.objects.all()
    serializer_class = ConversionHistorySerializer

    def get_queryset(self):
        return self.queryset.filter(ip_address=self.request.META.get("REMOTE_ADDR", ""))
