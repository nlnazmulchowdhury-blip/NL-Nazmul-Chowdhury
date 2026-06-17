from rest_framework import serializers
from .models import Category, Tool, ConversionHistory


class CategorySerializer(serializers.ModelSerializer):
    tool_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "description", "order", "tool_count"]

    def get_tool_count(self, obj):
        return obj.tools.filter(is_active=True).count()


class ToolListSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Tool
        fields = [
            "id", "name", "slug", "description", "icon", "color",
            "category_slug", "accepts_multiple_files", "max_file_size_mb",
        ]


class ToolDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Tool
        fields = "__all__"


class ConversionHistorySerializer(serializers.ModelSerializer):
    tool_slug = serializers.CharField(source="tool.slug", read_only=True)
    tool_name = serializers.CharField(source="tool.name", read_only=True)

    class Meta:
        model = ConversionHistory
        fields = [
            "id", "tool", "tool_slug", "tool_name",
            "original_file", "converted_file",
            "original_filename", "file_size", "status",
            "error_message", "meta_data", "created_at",
        ]
        read_only_fields = ["status", "error_message", "converted_file", "created_at"]


class ConvertRequestSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    tool_slug = serializers.CharField(required=True)
    options = serializers.JSONField(required=False, default=dict)
