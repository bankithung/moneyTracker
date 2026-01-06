from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from .models import User, OTP, Transaction
from django.db.models import F
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
import json
import logging

logger = logging.getLogger(__name__)


def login_view(request):
    """Phone number input page"""
    if request.session.get('user_id'):
        return redirect('dashboard')
    if request.session.get('pending_phone'):
        # If pending phone, clear it unless we're in middle of OTP flow? 
        # Actually better to just render login, let user re-enter phone.
        pass
    return render(request, 'core/login.html')


def check_user(request):
    """Check if user exists and decide next step (PIN or Setup)"""
    if request.method == 'POST':
        phone = request.POST.get('phone', '').strip()
        
        if not phone or len(phone) < 10:
            messages.error(request, 'Please enter a valid phone number')
            return redirect('login')
            
        request.session['pending_phone'] = phone
        
        # Get or Create User immediately (Bypassing OTP for now)
        user, created = User.objects.get_or_create(phone=phone)
        
        # Check if PIN is set and not default
        if user.pin and user.pin != '000000':
            return redirect('login_pin')
        else:
            # New user or no PIN -> Go straight to Setup/PIN creation
            # We treat them as verified for now since OTP is disabled
            request.session['user_id'] = user.id
            return redirect('create_pin')
            
    return redirect('login')


def login_pin(request):
    """Login with PIN"""
    phone = request.session.get('pending_phone')
    if not phone:
        return redirect('login')
        
    if request.method == 'POST':
        pin = request.POST.get('pin', '').strip()
        try:
            user = User.objects.get(phone=phone)
            if user.pin == pin:
                request.session['user_id'] = user.id
                # Don't delete pending_phone yet in case we need it elsewhere? 
                # Actually we can delete it now.
                del request.session['pending_phone']
                messages.success(request, f'Welcome back, {user.name or "friend"}!')
                return redirect('dashboard')
            else:
                messages.error(request, 'Invalid PIN')
        except User.DoesNotExist:
            return redirect('login')
            
    return render(request, 'core/login_pin.html', {'phone': phone})


def create_pin(request):
    """Create a new PIN after OTP verification"""
    phone = request.session.get('pending_phone')
    if not phone:
        return redirect('login')
        
    # Ensure user is actually logged in or we have a verified session state from OTP?
    # Security: In verify_otp_view we set user_id. So we should check user_id.
    # BUT, the plan was: verify_otp redirects to create_pin.
    # If verify_otp logs them in, then we can just use request.user equivalent.
    
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')
        
    if request.method == 'POST':
        pin = request.POST.get('pin', '').strip()
        confirm_pin = request.POST.get('confirm_pin', '').strip()
        name = request.POST.get('name', '').strip()
        
        if len(pin) != 6 or not pin.isdigit():
            messages.error(request, 'PIN must be 6 digits')
        elif pin != confirm_pin:
            messages.error(request, 'PINs do not match')
        else:
            user = User.objects.get(id=user_id)
            user.pin = pin
            if name:
                user.name = name
            user.save()
            messages.success(request, 'Setup completed successfully!')
            
            # If new user (income is 0), go to settings first
            if user.income == 0:
                 messages.info(request, 'Please set up your preferences.')
                 return redirect('settings')
                 
            return redirect('dashboard')
            
    # Check if user has name
    try:
        user = User.objects.get(id=user_id)
        has_name = bool(user.name)
    except User.DoesNotExist:
        return redirect('login')
        
    return render(request, 'core/create_pin.html', {'has_name': has_name})


def send_otp(request):
    """Send OTP to phone number"""
    if request.method == 'POST':
        # If coming from check_user, phone is already in session
        # If coming from login (direct POST somehow?), get from POST
        # But actually, check_user directs here for NEW users/NO PIN users.
        # We need to handle generation.
        
        # If we are here, it means we need to send OTP.
        # Phone might be in session (from check_user) or POST (legacy/fallback)
        
        phone = request.session.get('pending_phone')
        if not phone:
             # Try to get from POST if not in session (direct call)
             phone = request.POST.get('phone', '').strip()
        
        if not phone or len(phone) < 10:
            messages.error(request, 'Please enter a valid phone number')
            return redirect('login')
            
        request.session['pending_phone'] = phone

        # Check reset flag - if resetting, might want to ignore existing PIN check?
        # But send_otp is usually called when we KNOW we want an OTP.
        
        # Generate OTP
        otp = OTP.generate_otp(phone)
        
        # Log OTP to console (for development)
        logger.info(f"=" * 50)
        logger.info(f"OTP for {phone}: {otp.code}")
        logger.info(f"=" * 50)
        print(f"\n{'=' * 50}")
        print(f"📱 OTP for {phone}: {otp.code}")
        print(f"{'=' * 50}\n")
        
        return redirect('verify_otp')
    
    # If GET, check if we should just send OTP for pending_phone?
    # For now, if GET, we assume specific request to send OTP or just redirect
    phone = request.session.get('pending_phone')
    if phone:
        # Re-send logic
        otp = OTP.generate_otp(phone)
        logger.info(f"Resent OTP for {phone}: {otp.code}")
        print(f"📱 Resent OTP for {phone}: {otp.code}")
        messages.info(request, 'OTP sent successfully')
        return redirect('verify_otp')
        
    return redirect('login')
    
    return redirect('login')


def verify_otp_view(request):
    """OTP verification page"""
    phone = request.session.get('pending_phone')
    if not phone:
        return redirect('login')
    
    if request.method == 'POST':
        code = request.POST.get('otp', '').strip()
        
        try:
            otp = OTP.objects.get(phone=phone, is_verified=False)
            
            if otp.code == code and otp.is_valid():
                otp.is_verified = True
                otp.save()
                
                # Get or create user
                user, created = User.objects.get_or_create(phone=phone)
                
                # Store user in session
                request.session['user_id'] = user.id
                # Keep pending_phone until PIN is set? No, user_id is enough now.
                # But create_pin might want it? No, create_pin uses user_id.
                
                if created or not user.pin or user.pin == '000000':
                    # New user OR existing user without PIN -> Create PIN
                    return redirect('create_pin')
                else:
                    # Logic: If they did OTP but have a PIN? 
                    # Could happen if they forgot PIN and did reset flow.
                    # In that case, we should probably let them reset PIN?
                    # Yes, redirect to create_pin to set new PIN.
                    return redirect('create_pin')
            else:
                messages.error(request, 'Invalid or expired OTP. Please try again.')
        except OTP.DoesNotExist:
            messages.error(request, 'OTP not found. Please request a new one.')
            return redirect('login')
    
    return render(request, 'core/verify_otp.html', {'phone': phone})


def logout_view(request):
    """Logout user"""
    request.session.flush()
    messages.success(request, 'Logged out successfully')
    return redirect('login')


def privacy_policy_view(request):
    """Privacy Policy page"""
    return render(request, 'core/privacy_policy.html')


def delete_account_view(request):
    """Delete Account Request page"""
    request_submitted = False
    
    if request.method == 'POST':
        phone = request.POST.get('phone', '').strip()
        reason = request.POST.get('reason', '').strip()
        
        if not phone or len(phone) < 10:
            messages.error(request, 'Please enter a valid phone number')
        else:
            # Log the deletion request (in production, save to DB or send email)
            logger.info(f"Account deletion request for {phone}. Reason: {reason}")
            print(f"\n{'=' * 50}")
            print(f"🗑️ ACCOUNT DELETION REQUEST")
            print(f"Phone: {phone}")
            print(f"Reason: {reason or 'Not provided'}")
            print(f"{'=' * 50}\n")
            request_submitted = True
    
    return render(request, 'core/delete_account.html', {'request_submitted': request_submitted})


def get_user(request):
    """Helper to get current user"""
    user_id = request.session.get('user_id')
    if not user_id:
        return None
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None


def login_required_view(view_func):
    """Decorator for login required views"""
    def wrapper(request, *args, **kwargs):
        if not request.session.get('user_id'):
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


@login_required_view
def setup_view(request):
    """New user setup page - collect user's name"""
    user = get_user(request)
    
    # If user already has a name, redirect to dashboard
    if user.name:
        return redirect('dashboard')
    
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        
        if name:
            user.name = name
            user.save()
            messages.success(request, f'Welcome, {name}! Set up your income to get started.')
            return redirect('settings')
        else:
            messages.error(request, 'Please enter your name.')
    
    return render(request, 'core/setup.html')


def calculate_monthly_balance(user, year, month):
    """Calculate balance for a specific month"""
    txs = Transaction.objects.filter(user=user, date__year=year, date__month=month)
    spent = sum(tx.amount for tx in txs if tx.category != 'income')
    extra_income = sum(tx.amount for tx in txs if tx.category == 'income')
    return (user.income + extra_income) - spent


@login_required_view
def dashboard(request):
    """Main dashboard view - now includes history and advisor"""
    user = get_user(request)
    
    # Enforce name setup
    if not user.name:
        return redirect('setup')

    # Auto-Save Logic (Check previous month)
    today = date.today()
    first_of_month = today.replace(day=1)
    last_month_end = first_of_month - timedelta(days=1)
    
    # Avoid running this on every request if possible, 
    # but for now we check if specific tx exists.
    # We only auto-save if we haven't already.
    if not Transaction.objects.filter(
        user=user, 
        date=last_month_end, 
        description='Month End Savings'
    ).exists():
        past_balance = calculate_monthly_balance(user, last_month_end.year, last_month_end.month)
        if past_balance > 0:
            Transaction.objects.create(
                user=user,
                date=last_month_end,
                category='savings',
                description='Month End Savings',
                amount=past_balance,
                order=999
            )
            messages.info(request, f'💰 Saved {user.currency}{past_balance:g} from last month!')
    
    # Get current month from query params or default to today
    year = int(request.GET.get('year', date.today().year))
    month = int(request.GET.get('month', date.today().month))
    current_date = date(year, month, 1)
    
    # Get filter
    filter_category = request.GET.get('filter', 'all')
    
    # Get transactions for current month
    transactions = Transaction.objects.filter(
        user=user,
        date__year=year,
        date__month=month
    ).order_by('order', '-date', '-created_at')
    
    # Apply category filter
    if filter_category != 'all':
        filtered_transactions = transactions.filter(category=filter_category)
    else:
        filtered_transactions = transactions
    
    # Pagination
    page = int(request.GET.get('page', 1))
    items_per_page = 5
    total_items = filtered_transactions.count()
    total_pages = max(1, (total_items + items_per_page - 1) // items_per_page)
    page = min(max(1, page), total_pages)
    
    start_idx = (page - 1) * items_per_page
    end_idx = start_idx + items_per_page
    paged_transactions = filtered_transactions[start_idx:end_idx]
    
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
        'needs': total_income * Decimal(user.rule_needs) / 100,
        'wants': total_income * Decimal(user.rule_wants) / 100,
        'savings': total_income * Decimal(user.rule_savings) / 100,
    }
    
    # Previous and next month
    prev_month = current_date - relativedelta(months=1)
    next_month = current_date + relativedelta(months=1)
    
    # --- HISTORY DATA ---
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
    for key in sorted(monthly_data.keys(), reverse=True):
        y, m = key.split('-')
        month_name = date(int(y), int(m), 1).strftime('%B %Y')
        data = monthly_data[key]
        hist_total_income = user.income + data['extra_income']
        saved = hist_total_income - data['spent']
        
        history.append({
            'month': month_name,
            'total_income': hist_total_income,
            'spent': data['spent'],
            'saved': saved,
            'status': 'Saved' if saved >= 0 else 'Over'
        })
    
    # --- ADVISOR DATA ---
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
                'text': f'You are spending {total_pct:.1f}% of your income!'
            })
        elif total_pct < 85:
            advice.append({
                'type': 'good',
                'title': '✅ Good Status',
                'text': f'You are under budget ({total_pct:.1f}%).'
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
    
    context = {
        'user': user,
        'current_date': current_date,
        'transactions': paged_transactions,
        'all_transactions': transactions,
        'filter_category': filter_category,
        'page': page,
        'total_pages': total_pages,
        'total_items': total_items,
        'total_income': total_income,
        'total_spent': total_spent,
        'balance': balance,
        'categories': categories,
        'limits': limits,
        'prev_month': prev_month,
        'next_month': next_month,
        'history': history,
        'advice': advice,
    }
    
    return render(request, 'core/dashboard.html', context)


@login_required_view
def add_transaction(request):
    """Add or edit a transaction"""
    if request.method == 'POST':
        user = get_user(request)
        
        description = request.POST.get('description', '').strip()
        amount = request.POST.get('amount', '')
        category = request.POST.get('category', 'needs')
        tx_id = request.POST.get('tx_id', '')
        year = int(request.POST.get('year', date.today().year))
        month = int(request.POST.get('month', date.today().month))
        
        if not description or not amount:
            messages.error(request, 'Please fill all fields')
            return redirect(f'/dashboard/?year={year}&month={month}')
        
        try:
            amount = Decimal(amount)
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except:
            messages.error(request, 'Please enter a valid amount')
            return redirect(f'/dashboard/?year={year}&month={month}')
        
        # Determine transaction date
        today = date.today()
        if year == today.year and month == today.month:
            tx_date = today
        else:
            tx_date = date(year, month, 1)

        # Negative Balance Check
        if category != 'income':
            # Calculate projected balance
            current_bal = calculate_monthly_balance(user, year, month)
            
            # Adjust for edit
            if tx_id:
                try:
                    old_tx = Transaction.objects.get(id=tx_id, user=user)
                    if old_tx.category == 'income':
                        current_bal -= old_tx.amount
                    else:
                        current_bal += old_tx.amount
                except Transaction.DoesNotExist:
                    pass
            
            if (current_bal - amount) < 0:
                messages.error(request, f'Insufficient balance! Available: {user.currency}{current_bal:g}')
                return redirect(f'/dashboard/?year={year}&month={month}')
        
        if tx_id:
            # Edit existing transaction
            try:
                tx = Transaction.objects.get(id=tx_id, user=user)
                tx.description = description
                tx.amount = amount
                tx.category = category
                tx.save()
                messages.success(request, 'Transaction updated!')
            except Transaction.DoesNotExist:
                messages.error(request, 'Transaction not found')
        else:
            # Create new transaction
            # Shift existing orders down to make room at top
            Transaction.objects.filter(
                user=user,
                date__year=year,
                date__month=month
            ).update(order=F('order') + 1)
            
            Transaction.objects.create(
                user=user,
                description=description,
                amount=amount,
                category=category,
                date=tx_date,
                order=0 # Top of list
            )
            messages.success(request, 'Transaction added!')
        
        return redirect(f'/dashboard/?year={year}&month={month}')
    
    return redirect('dashboard')


@login_required_view
def delete_transaction(request, tx_id):
    """Delete a transaction"""
    user = get_user(request)
    year = request.GET.get('year', date.today().year)
    month = request.GET.get('month', date.today().month)
    
    try:
        tx = Transaction.objects.get(id=tx_id, user=user)
        tx.delete()
        messages.success(request, 'Transaction deleted!')
    except Transaction.DoesNotExist:
        messages.error(request, 'Transaction not found')
    
    return redirect(f'/dashboard/?year={year}&month={month}')


@login_required_view
@require_http_methods(["POST"])
def reorder_transactions(request):
    """Reorder transactions via AJAX"""
    user = get_user(request)
    
    try:
        data = json.loads(request.body)
        order_list = data.get('order', [])
        
        for idx, tx_id in enumerate(order_list):
            Transaction.objects.filter(id=tx_id, user=user).update(order=idx)
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required_view
def history_view(request):
    """Yearly history view"""
    user = get_user(request)
    
    # Get all transactions grouped by month
    transactions = Transaction.objects.filter(user=user).order_by('-date')
    
    # Group by month
    monthly_data = {}
    for tx in transactions:
        key = tx.date.strftime('%Y-%m')
        if key not in monthly_data:
            monthly_data[key] = {'spent': Decimal('0'), 'extra_income': Decimal('0')}
        
        if tx.category == 'income':
            monthly_data[key]['extra_income'] += tx.amount
        else:
            monthly_data[key]['spent'] += tx.amount
    
    # Convert to list with calculated values
    history = []
    for key in sorted(monthly_data.keys(), reverse=True):
        year, month = key.split('-')
        month_name = date(int(year), int(month), 1).strftime('%B %Y')
        data = monthly_data[key]
        total_income = user.income + data['extra_income']
        saved = total_income - data['spent']
        
        history.append({
            'month': month_name,
            'total_income': total_income,
            'spent': data['spent'],
            'saved': saved,
            'status': 'Saved' if saved >= 0 else 'Over'
        })
    
    context = {
        'user': user,
        'history': history,
    }
    
    return render(request, 'core/history.html', context)


@login_required_view
def advisor_view(request):
    """Smart advisor view"""
    user = get_user(request)
    
    # Get current month
    year = int(request.GET.get('year', date.today().year))
    month = int(request.GET.get('month', date.today().month))
    current_date = date(year, month, 1)
    
    # Get transactions for current month
    transactions = Transaction.objects.filter(
        user=user,
        date__year=year,
        date__month=month
    )
    
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
                'text': f'You are spending {total_pct:.1f}% of your income!'
            })
        elif total_pct < 85:
            advice.append({
                'type': 'good',
                'title': '✅ Good Status',
                'text': f'You are under budget ({total_pct:.1f}%).'
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
    
    # Previous and next month
    prev_month = current_date - relativedelta(months=1)
    next_month = current_date + relativedelta(months=1)
    
    context = {
        'user': user,
        'current_date': current_date,
        'advice': advice,
        'prev_month': prev_month,
        'next_month': next_month,
    }
    
    return render(request, 'core/advisor.html', context)



@login_required_view
def savings_view(request):
    """Deep analysis of savings"""
    user = get_user(request)
    
    # Year filter
    year = int(request.GET.get('year', date.today().year))
    
    # 1. Total Savings Analysis (All time vs This Year)
    all_savings_tx = Transaction.objects.filter(user=user, category='savings').order_by('-date')
    total_saved_all_time = sum(tx.amount for tx in all_savings_tx)
    
    # Filter for selected year
    year_savings_tx = all_savings_tx.filter(date__year=year)
    total_saved_year = sum(tx.amount for tx in year_savings_tx)
    
    # 2. Monthly Trend for Chart
    month_range = range(1, 13)
    monthly_data = {month: Decimal('0') for month in month_range}
    
    for tx in year_savings_tx:
        monthly_data[tx.date.month] += tx.amount
        
    chart_labels = [date(year, m, 1).strftime('%b') for m in month_range]
    chart_values = [float(monthly_data[m]) for m in month_range]
    
    # 3. vs Goal Analysis (Budget Rule)
    monthly_goal = user.income * Decimal(user.rule_savings) / 100
    yearly_goal = monthly_goal * 12
    
    # 4. Advanced Metrics
    # Savings Rate
    base_income_year = user.income * 12
    extra_income_tx = Transaction.objects.filter(user=user, category='income', date__year=year)
    extra_income_year = sum(tx.amount for tx in extra_income_tx)
    total_income_year = base_income_year + extra_income_year
    
    savings_rate = 0
    if total_income_year > 0:
        savings_rate = (total_saved_year / total_income_year) * 100
        
    # Projection & Avg
    current_month = date.today().month if year == date.today().year else 12
    avg_monthly = total_saved_year / max(1, current_month)
    projected_year = avg_monthly * 12
    
    # Best Month
    best_month_val = max(monthly_data.values()) if monthly_data else 0
    best_month_name = "N/A"
    if best_month_val > 0:
        best_month_idx = max(monthly_data, key=monthly_data.get)
        best_month_name = date(year, best_month_idx, 1).strftime('%B')
    
    # 5. Recent Transactions
    recent_savings = list(all_savings_tx[:10])
    
    # 6. Advice/Status
    status_msg = "Keep pushing!"
    # Determine status color
    status_color = "var(--text-sub)"
    if yearly_goal > 0:
        pct = (total_saved_year / yearly_goal) * 100
        if pct >= 100:
            status_msg = "Outstanding! Goal met."
            status_color = "var(--success)"
        elif pct >= 50:
            status_msg = "On track, over 50%!"
            status_color = "var(--primary)"
    
    context = {
        'user': user,
        'current_year': year,
        'year_prev': year - 1,
        'year_next': year + 1 if year < date.today().year else None,
        'total_saved_all_time': total_saved_all_time,
        'total_saved_year': total_saved_year,
        'monthly_goal': monthly_goal,
        'yearly_goal': yearly_goal,
        'chart_labels': json.dumps(chart_labels),
        'chart_values': json.dumps(chart_values),
        'recent_savings': recent_savings,
        'status_msg': status_msg,
        'status_color': status_color,
        'avg_monthly': avg_monthly,
        'savings_rate': savings_rate,
        'projected_year': projected_year,
        'best_month_name': best_month_name,
        'best_month_val': best_month_val,
    }
    
    return render(request, 'core/savings.html', context)


@login_required_view
def settings_view(request):
    """User settings view"""
    user = get_user(request)
    
    if request.method == 'POST':
        income = request.POST.get('income', '0')
        currency = request.POST.get('currency', '$')
        rule_needs = request.POST.get('rule_needs', '50')
        rule_wants = request.POST.get('rule_wants', '30')
        rule_savings = request.POST.get('rule_savings', '20')
        theme = request.POST.get('theme', 'light')
        
        try:
            income = Decimal(income) if income else Decimal('0')
            rule_needs = int(rule_needs)
            rule_wants = int(rule_wants)
            rule_savings = int(rule_savings)
            
            # Validate rules sum to 100
            if abs((rule_needs + rule_wants + rule_savings) - 100) > 0.1:
                messages.error(request, 'Budget rules must add up to 100%')
                return redirect('settings')
            
            user.income = income
            user.currency = currency
            user.rule_needs = rule_needs
            user.rule_wants = rule_wants
            user.rule_savings = rule_savings
            user.theme = theme
            user.save()
            
            messages.success(request, 'Settings saved successfully!')
            return redirect('dashboard')
        except Exception as e:
            messages.error(request, f'Error saving settings: {str(e)}')
    
    currencies = [
        ('$', '$ Dollar'),
        ('₹', '₹ Rupee'),
        ('€', '€ Euro'),
        ('£', '£ Pound'),
        ('¥', '¥ Yen'),
    ]
    
    context = {
        'user': user,
        'currencies': currencies,
    }
    
    return render(request, 'core/settings.html', context)


@login_required_view
def reset_data(request):
    """Reset all user data"""
    if request.method == 'POST':
        user = get_user(request)
        
        # Delete all transactions
        Transaction.objects.filter(user=user).delete()
        
        # Reset user settings to defaults
        user.income = Decimal('0')
        user.currency = '$'
        user.rule_needs = 50
        user.rule_wants = 30
        user.rule_savings = 20
        user.save()
        
        messages.success(request, 'All data has been reset!')
        return redirect('settings')
    
    return redirect('settings')


@login_required_view
def export_data(request):
    """Export user data as JSON"""
    user = get_user(request)
    
    transactions = Transaction.objects.filter(user=user)
    
    data = {
        'income': float(user.income),
        'currency': user.currency,
        'theme': user.theme,
        'rules': {
            'needs': user.rule_needs,
            'wants': user.rule_wants,
            'savings': user.rule_savings,
        },
        'txs': [
            {
                'desc': tx.description,
                'amt': float(tx.amount),
                'cat': tx.category,
                'date': tx.date.isoformat(),
                'order': tx.order,
            }
            for tx in transactions
        ]
    }
    
    response = JsonResponse(data)
    response['Content-Disposition'] = 'attachment; filename="wealth_planner_backup.json"'
    return response


@login_required_view
@require_http_methods(["POST"])
def import_data(request):
    """Import user data from JSON"""
    user = get_user(request)
    
    if 'file' not in request.FILES:
        messages.error(request, 'No file uploaded')
        return redirect('history')
    
    try:
        file = request.FILES['file']
        data = json.load(file)
        
        # Update user settings
        user.income = Decimal(str(data.get('income', 0)))
        user.currency = data.get('currency', '$')
        user.theme = data.get('theme', 'light')
        
        rules = data.get('rules', {})
        user.rule_needs = rules.get('needs', 50)
        user.rule_wants = rules.get('wants', 30)
        user.rule_savings = rules.get('savings', 20)
        user.save()
        
        # Delete existing transactions
        Transaction.objects.filter(user=user).delete()
        
        # Import transactions
        for tx_data in data.get('txs', []):
            Transaction.objects.create(
                user=user,
                description=tx_data.get('desc', ''),
                amount=Decimal(str(tx_data.get('amt', 0))),
                category=tx_data.get('cat', 'needs'),
                date=datetime.fromisoformat(tx_data.get('date', datetime.now().isoformat())).date(),
                order=tx_data.get('order', 0)
            )
        
        messages.success(request, 'Data imported successfully!')
    except Exception as e:
        messages.error(request, f'Error importing data: {str(e)}')
    
    return redirect('history')


@login_required_view
def toggle_theme(request):
    """Toggle theme between light and dark"""
    user = get_user(request)
    user.theme = 'dark' if user.theme == 'light' else 'light'
    user.save()
    
    # Redirect back to referring page
    referer = request.META.get('HTTP_REFERER', '/dashboard/')
    return redirect(referer)


@login_required_view
def transactions_view(request):
    """Full transactions list with filtering"""
    user = get_user(request)
    
    # Filters
    try:
        year = int(request.GET.get('year', date.today().year))
        month = int(request.GET.get('month', date.today().month))
    except ValueError:
        year = date.today().year
        month = date.today().month

    category = request.GET.get('category', 'all')
    search = request.GET.get('search', '').strip()
    
    # Use helper date
    current_dt = date(year, month, 1)
    
    # Base Query for Summary (All Month Data)
    month_txs = Transaction.objects.filter(user=user, date__year=year, date__month=month)
    
    # Calculate Summary Total (ignore filters)
    extra_income = sum(t.amount for t in month_txs if t.category == 'income')
    total_income = extra_income
    total_expenses = sum(t.amount for t in month_txs if t.category != 'income')
    
    # Filtered Query for List
    txs = month_txs
    
    if category != 'all':
        txs = txs.filter(category=category)
    
    if search:
        txs = txs.filter(description__icontains=search)
        
    # Sort
    sort_by = request.GET.get('sort', 'date')
    if sort_by == 'date':
        # Default: Latest First
        txs = txs.order_by('order', '-date', '-created_at')
    elif sort_by == 'amount_high':
        txs = txs.order_by('-amount')
    elif sort_by == 'amount_low':
        txs = txs.order_by('amount')
    
    context = {
        'total_income': total_income,
        'total_expenses': total_expenses,
        'user': user,
        'transactions': txs,
        'year': year,
        'month': month,
        'category': category,
        'search': search,
        'current_date': current_dt,
        'prev_month': current_dt - timedelta(days=1),
        'next_month': current_dt + relativedelta(months=1),
    }
    return render(request, 'core/transactions.html', context)
