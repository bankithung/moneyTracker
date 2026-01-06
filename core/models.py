from django.db import models
import random
import string
from datetime import datetime, timedelta


class User(models.Model):
    """User model with phone-based authentication"""
    phone = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=100, blank=True, default='')
    income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=5, default='$')
    theme = models.CharField(max_length=10, default='light')
    pin = models.CharField(max_length=128, default='000000')  # Storing plain for now as requested for simplicity, or we can hash later
    
    # Budget rules (50/30/20 default)
    rule_needs = models.IntegerField(default=50)
    rule_wants = models.IntegerField(default=30)
    rule_savings = models.IntegerField(default=20)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Properties required for DRF authentication
    @property
    def is_authenticated(self):
        """Always return True for authenticated users"""
        return True
    
    @property
    def is_anonymous(self):
        """Always return False for real users"""
        return False
    
    def __str__(self):
        return f"User: {self.name or self.phone}"


class OTP(models.Model):
    """OTP model for phone verification"""
    phone = models.CharField(max_length=15)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    @classmethod
    def generate_otp(cls, phone):
        """Generate a 6-digit OTP for a phone number"""
        # Delete old OTPs for this phone
        cls.objects.filter(phone=phone).delete()
        
        # Generate random 6-digit code
        code = ''.join(random.choices(string.digits, k=6))
        
        # Create new OTP
        otp = cls.objects.create(phone=phone, code=code)
        return otp
    
    def is_valid(self):
        """Check if OTP is still valid (10 minutes expiry)"""
        expiry_time = self.created_at + timedelta(minutes=10)
        return datetime.now(self.created_at.tzinfo) < expiry_time and not self.is_verified
    
    def __str__(self):
        return f"OTP for {self.phone}: {self.code}"


class Transaction(models.Model):
    """Transaction model for income/expenses"""
    CATEGORY_CHOICES = [
        ('needs', 'Needs'),
        ('wants', 'Wants'),
        ('savings', 'Savings'),
        ('income', 'Extra Income'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    date = models.DateField()
    order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', '-created_at']
    
    def __str__(self):
        return f"{self.description}: {self.amount} ({self.category})"
