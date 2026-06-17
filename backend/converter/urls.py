from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import admin_views

router = DefaultRouter()
router.register(r"categories", views.CategoryViewSet)
router.register(r"tools", views.ToolViewSet)
router.register(r"history", views.ConversionHistoryViewSet)

admin_urlpatterns = [
    path("login/", admin_views.admin_login, name="admin-login"),
    path("logout/", admin_views.admin_logout, name="admin-logout"),
    path("check-auth/", admin_views.admin_check_auth, name="admin-check-auth"),
    path("dashboard/", admin_views.admin_dashboard, name="admin-dashboard"),
    path("tools/", admin_views.admin_tools, name="admin-tools"),
    path("tools/<int:tool_id>/", admin_views.admin_tool_detail, name="admin-tool-detail"),
    path("users/", admin_views.admin_users, name="admin-users"),
    path("categories/", admin_views.admin_categories, name="admin-categories"),
    path("categories/<int:category_id>/", admin_views.admin_category_detail, name="admin-category-detail"),
    path("2fa/setup/", admin_views.admin_setup_2fa, name="admin-2fa-setup"),
    path("2fa/verify/", admin_views.admin_verify_2fa, name="admin-2fa-verify"),
    path("2fa/disable/", admin_views.admin_disable_2fa, name="admin-2fa-disable"),
    path("2fa/status/", admin_views.admin_2fa_status, name="admin-2fa-status"),
    path("2fa/regenerate-codes/", admin_views.admin_regenerate_backup_codes, name="admin-2fa-regenerate-codes"),
    path("2fa/complete-login/", admin_views.admin_complete_2fa_login, name="admin-2fa-complete-login"),
    path("2fa/mandatory-setup/", admin_views.admin_mandatory_2fa_setup, name="admin-2fa-mandatory-setup"),
    path("2fa/mandatory-verify/", admin_views.admin_mandatory_2fa_verify, name="admin-2fa-mandatory-verify"),
    path("settings/", admin_views.admin_settings, name="admin-settings"),
    path("conversions/", admin_views.admin_conversions, name="admin-conversions"),
]

urlpatterns = [
    path("", include(router.urls)),
    path("convert/", views.convert_file, name="convert-file"),
    path("generate-qr/", views.generate_qr, name="generate-qr"),
    path("format-json/", views.format_json_view, name="format-json"),
    path("admin/", include(admin_urlpatterns)),
]
