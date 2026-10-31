from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, JsonResponse
<<<<<<< HEAD
from django.urls import include, path, re_path
=======
from django.urls import path, re_path
>>>>>>> origin/main

from .health import health


def spa(request):
    """Catch-all: serve the built React app so client-side routes survive a refresh."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.is_file():
        return JsonResponse({"detail": "Frontend not built. Run `npm run build` or use the Vite dev server."}, status=404)
    return FileResponse(open(index, "rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    re_path(r"^api/healthz/?$", health),
<<<<<<< HEAD
    path("api/", include("apps.core.accounts.urls")),
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
    path("api/", include("apps.core.catalog.urls")),
>>>>>>> other-repo/phase-2a
=======
    path("api/", include("apps.core.catalog.urls")),
    path("api/", include("apps.core.subscriptions.urls")),
>>>>>>> other-repo/phase-3a
    re_path(r"^(?!api/|admin/|static/).*$", spa),
]
