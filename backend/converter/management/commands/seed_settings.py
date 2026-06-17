from django.core.management.base import BaseCommand
from converter.models import SiteSetting


class Command(BaseCommand):
    help = "Seed default site settings"

    def handle(self, *args, **kwargs):
        defaults = [
            ("site_name", "ProConverterBD", "string", "Site Name", "The name of your website"),
            ("site_tagline", "All-in-One File Conversion Platform", "string", "Tagline", "Site tagline shown in the hero"),
            ("site_description", "Convert images, PDFs, text, and more - all in one place. Fast, secure, and completely free.", "text", "Description", "Meta description for SEO"),
            ("contact_email", "hello@proconverterbd.com", "email", "Contact Email", "Primary contact email address"),
            ("primary_color", "#6366f1", "color", "Primary Color", "Primary brand color (hex)"),
            ("items_per_page", "12", "integer", "Items Per Page", "Number of items to show per page"),
            ("maintenance_mode", "false", "boolean", "Maintenance Mode", "Enable maintenance mode (site will show maintenance page)"),
            ("max_upload_size_mb", "50", "integer", "Max Upload Size (MB)", "Maximum file upload size in megabytes"),
            ("allow_registration", "false", "boolean", "Allow Registration", "Allow new user registration"),
            ("google_analytics_id", "", "string", "Google Analytics ID", "Google Analytics tracking ID (e.g. G-XXXXXXXXXX)"),
            ("adsense_publisher_id", "", "string", "AdSense Publisher ID", "Google AdSense publisher ID (e.g. ca-pub-XXXXXXXXXXXXXX)"),
            ("meta_keywords", "file converter, image converter, PDF tools, free online tools, ProConverterBD", "text", "Meta Keywords", "Comma-separated meta keywords for SEO"),
            ("footer_text", "© 2026 ProConverterBD. All rights reserved.", "string", "Footer Text", "Copyright text displayed in the footer"),
            ("logo_url", "", "url", "Logo URL", "URL to your custom logo image (optional)"),
            ("require_2fa", "false", "boolean", "Require 2FA", "Require two-factor authentication for all admin users"),
        ]

        created = 0
        for key, value, value_type, label, description in defaults:
            _, is_new = SiteSetting.objects.get_or_create(
                key=key,
                defaults={
                    "value": value,
                    "value_type": value_type,
                    "label": label,
                    "description": description,
                },
            )
            if is_new:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} site settings (total: {SiteSetting.objects.count()})"))
