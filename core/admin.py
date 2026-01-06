from django.contrib import admin
from .models import User, OTP, Transaction


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('phone', 'income', 'currency', 'theme', 'created_at')
    list_filter = ('currency', 'theme', 'created_at')
    search_fields = ('phone',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('phone', 'code', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('phone',)
    readonly_fields = ('created_at',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'description', 'amount', 'category', 'date', 'order')
    list_filter = ('category', 'date', 'user')
    search_fields = ('description', 'user__phone')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date'
