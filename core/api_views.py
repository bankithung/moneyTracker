from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import F
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
import json
import logging

from .models import User, OTP, Transaction
from .serializers import (
    UserSerializer, UserProfileUpdateSerializer,
    OTPSerializer, OTPVerifySerializer,
    TransactionSerializer, TransactionCreateSerializer,
    TransactionReorderSerializer
)
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

# Initialize Firebase (Ensure google-services.json or credentials are set up)
# For now, we assume default app or no-op if not configured on server yet.
# Ideally this should be initialized in settings.py or apps.py
if not firebase_admin._apps:
    # Use default credentials (works on Google Cloud) or rely on explicit service account
    # For local dev without env vars, this might fail unless GOOGLE_APPLICATION_CREDENTIALS is set
    try:
        firebase_admin.initialize_app()
    except Exception as e:
        logger.warning(f"Firebase Init Warning: {e}")

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    """Generate JWT tokens for a user"""
    # Create token for the user (this requires a Django auth user, 
    # but we're using custom User model, so we create manually with custom claims)
    refresh = RefreshToken()
    
    # Add custom claims
    refresh['user_id'] = user.id
    refresh['phone'] = user.phone
    
    # Also set standard claim that SimpleJWT expects
    refresh.payload['user_id'] = user.id
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def get_user_from_token(request):
    """Extract user from JWT token"""
    try:
        # SimpleJWT puts the validated token in request.auth
        # The token payload contains our custom user_id claim
        if hasattr(request.auth, 'payload'):
            user_id = request.auth.payload.get('user_id')
        elif hasattr(request.auth, '__getitem__'):
            user_id = request.auth.get('user_id')
        else:
            # Try to get user_id directly from the token
            user_id = getattr(request.auth, 'user_id', None)
        
        if user_id:
            return User.objects.get(id=user_id)
        return None
    except (AttributeError, User.DoesNotExist, TypeError) as e:
        logger.warning(f"get_user_from_token failed: {e}")
        return None


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """Custom token refresh endpoint for our custom User model"""
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Decode the refresh token
        from rest_framework_simplejwt.tokens import RefreshToken as RT
        try:
            token = RT(refresh_token)
            user_id = token.payload.get('user_id')
            
            if not user_id:
                return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Verify user exists in our custom User model
            user = User.objects.get(id=user_id)
            
            # Generate new tokens
            new_tokens = get_tokens_for_user(user)
            
            return Response({
                'access': new_tokens['access'],
                'refresh': new_tokens['refresh'],
            })
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return Response({'error': 'Token refresh failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============== Authentication APIs ==============

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """Send OTP to phone number"""
    serializer = OTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    phone = serializer.validated_data['phone']
    
    if not phone or len(phone) < 10:
        return Response(
            {'error': 'Please enter a valid phone number'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate OTP
    otp = OTP.generate_otp(phone)
    
    # Log OTP to console (for development)
    logger.info(f"{'=' * 50}")
    logger.info(f"OTP for {phone}: {otp.code}")
    logger.info(f"{'=' * 50}")
    print(f"\n{'=' * 50}")
    print(f"📱 OTP for {phone}: {otp.code}")
    print(f"{'=' * 50}\n")
    
    return Response({'message': 'OTP sent successfully', 'phone': phone})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Verify OTP and return JWT token"""
    serializer = OTPVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    phone = serializer.validated_data['phone']
    code = serializer.validated_data['otp']
    
    try:
        otp = OTP.objects.get(phone=phone, is_verified=False)
        
        if otp.code == code and otp.is_valid():
            otp.is_verified = True
            otp.save()
            
            # Get or create user
            user, created = User.objects.get_or_create(phone=phone)
            
            # Generate tokens
            tokens = get_tokens_for_user(user)
            
            return Response({
                'tokens': tokens,
                'user': UserSerializer(user).data,
                'is_new_user': created or not user.name
            })
        else:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except OTP.DoesNotExist:
        return Response(
            {'error': 'OTP not found. Please request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )



@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_status(request):
    """Check if user exists and has a PIN set"""
    phone = request.data.get('phone')
    if not phone:
        return Response({'error': 'Phone number required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user exists
    try:
        user = User.objects.get(phone=phone)
        # Check if PIN is the default '000000' or empty
        pin_set = user.pin != '000000' and user.pin != ''
        return Response({'exists': True, 'pin_set': pin_set})
    except User.DoesNotExist:
        return Response({'exists': False, 'pin_set': False})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_with_pin(request):
    """Register new user or Set PIN for existing user"""
    phone = request.data.get('phone')
    pin = request.data.get('pin')
    name = request.data.get('name', 'User')  # Default name if not provided
    
    if not phone or not pin:
        return Response({'error': 'Phone and PIN required'}, status=status.HTTP_400_BAD_REQUEST)
        
    if len(pin) != 6 or not pin.isdigit():
        return Response({'error': 'PIN must be 6 digits'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Check if user exists
        user = User.objects.filter(phone=phone).first()

        if user:
            # If user exists, check if we can update the PIN (only if currently unset/default)
            # OR if the user is explicitly asking to "register" again (re-onboarding flow)
            # For this requirement: "if pin is not set then allow user to enter new pin"
            
            if user.pin == '000000' or user.pin == '':
                user.pin = pin
                if name:
                    user.name = name
                user.save()
            else:
                 return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Create new user
            user = User.objects.create(phone=phone, pin=pin, name=name)
        
        # Generate tokens
        tokens = get_tokens_for_user(user)
        
        return Response({
            'tokens': tokens,
            'user': UserSerializer(user).data,
            'is_new_user': True
        })
    except Exception as e:
        logger.error(f"Registration Error: {e}")
        return Response({'error': 'Registration failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_with_pin(request):
    """Login with Phone and PIN"""
    phone = request.data.get('phone')
    pin = request.data.get('pin')
    
    if not phone or not pin:
        return Response({'error': 'Phone and PIN required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(phone=phone)
        if user.pin == pin:
            # Generate tokens
            tokens = get_tokens_for_user(user)
            return Response({
                'tokens': tokens,
                'user': UserSerializer(user).data,
                'is_new_user': False
            })
        else:
            return Response({'error': 'Invalid PIN'}, status=status.HTTP_401_UNAUTHORIZED)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


# ============== User/Profile APIs ==============

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update user profile"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    
    elif request.method == 'PUT':
        serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_user(request):
    """Setup new user's profile (name, income, currency)"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    name = request.data.get('name', '').strip()
    income = request.data.get('income')
    currency = request.data.get('currency')
    rule_needs = request.data.get('rule_needs')
    rule_wants = request.data.get('rule_wants')
    rule_savings = request.data.get('rule_savings')

    if not name:
        return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.name = name
    if income is not None:
        user.income = income
    if currency:
        user.currency = currency
    
    # Save budget rules if provided
    if rule_needs is not None:
        user.rule_needs = rule_needs
    if rule_wants is not None:
        user.rule_wants = rule_wants
    if rule_savings is not None:
        user.rule_savings = rule_savings
        
    user.save()
    
    return Response(UserSerializer(user).data)


# ============== Transaction APIs ==============

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def transaction_list(request):
    """List transactions or create new transaction"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Get filter parameters
        year = int(request.GET.get('year', date.today().year))
        month = int(request.GET.get('month', date.today().month))
        category = request.GET.get('category', 'all')
        search = request.GET.get('search', '').strip()
        
        transactions = Transaction.objects.filter(
            user=user,
            date__year=year,
            date__month=month
        ).order_by('order', '-date', '-created_at')
        
        if category != 'all':
            transactions = transactions.filter(category=category)
        
        if search:
            transactions = transactions.filter(description__icontains=search)
        
        return Response(TransactionSerializer(transactions, many=True).data)
    
    elif request.method == 'POST':
        serializer = TransactionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        tx_date = data.get('date', date.today())
        year = tx_date.year
        month = tx_date.month
        
        # Check balance for expenses
        if data['category'] != 'income':
            current_bal = calculate_monthly_balance(user, year, month)
            if (current_bal - data['amount']) < 0:
                return Response(
                    {'error': f'Insufficient balance! Available: {user.currency}{current_bal}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Shift existing orders down
        Transaction.objects.filter(
            user=user,
            date__year=year,
            date__month=month
        ).update(order=F('order') + 1)
        
        # Create transaction
        transaction = Transaction.objects.create(
            user=user,
            order=0,
            **data
        )
        
        return Response(TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def transaction_detail(request, pk):
    """View, update, or delete a specific transaction"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        transaction = Transaction.objects.get(id=pk, user=user)
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response(TransactionSerializer(transaction).data)
    
    elif request.method == 'PUT':
        serializer = TransactionCreateSerializer(transaction, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TransactionSerializer(transaction).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        transaction.delete()
        return Response({'message': 'Transaction deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_transactions(request):
    """Reorder transactions"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = TransactionReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    order_list = serializer.validated_data['order']
    
    for idx, tx_id in enumerate(order_list):
        Transaction.objects.filter(id=tx_id, user=user).update(order=idx)
    
    return Response({'success': True})


# ============== Dashboard APIs ==============

def calculate_monthly_balance(user, year, month):
    """Calculate balance for a specific month"""
    txs = Transaction.objects.filter(user=user, date__year=year, date__month=month)
    spent = sum(tx.amount for tx in txs if tx.category != 'income')
    extra_income = sum(tx.amount for tx in txs if tx.category == 'income')
    return (user.income + extra_income) - spent


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Get dashboard summary data"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get current month from query params
    year = int(request.GET.get('year', date.today().year))
    month = int(request.GET.get('month', date.today().month))
    current_date = date(year, month, 1)
    
    # Get transactions for current month
    transactions = Transaction.objects.filter(
        user=user,
        date__year=year,
        date__month=month
    ).order_by('order', '-date', '-created_at')
    
    # Calculate finances
    total_spent = Decimal('0')
    extra_income = Decimal('0')
    categories = {'needs': Decimal('0'), 'wants': Decimal('0'), 'savings': Decimal('0')}
    
    for tx in transactions:
        if tx.category == 'income':
            extra_income += tx.amount
        else:
            total_spent += tx.amount
            if tx.category in categories:
                categories[tx.category] += tx.amount
    
    total_income = user.income + extra_income
    balance = total_income - total_spent
    
    # Budget limits
    limits = {
        'needs': float(total_income * Decimal(user.rule_needs) / 100),
        'wants': float(total_income * Decimal(user.rule_wants) / 100),
        'savings': float(total_income * Decimal(user.rule_savings) / 100),
    }
    
    # Generate advice
    advice = []
    if user.income == 0:
        advice.append({
            'type': 'warning',
            'title': '⚠️ Setup Required',
            'text': 'Please go to Settings and set your Monthly Income.'
        })
    else:
        income_base = total_income if total_income > 0 else Decimal('1')
        total_pct = (total_spent / income_base) * 100
        wants_pct = (categories['wants'] / income_base) * 100
        
        if total_pct > 100:
            advice.append({
                'type': 'warning',
                'title': '🚨 Over Budget',
                'text': f'You are spending {float(total_pct):.1f}% of your income!'
            })
        elif total_pct < 85:
            advice.append({
                'type': 'good',
                'title': '✅ Good Status',
                'text': f'You are under budget ({float(total_pct):.1f}%).'
            })
        
        if wants_pct > user.rule_wants:
            advice.append({
                'type': 'warning',
                'title': '⚠️ Wants Alert',
                'text': 'You exceeded your "Wants" limit.'
            })
        
        if categories['savings'] == 0 and total_spent > 0:
            advice.append({
                'type': 'info',
                'title': '💡 Savings Tip',
                'text': 'No money allocated to Savings yet.'
            })
    
    # History data
    all_transactions = Transaction.objects.filter(user=user).order_by('-date')
    monthly_data = {}
    for tx in all_transactions:
        key = tx.date.strftime('%Y-%m')
        if key not in monthly_data:
            monthly_data[key] = {'spent': Decimal('0'), 'extra_income': Decimal('0')}
        
        if tx.category == 'income':
            monthly_data[key]['extra_income'] += tx.amount
        else:
            monthly_data[key]['spent'] += tx.amount
    
    history = []
    for key in sorted(monthly_data.keys(), reverse=True)[:12]:
        y, m = key.split('-')
        month_name = date(int(y), int(m), 1).strftime('%B %Y')
        data = monthly_data[key]
        hist_total_income = user.income + data['extra_income']
        saved = hist_total_income - data['spent']
        
        history.append({
            'month': month_name,
            'year': int(y),
            'month_num': int(m),
            'total_income': float(hist_total_income),
            'spent': float(data['spent']),
            'saved': float(saved),
            'status': 'Saved' if saved >= 0 else 'Over'
        })
    
    prev_month = current_date - relativedelta(months=1)
    next_month = current_date + relativedelta(months=1)
    
    return Response({
        'user': UserSerializer(user).data,
        'current_date': current_date.isoformat(),
        'transactions': TransactionSerializer(transactions, many=True).data,
        'total_income': float(total_income),
        'total_spent': float(total_spent),
        'balance': float(balance),
        'categories': {k: float(v) for k, v in categories.items()},
        'limits': limits,
        'advice': advice,
        'history': history,
        'prev_month': {'year': prev_month.year, 'month': prev_month.month},
        'next_month': {'year': next_month.year, 'month': next_month.month},
    })


# ============== Savings APIs ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def savings_summary(request):
    """Get savings analysis data"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    year = int(request.GET.get('year', date.today().year))
    
    # All savings transactions
    all_savings_tx = Transaction.objects.filter(user=user, category='savings').order_by('-date')
    total_saved_all_time = sum(tx.amount for tx in all_savings_tx)
    
    # Filter for selected year
    year_savings_tx = all_savings_tx.filter(date__year=year)
    total_saved_year = sum(tx.amount for tx in year_savings_tx)
    
    # Monthly trend
    month_range = range(1, 13)
    monthly_data = {month: Decimal('0') for month in month_range}
    
    for tx in year_savings_tx:
        monthly_data[tx.date.month] += tx.amount
    
    chart_labels = [date(year, m, 1).strftime('%b') for m in month_range]
    chart_values = [float(monthly_data[m]) for m in month_range]
    
    # Goals
    monthly_goal = float(user.income * Decimal(user.rule_savings) / 100)
    yearly_goal = monthly_goal * 12
    
    # Advanced metrics
    base_income_year = user.income * 12
    extra_income_tx = Transaction.objects.filter(user=user, category='income', date__year=year)
    extra_income_year = sum(tx.amount for tx in extra_income_tx)
    total_income_year = base_income_year + extra_income_year
    
    savings_rate = 0
    if total_income_year > 0:
        savings_rate = float((total_saved_year / total_income_year) * 100)
    
    current_month = date.today().month if year == date.today().year else 12
    avg_monthly = float(total_saved_year / max(1, current_month))
    projected_year = avg_monthly * 12
    
    # Best month
    best_month_val = max(monthly_data.values()) if monthly_data else 0
    best_month_name = "N/A"
    if best_month_val > 0:
        best_month_idx = max(monthly_data, key=monthly_data.get)
        best_month_name = date(year, best_month_idx, 1).strftime('%B')
    
    # Recent savings
    recent_savings = TransactionSerializer(list(all_savings_tx[:10]), many=True).data
    
    return Response({
        'current_year': year,
        'year_prev': year - 1,
        'year_next': year + 1 if year < date.today().year else None,
        'total_saved_all_time': float(total_saved_all_time),
        'total_saved_year': float(total_saved_year),
        'monthly_goal': monthly_goal,
        'yearly_goal': yearly_goal,
        'chart_labels': chart_labels,
        'chart_values': chart_values,
        'recent_savings': recent_savings,
        'avg_monthly': avg_monthly,
        'savings_rate': savings_rate,
        'projected_year': projected_year,
        'best_month_name': best_month_name,
        'best_month_val': float(best_month_val),
        'user': UserSerializer(user).data,
    })


# ============== Settings APIs ==============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_data(request):
    """Reset all user data"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Delete all transactions
    Transaction.objects.filter(user=user).delete()
    
    # Reset user settings
    user.income = Decimal('0')
    user.currency = '$'
    user.rule_needs = 50
    user.rule_wants = 30
    user.rule_savings = 20
    user.save()
    
    return Response({'message': 'All data has been reset', 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_theme(request):
    """Toggle theme between light and dark"""
    user = get_user_from_token(request)
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user.theme = 'dark' if user.theme == 'light' else 'light'
    user.save()
    
    return Response({'theme': user.theme})
