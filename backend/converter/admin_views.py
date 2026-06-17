import logging
from datetime import datetime, timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Category, Tool, ConversionHistory, SiteSetting, TwoFactorProfile

logger = logging.getLogger(__name__)


# ─── Auth ───────────────────────────────────────────────────────────────
import hashlib
import json
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

# Temporary token for 2FA login flow (5 minute expiry)
_2fa_signer = TimestampSigner()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


def _is_2fa_required():
    """Check if the require_2fa site setting is enabled."""
    try:
        setting = SiteSetting.objects.get(key="require_2fa")
        return setting.value.lower() == "true"
    except SiteSetting.DoesNotExist:
        return False


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is not None and user.is_staff:
        profile = TwoFactorProfile.objects.filter(user=user).first()
        has_2fa = bool(profile and profile.is_enabled and profile.secret)

        # If require_2fa is on and user doesn't have 2FA set up
        require_2fa = _is_2fa_required()
        if require_2fa and not has_2fa:
            # Don't log in — force 2FA setup first
            token_data = json.dumps({"user_id": user.id, "purpose": "2fa_setup"})
            temp_token = _2fa_signer.sign(token_data)
            return Response({
                "requires_2fa_setup": True,
                "temp_token": temp_token,
                "message": "Two-factor authentication is required for all admin users. Please set up 2FA to continue.",
            })

        if has_2fa:
            # Don't log in yet — require 2FA code
            token_data = json.dumps({"user_id": user.id, "purpose": "2fa_login"})
            temp_token = _2fa_signer.sign(token_data)
            return Response({
                "requires_2fa": True,
                "temp_token": temp_token,
                "message": "2FA code required. Enter the code from your authenticator app.",
            })

        login(request, user)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "has_2fa": False,
        })
    elif user is not None and not user.is_staff:
        return Response(
            {"error": "Access denied. Staff privileges required."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return Response(
        {"error": "Invalid credentials."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_mandatory_2fa_setup(request):
    """Begin mandatory 2FA setup after password auth (no session needed — uses temp_token)."""
    import pyotp
    import qrcode as qrcode_lib
    from io import BytesIO
    import base64
    import secrets

    temp_token = request.data.get("temp_token", "")
    if not temp_token:
        return Response({"error": "Missing temp_token."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        unsigned = _2fa_signer.unsign(temp_token, max_age=300)
        token_data = json.loads(unsigned)
        if token_data.get("purpose") != "2fa_setup":
            raise ValueError("Invalid token purpose")
        user_id = token_data["user_id"]
    except (BadSignature, SignatureExpired, ValueError, KeyError):
        return Response({"error": "Invalid or expired session. Please sign in again."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(id=user_id, is_staff=True)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    profile, created = TwoFactorProfile.objects.get_or_create(user=user)

    # Generate new secret
    secret = pyotp.random_base32()
    profile.secret = secret
    profile.backup_codes = []
    profile.is_enabled = False
    profile.save()

    # Provisioning URI for QR
    issuer = "ProConverterBD"
    totp_obj = pyotp.totp.TOTP(secret)
    uri = totp_obj.provisioning_uri(name=user.email or user.username, issuer_name=issuer)

    # Generate QR as data URL
    qr = qrcode_lib.QRCode(box_size=5, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#1e1b4b", back_color="white")
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    # Generate 8 backup codes
    backup_codes = []
    for _ in range(8):
        code = secrets.token_hex(4).upper()
        code = f"{code[:4]}-{code[4:]}"
        backup_codes.append(code)

    profile.backup_codes = backup_codes
    profile.save(update_fields=["backup_codes"])

    return Response({
        "secret": secret,
        "uri": uri,
        "qr_data_url": qr_data_url,
        "backup_codes": backup_codes,
        "username": user.username,
        "message": "Scan the QR code with your authenticator app, then verify with a code to enable 2FA.",
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_mandatory_2fa_verify(request):
    """Verify mandatory 2FA setup code and complete login."""
    import pyotp
    temp_token = request.data.get("temp_token", "")
    code = request.data.get("code", "")

    if not temp_token or not code:
        return Response({"error": "Missing temp_token or code."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        unsigned = _2fa_signer.unsign(temp_token, max_age=300)
        token_data = json.loads(unsigned)
        if token_data.get("purpose") != "2fa_setup":
            raise ValueError("Invalid token purpose")
        user_id = token_data["user_id"]
    except (BadSignature, SignatureExpired, ValueError, KeyError):
        return Response({"error": "Invalid or expired session. Please sign in again."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(id=user_id, is_staff=True)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    profile = TwoFactorProfile.objects.filter(user=user).first()
    if not profile or not profile.secret:
        return Response({"error": "No 2FA setup in progress. Start setup first."}, status=status.HTTP_400_BAD_REQUEST)

    if profile.is_enabled:
        return Response({"error": "2FA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)

    totp = pyotp.TOTP(profile.secret)
    if not totp.verify(code, valid_window=1):
        return Response({"error": "Invalid code. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

    # Enable 2FA and log the user in
    profile.is_enabled = True
    profile.save(update_fields=["is_enabled"])
    login(request, user)

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "has_2fa": True,
        "backup_codes": profile.backup_codes,
        "message": "2FA enabled successfully! Welcome to the admin panel.",
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_complete_2fa_login(request):
    """Complete login with 2FA code after password verification."""
    import pyotp
    temp_token = request.data.get("temp_token", "")
    code = request.data.get("code", "")

    if not temp_token or not code:
        return Response({"error": "Missing temp_token or code."}, status=status.HTTP_400_BAD_REQUEST)

    # Verify the temp token
    try:
        unsigned = _2fa_signer.unsign(temp_token, max_age=300)  # 5 minutes
        token_data = json.loads(unsigned)
        if token_data.get("purpose") not in ("2fa_login", "2fa_setup"):
            raise ValueError("Invalid token purpose")
        user_id = token_data["user_id"]
    except (BadSignature, SignatureExpired, ValueError, KeyError):
        return Response({"error": "Invalid or expired login session. Please sign in again."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = User.objects.get(id=user_id, is_staff=True)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # Verify TOTP code or backup code
    profile = TwoFactorProfile.objects.filter(user=user).first()
    if not profile or not profile.is_enabled:
        return Response({"error": "2FA is not enabled for this user."}, status=status.HTTP_400_BAD_REQUEST)

    import pyotp
    totp = pyotp.TOTP(profile.secret)

    if totp.verify(code, valid_window=1):
        login(request, user)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "has_2fa": True,
        })

    # Check backup codes
    if code in profile.backup_codes:
        codes = list(profile.backup_codes)
        codes.remove(code)
        profile.backup_codes = codes
        profile.save(update_fields=["backup_codes"])
        login(request, user)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "used_backup_code": True,
            "backup_codes_remaining": len(codes),
        })

    return Response({"error": "Invalid 2FA code. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_logout(request):
    logout(request)
    return Response({"message": "Logged out successfully."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_check_auth(request):
    user = request.user
    profile = TwoFactorProfile.objects.filter(user=user).first()
    has_2fa = profile.is_enabled if profile else False
    require_2fa = _is_2fa_required()
    return Response({
        "authenticated": True,
        "requires_2fa_setup": require_2fa and not has_2fa,
        "require_2fa_setting": require_2fa,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "has_2fa": has_2fa,
        },
    })


# ─── Helper: Require Staff ─────────────────────────────────────────────

def require_staff(user):
    return user.is_authenticated and user.is_staff


# ─── Dashboard Stats ───────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    total_tools = Tool.objects.count()
    total_categories = Category.objects.count()
    total_conversions = ConversionHistory.objects.count()
    total_users = User.objects.count()

    today_conversions = ConversionHistory.objects.filter(created_at__gte=today_start).count()
    week_conversions = ConversionHistory.objects.filter(created_at__gte=week_start).count()
    month_conversions = ConversionHistory.objects.filter(created_at__gte=month_start).count()

    # Conversions by tool (top 5)
    conversions_by_tool = (
        ConversionHistory.objects.values("tool__name", "tool__slug")
        .annotate(count=Count("id"))
        .order_by("-count")[:5]
    )

    # Conversions by status
    conversions_by_status = (
        ConversionHistory.objects.values("status")
        .annotate(count=Count("id"))
    )

    # Recent conversions (last 10)
    recent_conversions = ConversionHistory.objects.select_related("tool").order_by("-created_at")[:10]
    recent_data = [
        {
            "id": c.id,
            "tool_name": c.tool.name if c.tool else "Unknown",
            "tool_slug": c.tool.slug if c.tool else "",
            "original_filename": c.original_filename,
            "file_size": c.file_size,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
        }
        for c in recent_conversions
    ]

    return Response({
        "totals": {
            "tools": total_tools,
            "categories": total_categories,
            "conversions": total_conversions,
            "users": total_users,
        },
        "periods": {
            "today": today_conversions,
            "this_week": week_conversions,
            "this_month": month_conversions,
        },
        "by_tool": [
            {"name": t["tool__name"], "slug": t["tool__slug"], "count": t["count"]}
            for t in conversions_by_tool
        ],
        "by_status": {s["status"]: s["count"] for s in conversions_by_status},
        "recent": recent_data,
    })


# ─── Tool CRUD ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_tools(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        tools = Tool.objects.select_related("category").all().order_by("category__order", "name")
        data = [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "description": t.description,
                "icon": t.icon,
                "color": t.color,
                "category_name": t.category.name,
                "category_slug": t.category.slug,
                "is_active": t.is_active,
                "max_file_size_mb": t.max_file_size_mb,
                "created_at": t.created_at.isoformat(),
            }
            for t in tools
        ]
        return Response(data)

    # POST — create new tool
    name = request.data.get("name", "").strip()
    category_slug = request.data.get("category_slug", "")
    description = request.data.get("description", "")
    icon = request.data.get("icon", "wrench")
    color = request.data.get("color", "#6366f1")
    max_file_size_mb = request.data.get("max_file_size_mb", 10)
    is_active = request.data.get("is_active", True)

    if not name:
        return Response({"error": "Tool name is required."}, status=status.HTTP_400_BAD_REQUEST)

    category = Category.objects.filter(slug=category_slug).first()
    if not category:
        return Response({"error": f"Category '{category_slug}' not found."}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils.text import slugify
    slug = slugify(name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while Tool.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    tool = Tool.objects.create(
        category=category,
        name=name,
        slug=slug,
        description=description,
        icon=icon,
        color=color,
        max_file_size_mb=int(max_file_size_mb),
        is_active=bool(is_active),
    )

    return Response({
        "id": tool.id,
        "name": tool.name,
        "slug": tool.slug,
        "message": "Tool created successfully.",
    }, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_tool_detail(request, tool_id):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    try:
        tool = Tool.objects.select_related("category").get(id=tool_id)
    except Tool.DoesNotExist:
        return Response({"error": "Tool not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({
            "id": tool.id,
            "name": tool.name,
            "slug": tool.slug,
            "description": tool.description,
            "icon": tool.icon,
            "color": tool.color,
            "category_name": tool.category.name,
            "category_slug": tool.category.slug,
            "is_active": tool.is_active,
            "max_file_size_mb": tool.max_file_size_mb,
            "accepts_multiple_files": tool.accepts_multiple_files,
            "created_at": tool.created_at.isoformat(),
            "updated_at": tool.updated_at.isoformat(),
        })

    if request.method in ("PUT", "PATCH"):
        name = request.data.get("name", tool.name).strip()
        category_slug = request.data.get("category_slug", tool.category.slug)
        description = request.data.get("description", tool.description)
        icon = request.data.get("icon", tool.icon)
        color = request.data.get("color", tool.color)
        max_file_size_mb = request.data.get("max_file_size_mb", tool.max_file_size_mb)
        is_active = request.data.get("is_active", tool.is_active)
        accepts_multiple_files = request.data.get("accepts_multiple_files", tool.accepts_multiple_files)

        category = Category.objects.filter(slug=category_slug).first()
        if not category:
            return Response({"error": f"Category '{category_slug}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        tool.name = name
        tool.category = category
        tool.description = description
        tool.icon = icon
        tool.color = color
        tool.max_file_size_mb = int(max_file_size_mb)
        tool.is_active = bool(is_active)
        tool.accepts_multiple_files = bool(accepts_multiple_files)
        tool.save()

        return Response({
            "message": "Tool updated successfully.",
            "tool": {
                "id": tool.id,
                "name": tool.name,
                "slug": tool.slug,
                "is_active": tool.is_active,
            },
        })

    # DELETE
    tool.delete()
    return Response({"message": "Tool deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


# ─── Users ──────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by("-date_joined")
    data = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "is_staff": u.is_staff,
            "is_active": u.is_active,
            "is_superuser": u.is_superuser,
            "date_joined": u.date_joined.isoformat(),
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "conversion_count": 0,
        }
        for u in users
    ]
    return Response(data)


# ─── Categories ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_categories(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        cats = Category.objects.all().order_by("order")
        data = [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "icon": c.icon,
                "description": c.description,
                "order": c.order,
                "is_active": c.is_active,
                "tool_count": c.tools.count(),
            }
            for c in cats
        ]
        return Response(data)

    # POST — create new category
    name = request.data.get("name", "").strip()
    description = request.data.get("description", "")
    icon = request.data.get("icon", "folder")
    order = request.data.get("order", 0)
    is_active = request.data.get("is_active", True)

    if not name:
        return Response({"error": "Category name is required."}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils.text import slugify
    slug = slugify(name)
    base_slug = slug
    counter = 1
    while Category.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    cat = Category.objects.create(
        name=name,
        slug=slug,
        description=description,
        icon=icon,
        order=int(order),
        is_active=bool(is_active),
    )

    return Response({
        "id": cat.id,
        "name": cat.name,
        "slug": cat.slug,
        "icon": cat.icon,
        "message": "Category created successfully.",
    }, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_category_detail(request, category_id):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    try:
        cat = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response({"error": "Category not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "icon": cat.icon,
            "description": cat.description,
            "order": cat.order,
            "is_active": cat.is_active,
            "tool_count": cat.tools.count(),
        })

    if request.method in ("PUT", "PATCH"):
        name = request.data.get("name", cat.name).strip()
        description = request.data.get("description", cat.description)
        icon = request.data.get("icon", cat.icon)
        order = request.data.get("order", cat.order)
        is_active = request.data.get("is_active", cat.is_active)

        if not name:
            return Response({"error": "Category name is required."}, status=status.HTTP_400_BAD_REQUEST)

        cat.name = name
        cat.description = description
        cat.icon = icon
        cat.order = int(order)
        cat.is_active = bool(is_active)
        cat.save()

        return Response({
            "message": "Category updated successfully.",
            "category": {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "is_active": cat.is_active,
            },
        })

    # DELETE
    if cat.tools.exists():
        return Response({
            "error": f"Cannot delete '{cat.name}' — it has {cat.tools.count()} tools assigned to it. Move or delete those tools first."
        }, status=status.HTTP_400_BAD_REQUEST)
    cat.delete()
    return Response({"message": "Category deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


# ─── 2FA Management ─────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_setup_2fa(request):
    """Generate TOTP secret and return QR URI + backup codes."""
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    import pyotp
    user = request.user

    profile, created = TwoFactorProfile.objects.get_or_create(user=user)

    # Generate new secret
    secret = pyotp.random_base32()
    profile.secret = secret
    profile.backup_codes = []
    profile.is_enabled = False
    profile.save()

    # Generate provisioning URI for QR code
    issuer = "ProConverterBD"
    totp_obj = pyotp.totp.TOTP(secret)
    uri = totp_obj.provisioning_uri(
        name=user.email or user.username,
        issuer_name=issuer,
    )

    # Generate QR code image as data URL (uses installed qrcode library)
    import qrcode as qrcode_lib
    from io import BytesIO
    import base64
    qr = qrcode_lib.QRCode(box_size=5, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#1e1b4b", back_color="white")
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    # Generate 8 backup codes
    import secrets
    backup_codes = []
    for _ in range(8):
        code = secrets.token_hex(4).upper()
        # Format as XXXX-XXXX
        code = f"{code[:4]}-{code[4:]}"
        backup_codes.append(code)

    profile.backup_codes = backup_codes
    profile.save(update_fields=["backup_codes"])

    return Response({
        "secret": secret,
        "uri": uri,
        "qr_data_url": qr_data_url,
        "backup_codes": backup_codes,
        "message": "Scan the QR code with your authenticator app, then verify with a code to enable 2FA.",
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_verify_2fa(request):
    """Verify a TOTP code and enable 2FA."""
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    code = request.data.get("code", "")
    if not code:
        return Response({"error": "Verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

    profile = TwoFactorProfile.objects.filter(user=request.user).first()
    if not profile or not profile.secret:
        return Response({"error": "No 2FA setup in progress. Start setup first."}, status=status.HTTP_400_BAD_REQUEST)

    if profile.is_enabled:
        return Response({"error": "2FA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)

    import pyotp
    totp = pyotp.TOTP(profile.secret)
    if totp.verify(code, valid_window=1):
        profile.is_enabled = True
        profile.save(update_fields=["is_enabled"])
        return Response({
            "message": "2FA enabled successfully!",
            "backup_codes": profile.backup_codes,
            "enabled": True,
        })

    return Response({"error": "Invalid code. Please try again."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_disable_2fa(request):
    """Disable 2FA for the current user."""
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    code = request.data.get("code", "")
    if not code:
        return Response({"error": "Current 2FA code is required to disable."}, status=status.HTTP_400_BAD_REQUEST)

    profile = TwoFactorProfile.objects.filter(user=request.user).first()
    if not profile or not profile.is_enabled:
        return Response({"error": "2FA is not enabled."}, status=status.HTTP_400_BAD_REQUEST)

    import pyotp
    totp = pyotp.TOTP(profile.secret)

    # Allow using a backup code or TOTP to disable
    if totp.verify(code, valid_window=1) or code in profile.backup_codes:
        profile.is_enabled = False
        profile.secret = ""
        profile.backup_codes = []
        profile.save()
        return Response({"message": "2FA disabled successfully."})

    return Response({"error": "Invalid code. Please try again."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_2fa_status(request):
    """Get 2FA status for the current user."""
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    profile = TwoFactorProfile.objects.filter(user=request.user).first()
    return Response({
        "is_enabled": profile.is_enabled if profile else False,
        "backup_codes_remaining": len(profile.backup_codes) if profile and profile.is_enabled else 0,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_regenerate_backup_codes(request):
    """Regenerate backup codes for the current user."""
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    profile = TwoFactorProfile.objects.filter(user=request.user).first()
    if not profile or not profile.is_enabled:
        return Response({"error": "2FA must be enabled first."}, status=status.HTTP_400_BAD_REQUEST)

    import secrets
    backup_codes = []
    for _ in range(8):
        code = secrets.token_hex(4).upper()
        code = f"{code[:4]}-{code[4:]}"
        backup_codes.append(code)

    profile.backup_codes = backup_codes
    profile.save(update_fields=["backup_codes"])

    return Response({
        "backup_codes": backup_codes,
        "message": "New backup codes generated. Save them securely.",
    })


# ─── Settings ───────────────────────────────────────────────────────────

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def admin_settings(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        settings = SiteSetting.objects.all().order_by("key")
        data = {
            "settings": {
                s.key: s.value for s in settings
            },
            "meta": {
                s.key: {
                    "label": s.label,
                    "description": s.description,
                    "value_type": s.value_type,
                }
                for s in settings
            },
        }
        return Response(data)

    # PUT — update settings
    updated = 0
    errors = []
    for key, value in request.data.items():
        try:
            setting = SiteSetting.objects.get(key=key)
            setting.value = str(value)
            setting.save()
            updated += 1
        except SiteSetting.DoesNotExist:
            errors.append(f"Unknown setting: {key}")

    return Response({
        "message": f"{updated} setting(s) updated.",
        "updated": updated,
        "errors": errors,
    })


# ─── Conversion History ────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_conversions(request):
    if not require_staff(request.user):
        return Response({"error": "Staff privileges required."}, status=status.HTTP_403_FORBIDDEN)

    status_filter = request.query_params.get("status")
    tool_slug = request.query_params.get("tool")
    limit = request.query_params.get("limit", 50)

    qs = ConversionHistory.objects.select_related("tool").all().order_by("-created_at")

    if status_filter:
        qs = qs.filter(status=status_filter)
    if tool_slug:
        qs = qs.filter(tool__slug=tool_slug)

    try:
        qs = qs[:int(limit)]
    except (ValueError, TypeError):
        qs = qs[:50]

    data = [
        {
            "id": c.id,
            "tool_name": c.tool.name if c.tool else "Unknown",
            "tool_slug": c.tool.slug if c.tool else "",
            "original_filename": c.original_filename,
            "file_size": c.file_size,
            "status": c.status,
            "error_message": c.error_message,
            "created_at": c.created_at.isoformat(),
            "download_url": c.converted_file.url if c.converted_file else None,
        }
        for c in qs
    ]
    return Response(data)
