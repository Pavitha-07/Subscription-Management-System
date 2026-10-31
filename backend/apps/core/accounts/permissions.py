from rest_framework.permissions import BasePermission


class _HasRole(BasePermission):
    roles = ()

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role in self.roles)


class IsAdmin(_HasRole):
    roles = ("admin",)


class IsStaffOrAdmin(_HasRole):
    roles = ("admin", "staff")


class IsCustomer(_HasRole):
    roles = ("customer",)
