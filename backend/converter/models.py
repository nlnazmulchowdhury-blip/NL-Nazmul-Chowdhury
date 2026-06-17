from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    icon = models.CharField(max_length=50, help_text="Lucide icon name", default="package")
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["order"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tool(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="tools")
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, help_text="Lucide icon name", default="wrench")
    color = models.CharField(max_length=7, default="#6366f1", help_text="Hex color for card accent")
    is_active = models.BooleanField(default=True)
    accepts_multiple_files = models.BooleanField(default=False)
    max_file_size_mb = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SiteSetting(models.Model):
    """Key-value store for site-wide configuration."""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True, default="")
    value_type = models.CharField(
        max_length=20,
        choices=[
            ("string", "String"),
            ("text", "Text"),
            ("boolean", "Boolean"),
            ("integer", "Integer"),
            ("email", "Email"),
            ("url", "URL"),
            ("color", "Color"),
        ],
        default="string",
    )
    label = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key

    @classmethod
    def get_value(cls, key, default=""):
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_bool(cls, key, default=False):
        val = cls.get_value(key, str(default))
        return val.lower() in ("true", "1", "yes")

    @classmethod
    def get_int(cls, key, default=0):
        try:
            return int(cls.get_value(key, str(default)))
        except (ValueError, TypeError):
            return default


class TwoFactorProfile(models.Model):
    """Stores TOTP secret and 2FA settings for a user."""
    user = models.OneToOneField(
        "auth.User", on_delete=models.CASCADE, related_name="two_factor_profile"
    )
    secret = models.CharField(max_length=32, blank=True, default="")
    is_enabled = models.BooleanField(default=False)
    backup_codes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"2FA for {self.user.username}: {'enabled' if self.is_enabled else 'disabled'}"


class ConversionHistory(models.Model):
    tool = models.ForeignKey(Tool, on_delete=models.SET_NULL, null=True, related_name="conversions")
    original_file = models.FileField(upload_to="uploads/%Y/%m/%d/")
    converted_file = models.FileField(upload_to="converted/%Y/%m/%d/", blank=True, null=True)
    original_filename = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("processing", "Processing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="pending",
    )
    error_message = models.TextField(blank=True)
    meta_data = models.JSONField(blank=True, default=dict)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "conversion histories"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.original_filename} -> {self.tool.name if self.tool else 'Unknown'}"
