import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    SectionList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    TextInput,
    Dimensions,
    Animated,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDashboard, setCurrentDate, deleteTransaction } from '../../redux/slices/dashboardSlice';
import { getCategoryColor } from '../../theme/colors';

const { width } = Dimensions.get('window');

const TransactionsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { theme, isDark } = useSelector(state => state.theme);
    const { user } = useSelector(state => state.auth);
    const { transactions, currentYear, currentMonth } = useSelector(state => state.dashboard);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('date'); // date, amount

    useEffect(() => {
        dispatch(fetchDashboard({ year: currentYear, month: currentMonth }));
    }, [currentYear, currentMonth]);

    // Group transactions by Date
    const groupedTransactions = useMemo(() => {
        let filtered = transactions || [];

        // 1. Filter
        if (searchQuery) {
            filtered = filtered.filter(tx =>
                tx.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (filterCategory !== 'all') {
            filtered = filtered.filter(tx => tx.category === filterCategory);
        }

        // 2. Sort
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'amount') return b.amount - a.amount;
            return new Date(b.date) - new Date(a.date);
        });

        // 3. Group (only if sorting by date)
        if (sortBy === 'amount') {
            return [{ title: 'Top Transactions', data: filtered }];
        }

        const groups = filtered.reduce((acc, tx) => {
            const date = new Date(tx.date);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let title = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

            if (date.toDateString() === today.toDateString()) title = 'Today';
            else if (date.toDateString() === yesterday.toDateString()) title = 'Yesterday';

            if (!acc[title]) acc[title] = [];
            acc[title].push(tx);
            return acc;
        }, {});

        return Object.keys(groups).map(title => ({
            title,
            data: groups[title]
        }));
    }, [transactions, searchQuery, filterCategory, sortBy]);

    // Calculate totals for visible transactions
    const { income, expense } = useMemo(() => {
        return (transactions || []).reduce((acc, tx) => {
            // Apply same filters as list for accurate summary
            const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;

            if (matchesSearch && matchesCategory) {
                const amount = parseFloat(tx.amount) || 0;
                if (tx.category === 'income') acc.income += amount;
                else acc.expense += amount;
            }
            return acc;
        }, { income: 0, expense: 0 });
    }, [transactions, searchQuery, filterCategory]);

    const handlePrevMonth = () => {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 1) { newMonth = 12; newYear -= 1; }
        dispatch(setCurrentDate({ year: newYear, month: newMonth }));
    };

    const handleNextMonth = () => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 12) { newMonth = 1; newYear += 1; }
        dispatch(setCurrentDate({ year: newYear, month: newMonth }));
    };

    const styles = createStyles(theme);
    const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const categories = [
        { key: 'all', label: 'All', icon: 'view-grid' },
        { key: 'needs', label: 'Needs', icon: 'home' },
        { key: 'wants', label: 'Wants', icon: 'shopping' },
        { key: 'savings', label: 'Savings', icon: 'piggy-bank' },
        { key: 'income', label: 'Income', icon: 'trending-up' },
    ];

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'needs': return 'home-variant';
            case 'wants': return 'shopping';
            case 'savings': return 'piggy-bank';
            case 'income': return 'bank-transfer-in';
            default: return 'cash';
        }
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    const handleDeleteRequest = (id) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deleteTransaction(id)).unwrap();
                            dispatch(fetchDashboard({ year: currentYear, month: currentMonth }));
                        } catch (err) {
                            // Suppress error and force reload to handle "false failure"
                            dispatch(fetchDashboard({ year: currentYear, month: currentMonth }));
                            console.log('Delete "failed" but forcing reload:', err);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.txItem}
            onLongPress={() => handleDeleteRequest(item.id)}
        >
            <View style={[styles.txIconContainer, { backgroundColor: getCategoryColor(item.category, theme) + '15' }]}>
                <Icon name={getCategoryIcon(item.category)} size={24} color={getCategoryColor(item.category, theme)} />
            </View>
            <View style={styles.txContent}>
                <View style={styles.txTopRow}>
                    <Text style={styles.txDescription} numberOfLines={1}>{item.description}</Text>
                    <Text style={[styles.txAmount, { color: item.category === 'income' ? theme.success : theme.textMain }]}>
                        {item.category === 'income' ? '+' : '-'}{user?.currency}{item.amount.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.txBottomRow}>
                    <Text style={styles.txCategory}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
                    {item.category !== 'income' && (
                        <Icon name="arrow-right-thin" size={16} color={theme.textDisable} />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgBody} />

            {/* Modern Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Transactions</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setSortBy(prev => prev === 'date' ? 'amount' : 'date')}>
                    <Icon name={sortBy === 'date' ? "sort-calendar-ascending" : "sort-numeric-descending"} size={24} color={theme.textMain} />
                </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}>
                    <Icon name="chevron-left" size={24} color={theme.textSub} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthName}</Text>
                <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth}>
                    <Icon name="chevron-right" size={24} color={theme.textSub} />
                </TouchableOpacity>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Income</Text>
                    <Text style={[styles.statValue, { color: theme.success }]}>+{user?.currency}{income.toLocaleString()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Expense</Text>
                    <Text style={[styles.statValue, { color: theme.danger }]}>-{user?.currency}{expense.toLocaleString()}</Text>
                </View>
            </View>

            {/* Search & Filter */}
            <View style={styles.filterSection}>
                <View style={styles.searchBar}>
                    <Icon name="magnify" size={20} color={theme.textSub} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        placeholderTextColor={theme.textDisable}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close-circle" size={18} color={theme.textSub} />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.categories}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.key}
                            onPress={() => setFilterCategory(cat.key)}
                            style={[
                                styles.categoryChip,
                                filterCategory === cat.key && { backgroundColor: theme.textMain }
                            ]}
                        >
                            <Text style={[
                                styles.categoryText,
                                filterCategory === cat.key && { color: theme.bgBody }
                            ]}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Transactions List */}
            <SectionList
                sections={groupedTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBg}>
                            <Icon name="notebook-outline" size={48} color={theme.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No transactions found</Text>
                        <Text style={styles.emptySub}>Try adjusting your filters or date</Text>
                    </View>
                }
            />
        </View>
    );
};

const createStyles = (theme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bgBody },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
        iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgSurface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
        headerTitleContainer: { alignItems: 'center' },
        headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },

        monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
        monthNavBtn: { padding: 8 },
        monthText: { fontSize: 16, fontWeight: '600', color: theme.textMain, marginHorizontal: 16 },

        statsContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 20, backgroundColor: theme.bgSurface, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
        statBox: { flex: 1, alignItems: 'center' },
        statLabel: { fontSize: 12, fontWeight: '600', color: theme.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
        statValue: { fontSize: 18, fontWeight: '800' },
        statDivider: { width: 1, height: '80%', backgroundColor: theme.border },

        filterSection: { paddingHorizontal: 20, marginBottom: 10 },
        searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSurface, height: 46, borderRadius: 23, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
        searchInput: { flex: 1, height: '100%', marginLeft: 10, fontSize: 15, color: theme.textMain },
        categories: { flexDirection: 'row', justifyContent: 'space-between' },
        categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.border },
        categoryText: { fontSize: 12, fontWeight: '600', color: theme.textSub },

        listContent: { paddingHorizontal: 20, paddingBottom: 40 },
        sectionHeader: { marginTop: 24, marginBottom: 12 },
        sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSub, textTransform: 'uppercase', letterSpacing: 1 },

        txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
        txIconContainer: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
        txContent: { flex: 1 },
        txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
        txDescription: { fontSize: 16, fontWeight: '600', color: theme.textMain, flex: 1, marginRight: 10 },
        txAmount: { fontSize: 16, fontWeight: '700' },
        txBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        txCategory: { fontSize: 13, fontWeight: '500', color: theme.textSub },

        emptyState: { alignItems: 'center', marginTop: 60 },
        emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${theme.primary}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
        emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain, marginBottom: 8 },
        emptySub: { fontSize: 14, color: theme.textSub },
    });

export default TransactionsScreen;
