from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.CsrfView.as_view()),
    path("auth/signup/", views.SignupView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/password-reset/request/", views.PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", views.PasswordResetConfirmView.as_view()),
    path("staff/", views.StaffListCreateView.as_view()),
<<<<<<< HEAD:backend/apps/accounts/urls.py
=======
    path("customers/", views.CustomerListView.as_view()),
>>>>>>> recovery-old-main:backend/apps/core/accounts/urls.py
]
