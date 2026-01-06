from rest_framework import serializers
from .models import User, OTP, Transaction


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'phone', 'name', 'income', 'currency', 'theme',
                  'rule_needs', 'rule_wants', 'rule_savings', 'created_at']
        read_only_fields = ['id', 'phone', 'created_at']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile/settings"""
    class Meta:
        model = User
        fields = ['name', 'income', 'currency', 'theme',
                  'rule_needs', 'rule_wants', 'rule_savings']

    def validate(self, data):
        """Validate that budget rules sum to 100"""
        rule_needs = data.get('rule_needs', self.instance.rule_needs if self.instance else 50)
        rule_wants = data.get('rule_wants', self.instance.rule_wants if self.instance else 30)
        rule_savings = data.get('rule_savings', self.instance.rule_savings if self.instance else 20)
        
        if abs((rule_needs + rule_wants + rule_savings) - 100) > 0.1:
            raise serializers.ValidationError("Budget rules must add up to 100%")
        return data


class OTPSerializer(serializers.Serializer):
    """Serializer for OTP request"""
    phone = serializers.CharField(max_length=15)


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification"""
    phone = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""
    class Meta:
        model = Transaction
        fields = ['id', 'description', 'amount', 'category', 'date', 'order', 'created_at']
        read_only_fields = ['id', 'order', 'created_at']


class TransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating transactions"""
    class Meta:
        model = Transaction
        fields = ['description', 'amount', 'category', 'date']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value


class TransactionReorderSerializer(serializers.Serializer):
    """Serializer for reordering transactions"""
    order = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data"""
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    categories = serializers.DictField()
    limits = serializers.DictField()
    advice = serializers.ListField()
    history = serializers.ListField()
