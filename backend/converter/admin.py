from django.contrib import admin
from .models import Category, Tool, ConversionHistory, SiteSetting


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order", "is_active"]
    prepopulated_fields = {"slug": ["name"]}
    list_editable = ["order", "is_active"]


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "category", "is_active", "max_file_size_mb"]
    prepopulated_fields = {"slug": ["name"]}
    list_filter = ["category", "is_active"]
    list_editable = ["is_active", "max_file_size_mb"]


@admin.register(ConversionHistory)
class ConversionHistoryAdmin(admin.ModelAdmin):
    list_display = ["original_filename", "tool", "status", "file_size", "created_at"]
    list_filter = ["status", "tool", "created_at"]
    readonly_fields = ["original_file", "converted_file", "meta_data"]


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ["key", "value", "value_type", "updated_at"]
    list_editable = ["value"]
    search_fields = ["key", "label"]
