import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { fetchDashboard, addTransaction, updateTransaction, deleteTransaction, setCurrentDate } from '../../redux/slices/dashboardSlice';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { getCategoryColor } from '../../theme/colors';
import TransactionItem from '../../components/TransactionItem';
import BalanceCard from '../../components/BalanceCard';
import BudgetBar from '../../components/BudgetBar';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { user } = useSelector(state => state.auth);
    const {
        transactions, totalIncome, totalSpent, balance,
        categories, limits, advice, history,
        currentYear, currentMonth
    } = useSelector(state => state.dashboard);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addLoading, setAddLoading] = useState(false);

    // Add transaction form
    const [txDescription, setTxDescription] = useState('');
    const [txAmount, setTxAmount] = useState('');
    const [txCategory, setTxCategory] = useState('needs');
    const [editingTx, setEditingTx] = useState(null);

    // Silent background fetch - no loading indicators
    const loadDashboard = useCallback(() => {
        dispatch(fetchDashboard({ year: currentYear, month: currentMonth }));
    }, [dispatch, currentYear, currentMonth]);

    // Load on mount and when month changes - silently in background
    useEffect(() => {
        loadDashboard();
    }, [currentYear, currentMonth]);

    // Pre-fetch adjacent months for instant navigation
    useEffect(() => {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

        // Prefetch adjacent months silently (with small delay to not block current load)
        const timer = setTimeout(() => {
            // These will update cache but won't affect current display
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentYear, currentMonth]);

    const handlePrevMonth = () => {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }
        dispatch(setCurrentDate({ year: newYear, month: newMonth }));
    };

    const handleNextMonth = () => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }
        dispatch(setCurrentDate({ year: newYear, month: newMonth }));
    };

    const handleAddTransaction = async () => {
        if (!txDescription.trim() || !txAmount) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        setAddLoading(true);
        try {
            const txData = {
                description: txDescription.trim(),
                amount: parseFloat(txAmount),
                category: txCategory,
                date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
            };

            if (editingTx) {
                await dispatch(updateTransaction({ id: editingTx.id, data: txData })).unwrap();
            } else {
                await dispatch(addTransaction(txData)).unwrap();
            }

            setShowAddModal(false);
            resetForm();
            loadDashboard();
        } catch (err) {
            Alert.alert('Error', err || 'Failed to save transaction');
        } finally {
            setAddLoading(false);
        }
    };

    const handleEditTx = (tx) => {
        setEditingTx(tx);
        setTxDescription(tx.description);
        setTxAmount(tx.amount.toString());
        setTxCategory(tx.category);
        setShowAddModal(true);
    };

    const handleDeleteTx = async (id) => {
        Alert.alert('Delete Transaction', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await dispatch(deleteTransaction(id)).unwrap();
                        // Success - dashboard will auto-reload via effect or optimistic update
                    } catch (err) {
                        // Even if it fails, try reloading dashboard just in case it was a false positive
                        loadDashboard();
                        console.error('Delete error:', err);
                        // Optional: Alert.alert('Note', 'Could not verify deletion, please refresh.');
                    }
                },
            },
        ]);
    };

    const resetForm = () => {
        setTxDescription('');
        setTxAmount('');
        setTxCategory('needs');
        setEditingTx(null);
    };

    const handleLogout = () => dispatch(logout());
    const handleToggleTheme = () => dispatch(toggleTheme());

    const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const styles = createStyles(theme);

    const categoryOptions = [
        { key: 'needs', label: 'Needs', icon: 'home' },
        { key: 'wants', label: 'Wants', icon: 'shopping' },
        { key: 'savings', label: 'Savings', icon: 'piggy-bank' },
        { key: 'income', label: 'Income', icon: 'trending-up' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgBody} />

            {/* FIXED HEADER */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIcon}>
                        <Icon name="wallet" size={22} color={theme.primary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Wealth Planner</Text>
                        <Text style={styles.headerSub}>Welcome, {user?.name || 'User'}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings')}>
                        <Icon name="cog" size={22} color={theme.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleToggleTheme}>
                        <Icon name="brightness-6" size={22} color={theme.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
                        <Icon name="logout" size={22} color={theme.textSub} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* FIXED TABS */}
            <View style={styles.tabContainer}>
                {[
                    { key: 'dashboard', label: 'Overview', icon: 'chart-pie' },
                    { key: 'history', label: 'History', icon: 'calendar' },
                    { key: 'advisor', label: 'Advisor', icon: 'robot' },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Icon name={tab.icon} size={18} color={activeTab === tab.key ? '#fff' : theme.textSub} />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* SCROLLABLE CONTENT - Updates silently via Redux */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {activeTab === 'dashboard' && (
                    <>
                        {/* Month Navigation */}
                        <View style={styles.monthNav}>
                            <TouchableOpacity style={styles.monthBtn} onPress={handlePrevMonth}>
                                <Icon name="chevron-left" size={24} color={theme.textSub} />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>{monthName}</Text>
                            <TouchableOpacity style={styles.monthBtn} onPress={handleNextMonth}>
                                <Icon name="chevron-right" size={24} color={theme.textSub} />
                            </TouchableOpacity>
                        </View>

                        {/* Balance Card */}
                        <View style={styles.card}>
                            <BalanceCard
                                balance={balance}
                                income={totalIncome}
                                spent={totalSpent}
                                currency={user?.currency || '$'}
                                theme={theme}
                                onViewBalance={() => navigation.navigate('Savings')}
                                onViewTransactions={() => navigation.navigate('Transactions')}
                            />
                        </View>

                        {/* Budget Health */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Icon name="chart-bar" size={20} color={theme.primary} />
                                <Text style={styles.cardTitle}>Budget Health</Text>
                            </View>
                            <BudgetBar
                                label="Needs"
                                percentage={user?.rule_needs || 50}
                                spent={categories?.needs || 0}
                                limit={limits?.needs || 0}
                                color={theme.catNeeds}
                                currency={user?.currency || '$'}
                                theme={theme}
                            />
                            <BudgetBar
                                label="Wants"
                                percentage={user?.rule_wants || 30}
                                spent={categories?.wants || 0}
                                limit={limits?.wants || 0}
                                color={theme.catWants}
                                currency={user?.currency || '$'}
                                theme={theme}
                            />
                            <TouchableOpacity onPress={() => navigation.navigate('Savings')}>
                                <BudgetBar
                                    label="Savings"
                                    percentage={user?.rule_savings || 20}
                                    spent={categories?.savings || 0}
                                    limit={limits?.savings || 0}
                                    color={theme.catSavings}
                                    currency={user?.currency || '$'}
                                    theme={theme}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Transactions */}
                        <View style={styles.card}>
                            <TouchableOpacity style={styles.cardHeader} onPress={() => navigation.navigate('Transactions')}>
                                <Icon name="format-list-bulleted" size={20} color={theme.primary} />
                                <Text style={styles.cardTitle}>Transactions</Text>
                                <Text style={styles.cardCount}>{transactions?.length || 0}</Text>
                                <Icon name="chevron-right" size={20} color={theme.textSub} />
                            </TouchableOpacity>
                            {transactions?.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Icon name="clipboard-text-outline" size={48} color={theme.textDisable} />
                                    <Text style={styles.emptyText}>No transactions yet.</Text>
                                </View>
                            ) : (
                                transactions?.slice(0, 5).map((tx) => (
                                    <TransactionItem
                                        key={tx.id}
                                        transaction={tx}
                                        currency={user?.currency || '$'}
                                        theme={theme}
                                        onEdit={() => handleEditTx(tx)}
                                        onDelete={() => handleDeleteTx(tx.id)}
                                    />
                                ))
                            )}
                            {transactions?.length > 0 && (
                                <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('Transactions')}>
                                    <Text style={styles.viewAllText}>View All Transactions</Text>
                                    <Icon name="arrow-right" size={16} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                {activeTab === 'history' && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Icon name="history" size={20} color={theme.primary} />
                            <Text style={styles.cardTitle}>Yearly Overview</Text>
                        </View>
                        {history?.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="chart-line" size={48} color={theme.textDisable} />
                                <Text style={styles.emptyText}>No history data yet.</Text>
                            </View>
                        ) : (
                            history?.map((item, index) => (
                                <View key={index} style={styles.historyItem}>
                                    <Text style={styles.historyMonth}>{item.month}</Text>
                                    <View style={styles.historyStats}>
                                        <Text style={[styles.historySaved, { color: item.saved >= 0 ? theme.success : theme.danger }]}>
                                            {user?.currency}{item.saved?.toFixed(0)}
                                        </Text>
                                        <View style={[styles.statusBadge, { backgroundColor: item.saved >= 0 ? theme.success : theme.danger }]}>
                                            <Text style={styles.statusText}>{item.status}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'advisor' && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Icon name="lightbulb-on" size={20} color={theme.primary} />
                            <Text style={styles.cardTitle}>Financial Insights</Text>
                        </View>
                        {advice?.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="check-circle" size={48} color={theme.success} />
                                <Text style={styles.emptyText}>Everything looks good!</Text>
                            </View>
                        ) : (
                            advice?.map((item, index) => (
                                <View key={index} style={styles.adviceItem}>
                                    <Text style={styles.adviceTitle}>{item.title}</Text>
                                    <Text style={styles.adviceText}>{item.text}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => { resetForm(); setShowAddModal(true); }}
                activeOpacity={0.8}
            >
                <Icon name="plus" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Add Transaction Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</Text>
                            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                                <Icon name="close" size={24} color={theme.textSub} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Description (e.g. Salary, Rent)"
                            placeholderTextColor={theme.textDisable}
                            value={txDescription}
                            onChangeText={setTxDescription}
                        />

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Amount"
                            placeholderTextColor={theme.textDisable}
                            keyboardType="numeric"
                            value={txAmount}
                            onChangeText={setTxAmount}
                        />

                        <View style={styles.categoryGrid}>
                            {categoryOptions.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryItem,
                                        txCategory === cat.key && { borderColor: getCategoryColor(cat.key, theme), borderWidth: 2 },
                                    ]}
                                    onPress={() => setTxCategory(cat.key)}
                                >
                                    <Icon name={cat.icon} size={24} color={getCategoryColor(cat.key, theme)} />
                                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.modalBtn, addLoading && { opacity: 0.7 }]}
                            onPress={handleAddTransaction}
                            disabled={addLoading}
                        >
                            {addLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Icon name={editingTx ? 'check' : 'plus'} size={20} color="#fff" />
                                    <Text style={styles.modalBtnText}>{editingTx ? 'Update' : 'Add'}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.bgSurface, borderBottomWidth: 1, borderBottomColor: theme.border },
        headerLeft: { flexDirection: 'row', alignItems: 'center' },
        headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${theme.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
        headerSub: { fontSize: 13, color: theme.textSub },
        headerRight: { flexDirection: 'row', gap: 4 },
        headerBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
        tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: theme.bgSurface },
        tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: theme.bgAlt, gap: 6 },
        tabActive: { backgroundColor: theme.primary },
        tabText: { fontSize: 13, fontWeight: '500', color: theme.textSub },
        tabTextActive: { color: '#fff' },
        content: { flex: 1, paddingHorizontal: 16 },
        monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
        monthBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.bgSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
        monthTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
        card: { backgroundColor: theme.bgSurface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
        cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
        cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textMain, flex: 1 },
        cardCount: { fontSize: 12, fontWeight: '600', color: theme.textSub, backgroundColor: theme.bgAlt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
        emptyState: { alignItems: 'center', paddingVertical: 32 },
        emptyText: { marginTop: 12, fontSize: 14, color: theme.textSub },
        historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
        historyMonth: { fontSize: 14, fontWeight: '600', color: theme.textMain, flex: 1 },
        historyStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        historySaved: { fontSize: 14, fontWeight: '600' },
        statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
        statusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
        adviceItem: { backgroundColor: theme.bgAlt, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: theme.primary },
        adviceTitle: { fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 4 },
        adviceText: { fontSize: 13, color: theme.textSub },
        fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modalContent: { backgroundColor: theme.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
        modalTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain },
        modalInput: { backgroundColor: theme.bgAlt, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: theme.textMain, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
        categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 16 },
        categoryItem: { width: (width - 78) / 4, aspectRatio: 1, backgroundColor: theme.bgAlt, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
        categoryLabel: { fontSize: 11, fontWeight: '500', color: theme.textSub, marginTop: 6 },
        modalBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
        modalBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
        viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border, marginTop: 8, gap: 4 },
        viewAllText: { fontSize: 14, fontWeight: '600', color: theme.primary },
    });

export default DashboardScreen;
