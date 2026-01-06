from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    # Authentication
    # Authentication
    path('', views.login_view, name='login'),
    path('check-user/', views.check_user, name='check_user'),
    path('login-pin/', views.login_pin, name='login_pin'),
    path('create-pin/', views.create_pin, name='create_pin'),
    path('send-otp/', views.send_otp, name='send_otp'),
    path('verify-otp/', views.verify_otp_view, name='verify_otp'),
    path('setup/', views.setup_view, name='setup'),
    path('logout/', views.logout_view, name='logout'),
    path('privacy-policy/', views.privacy_policy_view, name='privacy_policy'),
    path('delete-account/', views.delete_account_view, name='delete_account'),
    
    # Main views
    path('dashboard/', views.dashboard, name='dashboard'),
    path('savings/', views.savings_view, name='savings'),
    path('transactions/', views.transactions_view, name='transactions'),
    path('history/', views.history_view, name='history'),
    path('advisor/', views.advisor_view, name='advisor'),
    path('settings/', views.settings_view, name='settings'),
    path('settings/save/', views.settings_view, name='save_settings'),
    
    # Transaction operations
    path('transaction/add/', views.add_transaction, name='add_transaction'),
    path('transaction/delete/<int:tx_id>/', views.delete_transaction, name='delete_transaction'),
    path('transaction/reorder/', views.reorder_transactions, name='reorder_transactions'),
    
    # Data operations
    path('export/', views.export_data, name='export_data'),
    path('import/', views.import_data, name='import_data'),
    path('reset/', views.reset_data, name='reset_data'),
    
    # Theme toggle
    path('toggle-theme/', views.toggle_theme, name='toggle_theme'),
    
    # =============== API ENDPOINTS ===============
    # Auth API
    path('api/auth/send-otp/', api_views.send_otp, name='api_send_otp'),
    path('api/auth/verify-otp/', api_views.verify_otp, name='api_verify_otp'),
    path('api/auth/check-status/', api_views.check_user_status, name='api_check_status'),
    path('api/auth/register/', api_views.register_with_pin, name='api_register'),
    path('api/auth/login-pin/', api_views.login_with_pin, name='api_login_pin'),
    path('api/token/refresh/', api_views.token_refresh, name='token_refresh'),
    
    # User API
    path('api/user/profile/', api_views.user_profile, name='api_user_profile'),
    path('api/user/setup/', api_views.setup_user, name='api_setup_user'),
    
    # Transaction API
    path('api/transactions/', api_views.transaction_list, name='api_transaction_list'),
    path('api/transactions/<int:pk>/', api_views.transaction_detail, name='api_transaction_detail'),
    path('api/transactions/reorder/', api_views.reorder_transactions, name='api_reorder_transactions'),
    
    # Dashboard API
    path('api/dashboard/', api_views.dashboard_summary, name='api_dashboard'),
    
    # Savings API
    path('api/savings/', api_views.savings_summary, name='api_savings'),
    
    # Settings API
    path('api/settings/reset/', api_views.reset_data, name='api_reset_data'),
    path('api/settings/toggle-theme/', api_views.toggle_theme, name='api_toggle_theme'),
]

